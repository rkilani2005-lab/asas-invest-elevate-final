import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle2, AlertCircle, Loader2, TestTube, Play,
  CalendarClock, FolderOpen, LogIn, LogOut, RefreshCw, Info,
} from "lucide-react";
import { toast } from "sonner";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { formatDistanceToNow } from "date-fns";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const GDRIVE_OAUTH_URL = `${SUPABASE_URL}/functions/v1/gdrive-oauth`;

async function callGdriveOAuth(action: string, payload: Record<string, unknown> = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(`${GDRIVE_OAUTH_URL}?action=${action}`, {
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

export default function ImporterSettings() {
  const queryClient = useQueryClient();
  const [rootFolderInput, setRootFolderInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [runningNow, setRunningNow] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [autoScanInterval, setAutoScanInterval] = useState<"disabled" | "hourly" | "daily">("disabled");
  const [publishingMode, setPublishingMode] = useState<"auto" | "manual">("manual");
  const [adminEmail, setAdminEmail] = useState("");
  const [contentTeamEmail, setContentTeamEmail] = useState("");

  // Check URL params for OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("gdrive_connected") === "true") {
      const email = params.get("email") || "account";
      toast.success(`Google Drive connected: ${email}`);
      queryClient.invalidateQueries({ queryKey: ["gdrive-settings"] });
      window.history.replaceState({}, "", window.location.pathname);
    }
    if (params.get("gdrive_error")) {
      toast.error(`Google Drive connection failed: ${params.get("gdrive_error")}`);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [queryClient]);

  const { data: gdriveSettings } = useQuery({
    queryKey: ["gdrive-settings"],
    queryFn: async () => {
      const { data } = await supabase
        .from("importer_settings")
        .select("key, value")
        .in("key", [
          "gdrive_connected", "gdrive_connected_email", "gdrive_root_folder_id",
          "gdrive_last_scan", "auto_scan_interval", "gdrive_last_tested",
          "publishing_mode", "admin_email", "content_team_email",
        ]);
      const map: Record<string, string> = {};
      (data || []).forEach((r) => { if (r.value) map[r.key] = r.value; });
      return map;
    },
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (gdriveSettings) {
      if (gdriveSettings.gdrive_root_folder_id) setRootFolderInput(gdriveSettings.gdrive_root_folder_id);
      const interval = gdriveSettings.auto_scan_interval;
      if (interval === "hourly" || interval === "daily" || interval === "disabled") {
        setAutoScanInterval(interval);
      }
      if (gdriveSettings.publishing_mode === "auto" || gdriveSettings.publishing_mode === "manual") {
        setPublishingMode(gdriveSettings.publishing_mode);
      }
      if (gdriveSettings.admin_email) setAdminEmail(gdriveSettings.admin_email);
      if (gdriveSettings.content_team_email) setContentTeamEmail(gdriveSettings.content_team_email);
    }
  }, [gdriveSettings]);

  const isConnected = gdriveSettings?.gdrive_connected === "true";
  const connectedEmail = gdriveSettings?.gdrive_connected_email;
  const lastScan = gdriveSettings?.gdrive_last_scan ? new Date(gdriveSettings.gdrive_last_scan) : null;

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const result = await callGdriveOAuth("get_auth_url");
      if (result.url) {
        window.location.href = result.url;
      } else {
        toast.error(result.error || "Failed to get auth URL. Ensure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are configured.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Connection failed");
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await callGdriveOAuth("disconnect");
      toast.success("Disconnected from Google Drive");
      queryClient.invalidateQueries({ queryKey: ["gdrive-settings"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Disconnect failed");
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const result = await callGdriveOAuth("test");
      if (result.success) {
        toast.success(`Connection verified${result.email ? `: ${result.email}` : ""}${result.refreshed ? " (token refreshed)" : ""}`);
        queryClient.invalidateQueries({ queryKey: ["gdrive-settings"] });
      } else {
        toast.error(result.error || "Test failed — token may be expired. Please reconnect.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Test failed");
    } finally {
      setTesting(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await supabase.from("importer_settings").upsert([
        { key: "gdrive_root_folder_id", value: rootFolderInput },
        { key: "auto_scan_interval", value: autoScanInterval },
        { key: "publishing_mode", value: publishingMode },
        { key: "admin_email", value: adminEmail },
        { key: "content_team_email", value: contentTeamEmail },
      ], { onConflict: "key" });
      toast.success("Settings saved");
      queryClient.invalidateQueries({ queryKey: ["gdrive-settings"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleScanNow = async () => {
    setRunningNow(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${SUPABASE_URL}/functions/v1/gdrive-scan`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ source: "manual" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Scan failed");
      if (data.action === "skipped") {
        toast.info(`Scan skipped: ${data.error}`);
      } else {
        toast.success(
          data.new_jobs > 0
            ? `Scan complete — queued ${data.new_jobs} new folder(s)`
            : `Scan complete — no new folders found (${data.total} total)`
        );
      }
      queryClient.invalidateQueries({ queryKey: ["gdrive-settings"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Scan failed");
    } finally {
      setRunningNow(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-semibold">Importer Settings</h1>
        <p className="text-muted-foreground mt-1">Configure Google Drive connection and import preferences</p>
      </div>

      {/* ── Google Drive Connection ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Google Drive Connection</CardTitle>
              <CardDescription>Connect your Google Drive to scan property folders</CardDescription>
            </div>
            {isConnected ? (
              <Badge variant="secondary" className="bg-green-500/10 text-green-600">
                <CheckCircle2 className="w-3 h-3 me-1" /> Connected
              </Badge>
            ) : (
              <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600">
                <AlertCircle className="w-3 h-3 me-1" /> Not connected
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              You need <strong>GOOGLE_CLIENT_ID</strong> and <strong>GOOGLE_CLIENT_SECRET</strong> configured as secrets.
              The redirect URI to add in Google Cloud Console is:
              <code className="block mt-1 p-1 bg-muted rounded text-xs break-all">
                {SUPABASE_URL}/functions/v1/gdrive-oauth-callback
              </code>
            </AlertDescription>
          </Alert>

          {isConnected && connectedEmail && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/5 border border-green-500/20">
              <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-700">{connectedEmail}</p>
                {gdriveSettings?.gdrive_last_tested && (
                  <p className="text-xs text-muted-foreground">
                    Last tested {formatDistanceToNow(new Date(gdriveSettings.gdrive_last_tested), { addSuffix: true })}
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-2 flex-wrap">
            {!isConnected ? (
              <Button onClick={handleConnect} disabled={connecting}>
                {connecting ? <Loader2 className="w-4 h-4 me-2 animate-spin" /> : <LogIn className="w-4 h-4 me-2" />}
                Connect Google Drive
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={handleTest} disabled={testing}>
                  {testing ? <Loader2 className="w-4 h-4 me-2 animate-spin" /> : <TestTube className="w-4 h-4 me-2" />}
                  Test Connection
                </Button>
                <Button variant="outline" onClick={handleConnect} disabled={connecting}>
                  <RefreshCw className="w-4 h-4 me-2" /> Reconnect
                </Button>
                <Button
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                  onClick={handleDisconnect}
                >
                  <LogOut className="w-4 h-4 me-2" /> Disconnect
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Root Folder Configuration ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FolderOpen className="w-4 h-4" /> Properties Root Folder
          </CardTitle>
          <CardDescription>
            The Google Drive folder ID where your property subfolders live
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="folder-id">Google Drive Folder ID</Label>
            <Input
              id="folder-id"
              value={rootFolderInput}
              onChange={(e) => setRootFolderInput(e.target.value)}
              placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Find the folder ID in the Google Drive URL: drive.google.com/drive/folders/<strong>FOLDER_ID</strong>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ── Auto Scan Schedule ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarClock className="w-4 h-4" /> Sync Schedule
          </CardTitle>
          <CardDescription>
            How often to automatically scan for new property folders
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup
            value={autoScanInterval}
            onValueChange={(v) => setAutoScanInterval(v as "disabled" | "hourly" | "daily")}
            className="space-y-2"
          >
            {[
              { value: "disabled", label: "Manual Only", desc: "Only scan when you click 'Scan Now'" },
              { value: "hourly", label: "Every Hour", desc: "Scan every 60 minutes via cron" },
              { value: "daily", label: "Daily", desc: "Scan once every 24 hours" },
            ].map((opt) => (
              <div key={opt.value} className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/30">
                <RadioGroupItem value={opt.value} id={`interval-${opt.value}`} className="mt-0.5" />
                <label htmlFor={`interval-${opt.value}`} className="cursor-pointer flex-1">
                  <span className="font-medium text-sm">{opt.label}</span>
                  <span className="text-xs text-muted-foreground ms-2">{opt.desc}</span>
                </label>
              </div>
            ))}
          </RadioGroup>

          {lastScan && (
            <p className="text-xs text-muted-foreground">
              Last scan: {formatDistanceToNow(lastScan, { addSuffix: true })}
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── Actions ── */}
      <div className="flex gap-3">
        <Button onClick={handleSaveSettings} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 me-2 animate-spin" /> : null}
          Save Settings
        </Button>
        <Button
          variant="outline"
          onClick={handleScanNow}
          disabled={runningNow || !isConnected || !rootFolderInput}
        >
          {runningNow ? <Loader2 className="w-4 h-4 me-2 animate-spin" /> : <Play className="w-4 h-4 me-2" />}
          Scan Now
        </Button>
      </div>

      <Separator />

      {/* ── Publishing Mode ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Publishing Mode</CardTitle>
          <CardDescription>
            Control whether imported properties go live automatically or require admin approval first
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <RadioGroup
            value={publishingMode}
            onValueChange={(v) => setPublishingMode(v as "auto" | "manual")}
            className="space-y-2"
          >
            {[
              {
                value: "manual",
                label: "Requires Admin Approval",
                desc: "Properties go to a review queue. You must approve before they go live. (Recommended)",
              },
              {
                value: "auto",
                label: "Auto-Publish",
                desc: "Properties are published immediately after processing if validation passes.",
              },
            ].map((opt) => (
              <div
                key={opt.value}
                className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/30 ${publishingMode === opt.value ? "border-primary bg-primary/5" : ""}`}
              >
                <RadioGroupItem value={opt.value} id={`mode-${opt.value}`} className="mt-0.5" />
                <label htmlFor={`mode-${opt.value}`} className="cursor-pointer flex-1">
                  <span className="font-medium text-sm">{opt.label}</span>
                  <span className="text-xs text-muted-foreground block mt-0.5">{opt.desc}</span>
                </label>
              </div>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      {/* ── Notification Emails ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notification Emails</CardTitle>
          <CardDescription>
            Who receives emails when properties are imported, approved, or rejected
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="admin-email">Admin Email</Label>
            <Input
              id="admin-email"
              type="email"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              placeholder="admin@asasinvest.com"
            />
            <p className="text-xs text-muted-foreground">
              Receives notifications when new properties are processed and when validation errors occur
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="team-email">Content Team Email</Label>
            <Input
              id="team-email"
              type="email"
              value={contentTeamEmail}
              onChange={(e) => setContentTeamEmail(e.target.value)}
              placeholder="content@asasinvest.com"
            />
            <p className="text-xs text-muted-foreground">
              Receives emails when properties are approved (confirmed live) or rejected with fix instructions
            </p>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Setup guide */}
      <Card className="border-muted">
        <CardHeader>
          <CardTitle className="text-sm">Google Cloud Setup Guide</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {[
            { n: "1", t: "Create / select a Google Cloud Project", d: "Go to console.cloud.google.com" },
            { n: "2", t: "Enable Google Drive API", d: "APIs & Services → Library → Google Drive API → Enable" },
            { n: "3", t: "Configure OAuth Consent Screen", d: "APIs & Services → OAuth consent screen → External → Add scope: drive.readonly + userinfo.email" },
            { n: "4", t: "Create OAuth 2.0 Credentials", d: `APIs & Services → Credentials → OAuth Client ID → Web Application.\nAuthorized Redirect URI: ${SUPABASE_URL}/functions/v1/gdrive-oauth-callback` },
            { n: "5", t: "Add secrets", d: "Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to your project secrets in Lovable." },
          ].map(({ n, t, d }) => (
            <div key={n} className="flex gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center flex-shrink-0">{n}</div>
              <div>
                <p className="font-medium text-sm">{t}</p>
                <pre className="text-muted-foreground whitespace-pre-wrap text-xs mt-0.5">{d}</pre>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
