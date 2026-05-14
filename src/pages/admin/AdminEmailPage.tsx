import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Mail, Search, RefreshCw, CheckCircle, XCircle, Clock, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import AdminEmailSettings from "./AdminEmailSettings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type EmailLog = {
  id: string;
  template_name: string;
  sender_email: string;
  recipient_email: string;
  recipient_type: string | null;
  subject: string;
  status: string | null;
  gmail_message_id: string | null;
  error_message: string | null;
  sent_at: string | null;
  created_at: string | null;
  submission_id: string | null;
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  sent: { label: "Sent", color: "bg-green-500/10 text-green-600", icon: CheckCircle },
  queued: { label: "Queued", color: "bg-blue-500/10 text-blue-600", icon: Clock },
  failed: { label: "Failed", color: "bg-destructive/10 text-destructive", icon: XCircle },
  error: { label: "Error", color: "bg-destructive/10 text-destructive", icon: XCircle },
};

export default function AdminEmailPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["email-log", search, statusFilter, page],
    queryFn: async () => {
      let q = supabase
        .from("email_log")
        .select("*")
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (statusFilter !== "all") {
        q = q.eq("status", statusFilter);
      }
      if (search.trim()) {
        q = q.or(
          `recipient_email.ilike.%${search.trim()}%,subject.ilike.%${search.trim()}%,template_name.ilike.%${search.trim()}%`
        );
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as EmailLog[];
    },
    refetchInterval: 30000,
  });

  const { data: stats } = useQuery({
    queryKey: ["email-log-stats"],
    queryFn: async () => {
      const { data } = await supabase.from("email_log").select("status");
      if (!data) return { total: 0, sent: 0, queued: 0, failed: 0 };
      return {
        total: data.length,
        sent: data.filter((r) => r.status === "sent").length,
        queued: data.filter((r) => r.status === "queued").length,
        failed: data.filter((r) => r.status === "failed" || r.status === "error").length,
      };
    },
    refetchInterval: 30000,
  });

  const statusCfg = (status: string | null) =>
    STATUS_CONFIG[status || "queued"] || { label: status || "Unknown", color: "bg-muted text-muted-foreground", icon: AlertTriangle };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Email</h1>
        <p className="text-muted-foreground mt-1">Gmail accounts, settings, and delivery log</p>
      </div>

      <Tabs defaultValue="log">
        <TabsList>
          <TabsTrigger value="log">
            <Mail className="w-4 h-4 me-2" /> Email Log
          </TabsTrigger>
          <TabsTrigger value="settings">Settings & Accounts</TabsTrigger>
        </TabsList>

        {/* ── EMAIL LOG TAB ── */}
        <TabsContent value="log" className="space-y-4 mt-4">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Total Sent", value: stats?.total ?? 0, color: "text-foreground" },
              { label: "Delivered", value: stats?.sent ?? 0, color: "text-green-600" },
              { label: "Queued", value: stats?.queued ?? 0, color: "text-blue-600" },
              { label: "Failed", value: stats?.failed ?? 0, color: "text-destructive" },
            ].map((s) => (
              <Card key={s.label}>
                <CardContent className="pt-4 pb-3">
                  <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Filters */}
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search recipient, subject…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                className="ps-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="queued">Queued</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={() => queryClient.invalidateQueries({ queryKey: ["email-log"] })}
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>

          {/* Log Table */}
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-4 space-y-3">
                  {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : logs.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <Mail className="w-10 h-10 mx-auto mb-3 opacity-20" />
                  <p>No email logs found</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {logs.map((log) => {
                    const cfg = statusCfg(log.status);
                    const Icon = cfg.icon;
                    return (
                      <div key={log.id} className="flex items-start gap-3 p-4 hover:bg-muted/30 transition-colors">
                        <Icon className="w-4 h-4 mt-1 flex-shrink-0 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm truncate">{log.subject}</span>
                            <Badge variant="secondary" className={`text-xs shrink-0 ${cfg.color}`}>
                              {cfg.label}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground flex items-center gap-3 mt-0.5 flex-wrap">
                            <span>To: {log.recipient_email}</span>
                            <span>From: {log.sender_email}</span>
                            <span className="capitalize">{log.template_name?.replace(/_/g, " ")}</span>
                            {log.created_at && (
                              <span>{format(new Date(log.created_at), "MMM d, HH:mm")}</span>
                            )}
                          </div>
                          {log.error_message && (
                            <p className="text-xs text-destructive mt-1 truncate">{log.error_message}</p>
                          )}
                        </div>
                        {log.gmail_message_id && (
                          <span className="text-xs text-muted-foreground font-mono shrink-0 hidden sm:block">
                            #{log.gmail_message_id.slice(-8)}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pagination */}
          {logs.length === PAGE_SIZE || page > 0 ? (
            <div className="flex justify-center gap-2">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <span className="text-sm text-muted-foreground py-2 px-3">Page {page + 1}</span>
              <Button variant="outline" size="sm" disabled={logs.length < PAGE_SIZE} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          ) : null}
        </TabsContent>

        {/* ── SETTINGS TAB ── */}
        <TabsContent value="settings" className="mt-4">
          <AdminEmailSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
