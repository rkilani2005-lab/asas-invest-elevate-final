import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CloudDownload, FolderOpen, FileText, Image, Video,
  ChevronRight, RefreshCw, AlertCircle, CheckCircle2, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

interface DriveFolder {
  id: string;
  name: string;
  modifiedTime?: string;
  pdf_count?: number;
  image_count?: number;
  video_count?: number;
  total_size?: number;
  files?: Array<{ id: string; name: string; mimeType: string; size?: string }>;
  scanned?: boolean;
  scanning?: boolean;
  already_imported?: boolean;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

async function callGdriveOAuth(action: string, payload: Record<string, unknown> = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(`${SUPABASE_URL}/functions/v1/gdrive-oauth?action=${action}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session?.access_token}`,
    },
    body: JSON.stringify({ action, ...payload }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

export default function ImporterScan() {
  const navigate = useNavigate();
  const [folders, setFolders] = useState<DriveFolder[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);

  const { data: rootFolderId } = useQuery({
    queryKey: ["gdrive-root-folder"],
    queryFn: async () => {
      const { data } = await supabase
        .from("importer_settings")
        .select("value")
        .eq("key", "gdrive_root_folder_id")
        .maybeSingle();
      return data?.value || "";
    },
  });

  const { data: existingFolderIds } = useQuery({
    queryKey: ["existing-folder-ids"],
    queryFn: async () => {
      const { data } = await supabase.from("import_jobs").select("dropbox_folder_path");
      return new Set((data || []).map((j) => j.dropbox_folder_path));
    },
  });

  const handleScan = async () => {
    if (!rootFolderId) {
      setScanError("No root folder configured. Go to Settings and enter a Google Drive Folder ID.");
      return;
    }
    setScanning(true);
    setScanError(null);
    setFolders([]);
    setSelected(new Set());

    try {
      const result = await callGdriveOAuth("list_root", { folder_id: rootFolderId });
      if (result.error) {
        setScanError(result.error);
        return;
      }

      const rawFolders: DriveFolder[] = (result.folders || []).map((f: { id: string; name: string; modifiedTime?: string }) => ({
        id: f.id,
        name: f.name,
        modifiedTime: f.modifiedTime,
        scanned: false,
        scanning: false,
        already_imported: existingFolderIds?.has(f.id) || false,
      }));

      setFolders(rawFolders);

      // Scan each folder for its files in batches of 5
      const batchSize = 5;
      for (let i = 0; i < rawFolders.length; i += batchSize) {
        const batch = rawFolders.slice(i, i + batchSize);
        setFolders((prev) =>
          prev.map((f) => batch.find((b) => b.id === f.id) ? { ...f, scanning: true } : f)
        );

        await Promise.all(batch.map(async (folder) => {
          try {
            // Recursively fetch ALL files flat — no subfolder structure required
            const allFiles: Array<{ id: string; name: string; mimeType: string; size?: string }> = [];
            const fetchFilesRecursive = async (fid: string) => {
              const sub = await callGdriveOAuth("list_files", { folder_id: fid });
              const items: Array<{ id: string; name: string; mimeType: string; size?: string }> = sub.files || [];
              for (const item of items) {
                if (item.mimeType === "application/vnd.google-apps.folder") {
                  await fetchFilesRecursive(item.id); // recurse into subfolders
                } else {
                  allFiles.push(item);
                }
              }
            };
            await fetchFilesRecursive(folder.id);
            const files = allFiles;

            const pdfFiles = files.filter((f) =>
              f.mimeType === "application/pdf" ||
              f.mimeType === "application/vnd.google-apps.document" ||
              f.name.toLowerCase().endsWith(".pdf")
            );
            const imageFiles = files.filter((f) => f.mimeType.startsWith("image/"));
            const videoFiles = files.filter((f) => f.mimeType.startsWith("video/"));
            const totalSize = files.reduce((acc, f) => acc + parseInt(f.size || "0", 10), 0);

            setFolders((prev) =>
              prev.map((f) =>
                f.id === folder.id
                  ? {
                      ...f,
                      pdf_count: pdfFiles.length,
                      image_count: imageFiles.length,
                      video_count: videoFiles.length,
                      total_size: totalSize,
                      files,
                      scanned: true,
                      scanning: false,
                    }
                  : f
              )
            );
          } catch {
            setFolders((prev) =>
              prev.map((f) =>
                f.id === folder.id
                  ? { ...f, scanned: true, scanning: false, pdf_count: 0, image_count: 0, video_count: 0 }
                  : f
              )
            );
          }
        }));
      }
    } catch (e) {
      setScanError(e instanceof Error ? e.message : "Failed to scan Google Drive");
    } finally {
      setScanning(false);
    }
  };

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = () => {
    setSelected(new Set(folders.filter((f) => !f.already_imported).map((f) => f.id)));
  };

  const handleProcess = async () => {
    if (!selected.size) return;
    setCreating(true);

    const selectedFolders = folders.filter((f) => selected.has(f.id));

    for (const folder of selectedFolders) {
      const files = folder.files || [];
      const pdfFiles = files.filter((f) =>
        f.mimeType === "application/pdf" || f.mimeType === "application/vnd.google-apps.document"
      );
      const imageFiles = files.filter((f) => f.mimeType.startsWith("image/"));
      const videoFiles = files.filter((f) => f.mimeType.startsWith("video/"));

      const { data: job } = await supabase
        .from("import_jobs")
        .insert({
          dropbox_folder_path: folder.id, // storing drive folder ID here
          folder_name: folder.name,
          import_status: "pending",
          pdf_count: pdfFiles.length,
          image_count: imageFiles.length,
          video_count: videoFiles.length,
        })
        .select()
        .single();

      if (!job) continue;

      const allMedia = [
        ...pdfFiles.map((f, i) => ({
          job_id: job.id, media_type: "brochure", original_filename: f.name,
          original_size_bytes: parseInt(f.size || "0", 10) || null,
          dropbox_path: f.id, // using drive file id
          sort_order: i, is_hero: false,
        })),
        ...imageFiles.map((f, i) => ({
          job_id: job.id, media_type: "image", original_filename: f.name,
          original_size_bytes: parseInt(f.size || "0", 10) || null,
          dropbox_path: f.id,
          sort_order: i, is_hero: i === 0,
        })),
        ...videoFiles.map((f, i) => ({
          job_id: job.id, media_type: "video", original_filename: f.name,
          original_size_bytes: parseInt(f.size || "0", 10) || null,
          dropbox_path: f.id,
          sort_order: i, is_hero: false,
          compression_status: (parseInt(f.size || "0", 10) || 0) > 40 * 1024 * 1024 ? "skipped" : "pending",
        })),
      ];

      if (allMedia.length > 0) {
        await supabase.from("import_media").insert(allMedia);
      }
    }

    toast.success(`${selectedFolders.length} propert${selectedFolders.length === 1 ? "y" : "ies"} queued for processing`);
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
          <h1 className="text-3xl font-semibold">Scan Google Drive</h1>
          <p className="text-muted-foreground mt-1">
            Detect property folders in your configured Google Drive folder
          </p>
        </div>
        <Button onClick={handleScan} disabled={scanning}>
          {scanning ? <Loader2 className="w-4 h-4 me-2 animate-spin" /> : <RefreshCw className="w-4 h-4 me-2" />}
          {scanning ? "Scanning…" : folders.length > 0 ? "Re-scan" : "Scan Drive"}
        </Button>
      </div>

      {!rootFolderId && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No root folder configured. <a href="/admin/importer/settings" className="underline font-medium">Go to Settings</a> and enter your Google Drive folder ID.
          </AlertDescription>
        </Alert>
      )}

      {scanError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{scanError}</AlertDescription>
        </Alert>
      )}

      {folders.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {folders.length} folder{folders.length !== 1 ? "s" : ""} found
              {selected.size > 0 && ` · ${selected.size} selected`}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={selectAll}>Select All New</Button>
              <Button size="sm" disabled={!selected.size || creating} onClick={handleProcess}>
                {creating ? <Loader2 className="w-4 h-4 me-2 animate-spin" /> : <ChevronRight className="w-4 h-4 me-2" />}
                Process {selected.size > 0 ? `${selected.size} ` : ""}Selected
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            {folders.map((folder) => (
              <Card
                key={folder.id}
                className={`transition-all ${selected.has(folder.id) ? "border-primary bg-primary/5" : ""} ${folder.already_imported ? "opacity-60" : "cursor-pointer hover:border-primary/50"}`}
                onClick={() => !folder.already_imported && toggleSelect(folder.id)}
              >
                <CardContent className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    {!folder.already_imported && (
                      <Checkbox
                        checked={selected.has(folder.id)}
                        onCheckedChange={() => toggleSelect(folder.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    )}
                    <FolderOpen className="w-5 h-5 text-yellow-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{folder.name}</div>
                      <div className="text-xs text-muted-foreground font-mono">{folder.id}</div>
                    </div>

                    {folder.scanning ? (
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    ) : folder.scanned ? (
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {(folder.pdf_count ?? 0) > 0 && (
                          <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> {folder.pdf_count}</span>
                        )}
                        {(folder.image_count ?? 0) > 0 && (
                          <span className="flex items-center gap-1"><Image className="w-3 h-3" /> {folder.image_count}</span>
                        )}
                        {(folder.video_count ?? 0) > 0 && (
                          <span className="flex items-center gap-1"><Video className="w-3 h-3" /> {folder.video_count}</span>
                        )}
                        {folder.total_size && folder.total_size > 0 && (
                          <span>{formatSize(folder.total_size)}</span>
                        )}
                      </div>
                    ) : null}

                    {folder.already_imported ? (
                      <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-600">
                        <CheckCircle2 className="w-3 h-3 me-1" /> Imported
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
                {creating ? <Loader2 className="w-4 h-4 me-2 animate-spin" /> : <CloudDownload className="w-4 h-4 me-2" />}
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
          <p className="text-sm mt-1">Click "Scan Drive" to detect property folders from Google Drive</p>
        </div>
      )}
    </div>
  );
}
