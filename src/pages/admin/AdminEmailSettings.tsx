import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Mail, Plus, Trash2, TestTube2, CheckCircle, XCircle,
  Settings, AlertCircle, ExternalLink, Loader2, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const PURPOSE_LABELS: Record<string, string> = {
  sales: "Sales (property inquiries, viewings)",
  info: "General Info (contact forms)",
  noreply: "No-Reply (automated confirmations)",
  support: "Support",
  manual: "Manual / Custom",
};

type GmailAccount = {
  id: string;
  email: string;
  purpose: string;
  display_name: string | null;
  is_connected: boolean;
  last_tested_at: string | null;
  token_expiry: string | null;
  created_at: string | null;
};

export default function AdminEmailSettings() {
  const queryClient = useQueryClient();
  const [connectingPurpose, setConnectingPurpose] = useState<string | null>(null);
  const [showSetupGuide, setShowSetupGuide] = useState(false);
  const [notificationEmail, setNotificationEmail] = useState("");
  const [savingNotif, setSavingNotif] = useState(false);
  const [secretsConfigured, setSecretsConfigured] = useState<boolean | null>(null);

  // Probe if secrets are configured by calling the edge function
  useEffect(() => {
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch(`${SUPABASE_URL}/functions/v1/gmail-oauth?action=get_auth_url`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ purpose: "info" }),
        });
        const result = await res.json();
        setSecretsConfigured(!!result.url);
      } catch {
        setSecretsConfigured(false);
      }
    })();
  }, []);

  // Check URL params for OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("gmail_connected") === "true") {
      const email = params.get("email") || "account";
      toast.success(`Gmail account connected: ${email}`);
      queryClient.invalidateQueries({ queryKey: ["gmail_accounts"] });
      window.history.replaceState({}, "", window.location.pathname);
    }
    if (params.get("gmail_error")) {
      toast.error(`Gmail connection failed: ${params.get("gmail_error")}`);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [queryClient]);

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ["gmail_accounts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("gmail_accounts").select("*").order("created_at");
      if (error) throw error;
      return (data || []) as GmailAccount[];
    },
  });

  // Load notification email setting
  useEffect(() => {
    supabase.from("site_settings").select("value").eq("key", "notification_email").maybeSingle().then(({ data }) => {
      if (data?.value) setNotificationEmail(data.value as string);
    });
  }, []);

  const saveNotificationEmail = async () => {
    setSavingNotif(true);
    const { error } = await supabase.from("site_settings").upsert(
      { key: "notification_email", value: notificationEmail },
      { onConflict: "key" }
    );
    setSavingNotif(false);
    if (error) toast.error("Failed to save");
    else toast.success("Notification email saved");
  };

  const testConnection = async (accountId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${SUPABASE_URL}/functions/v1/gmail-oauth?action=test`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ accountId }),
      });
      const result = await res.json();
      if (result.success) {
        toast.success(`Connection verified: ${result.email}`);
        queryClient.invalidateQueries({ queryKey: ["gmail_accounts"] });
      } else {
        toast.error(result.error || "Connection test failed");
      }
    } catch {
      toast.error("Network error testing connection");
    }
  };

  const connectAccount = async (purpose: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${SUPABASE_URL}/functions/v1/gmail-oauth?action=get_auth_url`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ purpose }),
      });
      const result = await res.json();
      if (result.url) {
        window.location.href = result.url;
      } else {
        toast.error(result.error || "Failed to get auth URL. Check that GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are configured.");
      }
    } catch {
      toast.error("Network error");
    }
  };

  const disconnectAccount = async (accountId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${SUPABASE_URL}/functions/v1/gmail-oauth?action=disconnect`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ accountId }),
      });
      const result = await res.json();
      if (result.success) {
        toast.success("Account disconnected");
        queryClient.invalidateQueries({ queryKey: ["gmail_accounts"] });
      }
    } catch {
      toast.error("Network error");
    }
  };

  const connectedPurposes = new Set(accounts.filter((a) => a.is_connected).map((a) => a.purpose));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Email Settings</h1>
        <p className="text-muted-foreground mt-1">Configure Gmail accounts, notifications, and email behaviour</p>
      </div>

      {/* Setup Guide Banner */}
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-amber-800 text-sm">Google Cloud Project Required</p>
              <p className="text-amber-700 text-xs mt-1 leading-relaxed">
                To send emails via Gmail, you need to configure a Google Cloud project with the Gmail API enabled and add your{" "}
                <code className="bg-amber-100 px-1 rounded">GOOGLE_CLIENT_ID</code> and{" "}
                <code className="bg-amber-100 px-1 rounded">GOOGLE_CLIENT_SECRET</code> as secrets.
              </p>
              <Button variant="outline" size="sm" className="mt-2 h-7 text-amber-800 border-amber-300" onClick={() => setShowSetupGuide(true)}>
                View Setup Guide
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gmail Accounts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" /> Gmail Accounts
          </CardTitle>
          <CardDescription>Connect Google Workspace accounts for different email purposes</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : accounts.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-6">No Gmail accounts connected yet.</p>
          ) : (
            <div className="space-y-3">
              {accounts.map((account) => (
                <div key={account.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full ${account.is_connected ? "bg-green-500" : "bg-muted"}`} />
                    <div>
                      <p className="font-medium text-sm">{account.email}</p>
                      <p className="text-xs text-muted-foreground">{PURPOSE_LABELS[account.purpose] || account.purpose}</p>
                      {account.last_tested_at && (
                        <p className="text-xs text-muted-foreground">
                          Last tested: {format(new Date(account.last_tested_at), "MMM d, HH:mm")}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {account.is_connected ? (
                      <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50">
                        <CheckCircle className="w-3 h-3 mr-1" /> Connected
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">Disconnected</Badge>
                    )}
                    <Button size="sm" variant="outline" onClick={() => testConnection(account.id)}>
                      <TestTube2 className="w-3 h-3 mr-1" /> Test
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive hover:text-destructive"
                      onClick={() => disconnectAccount(account.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Separator />

          <div className="space-y-3">
            <p className="text-sm font-medium">Connect New Account</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {Object.entries(PURPOSE_LABELS).map(([purpose, label]) => (
                <Button
                  key={purpose}
                  variant="outline"
                  size="sm"
                  disabled={connectedPurposes.has(purpose)}
                  onClick={() => connectAccount(purpose)}
                  className="justify-start"
                >
                  <Plus className="w-3 h-3 mr-2" />
                  {label.split(" ")[0]}
                  {connectedPurposes.has(purpose) && <CheckCircle className="w-3 h-3 ml-auto text-green-500" />}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification Recipients */}
      <Card>
        <CardHeader>
          <CardTitle>Team Notifications</CardTitle>
          <CardDescription>Email address that receives all new submission alerts</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-1">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground mb-2 block">
                Notification Email
              </Label>
              <Input
                type="email"
                placeholder="info@asas.ae"
                value={notificationEmail}
                onChange={(e) => setNotificationEmail(e.target.value)}
              />
            </div>
            <div className="pt-6">
              <Button onClick={saveNotificationEmail} disabled={savingNotif}>
                {savingNotif ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            All new form submissions (contact, property inquiry, viewing, callback) will send an alert to this email.
          </p>
        </CardContent>
      </Card>

      {/* Setup Guide Dialog */}
      <Dialog open={showSetupGuide} onOpenChange={setShowSetupGuide}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Google Cloud Setup Guide</DialogTitle>
            <DialogDescription>Follow these steps to connect Gmail to ASAS</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <div className="space-y-2">
              {[
                {
                  step: "1",
                  title: "Create a Google Cloud Project",
                  desc: 'Go to console.cloud.google.com → New Project → name it "ASAS Email"',
                },
                {
                  step: "2",
                  title: "Enable Gmail API",
                  desc: "APIs & Services → Library → search Gmail API → Enable",
                },
                {
                  step: "3",
                  title: "Configure OAuth Consent Screen",
                  desc: 'APIs & Services → OAuth consent screen → External → Add scopes: gmail.send, gmail.readonly, userinfo.email. Add your domain to Authorized Domains.',
                },
                {
                  step: "4",
                  title: "Create OAuth 2.0 Credentials",
                  desc: `APIs & Services → Credentials → Create Credentials → OAuth Client ID → Web Application.\n\nAuthorized Redirect URI:\n${SUPABASE_URL}/functions/v1/gmail-oauth-callback`,
                },
                {
                  step: "5",
                  title: "Add Secrets to Lovable Cloud",
                  desc: "Copy your Client ID and Client Secret. Then add them as secrets: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your Lovable project settings.",
                },
                {
                  step: "6",
                  title: "Connect Your Gmail Account",
                  desc: 'Return to this page and click "Connect New Account" for each sender purpose.',
                },
              ].map(({ step, title, desc }) => (
                <div key={step} className="flex gap-3 p-3 bg-muted/50 rounded-lg">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {step}
                  </div>
                  <div>
                    <p className="font-medium">{title}</p>
                    <pre className="text-muted-foreground whitespace-pre-wrap text-xs mt-1">{desc}</pre>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <a
                href="https://console.cloud.google.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" size="sm">
                  <ExternalLink className="w-3 h-3 mr-1" /> Open Google Cloud Console
                </Button>
              </a>
              <Button size="sm" onClick={() => setShowSetupGuide(false)}>Done</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
