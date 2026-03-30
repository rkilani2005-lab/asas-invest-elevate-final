import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePdfChunker } from "@/hooks/usePdfChunker";
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
  RotateCcw,
  ScanSearch,
  Trash2,
  Zap,
  Bell,
  X,
  FolderPlus,
} from "lucide-react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
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
  const navigate = useNavigate();
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

  // ── AI Extraction v2 — Claude chunked pipeline (fixes Gemini timeouts) ──────
  const { chunkPdfBlob } = usePdfChunker();

  // ── Helper: convert an image Blob to base64 for Claude Vision ───────────────
  // Uses window.FileReader (accessed via window. so Vite cannot rename it).
  // No canvas/Image APIs needed — Claude accepts raw JPEG/PNG/WEBP up to 20 MB.
  const resizeImageForClaude = useCallback((blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      // window.FileReader: property access on window prevents minifier renaming
      const reader = new (window as any).FileReader();
      reader.onloadend = () => {
        const result: string = reader.result;
        // result is "data:image/jpeg;base64,<b64data>" — strip the prefix
        const comma = result.indexOf(",");
        resolve(comma >= 0 ? result.slice(comma + 1) : result);
      };
      reader.onerror = () => reject(new Error("FileReader failed to read image blob"));
      reader.readAsDataURL(blob);
    });
  }, []);

  const handleExtract = useCallback(async () => {
    setExtracting(true);
    await supabase.from("import_jobs").update({ import_status: "extracting" }).eq("id", job.id);

    const addLog = async (action: string, details: string, level = "info") => {
      await supabase.from("import_logs").insert({ job_id: job.id, action, details, level });
    };

    // Cache Drive access token once at start — avoids 17+ redundant edge function calls
    let cachedDriveToken: string | null = null;
    const getDriveToken = async (): Promise<string> => {
      if (cachedDriveToken) return cachedDriveToken;
      const { access_token } = await callEdgeFunction("gdrive-oauth", {
        action: "get_download_link", file_id: "_warmup_",
      });
      cachedDriveToken = access_token;
      return access_token;
    };

    // Helper: download one file from Google Drive in the browser
    const downloadFromDrive = async (fileId: string, filename: string): Promise<Blob> => {
      const token = await getDriveToken();
      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error(`Failed to download "${filename}" (HTTP ${res.status})`);
      return res.blob();
    };

    try {
      // ── Step 1: Load all media items from DB ──────────────────────────────
      const { data: mediaItems } = await supabase
        .from("import_media").select("*").eq("job_id", job.id).order("sort_order");
      const allItems    = mediaItems || [];
      const pdfItems    = allItems.filter((m: any) => m.media_type === "brochure");
      const imageItems  = allItems.filter((m: any) => m.media_type === "image");
      const videoItems  = allItems.filter((m: any) => m.media_type === "video");

      await addLog("step", `1/9 — Found ${pdfItems.length} PDF(s), ${imageItems.length} image(s), ${videoItems.length} video(s)`);

      const CONCURRENCY = 3;
      const allBatches: Array<{
        pages: string[]; sourceFile: string; batchIndex: number;
        totalBatches: number; folderCategory: string;
      }> = [];

      // ── Step 2: Download + chunk PDFs ─────────────────────────────────────
      if (pdfItems.length > 0) {
        await addLog("step", "2/9 — Downloading & rendering PDFs");
        for (const item of pdfItems) {
          const blob = await downloadFromDrive(item.dropbox_path, item.original_filename);
          const batches = await chunkPdfBlob(blob, item.original_filename, "Brochure");
          allBatches.push(...batches);
          await addLog("info", `PDF "${item.original_filename}": ${batches.length} batch(es)`, "success");
        }
      } else {
        await addLog("warning", "No PDF brochures found — continuing with images only", "warning");
      }

      // ── Step 3: Download images + prepare vision batches ──────────────────
      // Prioritise: floor plans → exterior → interior → others (max 12 images total)
      const priorityOrder = (name: string, isHero: boolean): number => {
        const n = name.toLowerCase();
        if (n.includes("floor") || n.includes("plan") || n.includes("layout")) return 0;
        if (n.includes("exterior") || n.includes("facade") || isHero)           return 1;
        if (n.includes("amenity") || n.includes("pool") || n.includes("gym"))   return 2;
        if (n.includes("interior") || n.includes("living") || n.includes("bedroom")) return 3;
        return 4;
      };

      const sortedImages = [...imageItems].sort((a, b) =>
        priorityOrder(a.original_filename, a.is_hero) -
        priorityOrder(b.original_filename, b.is_hero)
      ).slice(0, 12); // cap at 12 images for extraction

      if (sortedImages.length > 0) {
        await addLog("step", `3/9 — Downloading ${sortedImages.length} image(s) for visual analysis`);

        const imageB64List: string[] = [];
        const imgToken = await getDriveToken();
        for (const item of sortedImages) {
          try {
            const imgRes = await fetch(
              `https://www.googleapis.com/drive/v3/files/${item.dropbox_path}?alt=media`,
              { headers: { Authorization: `Bearer ${imgToken}` } }
            );
            if (!imgRes.ok) {
              throw new Error(`Drive returned HTTP ${imgRes.status} for "${item.original_filename}"`);
            }
            const blob = await imgRes.blob();
            // Ensure blob has an image MIME type so FileReader works correctly
            const typedBlob = blob.type.startsWith("image/")
              ? blob
              : new Blob([await blob.arrayBuffer()], { type: "image/jpeg" });
            const b64 = await resizeImageForClaude(typedBlob);
            imageB64List.push(b64);
            await addLog("info", `Image ready: ${item.original_filename}`);
          } catch (imgErr: any) {
            await addLog("warning", `Skipped image "${item.original_filename}": ${imgErr.message}`, "warning");
          }
        }

        // Group images into batches of 4 for Claude
        const IMG_BATCH = 4;
        const imgTotalBatches = Math.ceil(imageB64List.length / IMG_BATCH);
        for (let i = 0; i < imageB64List.length; i += IMG_BATCH) {
          allBatches.push({
            pages:        imageB64List.slice(i, i + IMG_BATCH),
            sourceFile:   "property-images",
            batchIndex:   Math.floor(i / IMG_BATCH),
            totalBatches: imgTotalBatches,
            folderCategory: "Images",
          });
        }
        await addLog("info", `${imageB64List.length} image(s) ready in ${imgTotalBatches} batch(es)`, "success");
      }

      // ── Step 4: Collect video metadata ────────────────────────────────────
      const videoMeta = videoItems.map((v: any) => ({
        filename: v.original_filename,
        size_mb: v.original_size_bytes ? (v.original_size_bytes / 1048576).toFixed(1) : "unknown",
        file_id: v.dropbox_path,
      }));
      if (videoMeta.length > 0) {
        await addLog("step", `4/9 — Found ${videoMeta.length} video(s): ${videoItems.map((v: any) => v.original_filename).join(", ")}`);
      }

      if (!allBatches.length) {
        throw new Error("No PDFs or images could be processed. Check the Google Drive folder has files.");
      }

      // ── Step 5: Send all batches to extract-chunk (Claude Vision) ─────────
      await addLog("step", `5/9 — Sending ${allBatches.length} batch(es) to Claude Vision`);
      const partials: unknown[] = [];
      const batchErrors: string[] = [];

      for (let i = 0; i < allBatches.length; i += CONCURRENCY) {
        const group = allBatches.slice(i, i + CONCURRENCY);
        const results = await Promise.all(group.map(async (batch) => {
          let res: any;
          try {
            res = await callEdgeFunction("extract-chunk", {
              pages: batch.pages, sourceFile: batch.sourceFile,
              batchIndex: batch.batchIndex, totalBatches: batch.totalBatches,
              folderCategory: batch.folderCategory, hints: job.folder_name,
            });
          } catch (fetchErr: any) {
            const msg = fetchErr.message || String(fetchErr);
            console.error(`extract-chunk error (batch ${batch.batchIndex + 1}):`, msg);
            batchErrors.push(msg);
            await addLog("warning",
              `extract-chunk network error (is it deployed?): ${msg}`, "warning");
            return null;
          }
          if (!res?.ok) {
            const errMsg = res?.error ?? "unknown";
            console.error(`extract-chunk failed (batch ${batch.batchIndex + 1}):`, errMsg);
            batchErrors.push(errMsg);
            await addLog("warning", `Batch ${batch.batchIndex + 1}/${batch.totalBatches} of "${batch.sourceFile}" failed: ${errMsg}`, "warning");
            return null;
          }
          await addLog("info", `Batch ${batch.batchIndex + 1}/${batch.totalBatches} of "${batch.sourceFile}" ✓`, "success");
          return res.data;
        }));
        partials.push(...results.filter(Boolean));
      }

      if (!partials.length) {
        const firstErr = batchErrors[0] || "unknown error";
        throw new Error(`Claude could not extract data from any batch. First error: ${firstErr}`);
      }

      // ── Step 6: Merge all partials ────────────────────────────────────────
      await addLog("step", `6/9 — Merging ${partials.length} partial(s) with Claude`);
      const merged = await callEdgeFunction("merge-extract", {
        partials,
        folder_name: job.folder_name,
        hints: job.folder_name,
        video_files: videoMeta,
        image_count: imageItems.length,
        video_count: videoItems.length,
      });
      if (!merged?.ok) throw new Error(merged?.error ?? "Merge failed");
      const d = merged.data as Record<string, unknown>;

      // ── Step 7: Save text fields to import_jobs ───────────────────────────
      await addLog("step", "7/9 — Saving extracted text data");
      await supabase.from("import_jobs").update({
        import_status:   "reviewing",
        name_en:         d.name_en         || null,
        name_ar:         d.name_ar         || null,
        tagline_en:      d.tagline_en      || null,
        tagline_ar:      d.tagline_ar      || null,
        developer_en:    d.developer_en    || null,
        developer_ar:    d.developer_ar    || null,
        location_en:     d.location_en     || null,
        location_ar:     d.location_ar     || null,
        price_range:     d.price_range     || null,
        size_range:      d.size_range      || null,
        unit_types:      d.unit_types      || null,
        ownership_type:  d.ownership_type  || null,
        type:            (d.type as string) || "off-plan",
        handover_date:   d.handover_date   || null,
        overview_en:     d.overview_en     || null,
        overview_ar:     d.overview_ar     || null,
        highlights_en:   d.highlights_en   || null,
        highlights_ar:   d.highlights_ar   || null,
        investment_en:   d.investment_en   || null,
        investment_ar:   d.investment_ar   || null,
        enduser_text_en: d.enduser_text_en || null,
        enduser_text_ar: d.enduser_text_ar || null,
      }).eq("id", job.id);

      // ── Step 8: Save amenities + payment plan ─────────────────────────────
      await addLog("step", "8/9 — Saving amenities and payment plan");
      if (Array.isArray(d.amenities) && d.amenities.length) {
        await (supabase.from("property_amenities") as any).delete().eq("job_id", job.id);
        await (supabase.from("property_amenities") as any).insert(
          d.amenities.map((a: string, i: number) => ({ job_id: job.id, name_en: a, sort_order: i }))
        );
      }
      if (Array.isArray(d.payment_plan) && d.payment_plan.length) {
        await (supabase.from("payment_plan_milestones") as any).delete().eq("job_id", job.id);
        await (supabase.from("payment_plan_milestones") as any).insert(
          (d.payment_plan as any[]).map((p) => ({
            job_id: job.id, milestone_en: p.milestone_en,
            percentage: p.percentage, sort_order: p.sort_order,
          }))
        );
      }

      // ── Step 9: Update media sort order based on category priority ─────────
      await addLog("step", "9/9 — Updating media category order");
      // Mark floor plan images for the publish step
      for (const item of imageItems) {
        const fn = item.original_filename.toLowerCase();
        let detectedCategory = "image";
        if (fn.includes("floor") || fn.includes("plan") || fn.includes("layout")) detectedCategory = "floorplan";
        else if (item.is_hero || item.sort_order === 0) detectedCategory = "hero";
        else if (fn.includes("exterior") || fn.includes("facade")) detectedCategory = "exterior";
        else if (fn.includes("interior") || fn.includes("living") || fn.includes("bedroom")) detectedCategory = "interior";
        else if (fn.includes("pool") || fn.includes("gym") || fn.includes("amenity")) detectedCategory = "amenity";
        // Store detected category in media_type field for publish step to use
        await supabase.from("import_media").update({ media_type: detectedCategory }).eq("id", item.id);
      }

      // ── Step 9b: Upload images & videos to Supabase Storage ─────────────
      // This makes media immediately available for preview and speeds up publish.
      const uploadableMedia = [...imageItems, ...videoItems].filter(
        (m: any) => !m.storage_url || m.compression_status !== "done"
      );
      if (uploadableMedia.length > 0) {
        await addLog("step", `9/9 — Uploading ${uploadableMedia.length} media file(s) to storage`);
        const imageIdSet = new Set(imageItems.map((m: any) => m.id));
        let uploadedCount = 0, skippedCount = 0;

        for (let idx = 0; idx < uploadableMedia.length; idx++) {
          const item = uploadableMedia[idx];
          const isImg = imageIdSet.has(item.id);
          try {
            // Get a short-lived Drive access token
            const { access_token: dlToken } = await callEdgeFunction("gdrive-oauth", {
              action: "get_download_link", file_id: item.dropbox_path,
            });
            // Download from Drive
            const driveRes = await fetch(
              `https://www.googleapis.com/drive/v3/files/${item.dropbox_path}?alt=media`,
              { headers: { Authorization: `Bearer ${dlToken}` } }
            );
            if (!driveRes.ok) throw new Error(`Drive HTTP ${driveRes.status} for "${item.original_filename}"`);
            const rawBlob = await driveRes.blob();
            // Ensure MIME type is set so createImageBitmap works (Drive may return application/octet-stream)
            const typedBlob = rawBlob.type.startsWith("image/")
              ? rawBlob
              : new Blob([await rawBlob.arrayBuffer()], { type: "image/jpeg" });

            let finalBlob: Blob;
            if (isImg) {
              // Compress image to ≤ 600 KB using the Canvas pipeline
              finalBlob = await compressImageToLimit(typedBlob, MAX_IMAGE_BYTES, () => {});
            } else {
              // Video: skip if over 40 MB
              if (rawBlob.size > MAX_VIDEO_BYTES) {
                await addLog("warning", `Video "${item.original_filename}" exceeds 40 MB — skipped`, "warning");
                skippedCount++;
                continue;
              }
              finalBlob = rawBlob;
            }

            // Build storage path under jobs/ prefix
            const ext = isImg
              ? getExtensionFromBlob(finalBlob)
              : item.original_filename.split(".").pop() || "mp4";
            const safeName = item.original_filename.replace(/[^a-zA-Z0-9._-]/g, "_");
            const storagePath = `jobs/${job.id}/${String(idx).padStart(3, "0")}-${safeName.replace(/\.[^.]+$/, "")}.${ext}`;

            const { error: upErr } = await supabase.storage
              .from("property-media")
              .upload(storagePath, finalBlob, {
                contentType: isImg ? (ext === "webp" ? "image/webp" : "image/jpeg") : "video/mp4",
                upsert: true,
              });
            if (upErr) throw new Error(upErr.message);

            const { data: { publicUrl } } = supabase.storage
              .from("property-media")
              .getPublicUrl(storagePath);

            // Persist the URL so publish can skip the re-download
            await supabase.from("import_media").update({
              storage_url: publicUrl,
              compressed_size_bytes: finalBlob.size,
              compression_status: "done",
            }).eq("id", item.id);

            uploadedCount++;
            await addLog("info",
              `✓ ${item.original_filename} → ${(finalBlob.size / 1024).toFixed(0)} KB`, "success");

          } catch (upErr: any) {
            await addLog("warning",
              `Could not upload "${item.original_filename}": ${upErr.message}`, "warning");
          }
        }
        await addLog("info",
          `Media upload complete: ${uploadedCount} uploaded, ${skippedCount} skipped`, "success");
      }

      await addLog("extract_complete",
        `✓ "${d.name_en || job.folder_name}" — ${pdfItems.length} PDF(s), ${imageItems.length} image(s), ${videoItems.length} video(s) imported`,
        "success"
      );
      toast.success(`Extraction complete — ${imageItems.length} images & ${videoItems.length} videos imported to storage`);
      onRefresh();

    } catch (e: any) {
      await addLog("extract_error", e.message, "error");
      await supabase.from("import_jobs")
        .update({ import_status: "error", error_log: e.message }).eq("id", job.id);
      toast.error(e.message);
    } finally {
      setExtracting(false);
    }
  }, [job, chunkPdfBlob, resizeImageForClaude, onRefresh]);

  const handleResetStuck = async () => {
    await supabase
      .from("import_jobs")
      .update({ import_status: "pending" })
      .eq("id", job.id);
    toast.info("Job reset to pending");
    onRefresh();
  };

  // ── Redo Extraction: clear extracted data + logs, reset to pending, re-run ──
  const handleRedoExtraction = async () => {
    if (!window.confirm(`Re-run AI extraction for "${job.folder_name}"? This will clear all previously extracted data.`)) return;
    setExtracting(true);

    // 1. Wipe extracted text fields + reset status
    await supabase.from("import_jobs").update({
      import_status:   "pending",
      name_en: null,         name_ar: null,
      tagline_en: null,      tagline_ar: null,
      developer_en: null,    developer_ar: null,
      location_en: null,     location_ar: null,
      price_range: null,     size_range: null,
      unit_types: null,      ownership_type: null,
      handover_date: null,
      overview_en: null,     overview_ar: null,
      highlights_en: null,   highlights_ar: null,
      investment_en: null,   investment_ar: null,
      enduser_text_en: null, enduser_text_ar: null,
      error_log: null,
    }).eq("id", job.id);

    // 2. Clear old logs so the stepper starts fresh
    await supabase.from("import_logs").delete().eq("job_id", job.id);

    // 3. Reset media upload state so files are re-processed
    await supabase.from("import_media").update({
      storage_url: null,
      compressed_size_bytes: null,
      compression_status: "pending",
    }).eq("job_id", job.id);

    toast.info("Cleared — restarting extraction…");
    onRefresh();

    // 4. Wait a tick so the DB update propagates, then re-run extraction
    setTimeout(() => handleExtract(), 300);
  };

  // ── Redo Scan: delete this job + its media, go back to scan to re-select ────
  const handleRedoScan = async () => {
    if (!window.confirm(`Delete this job and re-scan the Drive folder for "${job.folder_name}"? All extracted data will be lost.`)) return;

    await supabase.from("import_logs").delete().eq("job_id", job.id);
    await supabase.from("import_media").delete().eq("job_id", job.id);
    await supabase.from("import_jobs").delete().eq("id", job.id);

    toast.success("Job deleted — you can re-scan and re-select this folder");
    onRefresh();
    navigate("/admin/importer/scan");
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
   * Downloads a file from Google Drive (via access token), compresses images
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

    // ── Videos: skip if over 40 MB ────────────────────────────────────────
    if (isVideo) {
      const origBytes = mediaItem.original_size_bytes || 0;
      if (origBytes > MAX_VIDEO_BYTES) {
        return { url: "", compressedSize: origBytes, skipped: true };
      }
    }

    // ── Step 1: get Google Drive access token ─────────────────────────────
    // dropbox_path field stores the Google Drive file ID
    const fileId = mediaItem.dropbox_path;
    const { access_token } = await callEdgeFunction("gdrive-oauth", {
      action: "get_download_link",
      file_id: fileId,
    });

    // ── Step 2: fetch the raw file from Google Drive in the browser ───────
    const driveUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
    const fetchRes = await fetch(driveUrl, {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    if (!fetchRes.ok) throw new Error(`Failed to fetch ${mediaItem.original_filename} from Google Drive (${fetchRes.status})`);
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

      // Ensure MIME type for compressImageToLimit (Drive may return application/octet-stream)
      const typedForCompress = rawBlob.type.startsWith("image/")
        ? rawBlob
        : new Blob([await rawBlob.arrayBuffer()], { type: "image/jpeg" });
      finalBlob = await compressImageToLimit(typedForCompress, MAX_IMAGE_BYTES, ({ quality, size, pass }) => {
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
      // Include images (all detected categories), videos, and brochures for upload
      const UPLOADABLE_TYPES = ["image","hero","exterior","interior","floorplan","amenity","render","view","video","brochure"];
      const mediaToUpload = (media || []).filter(
        (m: any) => UPLOADABLE_TYPES.includes(m.media_type)
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
          // ── Fast-path: already uploaded during extraction ─────────────────
          if (item.storage_url && item.compression_status === "done") {
            const url = item.storage_url;
            const compressedSize = item.compressed_size_bytes || item.original_size_bytes || 0;
            const savedPct = item.original_size_bytes
              ? Math.round((1 - compressedSize / item.original_size_bytes) * 100) : 0;

            setFileProgress((prev) =>
              prev.map((f) =>
                f.filename === item.original_filename
                  ? { ...f, phase: "done", compressedSize, savedPct }
                  : f
              )
            );

            const KNOWN_CATS = ["video","hero","exterior","interior","floorplan","amenity","view","render","brochure"];
            const cat = KNOWN_CATS.includes(item.media_type) ? item.media_type
              : item.is_hero ? "hero" : "render";

            await (supabase.from("media") as any).insert({
              property_id, type: cat, url,
              order_index: item.sort_order, file_size: compressedSize,
            });

            successCount++;
            continue;   // ← skip the full download/compress/upload below
          }

          // ── Normal path: not yet in storage — download, compress, upload ──
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

          // Create CMS media record with smart category detection
          const filename = item.original_filename.toLowerCase();
          // Use category set by extraction step (stored in media_type), fall back to filename detection
          let mediaCategory: string;
          const KNOWN_CATS = ["video","hero","exterior","interior","floorplan","amenity","view","render","brochure"];
          if (KNOWN_CATS.includes(item.media_type)) {
            mediaCategory = item.media_type;
          } else if (item.is_hero || item.sort_order === 0) {
            mediaCategory = "hero";
          } else if (filename.includes("floor") || filename.includes("plan") || filename.includes("layout")) {
            mediaCategory = "floorplan";
          } else if (filename.includes("exterior") || filename.includes("facade") || filename.includes("building")) {
            mediaCategory = "exterior";
          } else if (filename.includes("interior") || filename.includes("living") || filename.includes("bedroom")) {
            mediaCategory = "interior";
          } else if (filename.includes("pool") || filename.includes("gym") || filename.includes("amenity")) {
            mediaCategory = "amenity";
          } else if (filename.includes("view") || filename.includes("aerial") || filename.includes("panorama")) {
            mediaCategory = "view";
          } else if (filename.includes(".pdf")) {
            mediaCategory = "brochure";
          } else {
            mediaCategory = "render";
          }

          await (supabase.from("media") as any).insert({
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

  const imageMedia = (media || []).filter((m: any) => m.media_type === "image");
  const videos = (media || []).filter((m: any) => m.media_type === "video");
  const pdfs   = (media || []).filter((m: any) => m.media_type === "brochure");

  // ── Extraction step stepper ─────────────────────────────────────────────
  const EXTRACTION_STEPS = [
    { key: "1/9", label: "Scanning files" },
    { key: "2/9", label: "Downloading PDFs" },
    { key: "3/9", label: "Loading images" },
    { key: "4/9", label: "Videos found" },
    { key: "5/9", label: "Claude Vision" },
    { key: "6/9", label: "Merging data" },
    { key: "7/9", label: "Saving fields" },
    { key: "8/9", label: "Amenities" },
    { key: "9/9", label: "Uploading media" },
  ];

  // Find the LAST step log (most recent progress)
  const stepLogs = (logs || []).filter((l: any) => l.action === "step");
  const currentStepLog = stepLogs[0] ?? null; // logs ordered desc so [0] is newest
  const currentStepKey = currentStepLog ? (currentStepLog as any).details?.split(" —")[0].trim() : null;
  const currentStepIdx = currentStepKey
    ? EXTRACTION_STEPS.findIndex((s) => s.key === currentStepKey)
    : -1;

  const extractionStepper = (extracting || job.import_status === "extracting") && (
    <div className="border-t px-4 py-3 bg-blue-500/5 space-y-2">
      <div className="flex items-center gap-2 text-xs font-medium text-blue-600">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        <span>
          {currentStepLog
            ? (currentStepLog as any).details
            : "Starting extraction…"}
        </span>
      </div>
      <div className="flex gap-1">
        {EXTRACTION_STEPS.map((step, i) => (
          <div key={step.key} className="flex-1 flex flex-col items-center gap-1">
            <div
              className={`h-1.5 w-full rounded-full transition-all ${
                i < currentStepIdx
                  ? "bg-green-500"
                  : i === currentStepIdx
                  ? "bg-blue-500 animate-pulse"
                  : "bg-muted"
              }`}
            />
            <span
              className={`text-[10px] leading-tight text-center ${
                i <= currentStepIdx
                  ? "text-foreground font-medium"
                  : "text-muted-foreground"
              }`}
            >
              {step.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );

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
          : job.import_status === "error"
          ? "border-red-400/40"
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

          {!isProcessing && !publishing && (
              <div className="flex gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>

                {/* ── Pending: run extraction ─────────────────────────── */}
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

                {/* ── Reviewing: edit · redo extraction · publish ────── */}
                {job.import_status === "reviewing" && (
                  <>
                    <Button size="sm" variant="outline" onClick={startEditing}>
                      <Edit3 className="w-3 h-3" />
                      <span className="ml-1">Edit</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleRedoExtraction}
                      disabled={extracting}
                      className="text-amber-600 border-amber-300 hover:bg-amber-50"
                      title="Clear extracted data and re-run AI extraction"
                    >
                      {extracting ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <RotateCcw className="w-3 h-3" />
                      )}
                      <span className="ml-1">Redo</span>
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

                {/* ── Error: redo extraction · redo scan ─────────────── */}
                {job.import_status === "error" && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleRedoExtraction}
                      disabled={extracting}
                      className="text-amber-600 border-amber-300 hover:bg-amber-50"
                    >
                      {extracting ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <RotateCcw className="w-3 h-3" />
                      )}
                      <span className="ml-1">Redo Extraction</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleRedoScan}
                      className="text-blue-600 border-blue-300 hover:bg-blue-50"
                    >
                      <ScanSearch className="w-3 h-3" />
                      <span className="ml-1">Redo Scan</span>
                    </Button>
                  </>
                )}

                {/* ── Completed: view ─────────────────────────────────── */}
                {job.import_status === "completed" && job.cms_url && (
                  <Button
                    size="sm"
                    variant="outline"
                    asChild
                  >
                    <Link to={job.cms_url} target="_blank">
                      <Eye className="w-3 h-3 mr-1" />View
                    </Link>
                  </Button>
                )}
              </div>
            )}

          {/* Allow resetting stuck jobs (extracting/processing_media/uploading) */}
          {isProcessing && !publishing && (
            <Button
              size="sm"
              variant="ghost"
              className="text-muted-foreground hover:text-foreground"
              onClick={(e) => { e.stopPropagation(); handleResetStuck(); }}
              title="Reset stuck job to pending"
            >
              <RefreshCw className="w-3 h-3" />
            </Button>
          )}



          {expanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </div>

        {/* ── Extraction step stepper (while extracting) ──────────────── */}
        {extractionStepper}

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
                      <div className="flex gap-2 pt-2 flex-wrap">
                        <Button size="sm" variant="outline" onClick={startEditing}>
                          <Edit3 className="w-3 h-3 mr-1" />Edit Data
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleRedoExtraction}
                          disabled={extracting}
                          className="text-amber-600 border-amber-300 hover:bg-amber-50"
                        >
                          {extracting ? (
                            <Loader2 className="w-3 h-3 animate-spin mr-1" />
                          ) : (
                            <RotateCcw className="w-3 h-3 mr-1" />
                          )}
                          Redo Extraction
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
                  {imageMedia.length > 0 && (
                    <div>
                      <h4 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                        <Image className="w-3 h-3" /> Images ({imageMedia.length})
                        <span className="ml-2 text-[10px] bg-purple-500/10 text-purple-600 px-1.5 py-0.5 rounded">
                          client-compressed → ≤600 KB
                        </span>
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {imageMedia.map((img: any) => {
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
  const queryClient = useQueryClient();
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

  // ── New-jobs notification state ───────────────────────────────────────────
  const [newJobs, setNewJobs] = useState<{ id: string; folder_name: string }[]>([]);
  const [bannerVisible, setBannerVisible] = useState(false);
  // Track IDs already known so we only alert on truly new inserts
  const knownIds = useRef<Set<string>>(new Set());

  // Seed known IDs once the initial query resolves
  useEffect(() => {
    if (jobs) {
      jobs.forEach((j) => knownIds.current.add(j.id));
    }
  }, [jobs === null]); // only on first load (null → array)

  // ── Realtime subscription on import_jobs INSERT ───────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel("import-jobs-inserts")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "import_jobs" },
        (payload) => {
          const row = payload.new as { id: string; folder_name: string; import_status: string };
          // Skip if we already knew about this job (e.g. created by this session)
          if (knownIds.current.has(row.id)) return;
          knownIds.current.add(row.id);

          setNewJobs((prev) => {
            const updated = [...prev, { id: row.id, folder_name: row.folder_name }];
            setBannerVisible(true);
            return updated;
          });

          // Refresh the query so the job appears in the list
          queryClient.invalidateQueries({ queryKey: ["import-queue"] });

          toast(`New folder queued: ${row.folder_name}`, {
            icon: <FolderPlus className="w-4 h-4 text-primary" />,
            description: "Auto-detected via Dropbox webhook / auto-scan",
            duration: 6000,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const dismissBanner = () => {
    setBannerVisible(false);
    setNewJobs([]);
  };

  const handleRefreshAndDismiss = () => {
    refetch();
    dismissBanner();
  };

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

      {/* ── Realtime new-jobs banner ── */}
      {bannerVisible && newJobs.length > 0 && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 flex items-start gap-3 animate-in slide-in-from-top-2 duration-300">
          <Bell className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">
              {newJobs.length} new folder{newJobs.length !== 1 ? "s" : ""} auto-queued
            </p>
            <ul className="mt-1 space-y-0.5">
              {newJobs.map((j) => (
                <li key={j.id} className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <FolderPlus className="w-3 h-3 flex-shrink-0" />
                  {j.folder_name}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleRefreshAndDismiss}>
              <RefreshCw className="w-3 h-3 mr-1" />View
            </Button>
            <button
              onClick={dismissBanner}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

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
