import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "lucide-react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";

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

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: "Pending", color: "bg-muted text-muted-foreground" },
  extracting: { label: "Extracting with AI…", color: "bg-blue-500/10 text-blue-600" },
  reviewing: { label: "Ready to Review", color: "bg-yellow-500/10 text-yellow-600" },
  processing_media: { label: "Processing Media", color: "bg-purple-500/10 text-purple-600" },
  uploading: { label: "Uploading…", color: "bg-orange-500/10 text-orange-600" },
  completed: { label: "Completed", color: "bg-green-500/10 text-green-600" },
  error: { label: "Error", color: "bg-red-500/10 text-red-600" },
};

function JobCard({ job, onRefresh }: { job: any; onRefresh: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({});
  const [publishing, setPublishing] = useState(false);
  const [extracting, setExtracting] = useState(false);

  const { data: media } = useQuery({
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
    refetchInterval: job.import_status !== "completed" && job.import_status !== "error" ? 3000 : false,
  });

  const cfg = statusConfig[job.import_status || "pending"] || statusConfig.pending;
  const isProcessing = ["extracting", "processing_media", "uploading"].includes(job.import_status || "");

  const handleExtract = async () => {
    setExtracting(true);
    try {
      const pdfMedia = (media || []).filter((m) => m.media_type === "brochure");
      await callEdgeFunction("extract-property", {
        job_id: job.id,
        folder_name: job.folder_name,
        pdf_files: pdfMedia.map((m) => ({ path_lower: m.dropbox_path, name: m.original_filename, size: m.original_size_bytes })),
      });
      toast.success("AI extraction complete");
      onRefresh();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setExtracting(false);
    }
  };

  const startEditing = () => {
    setForm({
      name_en: job.name_en || "",
      name_ar: job.name_ar || "",
      tagline_en: job.tagline_en || "",
      tagline_ar: job.tagline_ar || "",
      developer_en: job.developer_en || "",
      developer_ar: job.developer_ar || "",
      location_en: job.location_en || "",
      location_ar: job.location_ar || "",
      price_range: job.price_range || "",
      size_range: job.size_range || "",
      unit_types: job.unit_types || "",
      ownership_type: job.ownership_type || "",
      type: job.type || "off-plan",
      handover_date: job.handover_date || "",
      overview_en: job.overview_en || "",
      overview_ar: job.overview_ar || "",
      highlights_en: job.highlights_en || "",
      highlights_ar: job.highlights_ar || "",
      investment_en: job.investment_en || "",
      investment_ar: job.investment_ar || "",
      enduser_text_en: job.enduser_text_en || "",
      enduser_text_ar: job.enduser_text_ar || "",
    });
    setEditing(true);
  };

  const saveEdits = async () => {
    await supabase.from("import_jobs").update({ ...form, import_status: "reviewing" }).eq("id", job.id);
    setEditing(false);
    toast.success("Changes saved");
    onRefresh();
  };

  const handlePublish = async () => {
    if (editing) await saveEdits();
    setPublishing(true);
    try {
      // Step 1: Create property
      const { property_id } = await callEdgeFunction("publish-property", {
        job_id: job.id,
        action: "create_property",
      });

      toast.success("Property created in CMS");

      // Step 2: Upload media
      const imageMedia = (media || []).filter((m) => m.media_type === "image" || m.media_type === "video");
      if (imageMedia.length > 0) {
        await callEdgeFunction("publish-property", {
          job_id: job.id,
          action: "upload_media",
          property_id,
          media_items: imageMedia.map((m) => ({
            import_media_id: m.id,
            dropbox_path: m.dropbox_path,
            filename: m.original_filename,
            type: m.media_type,
            sort_order: m.sort_order,
            is_hero: m.is_hero,
          })),
        });
        toast.success("Media uploaded to CMS");
      }

      onRefresh();
    } catch (e: any) {
      toast.error(e.message);
      await supabase.from("import_jobs").update({ import_status: "error", error_log: e.message }).eq("id", job.id);
    } finally {
      setPublishing(false);
    }
  };

  const Field = ({ label, field, multiline = false }: { label: string; field: string; multiline?: boolean }) => {
    const value = form[field] || "";
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

  const images = (media || []).filter((m) => m.media_type === "image");
  const videos = (media || []).filter((m) => m.media_type === "video");
  const pdfs = (media || []).filter((m) => m.media_type === "brochure");

  return (
    <Card className={`${job.import_status === "completed" ? "border-green-500/30" : isProcessing ? "border-blue-500/30" : ""}`}>
      <CardContent className="p-0">
        {/* Header */}
        <div
          className="flex items-center gap-3 p-4 cursor-pointer"
          onClick={() => setExpanded((p) => !p)}
        >
          {isProcessing ? (
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
              {job.pdf_count > 0 && <span>{job.pdf_count} PDF</span>}
              {job.image_count > 0 && <span>{job.image_count} images</span>}
              {job.video_count > 0 && <span>{job.video_count} videos</span>}
            </div>
          </div>

          <Badge variant="secondary" className={`text-xs ${cfg.color}`}>{cfg.label}</Badge>

          {!isProcessing && job.import_status !== "completed" && job.import_status !== "error" && (
            <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
              {job.import_status === "pending" && (
                <Button size="sm" variant="outline" onClick={handleExtract} disabled={extracting}>
                  {extracting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                  <span className="ml-1">Extract</span>
                </Button>
              )}
              {(job.import_status === "reviewing") && (
                <>
                  <Button size="sm" variant="outline" onClick={startEditing}>
                    <Edit3 className="w-3 h-3" />
                    <span className="ml-1">Edit</span>
                  </Button>
                  <Button size="sm" onClick={handlePublish} disabled={publishing}>
                    {publishing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                    <span className="ml-1">Publish</span>
                  </Button>
                </>
              )}
            </div>
          )}

          {job.import_status === "completed" && job.cms_url && (
            <Button size="sm" variant="outline" asChild onClick={(e) => e.stopPropagation()}>
              <Link to={job.cms_url} target="_blank"><Eye className="w-3 h-3 mr-1" />View</Link>
            </Button>
          )}

          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>

        {/* Expanded content */}
        {expanded && (
          <div className="border-t">
            <Tabs defaultValue="data">
              <TabsList className="w-full rounded-none border-b bg-transparent h-10">
                <TabsTrigger value="data" className="text-xs">Extracted Data</TabsTrigger>
                <TabsTrigger value="media" className="text-xs">Media ({(media || []).length})</TabsTrigger>
                <TabsTrigger value="logs" className="text-xs">Logs</TabsTrigger>
              </TabsList>

              <TabsContent value="data" className="p-4">
                {!job.name_en && job.import_status === "pending" ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Sparkles className="w-8 h-8 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Click "Extract" to run AI data extraction</p>
                  </div>
                ) : editing ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Field label="Property Name (EN)" field="name_en" />
                      <Field label="Property Name (AR)" field="name_ar" />
                      <Field label="Tagline (EN)" field="tagline_en" />
                      <Field label="Tagline (AR)" field="tagline_ar" />
                      <Field label="Developer (EN)" field="developer_en" />
                      <Field label="Developer (AR)" field="developer_ar" />
                      <Field label="Location (EN)" field="location_en" />
                      <Field label="Location (AR)" field="location_ar" />
                      <Field label="Price Range" field="price_range" />
                      <Field label="Size Range" field="size_range" />
                      <Field label="Unit Types (pipe-separated)" field="unit_types" />
                      <Field label="Ownership Type" field="ownership_type" />
                      <Field label="Type (off-plan/ready)" field="type" />
                      <Field label="Handover Date (YYYY-MM-DD)" field="handover_date" />
                    </div>
                    <Separator />
                    <div className="space-y-3">
                      <Field label="Overview (EN)" field="overview_en" multiline />
                      <Field label="Overview (AR)" field="overview_ar" multiline />
                      <Field label="Highlights (EN) — pipe-separated" field="highlights_en" multiline />
                      <Field label="Highlights (AR) — pipe-separated" field="highlights_ar" multiline />
                      <Field label="Investment Text (EN)" field="investment_en" multiline />
                      <Field label="Investment Text (AR)" field="investment_ar" multiline />
                      <Field label="End-User Text (EN)" field="enduser_text_en" multiline />
                      <Field label="End-User Text (AR)" field="enduser_text_ar" multiline />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button onClick={saveEdits}>Save Changes</Button>
                      <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 text-sm">
                    {[
                      ["Name", job.name_en],
                      ["Name (AR)", job.name_ar],
                      ["Developer", job.developer_en],
                      ["Location", job.location_en],
                      ["Type", job.type],
                      ["Price Range", job.price_range],
                      ["Size Range", job.size_range],
                      ["Unit Types", job.unit_types],
                      ["Handover Date", job.handover_date],
                      ["Ownership", job.ownership_type],
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
                        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-4">{job.overview_en}</p>
                      </div>
                    )}
                    {job.import_status === "reviewing" && (
                      <div className="flex gap-2 pt-2">
                        <Button size="sm" variant="outline" onClick={startEditing}>
                          <Edit3 className="w-3 h-3 mr-1" />Edit Data
                        </Button>
                        <Button size="sm" onClick={handlePublish} disabled={publishing}>
                          {publishing ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Send className="w-3 h-3 mr-1" />}
                          Publish to CMS
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="media" className="p-4">
                <div className="space-y-4">
                  {images.length > 0 && (
                    <div>
                      <h4 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                        <Image className="w-3 h-3" /> Images ({images.length})
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {images.map((img) => (
                          <div key={img.id} className={`rounded-lg border p-2 text-xs ${img.is_hero ? "border-primary" : ""}`}>
                            <div className="truncate font-medium">{img.original_filename}</div>
                            <div className="text-muted-foreground mt-0.5">
                              {img.original_size_bytes ? `${(img.original_size_bytes / 1024).toFixed(0)} KB` : "—"}
                              {img.is_hero && <Badge className="ml-1 text-[10px] px-1 py-0">Hero</Badge>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {videos.length > 0 && (
                    <div>
                      <h4 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                        <Video className="w-3 h-3" /> Videos ({videos.length})
                      </h4>
                      {videos.map((vid) => (
                        <div key={vid.id} className="flex items-center gap-2 text-xs border rounded-lg p-2">
                          <Video className="w-3 h-3 text-muted-foreground" />
                          <span className="flex-1 truncate">{vid.original_filename}</span>
                          <span className="text-muted-foreground">
                            {vid.original_size_bytes ? `${(vid.original_size_bytes / 1024 / 1024).toFixed(1)} MB` : "—"}
                          </span>
                          {vid.compression_status === "skipped" && (
                            <Badge variant="secondary" className="text-[10px] bg-yellow-500/10 text-yellow-600">Over 30MB</Badge>
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
                      {pdfs.map((pdf) => (
                        <div key={pdf.id} className="flex items-center gap-2 text-xs border rounded-lg p-2">
                          <FileText className="w-3 h-3 text-muted-foreground" />
                          <span className="flex-1 truncate">{pdf.original_filename}</span>
                          <span className="text-muted-foreground">
                            {pdf.original_size_bytes ? `${(pdf.original_size_bytes / 1024).toFixed(0)} KB` : "—"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  {!(media || []).length && (
                    <p className="text-sm text-muted-foreground text-center py-4">No media files detected</p>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="logs" className="p-4">
                {!(logs || []).length ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No logs yet</p>
                ) : (
                  <div className="space-y-2">
                    {(logs || []).map((log) => (
                      <div key={log.id} className="flex items-start gap-2 text-xs">
                        <span className={`flex-shrink-0 mt-0.5 w-2 h-2 rounded-full mt-1 ${
                          log.level === "success" ? "bg-green-500" :
                          log.level === "error" ? "bg-red-500" :
                          log.level === "warning" ? "bg-yellow-500" : "bg-blue-500"
                        }`} />
                        <div>
                          <span className="font-medium">{log.action}</span>
                          {log.details && <span className="text-muted-foreground ml-2">{log.details}</span>}
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

  const pending = (jobs || []).filter((j) => j.import_status === "pending");
  const reviewing = (jobs || []).filter((j) => j.import_status === "reviewing");
  const active = (jobs || []).filter((j) => ["extracting", "processing_media", "uploading"].includes(j.import_status || ""));
  const completed = (jobs || []).filter((j) => j.import_status === "completed");
  const errored = (jobs || []).filter((j) => j.import_status === "error");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Processing Queue</h1>
          <p className="text-muted-foreground mt-1">Review AI-extracted data and publish to CMS</p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4 mr-2" />Refresh
        </Button>
      </div>

      {/* Progress summary */}
      {active.length > 0 && (
        <Card className="border-blue-500/30 bg-blue-500/5">
          <CardContent className="py-3 px-4 flex items-center gap-3">
            <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
            <span className="text-sm">{active.length} propert{active.length === 1 ? "y" : "ies"} processing…</span>
          </CardContent>
        </Card>
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
        <div>
          <h2 className="text-sm font-semibold text-yellow-600 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-yellow-500" />
            Ready to Review ({reviewing.length})
          </h2>
          <div className="space-y-3">
            {reviewing.map((job) => (
              <JobCard key={job.id} job={job} onRefresh={() => refetch()} />
            ))}
          </div>
        </div>
      )}

      {pending.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-muted-foreground" />
            Pending Extraction ({pending.length})
          </h2>
          <div className="space-y-3">
            {pending.map((job) => (
              <JobCard key={job.id} job={job} onRefresh={() => refetch()} />
            ))}
          </div>
        </div>
      )}

      {active.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-blue-600 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            Processing ({active.length})
          </h2>
          <div className="space-y-3">
            {active.map((job) => (
              <JobCard key={job.id} job={job} onRefresh={() => refetch()} />
            ))}
          </div>
        </div>
      )}

      {errored.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-red-600 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            Errors ({errored.length})
          </h2>
          <div className="space-y-3">
            {errored.map((job) => (
              <JobCard key={job.id} job={job} onRefresh={() => refetch()} />
            ))}
          </div>
        </div>
      )}

      {completed.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-green-600 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            Completed ({completed.length})
          </h2>
          <div className="space-y-3">
            {completed.map((job) => (
              <JobCard key={job.id} job={job} onRefresh={() => refetch()} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
