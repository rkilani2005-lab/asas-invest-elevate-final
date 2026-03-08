import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Edit3,
  Eye,
  Send,
  FileText,
  Image,
  Video,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  compressImageToLimit,
  getExtensionFromBlob,
  formatFileSize,
} from "@/lib/image-compression";

const MAX_IMAGE_BYTES = 600 * 1024; // 600 KB target
const MAX_VIDEO_BYTES = 40 * 1024 * 1024; // 40 MB

// ─── Edge function helper ─────────────────────────────────────────────────────
async function callEdgeFunction(fn: string, body: Record<string, any>) {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${fn}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session?.access_token}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    if (res.status === 429) throw new Error("Rate limit exceeded. Please try again later.");
    if (res.status === 402) throw new Error("AI credits exhausted. Please add credits to your workspace.");
    throw new Error(data.error || "Request failed");
  }
  return data;
}

// ─── Status config ────────────────────────────────────────────────────────────
const statusConfig: Record<string, { label: string; color: string }> = {
  pending:          { label: "Pending",           color: "bg-muted text-muted-foreground" },
  extracting:       { label: "Extracting…",       color: "bg-blue-500/10 text-blue-600" },
  reviewing:        { label: "Ready to Review",   color: "bg-yellow-500/10 text-yellow-600" },
  processing_media: { label: "Compressing",       color: "bg-purple-500/10 text-purple-600" },
  uploading:        { label: "Uploading…",        color: "bg-orange-500/10 text-orange-600" },
  completed:        { label: "Completed",         color: "bg-green-500/10 text-green-600" },
  error:            { label: "Error",             color: "bg-red-500/10 text-red-600" },
};

// ─── Per-file compression state ───────────────────────────────────────────────
interface FileProgress {
  filename: string;
  phase: "waiting" | "compressing" | "uploading" | "done" | "skipped" | "error";
  originalSize: number;
  compressedSize?: number;
  savedPct?: number;
  error?: string;
}

// ─── JobCard ──────────────────────────────────────────────────────────────────
function JobCard({ job, onRefresh }: { job: any; onRefresh: () => void }) {
  const [expanded, setExpanded]         = useState(false);
  const [editing, setEditing]           = useState(false);
  const [form, setForm]                 = useState<Record<string, any>>({});
  const [publishing, setPublishing]     = useState(false);
  const [extracting, setExtracting]     = useState(false);
  const [fileProgress, setFileProgress] = useState<FileProgress[]>([]);
  const [overallStep, setOverallStep]   = useState("");

  // ── Queries ──────────────────────────────────────────────────────────────
  const { data: media, refetch: refetchMedia } = useQuery({
    queryKey: ["job-media", job.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("import_media")
        .select("*")
        .eq("job_id", job.id)
        .order("sort_order");
      return data || [];
    },
    enabled: expanded,
  });

  const { data: logs } = useQuery({
    queryKey: ["job-logs", job.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("import_logs")
        .select("*")
        .eq("job_id", job.id)
        .order("created_at", { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: expanded,
    refetchInterval:
      job.import_status !== "completed" && job.import_status !== "error"
        ? 3000
        : false,
  });

  const cfg        = statusConfig[job.import_status || "pending"] || statusConfig.pending;
  const isProcessing = ["extracting", "processing_media", "uploading"].includes(
    job.import_status || ""
  );

  // ── AI Extraction ─────────────────────────────────────────────────────────
  const handleExtract = async () => {
    setExtracting(true);
    try {
      const pdfMedia = (media || []).filter((m: any) => m.media_type === "brochure");
      await callEdgeFunction("extract-property", {
        job_id: job.id,
        folder_name: job.folder_name,
        pdf_files: pdfMedia.map((m: any) => ({
          path_lower: m.dropbox_path,
          name: m.original_filename,
          size: m.original_size_bytes,
        })),
      });
      toast.success("AI extraction complete");
      onRefresh();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setExtracting(false);
    }
  };

  // ── Edit helpers ──────────────────────────────────────────────────────────
  const startEditing = () => {
    setForm({
      name_en: job.name_en || "",          name_ar: job.name_ar || "",
      tagline_en: job.tagline_en || "",    tagline_ar: job.tagline_ar || "",
      developer_en: job.developer_en || "",developer_ar: job.developer_ar || "",
      location_en: job.location_en || "",  location_ar: job.location_ar || "",
      price_range: job.price_range || "",  size_range: job.size_range || "",
      unit_types: job.unit_types || "",    ownership_type: job.ownership_type || "",
      type: job.type || "off-plan",        handover_date: job.handover_date || "",
      overview_en: job.overview_en || "",  overview_ar: job.overview_ar || "",
      highlights_en: job.highlights_en || "",highlights_ar: job.highlights_ar || "",
      investment_en: job.investment_en || "",investment_ar: job.investment_ar || "",
      enduser_text_en: job.enduser_text_en || "",enduser_text_ar: job.enduser_text_ar || "",
    });
    setEditing(true);
  };

  const saveEdits = async () => {
    await supabase
      .from("import_jobs")
      .update({ ...form, import_status: "reviewing" })
      .eq("id", job.id);
    setEditing(false);
    toast.success("Changes saved");
    onRefresh();
  };

  // ── Client-side media upload with compression ─────────────────────────────
  /**
   * Downloads an image from Dropbox via a temporary link, compresses it
   * client-side using the Canvas API, then uploads the result directly to
   * Supabase Storage. Returns the public URL.
   */
  const compressAndUpload = async (
    mediaItem: any,
    propertyId: string,
    idx: number
  ): Promise<{ url: string; compressedSize: number; skipped: boolean }> => {
    const isImage = mediaItem.media_type === "image";
    const isVideo = mediaItem.media_type === "video";

    // ── Videos: skip if over 30 MB ────────────────────────────────────────
    if (isVideo) {
      const origBytes = mediaItem.original_size_bytes || 0;
      if (origBytes > MAX_VIDEO_BYTES) {
        return { url: "", compressedSize: origBytes, skipped: true };
      }
    }

    // ── Step 1: get a temp Dropbox link ───────────────────────────────────
    const { link } = await callEdgeFunction("dropbox-proxy", {
      action: "get_preview_link",
      file_path: mediaItem.dropbox_path,
    });

    // ── Step 2: fetch the raw file in the browser ─────────────────────────
    const fetchRes = await fetch(link);
    if (!fetchRes.ok) throw new Error(`Failed to fetch ${mediaItem.original_filename}`);
    const rawBlob = await fetchRes.blob();

    let finalBlob: Blob;
    let compressedSize: number;
    let skipped = false;

    if (isImage) {
      // ── Step 3: compress to ≤ 600 KB with iterative Canvas encoding ────
      setFileProgress((prev) =>
        prev.map((f) =>
          f.filename === mediaItem.original_filename
            ? { ...f, phase: "compressing" }
            : f
        )
      );

      finalBlob = await compressImageToLimit(rawBlob, MAX_IMAGE_BYTES, ({ quality, size, pass }) => {
        setFileProgress((prev) =>
          prev.map((f) =>
            f.filename === mediaItem.original_filename
              ? { ...f, phase: "compressing", compressedSize: size }
              : f
          )
        );
      });
      compressedSize = finalBlob.size;
    } else {
      // Video — upload as-is
      finalBlob = rawBlob;
      compressedSize = rawBlob.size;
    }

    // ── Step 4: upload compressed blob to Supabase Storage ────────────────
    setFileProgress((prev) =>
      prev.map((f) =>
        f.filename === mediaItem.original_filename ? { ...f, phase: "uploading" } : f
      )
    );

    const ext    = isImage ? getExtensionFromBlob(finalBlob) : mediaItem.original_filename.split(".").pop() || "mp4";
    const safeFilename = mediaItem.original_filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath  = `${propertyId}/${String(idx).padStart(3, "0")}-${safeFilename.replace(/\.[^.]+$/, "")}.${ext}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("property-media")
      .upload(storagePath, finalBlob, {
        contentType: isImage ? (ext === "webp" ? "image/webp" : "image/jpeg") : "video/mp4",
        upsert: true,
      });

    if (uploadError) throw new Error(`Upload failed for ${mediaItem.original_filename}: ${uploadError.message}`);

    const { data: { publicUrl } } = supabase.storage
      .from("property-media")
      .getPublicUrl(storagePath);

    return { url: publicUrl, compressedSize, skipped };
  };

  // ── Main publish handler ──────────────────────────────────────────────────
  const handlePublish = async () => {
    if (editing) await saveEdits();
    setPublishing(true);
    setFileProgress([]);
    setOverallStep("Creating property record…");

    try {
      // ── 1. Create property in CMS ────────────────────────────────────────
      await supabase.from("import_jobs").update({ import_status: "uploading" }).eq("id", job.id);
      const { property_id } = await callEdgeFunction("publish-property", {
        job_id: job.id,
        action: "create_property",
      });
      toast.success("Property record created");

      // ── 2. Prepare media list ────────────────────────────────────────────
      const mediaToUpload = (media || []).filter(
        (m: any) => m.media_type === "image" || m.media_type === "video"
      );

      if (mediaToUpload.length === 0) {
        await supabase.from("import_jobs").update({ import_status: "completed" }).eq("id", job.id);
        await supabase.from("import_logs").insert({
          job_id: job.id,
          action: "publish_complete",
          details: "Property published with no media",
          level: "success",
        });
        toast.success("Property published successfully");
        onRefresh();
        return;
      }

      // ── 3. Initialise per-file progress ──────────────────────────────────
      setFileProgress(
        mediaToUpload.map((m: any) => ({
          filename: m.original_filename,
          phase: "waiting" as const,
          originalSize: m.original_size_bytes || 0,
        }))
      );

      setOverallStep(`Compressing & uploading ${mediaToUpload.length} file(s)…`);
      await supabase.from("import_jobs").update({ import_status: "processing_media" }).eq("id", job.id);

      let successCount = 0;
      let skippedCount = 0;

      // ── 4. Process one at a time (Canvas API is synchronous) ─────────────
      for (let i = 0; i < mediaToUpload.length; i++) {
        const item = mediaToUpload[i];

        try {
          const { url, compressedSize, skipped } = await compressAndUpload(item, property_id, i);

          if (skipped) {
            skippedCount++;
            setFileProgress((prev) =>
              prev.map((f) =>
                f.filename === item.original_filename
                  ? { ...f, phase: "skipped", error: "Over 40 MB — skipped" }
                  : f
              )
            );
            await supabase.from("import_logs").insert({
              job_id: job.id,
              action: "media_skipped",
              details: `"${item.original_filename}" skipped — exceeds 40 MB video limit`,
              level: "warning",
            });
            continue;
          }

          // Save original size before compression info
          const savedPct = item.original_size_bytes
            ? Math.round((1 - compressedSize / item.original_size_bytes) * 100)
            : 0;

          setFileProgress((prev) =>
            prev.map((f) =>
              f.filename === item.original_filename
                ? { ...f, phase: "done", compressedSize, savedPct }
                : f
            )
          );

          // Update import_media record
          await supabase.from("import_media").update({
            storage_url: url,
            compressed_size_bytes: compressedSize,
            compression_status: "done",
          }).eq("id", item.id);

          // Create CMS media record
          const mediaCategory = item.is_hero
            ? "hero"
            : item.media_type === "image"
              ? "render"
              : "video";

          await supabase.from("media").insert({
            property_id,
            type: mediaCategory,
            url,
            order_index: item.sort_order,
            file_size: compressedSize,
          });

          successCount++;
        } catch (fileErr: any) {
          setFileProgress((prev) =>
            prev.map((f) =>
              f.filename === item.original_filename
                ? { ...f, phase: "error", error: fileErr.message }
                : f
            )
          );
          await supabase.from("import_logs").insert({
            job_id: job.id,
            action: "media_error",
            details: `"${item.original_filename}": ${fileErr.message}`,
            level: "error",
          });
        }
      }

      // ── 5. Mark complete ─────────────────────────────────────────────────
      setOverallStep("");
      await supabase.from("import_jobs").update({ import_status: "completed" }).eq("id", job.id);
      await supabase.from("import_logs").insert({
        job_id: job.id,
        action: "publish_complete",
        details: `${successCount} files uploaded${skippedCount > 0 ? `, ${skippedCount} skipped` : ""}`,
        level: "success",
      });

      const totalSaved = fileProgress
        .filter((f) => f.phase === "done" && f.compressedSize && f.originalSize)
        .reduce((acc, f) => acc + (f.originalSize - (f.compressedSize || 0)), 0);

      toast.success(
        `Published! ${successCount} file${successCount !== 1 ? "s" : ""} uploaded` +
        (totalSaved > 0 ? ` · saved ${formatFileSize(totalSaved)}` : "")
      );
      onRefresh();
    } catch (e: any) {
      toast.error(e.message);
      await supabase.from("import_jobs").update({
        import_status: "error",
        error_log: e.message,
      }).eq("id", job.id);
      setOverallStep("");
    } finally {
      setPublishing(false);
    }
  };

  // ── Field editor helper ───────────────────────────────────────────────────
  const Field = ({
    label,
    field,
    multiline = false,
  }: {
    label: string;
    field: string;
    multiline?: boolean;
  }) => {
    const value   = form[field] || "";
    const isEmpty = !value;
    return (
      <div>
        <Label className="text-xs text-muted-foreground mb-1 block">
          {label}
          {isEmpty && <span className="ml-2 text-yellow-500 text-xs">⚠ Empty</span>}
        </Label>
        {multiline ? (
          <Textarea
            value={value}
            onChange={(e) => setForm((p) => ({ ...p, [field]: e.target.value }))}
            className={`text-sm ${isEmpty ? "border-yellow-500/50" : ""}`}
            rows={3}
          />
        ) : (
          <Input
            value={value}
            onChange={(e) => setForm((p) => ({ ...p, [field]: e.target.value }))}
            className={`text-sm h-8 ${isEmpty ? "border-yellow-500/50" : ""}`}
          />
        )}
      </div>
    );
  };

  const images = (media || []).filter((m: any) => m.media_type === "image");
  const videos = (media || []).filter((m: any) => m.media_type === "video");
  const pdfs   = (media || []).filter((m: any) => m.media_type === "brochure");

  // ── Compression progress overlay (shown while publishing) ────────────────
  const publishingProgressPanel = publishing && fileProgress.length > 0 && (
    <div className="border-t p-4 bg-muted/30 space-y-3">
      {overallStep && (
        <p className="text-xs font-medium text-muted-foreground">{overallStep}</p>
      )}

      {/* Overall progress bar */}
      <div>
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>
            {fileProgress.filter((f) => f.phase === "done" || f.phase === "skipped").length}
            {" / "}
            {fileProgress.length} files
          </span>
          <span>
            {Math.round(
              (fileProgress.filter((f) => f.phase === "done" || f.phase === "skipped" || f.phase === "error").length /
                fileProgress.length) *
                100
            )}
            %
          </span>
        </div>
        <Progress
          value={
            (fileProgress.filter((f) => ["done", "skipped", "error"].includes(f.phase)).length /
              fileProgress.length) *
            100
          }
          className="h-1.5"
        />
      </div>

      {/* Per-file rows */}
      <div className="space-y-1.5 max-h-48 overflow-y-auto">
        {fileProgress.map((f) => (
          <div key={f.filename} className="flex items-center gap-2 text-xs">
            {f.phase === "waiting" && (
              <span className="w-3 h-3 rounded-full border border-muted-foreground/30 flex-shrink-0" />
            )}
            {f.phase === "compressing" && (
              <Zap className="w-3 h-3 text-purple-500 flex-shrink-0 animate-pulse" />
            )}
            {f.phase === "uploading" && (
              <Loader2 className="w-3 h-3 text-orange-500 flex-shrink-0 animate-spin" />
            )}
            {f.phase === "done" && (
              <CheckCircle2 className="w-3 h-3 text-green-500 flex-shrink-0" />
            )}
            {f.phase === "skipped" && (
              <span className="w-3 h-3 text-yellow-500 flex-shrink-0 font-bold leading-3">–</span>
            )}
            {f.phase === "error" && (
              <AlertCircle className="w-3 h-3 text-red-500 flex-shrink-0" />
            )}

            <span className="flex-1 truncate text-muted-foreground">{f.filename}</span>

            {f.phase === "compressing" && f.compressedSize !== undefined && (
              <span className="text-muted-foreground">{formatFileSize(f.compressedSize)}</span>
            )}
            {f.phase === "done" && f.compressedSize !== undefined && (
              <span className="text-green-600 font-medium">
                {formatFileSize(f.compressedSize)}
                {f.savedPct !== undefined && f.savedPct > 0 && (
                  <span className="text-muted-foreground ml-1">−{f.savedPct}%</span>
                )}
              </span>
            )}
            {f.phase === "skipped" && (
              <span className="text-yellow-600">Skipped</span>
            )}
            {f.phase === "error" && (
              <span className="text-red-500 truncate max-w-[120px]">{f.error}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <Card
      className={`${
        job.import_status === "completed"
          ? "border-green-500/30"
          : isProcessing
          ? "border-blue-500/30"
          : ""
      }`}
    >
      <CardContent className="p-0">
        {/* ── Header row ────────────────────────────────────────────────── */}
        <div
          className="flex items-center gap-3 p-4 cursor-pointer"
          onClick={() => setExpanded((p) => !p)}
        >
          {isProcessing || publishing ? (
            <Loader2 className="w-5 h-5 text-blue-500 animate-spin flex-shrink-0" />
          ) : job.import_status === "completed" ? (
            <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
          ) : job.import_status === "error" ? (
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          ) : (
            <Sparkles className="w-5 h-5 text-muted-foreground flex-shrink-0" />
          )}

          <div className="flex-1 min-w-0">
            <div className="font-medium">{job.name_en || job.folder_name}</div>
            <div className="text-xs text-muted-foreground mt-0.5 flex gap-3">
              {job.pdf_count > 0   && <span>{job.pdf_count} PDF</span>}
              {job.image_count > 0 && <span>{job.image_count} images</span>}
              {job.video_count > 0 && <span>{job.video_count} videos</span>}
            </div>
          </div>

          <Badge variant="secondary" className={`text-xs ${cfg.color}`}>
            {cfg.label}
          </Badge>

          {!isProcessing &&
            !publishing &&
            job.import_status !== "completed" &&
            job.import_status !== "error" && (
              <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                {job.import_status === "pending" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleExtract}
                    disabled={extracting}
                  >
                    {extracting ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Sparkles className="w-3 h-3" />
                    )}
                    <span className="ml-1">Extract</span>
                  </Button>
                )}
                {job.import_status === "reviewing" && (
                  <>
                    <Button size="sm" variant="outline" onClick={startEditing}>
                      <Edit3 className="w-3 h-3" />
                      <span className="ml-1">Edit</span>
                    </Button>
                    <Button
                      size="sm"
                      onClick={handlePublish}
                      disabled={publishing}
                    >
                      {publishing ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Send className="w-3 h-3" />
                      )}
                      <span className="ml-1">Publish</span>
                    </Button>
                  </>
                )}
              </div>
            )}

          {job.import_status === "completed" && job.cms_url && (
            <Button
              size="sm"
              variant="outline"
              asChild
              onClick={(e) => e.stopPropagation()}
            >
              <Link to={job.cms_url} target="_blank">
                <Eye className="w-3 h-3 mr-1" />View
              </Link>
            </Button>
          )}

          {expanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </div>

        {/* ── Compression progress (while publishing) ────────────────────── */}
        {publishingProgressPanel}

        {/* ── Expanded tabs ─────────────────────────────────────────────── */}
        {expanded && (
          <div className="border-t">
            <Tabs defaultValue="data">
              <TabsList className="w-full rounded-none border-b bg-transparent h-10">
                <TabsTrigger value="data"  className="text-xs">Extracted Data</TabsTrigger>
                <TabsTrigger value="media" className="text-xs">
                  Media ({(media || []).length})
                </TabsTrigger>
                <TabsTrigger value="logs"  className="text-xs">Logs</TabsTrigger>
              </TabsList>

              {/* ── Data tab ───────────────────────────────────────────── */}
              <TabsContent value="data" className="p-4">
                {!job.name_en && job.import_status === "pending" ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Sparkles className="w-8 h-8 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Click "Extract" to run AI data extraction</p>
                  </div>
                ) : editing ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Field label="Property Name (EN)"           field="name_en" />
                      <Field label="Property Name (AR)"           field="name_ar" />
                      <Field label="Tagline (EN)"                 field="tagline_en" />
                      <Field label="Tagline (AR)"                 field="tagline_ar" />
                      <Field label="Developer (EN)"               field="developer_en" />
                      <Field label="Developer (AR)"               field="developer_ar" />
                      <Field label="Location (EN)"                field="location_en" />
                      <Field label="Location (AR)"                field="location_ar" />
                      <Field label="Price Range"                  field="price_range" />
                      <Field label="Size Range"                   field="size_range" />
                      <Field label="Unit Types (pipe-separated)"  field="unit_types" />
                      <Field label="Ownership Type"               field="ownership_type" />
                      <Field label="Type (off-plan/ready)"        field="type" />
                      <Field label="Handover Date (YYYY-MM-DD)"   field="handover_date" />
                    </div>
                    <Separator />
                    <div className="space-y-3">
                      <Field label="Overview (EN)"                      field="overview_en"     multiline />
                      <Field label="Overview (AR)"                      field="overview_ar"     multiline />
                      <Field label="Highlights (EN) — pipe-separated"   field="highlights_en"   multiline />
                      <Field label="Highlights (AR) — pipe-separated"   field="highlights_ar"   multiline />
                      <Field label="Investment Text (EN)"               field="investment_en"   multiline />
                      <Field label="Investment Text (AR)"               field="investment_ar"   multiline />
                      <Field label="End-User Text (EN)"                 field="enduser_text_en" multiline />
                      <Field label="End-User Text (AR)"                 field="enduser_text_ar" multiline />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button onClick={saveEdits}>Save Changes</Button>
                      <Button variant="outline" onClick={() => setEditing(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 text-sm">
                    {[
                      ["Name",          job.name_en],
                      ["Name (AR)",     job.name_ar],
                      ["Developer",     job.developer_en],
                      ["Location",      job.location_en],
                      ["Type",          job.type],
                      ["Price Range",   job.price_range],
                      ["Size Range",    job.size_range],
                      ["Unit Types",    job.unit_types],
                      ["Handover Date", job.handover_date],
                      ["Ownership",     job.ownership_type],
                    ].map(([label, value]) => (
                      <div key={label} className="flex gap-3">
                        <span className="text-muted-foreground w-32 flex-shrink-0">{label}</span>
                        <span className={value ? "" : "text-yellow-500 italic"}>
                          {value || "Not extracted"}
                        </span>
                      </div>
                    ))}
                    {job.overview_en && (
                      <div>
                        <div className="text-muted-foreground mb-1">Overview</div>
                        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-4">
                          {job.overview_en}
                        </p>
                      </div>
                    )}
                    {job.import_status === "reviewing" && (
                      <div className="flex gap-2 pt-2">
                        <Button size="sm" variant="outline" onClick={startEditing}>
                          <Edit3 className="w-3 h-3 mr-1" />Edit Data
                        </Button>
                        <Button
                          size="sm"
                          onClick={handlePublish}
                          disabled={publishing}
                        >
                          {publishing ? (
                            <Loader2 className="w-3 h-3 animate-spin mr-1" />
                          ) : (
                            <Send className="w-3 h-3 mr-1" />
                          )}
                          Publish to CMS
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>

              {/* ── Media tab ──────────────────────────────────────────── */}
              <TabsContent value="media" className="p-4">
                <div className="space-y-4">
                  {images.length > 0 && (
                    <div>
                      <h4 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                        <Image className="w-3 h-3" /> Images ({images.length})
                        <span className="ml-2 text-[10px] bg-purple-500/10 text-purple-600 px-1.5 py-0.5 rounded">
                          client-compressed → ≤600 KB
                        </span>
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {images.map((img: any) => {
                          const fp = fileProgress.find(
                            (f) => f.filename === img.original_filename
                          );
                          return (
                            <div
                              key={img.id}
                              className={`rounded-lg border p-2 text-xs ${
                                img.is_hero ? "border-primary" : ""
                              } ${fp?.phase === "done" ? "border-green-500/50 bg-green-500/5" : ""}`}
                            >
                              <div className="truncate font-medium">
                                {img.original_filename}
                              </div>
                              <div className="text-muted-foreground mt-0.5 flex items-center gap-1 flex-wrap">
                                <span>
                                  {img.original_size_bytes
                                    ? formatFileSize(img.original_size_bytes)
                                    : "—"}
                                </span>
                                {fp?.phase === "done" && fp.compressedSize !== undefined && (
                                  <>
                                    <span className="text-muted-foreground">→</span>
                                    <span className="text-green-600 font-medium">
                                      {formatFileSize(fp.compressedSize)}
                                    </span>
                                    {fp.savedPct !== undefined && fp.savedPct > 0 && (
                                      <span className="text-muted-foreground">−{fp.savedPct}%</span>
                                    )}
                                  </>
                                )}
                                {img.is_hero && (
                                  <Badge className="text-[10px] px-1 py-0">Hero</Badge>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {videos.length > 0 && (
                    <div>
                      <h4 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                        <Video className="w-3 h-3" /> Videos ({videos.length})
                      </h4>
                      {videos.map((vid: any) => (
                        <div
                          key={vid.id}
                          className="flex items-center gap-2 text-xs border rounded-lg p-2"
                        >
                          <Video className="w-3 h-3 text-muted-foreground" />
                          <span className="flex-1 truncate">{vid.original_filename}</span>
                          <span className="text-muted-foreground">
                            {vid.original_size_bytes
                              ? `${(vid.original_size_bytes / 1024 / 1024).toFixed(1)} MB`
                              : "—"}
                          </span>
                          {(vid.original_size_bytes || 0) > MAX_VIDEO_BYTES ? (
                            <Badge variant="secondary" className="text-[10px] bg-yellow-500/10 text-yellow-600">
                              Will skip — over 40 MB
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[10px] bg-green-500/10 text-green-600">
                              Will upload
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {pdfs.length > 0 && (
                    <div>
                      <h4 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                        <FileText className="w-3 h-3" /> Brochures ({pdfs.length})
                      </h4>
                      {pdfs.map((pdf: any) => (
                        <div
                          key={pdf.id}
                          className="flex items-center gap-2 text-xs border rounded-lg p-2"
                        >
                          <FileText className="w-3 h-3 text-muted-foreground" />
                          <span className="flex-1 truncate">{pdf.original_filename}</span>
                          <span className="text-muted-foreground">
                            {pdf.original_size_bytes
                              ? `${(pdf.original_size_bytes / 1024).toFixed(0)} KB`
                              : "—"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {!(media || []).length && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No media files detected
                    </p>
                  )}
                </div>
              </TabsContent>

              {/* ── Logs tab ───────────────────────────────────────────── */}
              <TabsContent value="logs" className="p-4">
                {!(logs || []).length ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No logs yet
                  </p>
                ) : (
                  <div className="space-y-2">
                    {(logs || []).map((log: any) => (
                      <div key={log.id} className="flex items-start gap-2 text-xs">
                        <span
                          className={`flex-shrink-0 w-2 h-2 rounded-full mt-1 ${
                            log.level === "success"
                              ? "bg-green-500"
                              : log.level === "error"
                              ? "bg-red-500"
                              : log.level === "warning"
                              ? "bg-yellow-500"
                              : "bg-blue-500"
                          }`}
                        />
                        <div>
                          <span className="font-medium">{log.action}</span>
                          {log.details && (
                            <span className="text-muted-foreground ml-2">
                              {log.details}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── ImporterQueue page ───────────────────────────────────────────────────────
export default function ImporterQueue() {
  const { data: jobs, refetch } = useQuery({
    queryKey: ["import-queue"],
    queryFn: async () => {
      const { data } = await supabase
        .from("import_jobs")
        .select("*")
        .order("created_at", { ascending: false });
      return data || [];
    },
    refetchInterval: 5000,
  });

  const pending   = (jobs || []).filter((j) => j.import_status === "pending");
  const reviewing = (jobs || []).filter((j) => j.import_status === "reviewing");
  const active    = (jobs || []).filter((j) =>
    ["extracting", "processing_media", "uploading"].includes(j.import_status || "")
  );
  const completed = (jobs || []).filter((j) => j.import_status === "completed");
  const errored   = (jobs || []).filter((j) => j.import_status === "error");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Processing Queue</h1>
          <p className="text-muted-foreground mt-1">
            Review AI-extracted data and publish to CMS
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4 mr-2" />Refresh
        </Button>
      </div>

      {active.length > 0 && (
        <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 px-4 py-3 flex items-center gap-3">
          <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
          <span className="text-sm">
            {active.length} propert{active.length === 1 ? "y" : "ies"} processing…
          </span>
        </div>
      )}

      {!(jobs || []).length && (
        <div className="text-center py-16 text-muted-foreground">
          <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p className="text-lg font-medium">Queue is empty</p>
          <p className="text-sm mt-1">Scan Dropbox and select properties to import</p>
          <Button className="mt-4" asChild>
            <Link to="/admin/importer/scan">Scan Dropbox</Link>
          </Button>
        </div>
      )}

      {reviewing.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-yellow-600 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-yellow-500" />
            Ready to Review ({reviewing.length})
          </h2>
          <div className="space-y-3">
            {reviewing.map((job) => (
              <JobCard key={job.id} job={job} onRefresh={() => refetch()} />
            ))}
          </div>
        </section>
      )}

      {pending.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-muted-foreground" />
            Pending Extraction ({pending.length})
          </h2>
          <div className="space-y-3">
            {pending.map((job) => (
              <JobCard key={job.id} job={job} onRefresh={() => refetch()} />
            ))}
          </div>
        </section>
      )}

      {active.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-blue-600 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            Processing ({active.length})
          </h2>
          <div className="space-y-3">
            {active.map((job) => (
              <JobCard key={job.id} job={job} onRefresh={() => refetch()} />
            ))}
          </div>
        </section>
      )}

      {errored.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-red-600 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            Errors ({errored.length})
          </h2>
          <div className="space-y-3">
            {errored.map((job) => (
              <JobCard key={job.id} job={job} onRefresh={() => refetch()} />
            ))}
          </div>
        </section>
      )}

      {completed.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-green-600 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            Completed ({completed.length})
          </h2>
          <div className="space-y-3">
            {completed.map((job) => (
              <JobCard key={job.id} job={job} onRefresh={() => refetch()} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
