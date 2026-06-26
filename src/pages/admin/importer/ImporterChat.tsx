import React, { useState, useRef, useCallback, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Bot, User, Paperclip, SendHorizontal, Loader2, FileText, Image as ImageIcon,
  Video, FileType2, X, Sparkles, ArrowRight, AlertTriangle, CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

const BUCKET = "property-media";

type FileKind = "image" | "pdf" | "docx" | "text" | "video" | "other";

interface PendingFile {
  file: File;
  kind: FileKind;
}

interface ManualTodo {
  fields?: string[];
  images_found?: number;
  images_needed?: number;
  warnings?: string[];
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  attachments?: { name: string; kind: FileKind }[];
  jobId?: string;
  manualTodo?: ManualTodo;
}

function classifyKind(file: File): FileKind {
  const n = file.name.toLowerCase();
  const m = file.type.toLowerCase();
  if (m.startsWith("image/") || /\.(jpe?g|png|webp|gif)$/.test(n)) return "image";
  if (m.startsWith("video/") || /\.(mp4|mov|webm|m4v)$/.test(n)) return "video";
  if (m === "application/pdf" || n.endsWith(".pdf")) return "pdf";
  if (n.endsWith(".docx") || m.includes("wordprocessingml")) return "docx";
  if (m.startsWith("text/") || n.endsWith(".txt")) return "text";
  return "other";
}

const KindIcon = ({ kind, className }: { kind: FileKind; className?: string }) => {
  if (kind === "image") return <ImageIcon className={className} />;
  if (kind === "video") return <Video className={className} />;
  if (kind === "docx" || kind === "text") return <FileType2 className={className} />;
  return <FileText className={className} />;
};

const URL_RE = /\bhttps?:\/\/[^\s)]+/gi;
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

const WELCOME =
  "👋 I'm the ASAS property assistant. Upload a **brochure (PDF/Word)**, **images**, or a **video**, or paste a **listing URL** or any **text** about the project. I'll extract the name, developer, description, unit types, sizes (SQF), rooms, off-plan/ready status and the price range, attach the images, and prepare a **draft** for you to review and publish.";

export default function ImporterChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: "welcome", role: "assistant", text: WELCOME },
  ]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState<PendingFile[]>([]);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  // Load persisted chat history (past extraction attempts) once on mount.
  useEffect(() => {
    (async () => {
      try {
        const { data } = await (supabase as any)
          .from("ai_chat_log")
          .select("id, status, prompt, file_names, job_id, assistant_message, error")
          .order("created_at", { ascending: false })
          .limit(15);
        if (!data?.length) return;
        const hist: ChatMessage[] = [];
        for (const row of [...data].reverse()) {
          const fileNames: string[] = Array.isArray(row.file_names) ? row.file_names : [];
          hist.push({
            id: `h-u-${row.id}`,
            role: "user",
            text: row.prompt || (fileNames.length ? `(${fileNames.length} attachment${fileNames.length === 1 ? "" : "s"})` : "—"),
            attachments: fileNames.map((n) => ({ name: n, kind: "other" as FileKind })),
          });
          hist.push({
            id: `h-a-${row.id}`,
            role: "assistant",
            text: row.status === "success" ? (row.assistant_message || "Draft created.") : `⚠️ ${row.error || "Extraction failed."}`,
            jobId: row.status === "success" ? (row.job_id || undefined) : undefined,
          });
        }
        setMessages((m) => [m[0], ...hist, ...m.slice(1)]);
      } catch { /* history is best-effort */ }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addFiles = useCallback((list: FileList | null) => {
    if (!list) return;
    const next: PendingFile[] = [];
    for (const file of Array.from(list)) {
      if (file.size > 200 * 1024 * 1024) { toast.error(`${file.name} is over the 200 MB limit — skipped.`); continue; }
      next.push({ file, kind: classifyKind(file) });
    }
    setPending((p) => [...p, ...next]);
  }, []);

  const removePending = (idx: number) => setPending((p) => p.filter((_, i) => i !== idx));

  const onDrop = (e: React.DragEvent) => { e.preventDefault(); addFiles(e.dataTransfer.files); };

  const handleSend = async () => {
    const text = input.trim();
    if (!text && pending.length === 0) return;
    setBusy(true);

    const urls = (text.match(URL_RE) || []).map((u) => u.replace(/[.,]$/, ""));
    const cleanText = text.replace(URL_RE, "").trim();

    const userMsg: ChatMessage = {
      id: uid(), role: "user",
      text: text || `(${pending.length} attachment${pending.length === 1 ? "" : "s"})`,
      attachments: pending.map((p) => ({ name: p.file.name, kind: p.kind })),
    };
    setMessages((m) => [...m, userMsg]);

    const filesToUpload = [...pending];
    setInput("");
    setPending([]);

    try {
      // 1. Extract PDF text in the browser (pdf.js) — keeps heavy parsing OFF the
      //    edge function (which was hitting the 546 resource limit). For image-only
      //    PDFs we render the first pages to images for the vision model.
      // The edge function reads PDFs natively via Claude (text + embedded images),
      // so we upload the PDF itself. We ALSO run pdf.js in the browser as a
      // supplement: pull a text layer (helps when present) and, for image-only
      // PDFs, render page images for the gallery.
      const extractedTexts: string[] = [];
      const processList: PendingFile[] = [];
      for (const pf of filesToUpload) {
        if (pf.kind === "pdf") {
          processList.push(pf); // upload the PDF — Claude reads it directly
          try {
            // Hard overall cap: pdf.js must never block the send. If it stalls,
            // we proceed — Claude still reads the PDF server-side.
            const { text, images } = await withTimeout(extractPdfClient(pf.file), 60000, "pdf");
            if (text.trim().length > 20) extractedTexts.push(`--- ${pf.file.name} ---\n${text.slice(0, 16000)}`);
            for (const img of images) processList.push({ file: img, kind: "image" });
          } catch { /* Claude still reads the PDF server-side; pdf.js is only a supplement */ }
        } else {
          processList.push(pf);
        }
      }

      // 2. Upload everything to the property-media bucket under imports/<folder>/
      const folder = `imports/${uid()}`;
      const uploaded: { storage_path: string; name: string; mime: string; kind: FileKind; size: number }[] = [];
      for (const pf of processList) {
        const safeName = pf.file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${safeName}`;
        const { error } = await supabase.storage.from(BUCKET).upload(path, pf.file, {
          contentType: pf.file.type || "application/octet-stream", upsert: true,
        });
        if (error) { toast.error(`Upload failed for ${pf.file.name}: ${error.message}`); continue; }
        uploaded.push({ storage_path: path, name: pf.file.name, mime: pf.file.type, kind: pf.kind, size: pf.file.size });
      }

      // 3. Call the extraction orchestrator (raw fetch — no invoke timeout)
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-extract`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          property_hint: cleanText.split("\n")[0]?.slice(0, 120) || "",
          // Fold PDF text into `text` so ANY server version reads it (older builds
          // ignore extracted_texts). extracted_texts kept for the newer build.
          text: [cleanText, ...extractedTexts].filter(Boolean).join("\n\n"),
          extracted_texts: extractedTexts,
          urls,
          files: uploaded,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.error) throw new Error(data?.error || `Request failed (${res.status})`);

      setMessages((m) => [...m, {
        id: uid(), role: "assistant",
        text: data.assistant_message || "Draft created.",
        jobId: data.job_id,
        manualTodo: data.manual_todo,
      }]);
    } catch (e) {
      setMessages((m) => [...m, {
        id: uid(), role: "assistant",
        text: `⚠️ Something went wrong: ${e instanceof Error ? e.message : String(e)}\n\nYou can try again, or upload the missing details directly.`,
      }]);
    } finally {
      setBusy(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (!busy) handleSend(); }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-9rem)]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-3xl font-semibold flex items-center gap-2">
            <Sparkles className="w-7 h-7 text-primary" /> AI Property Chat
          </h1>
          <p className="text-muted-foreground mt-1">
            Upload brochures, images, videos or URLs — the AI extracts the data and prepares a draft to review.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to="/admin/importer/queue">Review Queue <ArrowRight className="w-4 h-4 ms-2" /></Link>
        </Button>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        className="flex-1 overflow-y-auto rounded-xl border border-border bg-muted/20 p-4 space-y-4"
      >
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-card border border-border"}`}>
              {msg.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4 text-primary" />}
            </div>
            <div className={`max-w-[80%] space-y-2 ${msg.role === "user" ? "items-end" : ""}`}>
              <Card className={msg.role === "user" ? "bg-primary text-primary-foreground" : ""}>
                <CardContent className="py-3 px-4">
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{renderInline(msg.text)}</p>
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {msg.attachments.map((a, i) => (
                        <Badge key={i} variant="secondary" className="gap-1 font-normal">
                          <KindIcon kind={a.kind} className="w-3 h-3" /> {a.name}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Draft result card */}
              {msg.role === "assistant" && msg.jobId && (
                <Card className="border-primary/40">
                  <CardContent className="py-3 px-4 space-y-2">
                    {msg.manualTodo?.fields && msg.manualTodo.fields.length > 0 ? (
                      <div className="flex items-start gap-2 text-sm text-amber-600">
                        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                        <span>Couldn't extract: {msg.manualTodo.fields.map((f) => (
                          <Badge key={f} variant="outline" className="mx-0.5 text-amber-700 border-amber-300">{f}</Badge>
                        ))}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-green-600">
                        <CheckCircle2 className="w-4 h-4" /> All key fields extracted.
                      </div>
                    )}
                    {typeof msg.manualTodo?.images_needed === "number" && msg.manualTodo.images_needed > 0 && (
                      <div className="flex items-center gap-2 text-sm text-amber-600">
                        <ImageIcon className="w-4 h-4" />
                        {msg.manualTodo.images_found}/5 images — upload {msg.manualTodo.images_needed} more above.
                      </div>
                    )}
                    <Button asChild size="sm" className="mt-1">
                      <Link to="/admin/importer/queue">Review &amp; publish draft <ArrowRight className="w-4 h-4 ms-2" /></Link>
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        ))}

        {busy && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-card border border-border flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-primary" />
            </div>
            <Card><CardContent className="py-3 px-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Reading your files and extracting property data…
            </CardContent></Card>
          </div>
        )}
      </div>

      {/* Pending attachments */}
      {pending.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {pending.map((p, i) => (
            <Badge key={i} variant="secondary" className="gap-1.5 py-1 pe-1 font-normal">
              <KindIcon kind={p.kind} className="w-3.5 h-3.5" /> {p.file.name}
              <button onClick={() => removePending(i)} className="ms-1 rounded-full hover:bg-background/60 p-0.5">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Composer */}
      <div className="mt-3 flex items-end gap-2">
        <input
          ref={fileRef} type="file" multiple hidden
          accept="image/*,video/*,application/pdf,.docx,.txt,.doc"
          onChange={(e) => { addFiles(e.target.files); if (fileRef.current) fileRef.current.value = ""; }}
        />
        <Button variant="outline" size="icon" className="shrink-0 h-[60px] w-[52px]" onClick={() => fileRef.current?.click()} disabled={busy} title="Attach files">
          <Paperclip className="w-5 h-5" />
        </Button>
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Paste a listing URL or property details, then attach files… (Enter to send, Shift+Enter for newline)"
          className="min-h-[60px] max-h-40 resize-none"
          disabled={busy}
        />
        <Button size="icon" className="shrink-0 h-[60px] w-[52px]" onClick={handleSend} disabled={busy || (!input.trim() && pending.length === 0)}>
          {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <SendHorizontal className="w-5 h-5" />}
        </Button>
      </div>
    </div>
  );
}

/* eslint-disable @typescript-eslint/no-explicit-any */
async function loadPdfjs(): Promise<any> {
  const pdfjs: any = await import("pdfjs-dist");
  // @ts-ignore — Vite ?url asset import
  const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  return pdfjs;
}

function canvasToFile(canvas: HTMLCanvasElement, name: string): Promise<File | null> {
  return new Promise((r) =>
    canvas.toBlob((b) => r(b ? new File([b], name, { type: "image/jpeg" }) : null), "image/jpeg", 0.85),
  );
}

// Reject if a promise takes longer than ms — so a misbehaving pdf.js call can
// never hang the whole send. The underlying work is simply abandoned.
function withTimeout<T>(p: Promise<T>, ms: number, label = "op"): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, rej) => setTimeout(() => rej(new Error(`${label} timed out`)), ms)),
  ]);
}

// Render the PDF pages to images (pdf.js's most reliable path). Reliable beats
// clever: this never hangs, and brochure pages are mostly the property renders.
async function extractPdfImages(doc: any, baseName: string, want = 5): Promise<File[]> {
  const stem = baseName.replace(/\.pdf$/i, "");
  const out: File[] = [];
  const pages = Math.min(doc.numPages, want);
  for (let p = 1; p <= pages; p++) {
    try {
      const page: any = await withTimeout(doc.getPage(p), 8000, "getPage");
      const vp = page.getViewport({ scale: 1.5 });
      const c = document.createElement("canvas");
      c.width = Math.ceil(vp.width);
      c.height = Math.ceil(vp.height);
      const ctx = c.getContext("2d");
      if (!ctx) continue;
      await withTimeout(page.render({ canvasContext: ctx, viewport: vp, canvas: c }).promise, 12000, "render");
      const f = await canvasToFile(c, `${stem}-page-${p}.jpg`);
      if (f) out.push(f);
    } catch { /* skip this page */ }
  }
  return out;
}

// Browser-side PDF processing with pdf.js: text layer (supplement) + page images.
async function extractPdfClient(file: File): Promise<{ text: string; images: File[] }> {
  const pdfjs = await loadPdfjs();
  const data = new Uint8Array(await file.arrayBuffer());
  const doc: any = await withTimeout(pdfjs.getDocument({ data }).promise, 15000, "getDocument");

  let text = "";
  const textPages = Math.min(doc.numPages, 20);
  for (let p = 1; p <= textPages; p++) {
    try {
      const page: any = await withTimeout(doc.getPage(p), 8000, "getPage");
      const content: any = await withTimeout(page.getTextContent(), 8000, "getTextContent");
      text += content.items.map((it: any) => (typeof it?.str === "string" ? it.str : "")).join(" ") + "\n";
    } catch { /* skip page text */ }
  }

  let images: File[] = [];
  try { images = await extractPdfImages(doc, file.name, 5); } catch { images = []; }
  return { text, images };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// Minimal **bold** rendering for assistant text
function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**")
      ? <strong key={i}>{p.slice(2, -2)}</strong>
      : <span key={i}>{p}</span>
  );
}
