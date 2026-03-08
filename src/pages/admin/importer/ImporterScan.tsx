import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CloudDownload,
  FolderOpen,
  FileText,
  Image,
  Video,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

interface DropboxFolder {
  name: string;
  path_lower: string;
  pdf_count?: number;
  image_count?: number;
  video_count?: number;
  total_size?: number;
  scanned?: boolean;
  scanning?: boolean;
  already_imported?: boolean;
}

async function callDropboxProxy(action: string, payload: Record<string, any> = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/dropbox-proxy`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ action, ...payload }),
    }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

export default function ImporterScan() {
  const navigate = useNavigate();
  const [folders, setFolders] = useState<DropboxFolder[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);

  const { data: rootPath } = useQuery({
    queryKey: ["importer-root-path"],
    queryFn: async () => {
      const { data } = await supabase
        .from("importer_settings")
        .select("value")
        .eq("key", "dropbox_root_path")
        .maybeSingle();
      return data?.value || "/ASAS-Properties";
    },
  });

  const { data: existingSlugs } = useQuery({
    queryKey: ["existing-slugs"],
    queryFn: async () => {
      const { data } = await supabase.from("import_jobs").select("folder_name");
      return new Set((data || []).map((j) => j.folder_name));
    },
  });

  const handleScan = async () => {
    setScanning(true);
    setScanError(null);
    setFolders([]);
    setSelected(new Set());

    try {
      const result = await callDropboxProxy("list_root", { root_path: rootPath || "/ASAS-Properties" });
      if (result.error) {
        setScanError(result.error);
        return;
      }

      const rawFolders: DropboxFolder[] = (result.folders || []).map((f: any) => ({
        name: f.name,
        path_lower: f.path_lower,
        scanned: false,
        scanning: false,
        already_imported: existingSlugs?.has(f.name) || false,
      }));

      setFolders(rawFolders);

      // Scan each folder for its subfolders in parallel (batches of 5)
      const batchSize = 5;
      for (let i = 0; i < rawFolders.length; i += batchSize) {
        const batch = rawFolders.slice(i, i + batchSize);
        setFolders((prev) =>
          prev.map((f) => batch.find((b) => b.path_lower === f.path_lower) ? { ...f, scanning: true } : f)
        );

        await Promise.all(batch.map(async (folder) => {
          try {
            const sub = await callDropboxProxy("scan_property", { folder_path: folder.path_lower });
            const pdfFiles = (sub.brochures || []).filter((f: any) => f.name?.endsWith(".pdf"));
            const imageFiles = (sub.images || []).filter((f: any) =>
              /\.(jpg|jpeg|png|webp)$/i.test(f.name || "")
            );
            const videoFiles = (sub.videos || []).filter((f: any) =>
              /\.(mp4|mov|avi|webm)$/i.test(f.name || "")
            );
            const totalSize = [...pdfFiles, ...imageFiles, ...videoFiles].reduce(
              (acc: number, f: any) => acc + (f.size || 0), 0
            );

            setFolders((prev) =>
              prev.map((f) =>
                f.path_lower === folder.path_lower
                  ? {
                      ...f,
                      pdf_count: pdfFiles.length,
                      image_count: imageFiles.length,
                      video_count: videoFiles.length,
                      total_size: totalSize,
                      scanned: true,
                      scanning: false,
                    }
                  : f
              )
            );
          } catch {
            setFolders((prev) =>
              prev.map((f) =>
                f.path_lower === folder.path_lower
                  ? { ...f, scanned: true, scanning: false, pdf_count: 0, image_count: 0, video_count: 0 }
                  : f
              )
            );
          }
        }));
      }
    } catch (e: any) {
      setScanError(e.message || "Failed to scan Dropbox");
    } finally {
      setScanning(false);
    }
  };

  const toggleSelect = useCallback((path: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  const selectAll = () => {
    setSelected(new Set(folders.filter((f) => !f.already_imported).map((f) => f.path_lower)));
  };

  const handleProcess = async () => {
    if (!selected.size) return;
    setCreating(true);

    const selectedFolders = folders.filter((f) => selected.has(f.path_lower));
    const jobIds: string[] = [];

    for (const folder of selectedFolders) {
      // Get subfolder details for pdf/image/video files
      let brochures: any[] = [];
      let images: any[] = [];
      let videos: any[] = [];

      try {
        const sub = await callDropboxProxy("scan_property", { folder_path: folder.path_lower });
        brochures = (sub.brochures || []).filter((f: any) => f.name?.endsWith(".pdf"));
        images = (sub.images || []).filter((f: any) => /\.(jpg|jpeg|png|webp)$/i.test(f.name || ""));
        videos = (sub.videos || []).filter((f: any) => /\.(mp4|mov|avi|webm)$/i.test(f.name || ""));
      } catch { /* ok */ }

      // Create the import job
      const { data: job } = await supabase
        .from("import_jobs")
        .insert({
          dropbox_folder_path: folder.path_lower,
          folder_name: folder.name,
          import_status: "pending",
          pdf_count: brochures.length,
          image_count: images.length,
          video_count: videos.length,
        })
        .select()
        .single();

      if (!job) continue;
      jobIds.push(job.id);

      // Create media records
      const allMedia = [
        ...brochures.map((f: any, i: number) => ({
          job_id: job.id, media_type: "brochure", original_filename: f.name,
          original_size_bytes: f.size || null, dropbox_path: f.path_lower, sort_order: i, is_hero: false,
        })),
        ...images.map((f: any, i: number) => ({
          job_id: job.id, media_type: "image", original_filename: f.name,
          original_size_bytes: f.size || null, dropbox_path: f.path_lower, sort_order: i, is_hero: i === 0,
        })),
        ...videos.map((f: any, i: number) => ({
          job_id: job.id, media_type: "video", original_filename: f.name,
          original_size_bytes: f.size || null, dropbox_path: f.path_lower, sort_order: i, is_hero: false,
          compression_status: (f.size || 0) > 30 * 1024 * 1024 ? "skipped" : "pending",
        })),
      ];

      if (allMedia.length > 0) {
        await supabase.from("import_media").insert(allMedia);
      }
    }

    toast.success(`${jobIds.length} propert${jobIds.length === 1 ? "y" : "ies"} queued for processing`);
    navigate("/admin/importer/queue");
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return "";
    if (bytes > 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
    if (bytes > 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    return `${(bytes / 1024).toFixed(0)} KB`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Scan Dropbox</h1>
          <p className="text-muted-foreground mt-1">
            Detect property folders in <code className="text-xs bg-muted px-1 py-0.5 rounded">{rootPath || "/ASAS-Properties"}</code>
          </p>
        </div>
        <Button onClick={handleScan} disabled={scanning}>
          {scanning ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
          {scanning ? "Scanning…" : folders.length > 0 ? "Re-scan" : "Scan Dropbox"}
        </Button>
      </div>

      {scanError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{scanError}</AlertDescription>
        </Alert>
      )}

      {/* Results */}
      {folders.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {folders.length} folder{folders.length !== 1 ? "s" : ""} found
              {selected.size > 0 && ` · ${selected.size} selected`}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={selectAll}>
                Select All New
              </Button>
              <Button
                size="sm"
                disabled={!selected.size || creating}
                onClick={handleProcess}
              >
                {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ChevronRight className="w-4 h-4 mr-2" />}
                Process {selected.size > 0 ? `${selected.size} ` : ""}Selected
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            {folders.map((folder) => (
              <Card
                key={folder.path_lower}
                className={`transition-all ${
                  selected.has(folder.path_lower) ? "border-primary bg-primary/5" : ""
                } ${folder.already_imported ? "opacity-60" : "cursor-pointer hover:border-primary/50"}`}
                onClick={() => !folder.already_imported && toggleSelect(folder.path_lower)}
              >
                <CardContent className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    {!folder.already_imported && (
                      <Checkbox
                        checked={selected.has(folder.path_lower)}
                        onCheckedChange={() => toggleSelect(folder.path_lower)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    )}
                    <FolderOpen className="w-5 h-5 text-yellow-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{folder.name}</div>
                      <div className="text-xs text-muted-foreground">{folder.path_lower}</div>
                    </div>

                    {folder.scanning ? (
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    ) : folder.scanned ? (
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {(folder.pdf_count ?? 0) > 0 && (
                          <span className="flex items-center gap-1">
                            <FileText className="w-3 h-3" /> {folder.pdf_count}
                          </span>
                        )}
                        {(folder.image_count ?? 0) > 0 && (
                          <span className="flex items-center gap-1">
                            <Image className="w-3 h-3" /> {folder.image_count}
                          </span>
                        )}
                        {(folder.video_count ?? 0) > 0 && (
                          <span className="flex items-center gap-1">
                            <Video className="w-3 h-3" /> {folder.video_count}
                          </span>
                        )}
                        {folder.total_size && folder.total_size > 0 && (
                          <span>{formatSize(folder.total_size)}</span>
                        )}
                      </div>
                    ) : null}

                    {folder.already_imported ? (
                      <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-600">
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Imported
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">New</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {selected.size > 0 && (
            <div className="sticky bottom-4 flex justify-end">
              <Button size="lg" onClick={handleProcess} disabled={creating}>
                {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CloudDownload className="w-4 h-4 mr-2" />}
                Process {selected.size} Propert{selected.size === 1 ? "y" : "ies"}
              </Button>
            </div>
          )}
        </div>
      )}

      {!scanning && folders.length === 0 && !scanError && (
        <div className="text-center py-16 text-muted-foreground">
          <CloudDownload className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p className="text-lg font-medium">Ready to scan</p>
          <p className="text-sm mt-1">Click "Scan Dropbox" to detect property folders</p>
        </div>
      )}
    </div>
  );
}
