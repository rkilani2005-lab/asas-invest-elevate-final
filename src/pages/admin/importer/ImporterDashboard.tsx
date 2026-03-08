import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CloudDownload,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  ArrowRight,
  FileText,
  Image,
  Video,
  Sparkles,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function ImporterDashboard() {
  const { data: stats } = useQuery({
    queryKey: ["importer-stats"],
    queryFn: async () => {
      const { data } = await supabase.from("import_jobs").select("import_status");
      if (!data) return { total: 0, pending: 0, processing: 0, completed: 0, error: 0 };
      return {
        total: data.length,
        pending: data.filter((j) => j.import_status === "pending" || j.import_status === "reviewing").length,
        processing: data.filter((j) => ["extracting", "processing_media", "uploading"].includes(j.import_status || "")).length,
        completed: data.filter((j) => j.import_status === "completed").length,
        error: data.filter((j) => j.import_status === "error").length,
      };
    },
    refetchInterval: 5000,
  });

  const { data: recentJobs } = useQuery({
    queryKey: ["importer-recent"],
    queryFn: async () => {
      const { data } = await supabase
        .from("import_jobs")
        .select("id, folder_name, name_en, import_status, cms_url, created_at, pdf_count, image_count, video_count")
        .order("created_at", { ascending: false })
        .limit(10);
      return data || [];
    },
    refetchInterval: 5000,
  });

  const { data: dropboxConnected } = useQuery({
    queryKey: ["dropbox-status"],
    queryFn: async () => {
      const { data } = await supabase
        .from("importer_settings")
        .select("value")
        .eq("key", "dropbox_access_token")
        .maybeSingle();
      return !!data?.value;
    },
  });

  const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
    pending: { label: "Pending", color: "bg-muted text-muted-foreground", icon: Clock },
    extracting: { label: "Extracting", color: "bg-blue-500/10 text-blue-600", icon: Sparkles },
    reviewing: { label: "Reviewing", color: "bg-yellow-500/10 text-yellow-600", icon: FileText },
    processing_media: { label: "Processing Media", color: "bg-purple-500/10 text-purple-600", icon: Image },
    uploading: { label: "Uploading", color: "bg-orange-500/10 text-orange-600", icon: CloudDownload },
    completed: { label: "Completed", color: "bg-green-500/10 text-green-600", icon: CheckCircle2 },
    error: { label: "Error", color: "bg-red-500/10 text-red-600", icon: AlertCircle },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Property Importer</h1>
          <p className="text-muted-foreground mt-1">
            Automate property creation from Dropbox folders using AI
          </p>
        </div>
        <Button asChild>
          <Link to="/admin/importer/scan">
            <CloudDownload className="w-4 h-4 mr-2" />
            Scan Dropbox
          </Link>
        </Button>
      </div>

      {/* Dropbox Status */}
      <Card className={`border ${dropboxConnected ? "border-green-500/30 bg-green-500/5" : "border-yellow-500/30 bg-yellow-500/5"}`}>
        <CardContent className="flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <div className={`w-2.5 h-2.5 rounded-full ${dropboxConnected ? "bg-green-500" : "bg-yellow-500"} animate-pulse`} />
            <span className="text-sm font-medium">
              {dropboxConnected ? "Dropbox connected" : "Dropbox not connected — add your access token in Settings"}
            </span>
          </div>
          {!dropboxConnected && (
            <Button variant="outline" size="sm" asChild>
              <Link to="/admin/importer/settings">Configure</Link>
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Imported", value: stats?.total ?? 0, icon: FileText, color: "text-foreground" },
          { label: "In Queue", value: stats?.pending ?? 0, icon: Clock, color: "text-yellow-600" },
          { label: "Processing", value: stats?.processing ?? 0, icon: Loader2, color: "text-blue-600" },
          { label: "Completed", value: stats?.completed ?? 0, icon: CheckCircle2, color: "text-green-600" },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <div className="text-3xl font-bold">{stat.value}</div>
              <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="hover:border-primary/50 transition-colors cursor-pointer group">
          <Link to="/admin/importer/scan">
            <CardContent className="pt-6 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <CloudDownload className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <div className="font-semibold">Scan & Import</div>
                <div className="text-sm text-muted-foreground">Browse Dropbox folders</div>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </CardContent>
          </Link>
        </Card>

        <Card className="hover:border-primary/50 transition-colors cursor-pointer group">
          <Link to="/admin/importer/queue">
            <CardContent className="pt-6 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
                <Loader2 className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <div className="font-semibold">Processing Queue</div>
                <div className="text-sm text-muted-foreground">Monitor active imports</div>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </CardContent>
          </Link>
        </Card>

        <Card className="hover:border-primary/50 transition-colors cursor-pointer group">
          <Link to="/admin/importer/settings">
            <CardContent className="pt-6 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-muted group-hover:bg-muted/70 transition-colors">
                <Sparkles className="w-6 h-6 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <div className="font-semibold">Settings</div>
                <div className="text-sm text-muted-foreground">API keys & configuration</div>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </CardContent>
          </Link>
        </Card>
      </div>

      {/* Recent Jobs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Imports</CardTitle>
        </CardHeader>
        <CardContent>
          {!recentJobs?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              <CloudDownload className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>No imports yet. Connect Dropbox and scan for properties.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentJobs.map((job) => {
                const cfg = statusConfig[job.import_status || "pending"] || statusConfig.pending;
                const Icon = cfg.icon;
                return (
                  <div key={job.id} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                    <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{job.name_en || job.folder_name}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-3 mt-0.5">
                        <span>{formatDistanceToNow(new Date(job.created_at || ""), { addSuffix: true })}</span>
                        {job.pdf_count > 0 && <span>{job.pdf_count} PDF{job.pdf_count > 1 ? "s" : ""}</span>}
                        {job.image_count > 0 && <span>{job.image_count} images</span>}
                        {job.video_count > 0 && <span>{job.video_count} videos</span>}
                      </div>
                    </div>
                    <Badge variant="secondary" className={`text-xs ${cfg.color}`}>
                      {cfg.label}
                    </Badge>
                    {job.cms_url && (
                      <Button variant="ghost" size="sm" asChild className="h-7 text-xs">
                        <Link to={job.cms_url}>View</Link>
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
