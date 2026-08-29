import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, X, SendHorizontal, Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Msg { role: "user" | "assistant"; content: string }

const SITE_HOST = "asasinvest.com";

/** Render assistant text with clickable links (internal /property/* via SPA nav). */
function RichText({ text }: { text: string }) {
  const navigate = useNavigate();
  const nodes: React.ReactNode[] = [];
  // [label](href) or bare URL / /property/slug
  const re = /\[([^\]]+)\]\((https?:\/\/[^\s)]+|\/[^\s)]+)\)|(https?:\/\/[^\s]+)|(\/property\/[A-Za-z0-9\-_]+)/g;
  let last = 0, m: RegExpExecArray | null, key = 0;
  const toInternal = (href: string): string | null => {
    try {
      if (href.startsWith("/")) return href;
      const u = new URL(href);
      if (u.hostname.replace(/^www\./, "").endsWith(SITE_HOST)) return u.pathname + u.search;
      return null;
    } catch { return null; }
  };
  const push = (label: string, href: string) => {
    const internal = toInternal(href);
    if (internal) {
      nodes.push(
        <a key={key++} href={internal} onClick={(e) => { e.preventDefault(); navigate(internal); }}
           className="text-accent underline underline-offset-2 hover:opacity-80">{label}</a>
      );
    } else {
      nodes.push(
        <a key={key++} href={href} target="_blank" rel="noopener noreferrer"
           className="text-accent underline underline-offset-2 hover:opacity-80">{label}</a>
      );
    }
  };
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    if (m[1] && m[2]) push(m[1], m[2]);
    else if (m[3]) push(m[3].replace(/^https?:\/\//, "").replace(/\/$/, ""), m[3]);
    else if (m[4]) push(m[4], m[4]);
    last = re.lastIndex;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return <span className="whitespace-pre-wrap break-words">{nodes}</span>;
}

export default function PropertyAssistant() {
  const { language, isRTL } = useLanguage();
  const location = useLocation();
  const ar = language === "ar";
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [leadSent, setLeadSent] = useState(false); // true once the team has been emailed this visitor's details
  const scrollRef = useRef<HTMLDivElement>(null);

  const greeting = ar
    ? "مرحباً بك في أساس للاستثمار! أنا مساعدك العقاري. اسألني عن مشاريعنا وأسعارها ومواقعها وسأساعدك بكل سرور."
    : "Welcome to ASAS Invest! I'm your property assistant. Ask me about our projects, prices, locations or unit types — I'm happy to help.";

  const starters = ar
    ? ["ما العقارات الجاهزة للتسليم؟", "مشاريع على الخارطة", "عقارات في دبي مارينا", "ماذا تقدم أساس؟"]
    : ["What's ready to move in?", "Show me off-plan projects", "Properties in Dubai Marina", "What does ASAS offer?"];

  useEffect(() => {
    if (open && messages.length === 0) setMessages([{ role: "assistant", content: greeting }]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  // Never show on the admin app.
  if (location.pathname.startsWith("/admin")) return null;

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || busy) return;
    const next = [...messages, { role: "user" as const, content: q }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const payload = next.filter((m) => m.content !== greeting); // don't send the local greeting
      const { data, error } = await supabase.functions.invoke("property-assistant", {
        body: { messages: payload, locale: language, lead_captured: leadSent },
      });
      if (error) throw error;
      if ((data as any)?.lead_captured) setLeadSent(true);
      const reply = (data as any)?.reply || (data as any)?.error;
      setMessages((prev) => [...prev, { role: "assistant", content: reply || (ar ? "عذراً، حدث خطأ. حاول مرة أخرى." : "Sorry, something went wrong. Please try again.") }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: ar ? "عذراً، تعذّر الاتصال. حاول مرة أخرى." : "Sorry, I couldn't connect. Please try again." }]);
    } finally {
      setBusy(false);
    }
  };

  const showStarters = messages.length <= 1 && !busy;

  return (
    <>
      {/* Launcher — stacked above the WhatsApp button */}
      {!open && (
        <motion.button
          onClick={() => setOpen(true)}
          className="fixed bottom-24 end-6 z-50 flex items-center justify-center w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 1.2, type: "spring", stiffness: 260, damping: 20 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          aria-label={ar ? "مساعد أساس العقاري" : "ASAS property assistant"}
        >
          <Sparkles className="w-6 h-6" />
        </motion.button>
      )}

      <AnimatePresence>
        {open && (
          <motion.div
            dir={isRTL ? "rtl" : "ltr"}
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 280, damping: 26 }}
            className="fixed bottom-24 end-4 z-50 flex flex-col overflow-hidden rounded-2xl border border-accent/30 bg-background shadow-2xl"
            style={{ width: "min(380px, calc(100vw - 2rem))", height: "min(560px, calc(100vh - 8rem))" }}
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 bg-[#1A1A1A] text-white">
              <div className="flex items-center justify-center w-9 h-9 rounded-full bg-accent/20">
                <Sparkles className="w-5 h-5 text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold leading-tight">{ar ? "مساعد أساس" : "ASAS Assistant"}</p>
                <p className="text-[11px] text-white/60 leading-tight">{ar ? "اسألني عن عقاراتنا" : "Ask me about our properties"}</p>
              </div>
              <button onClick={() => setOpen(false)} aria-label={ar ? "إغلاق" : "Close"} className="text-white/70 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5 bg-muted/20">
              {messages.map((m, i) => (
                <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                  <div className={cn(
                    "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed",
                    m.role === "user" ? "bg-primary text-primary-foreground rounded-ee-sm" : "bg-background border border-border rounded-es-sm"
                  )}>
                    {m.role === "assistant" ? <RichText text={m.content} /> : <span className="whitespace-pre-wrap break-words">{m.content}</span>}
                  </div>
                </div>
              ))}
              {busy && (
                <div className="flex justify-start">
                  <div className="bg-background border border-border rounded-2xl rounded-es-sm px-3.5 py-2.5">
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}

              {showStarters && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {starters.map((s) => (
                    <button key={s} onClick={() => send(s)}
                      className="text-xs px-3 py-1.5 rounded-full border border-accent/40 text-foreground/80 hover:bg-accent/10 transition-colors">
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Composer */}
            <div className="border-t p-2.5 flex items-end gap-2 bg-background">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
                rows={1}
                placeholder={ar ? "اكتب سؤالك…" : "Type your question…"}
                disabled={busy}
                className="flex-1 resize-none max-h-24 rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <button
                onClick={() => send(input)}
                disabled={busy || !input.trim()}
                aria-label={ar ? "إرسال" : "Send"}
                className="shrink-0 flex items-center justify-center w-9 h-9 rounded-xl bg-primary text-primary-foreground disabled:opacity-40"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <SendHorizontal className={cn("w-4 h-4", isRTL && "rotate-180")} />}
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground text-center pb-2 px-3">
              {ar ? "يجيب المساعد بناءً على العقارات المنشورة في أساس فقط." : "Answers are based only on ASAS's published properties."}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
