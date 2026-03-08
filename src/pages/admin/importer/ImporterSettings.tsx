import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Save,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  TestTube,
  Loader2,
  Copy,
  Webhook,
  RefreshCw,
  Info,
  FolderPlus,
  Clock,
  Timer,
  Play,
  CalendarClock,
} from "lucide-react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function callDropboxProxy(action: string, payload: Record<string, unknown> = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/dropbox-proxy`, {
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

const WEBHOOK_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/dropbox-webhook`;

// ─── Component ───────────────────────────────────────────────────────────────

export default function ImporterSettings() {
  const queryClient = useQueryClient();

  const [dropboxToken, setDropboxToken] = useState("");
  const [rootPath, setRootPath] = useState("/ASAS-Properties");
  const [showToken, setShowToken] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [initingCursor, setInitingCursor] = useState(false);
  const [runningNow, setRunningNow] = useState(false);
  const [autoScanInterval, setAutoScanInterval] = useState<"disabled" | "hourly" | "daily">("disabled");
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  // Load existing settings
  useQuery({
    queryKey: ["importer-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("importer_settings").select("key, value");
      if (!data) return;
      const settings: Record<string, string> = {};
      data.forEach((row) => { settings[row.key] = row.value || ""; });
      if (settings.dropbox_access_token) setDropboxToken(settings.dropbox_access_token);
      if (settings.dropbox_root_path) setRootPath(settings.dropbox_root_path);
      if (settings.auto_scan_interval) {
        const val = settings.auto_scan_interval;
        if (val === "hourly" || val === "daily" || val === "disabled") setAutoScanInterval(val);
      }
      return settings;
    },
  });

  const { data: connected } = useQuery({
    queryKey: ["dropbox-connected"],
    queryFn: async () => {
      const { data } = await supabase
        .from("importer_settings")
        .select("value")
        .eq("key", "dropbox_access_token")
        .maybeSingle();
      return !!data?.value;
    },
  });

  const { data: cursorInfo } = useQuery({
    queryKey: ["dropbox-cursor"],
    queryFn: async () => {
      const { data } = await supabase
        .from("importer_settings")
        .select("value, updated_at")
        .eq("key", "dropbox_cursor")
        .maybeSingle();
      return data ?? null;
    },
  });

  const { data: webhookLogs, isLoading: logsLoading } = useQuery({
    queryKey: ["webhook-activity-logs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("import_logs")
        .select("id, details, created_at, level")
        .eq("action", "webhook_queued")
        .order("created_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
    refetchInterval: 15_000,
  });

  const { data: autoScanInfo } = useQuery({
    queryKey: ["auto-scan-info"],
    queryFn: async () => {
      const { data } = await supabase
        .from("importer_settings")
        .select("key, value, updated_at")
        .in("key", ["auto_scan_last_run", "auto_scan_interval"]);
      const map: Record<string, { value: string | null; updated_at: string | null }> = {};
      (data ?? []).forEach((r) => { map[r.key] = { value: r.value, updated_at: r.updated_at }; });
      return map;
    },
    refetchInterval: 30_000,
  });

  const hasCursor = !!cursorInfo?.value;
  const lastRun = autoScanInfo?.auto_scan_last_run?.value
    ? new Date(autoScanInfo.auto_scan_last_run.value)
    : null;

  /** Compute next scheduled run time for display */
  function getNextRun(interval: string, last: Date | null): string {
    if (interval === "disabled") return "—";
    const base = last ?? new Date();
    if (interval === "hourly") {
      const next = new Date(base);
      next.setMinutes(0, 0, 0);
      next.setHours(next.getHours() + (last ? 1 : 0));
      if (next <= new Date()) next.setHours(next.getHours() + 1);
      return next.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    if (interval === "daily" && last) {
      const next = new Date(last.getTime() + 24 * 60 * 60 * 1000);
      return next.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    }
    return "Next hour";
  }

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleSave = async () => {
    setSaving(true);
    try {
      if (dropboxToken) {
        await callDropboxProxy("save_token", { token: dropboxToken });
      }
      await supabase.from("importer_settings").upsert(
        [
          { key: "dropbox_root_path", value: rootPath },
          { key: "auto_scan_interval", value: autoScanInterval },
        ],
        { onConflict: "key" }
      );
      toast.success("Settings saved");
      queryClient.invalidateQueries({ queryKey: ["dropbox-connected"] });
      queryClient.invalidateQueries({ queryKey: ["auto-scan-info"] });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!dropboxToken) {
      toast.error("Please enter your Dropbox access token first");
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      await callDropboxProxy("save_token", { token: dropboxToken });
      const result = await callDropboxProxy("list_root", { root_path: rootPath });
      if (result.folders !== undefined) {
        setTestResult({
          ok: true,
          message: result.error
            ? `Connected, but: ${result.error}`
            : `Connected! Found ${result.folders.length} folder(s) in ${rootPath}`,
        });
      } else {
        setTestResult({ ok: false, message: result.error || "Unexpected response" });
      }
    } catch (e: unknown) {
      setTestResult({ ok: false, message: e instanceof Error ? e.message : "Test failed" });
    } finally {
      setTesting(false);
    }
  };

  const handleInitCursor = async () => {
    setInitingCursor(true);
    try {
      await callDropboxProxy("get_cursor", { root_path: rootPath });
      toast.success("Webhook baseline set — only folders added after this point will be auto-queued");
      queryClient.invalidateQueries({ queryKey: ["dropbox-cursor"] });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to initialize cursor");
    } finally {
      setInitingCursor(false);
    }
  };

  const handleResetCursor = async () => {
    setInitingCursor(true);
    try {
      await callDropboxProxy("clear_cursor", {});
      toast.success("Cursor cleared — next webhook notification will set a new baseline");
      queryClient.invalidateQueries({ queryKey: ["dropbox-cursor"] });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to reset cursor");
    } finally {
      setInitingCursor(false);
    }
  };

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(WEBHOOK_URL);
    toast.success("Webhook URL copied");
  };

  const handleRunNow = async () => {
    setRunningNow(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/dropbox-auto-scan`, {
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
        toast.info(`Scan skipped: ${data.reason}`);
      } else {
        toast.success(
          data.new_jobs > 0
            ? `Scan complete — queued ${data.new_jobs} new folder(s)`
            : `Scan complete — no new folders found (${data.total} total)`
        );
      }
      queryClient.invalidateQueries({ queryKey: ["auto-scan-info"] });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Scan failed");
    } finally {
      setRunningNow(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-semibold">Importer Settings</h1>
        <p className="text-muted-foreground mt-1">Configure Dropbox connection, webhook, and import preferences</p>
      </div>

      {/* ── Dropbox Configuration ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Dropbox Configuration</CardTitle>
              <CardDescription>Connect your Dropbox to scan property folders</CardDescription>
            </div>
            {connected ? (
              <Badge variant="secondary" className="bg-green-500/10 text-green-600">
                <CheckCircle2 className="w-3 h-3 mr-1" />Connected
              </Badge>
            ) : (
              <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600">
                <AlertCircle className="w-3 h-3 mr-1" />Not connected
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertDescription className="text-xs">
              Generate a long-lived access token from your{" "}
              <a
                href="https://www.dropbox.com/developers/apps"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                Dropbox App Console
              </a>
              . Create an app with "Full Dropbox" access, then generate a token under Settings → OAuth 2 → Generated access token.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="dropbox-token">Dropbox Access Token</Label>
            <div className="relative">
              <Input
                id="dropbox-token"
                type={showToken ? "text" : "password"}
                value={dropboxToken}
                onChange={(e) => setDropboxToken(e.target.value)}
                placeholder="sl.XXXXXXXX..."
                className="pr-10 font-mono text-sm"
              />
              <button
                type="button"
                onClick={() => setShowToken((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="root-path">Root Folder Path</Label>
            <Input
              id="root-path"
              value={rootPath}
              onChange={(e) => setRootPath(e.target.value)}
              placeholder="/ASAS-Properties"
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              All property subfolders must be inside this Dropbox folder
            </p>
          </div>

          {testResult && (
            <Alert
              variant={testResult.ok ? "default" : "destructive"}
              className={testResult.ok ? "border-green-500/30 bg-green-500/5" : ""}
            >
              {testResult.ok
                ? <CheckCircle2 className="h-4 w-4 text-green-600" />
                : <AlertCircle className="h-4 w-4" />}
              <AlertDescription className="text-xs">{testResult.message}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <Button variant="outline" onClick={handleTest} disabled={testing}>
              {testing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <TestTube className="w-4 h-4 mr-2" />}
              Test Connection
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Webhook Configuration ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Webhook className="w-4 h-4" />
                Webhook — Auto-detect New Folders
              </CardTitle>
              <CardDescription>
                Register this URL in your Dropbox App Console to automatically queue new property folders
              </CardDescription>
            </div>
            {hasCursor ? (
              <Badge variant="secondary" className="bg-green-500/10 text-green-600">
                <CheckCircle2 className="w-3 h-3 mr-1" />Active
              </Badge>
            ) : (
              <Badge variant="secondary" className="bg-muted text-muted-foreground">
                <Info className="w-3 h-3 mr-1" />Not initialized
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Webhook URL */}
          <div className="space-y-2">
            <Label>Webhook URL</Label>
            <div className="flex gap-2">
              <Input
                readOnly
                value={WEBHOOK_URL}
                className="font-mono text-xs bg-muted"
              />
              <Button variant="outline" size="icon" onClick={copyWebhookUrl} title="Copy URL">
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Setup steps */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <p className="font-medium text-xs mb-2">Setup steps:</p>
              <ol className="text-xs space-y-1 list-decimal list-inside text-muted-foreground">
                <li>
                  Go to your{" "}
                  <a
                    href="https://www.dropbox.com/developers/apps"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    Dropbox App Console
                  </a>{" "}
                  → select your app → <strong>Webhooks</strong> tab
                </li>
                <li>Paste the Webhook URL above and click <strong>Add</strong></li>
                <li>Dropbox will send a GET challenge — the function responds automatically</li>
                <li>Click <strong>"Initialize Baseline"</strong> below so only future changes trigger imports</li>
              </ol>
            </AlertDescription>
          </Alert>

          {/* Cursor status */}
          {hasCursor && cursorInfo?.updated_at && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/5 border border-green-500/20 text-xs">
              <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
              <div>
                <span className="font-medium text-green-700">Webhook active</span>
                <span className="text-muted-foreground ml-2">
                  Baseline set {new Date(cursorInfo.updated_at).toLocaleString()}
                </span>
              </div>
            </div>
          )}

          {!hasCursor && connected && (
            <Alert className="border-yellow-500/30 bg-yellow-500/5">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-xs">
                Webhook is registered but not yet initialized. Click <strong>Initialize Baseline</strong> to activate auto-detection.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={handleInitCursor}
              disabled={initingCursor || !connected}
              title="Set the current state as baseline — only new folders after this point will be auto-queued"
            >
              {initingCursor
                ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                : <CheckCircle2 className="w-4 h-4 mr-2" />}
              {hasCursor ? "Re-initialize Baseline" : "Initialize Baseline"}
            </Button>
            {hasCursor && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetCursor}
                disabled={initingCursor}
                className="text-muted-foreground"
                title="Clear the cursor so the next notification resets the baseline"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Reset cursor
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Folder Structure Guide ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Required Folder Structure</CardTitle>
          <CardDescription>Each property folder must follow this layout</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="text-xs bg-muted rounded-lg p-4 overflow-auto text-muted-foreground">
{`${rootPath || "/ASAS-Properties"}/
├── Property Name - Location/
│   ├── brochures/
│   │   └── brochure.pdf
│   ├── images/
│   │   ├── 01-hero.jpg
│   │   └── 02-interior.jpg
│   └── videos/
│       └── walkthrough.mp4
└── Another Property - Area/
    └── ...`}
          </pre>
          <div className="mt-3 space-y-1 text-xs text-muted-foreground">
            <p>• Folder name format: <code className="bg-muted px-1 rounded">Property Name - Location</code></p>
            <p>• Images: .jpg, .jpeg, .png, .webp (max 600KB after compression)</p>
            <p>• Videos: .mp4, .mov, .avi, .webm (max 40MB, skipped if larger)</p>
            <p>• Brochures: .pdf (processed by AI for data extraction)</p>
            <p>• Number image filenames (01-, 02-, …) to control gallery order</p>
          </div>
        </CardContent>
      </Card>

      {/* ── AI Settings ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">AI Configuration</CardTitle>
          <CardDescription>Property data extraction uses Lovable AI — no API key required</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
            <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
            <div className="text-sm">
              <div className="font-medium">Lovable AI (Gemini 2.5 Flash) — Active</div>
              <div className="text-muted-foreground text-xs mt-0.5">
                Processes PDF brochures and extracts all 26 property fields with Arabic translations
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Media Settings ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Media Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {[
            { label: "Max image size", value: "600 KB (auto-compressed client-side)" },
            { label: "Max image resolution", value: "1920px longest side" },
            { label: "Max video size", value: "40 MB (skipped if larger)" },
            { label: "Video compression", value: "None — uploaded as-is" },
            { label: "Image output format", value: "WebP / JPEG fallback" },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between py-2 border-b last:border-0">
              <span className="text-muted-foreground">{label}</span>
              <span className="font-medium">{value}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} size="lg">
        {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
        Save Settings
      </Button>

      {/* ── Webhook Activity Log ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Webhook Activity Log
              </CardTitle>
              <CardDescription>Last 20 folders auto-queued via Dropbox webhook</CardDescription>
            </div>
            {webhookLogs && webhookLogs.length > 0 && (
              <Badge variant="secondary">{webhookLogs.length} event{webhookLogs.length !== 1 ? "s" : ""}</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {logsLoading ? (
            <div className="flex items-center gap-2 py-6 text-muted-foreground text-sm justify-center">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading activity…
            </div>
          ) : !webhookLogs || webhookLogs.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
              <Webhook className="w-8 h-8 opacity-30" />
              <p className="text-sm">No webhook events yet</p>
              <p className="text-xs">Events will appear here once the webhook is active and Dropbox detects new folders</p>
            </div>
          ) : (
            <ScrollArea className="h-72">
              <div className="space-y-1 pr-2">
                {webhookLogs.map((log) => {
                  // Extract folder name from details string like:
                  // "Auto-queued via Dropbox webhook: Folder Name"
                  const folderName = log.details?.replace("Auto-queued via Dropbox webhook: ", "") ?? "—";
                  const ts = log.created_at ? new Date(log.created_at) : null;

                  return (
                    <div
                      key={log.id}
                      className="flex items-start gap-3 px-3 py-2.5 rounded-md hover:bg-muted/50 transition-colors group"
                    >
                      <FolderPlus className="w-3.5 h-3.5 mt-0.5 text-primary flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate" title={folderName}>
                          {folderName}
                        </p>
                        {ts && (
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {formatDistanceToNow(ts, { addSuffix: true })}
                            <span className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              · {ts.toLocaleString()}
                            </span>
                          </p>
                        )}
                      </div>
                      <Badge
                        variant="secondary"
                        className="text-[10px] bg-primary/10 text-primary flex-shrink-0"
                      >
                        queued
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
