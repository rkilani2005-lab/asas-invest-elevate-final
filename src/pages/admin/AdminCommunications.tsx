import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import {
  Search, Download, Eye, Mail, Phone, User, Calendar,
  MessageSquare, Building2, CheckCircle, X, RefreshCw,
  Clock, Send, Loader2, RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";

type Submission = {
  id: string;
  form_type: string;
  visitor_name: string | null;
  visitor_email: string;
  visitor_phone: string | null;
  visitor_message: string | null;
  preferred_language: string | null;
  preferred_contact: string | null;
  property_name: string | null;
  unit_type_interest: string | null;
  budget_range: string | null;
  purpose: string | null;
  viewing_date: string | null;
  viewing_time: string | null;
  callback_time: string | null;
  subject: string | null;
  status: string;
  notes: string | null;
  email_sent: boolean | null;
  team_notified: boolean | null;
  assigned_agent_id: string | null;
  source_page: string | null;
  utm_source: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type EmailLog = {
  id: string;
  template_name: string;
  sender_email: string;
  recipient_email: string;
  recipient_type: string | null;
  subject: string;
  status: string;
  sent_at: string | null;
  created_at: string | null;
  error_message: string | null;
};

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  new: { label: "New", className: "bg-blue-100 text-blue-700 border-blue-200" },
  contacted: { label: "Contacted", className: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  in_progress: { label: "In Progress", className: "bg-purple-100 text-purple-700 border-purple-200" },
  converted: { label: "Converted", className: "bg-green-100 text-green-700 border-green-200" },
  closed: { label: "Closed", className: "bg-muted text-muted-foreground border-muted" },
  spam: { label: "Spam", className: "bg-red-100 text-red-700 border-red-200" },
};

const FORM_TYPE_LABELS: Record<string, string> = {
  contact: "General Inquiry",
  property_inquiry: "Property Inquiry",
  schedule_viewing: "Viewing Request",
  callback: "Callback",
  newsletter: "Newsletter",
  brochure_download: "Brochure",
};

export default function AdminCommunications() {
  const queryClient = useQueryClient();
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newCount, setNewCount] = useState(0);
  const [bannerVisible, setBannerVisible] = useState(false);
  const knownIds = useRef<Set<string>>(new Set());

  const { data: submissions = [], isLoading, refetch } = useQuery({
    queryKey: ["form_submissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("form_submissions")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      // seed known IDs
      if (knownIds.current.size === 0) {
        data?.forEach((s) => knownIds.current.add(s.id));
      }
      return (data || []) as Submission[];
    },
    refetchInterval: 30000,
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("form_submissions_realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "form_submissions" },
        (payload) => {
          const newSub = payload.new as Submission;
          if (!knownIds.current.has(newSub.id)) {
            knownIds.current.add(newSub.id);
            setNewCount((c) => c + 1);
            setBannerVisible(true);
            toast(`📨 New ${FORM_TYPE_LABELS[newSub.form_type] || "submission"} from ${newSub.visitor_name || newSub.visitor_email}`, {
              duration: 6000,
            });
            queryClient.invalidateQueries({ queryKey: ["form_submissions"] });
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const selectedSubmission = submissions.find((s) => s.id === selectedId) || null;

  const { data: emailLogs = [] } = useQuery({
    queryKey: ["email_log", selectedId],
    queryFn: async () => {
      if (!selectedId) return [];
      const { data } = await supabase
        .from("email_log")
        .select("*")
        .eq("submission_id", selectedId)
        .order("created_at", { ascending: true });
      return (data || []) as EmailLog[];
    },
    enabled: !!selectedId,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("form_submissions")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["form_submissions"] });
      toast.success("Status updated");
    },
  });

  const updateNotesMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const { error } = await supabase
        .from("form_submissions")
        .update({ notes })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["form_submissions"] });
      toast.success("Notes saved");
    },
  });

  const resendEmailMutation = useMutation({
    mutationFn: async (submission: Submission) => {
      // Fetch a connected gmail account
      const { data: gmailAccount } = await supabase
        .from("gmail_accounts")
        .select("*")
        .eq("is_connected", true)
        .limit(1)
        .maybeSingle();

      // Fetch team notification email
      const { data: settingRow } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "notification_email")
        .maybeSingle();
      const teamEmail = (settingRow?.value as string) || "admin@asasinvest.com";

      const resp = await supabase.functions.invoke("send-email", {
        body: {
          submission_id: submission.id,
          form_type: submission.form_type,
          visitor_name: submission.visitor_name,
          visitor_email: submission.visitor_email,
          visitor_phone: submission.visitor_phone,
          visitor_message: submission.visitor_message,
          preferred_language: submission.preferred_language || "en",
          property_name: submission.property_name,
          viewing_date: submission.viewing_date,
          viewing_time: submission.viewing_time,
          callback_time: submission.callback_time,
          budget_range: submission.budget_range,
          unit_type_interest: submission.unit_type_interest,
          team_email: teamEmail,
          gmail_account: gmailAccount,
        },
      });
      if (resp.error) throw resp.error;
      return resp.data;
    },
    onMutate: (submission) => setResendingId(submission.id),
    onSuccess: (_, submission) => {
      setResendingId(null);
      toast.success(`Email resent to ${submission.visitor_email}`);
      queryClient.invalidateQueries({ queryKey: ["form_submissions"] });
      queryClient.invalidateQueries({ queryKey: ["email_log", submission.id] });
    },
    onError: (err, submission) => {
      setResendingId(null);
      toast.error(`Failed to resend: ${String(err)}`);
    },
  });

  const [notesValue, setNotesValue] = useState("");
  useEffect(() => {
    setNotesValue(selectedSubmission?.notes || "");
  }, [selectedId, selectedSubmission?.notes]);

  const filtered = submissions.filter((s) => {
    const q = search.toLowerCase();
    const matchSearch =
      (s.visitor_name?.toLowerCase().includes(q) ?? false) ||
      s.visitor_email.toLowerCase().includes(q) ||
      (s.visitor_phone?.toLowerCase().includes(q) ?? false) ||
      (s.property_name?.toLowerCase().includes(q) ?? false);
    const matchStatus = statusFilter === "all" || s.status === statusFilter;
    const matchType = typeFilter === "all" || s.form_type === typeFilter;
    return matchSearch && matchStatus && matchType;
  });

  const todayCount = submissions.filter(
    (s) => s.created_at && new Date(s.created_at).toDateString() === new Date().toDateString()
  ).length;

  const exportCSV = () => {
    const headers = ["Date", "Type", "Name", "Email", "Phone", "Property", "Status", "Source"];
    const rows = filtered.map((s) => [
      s.created_at ? format(new Date(s.created_at), "yyyy-MM-dd HH:mm") : "",
      FORM_TYPE_LABELS[s.form_type] || s.form_type,
      s.visitor_name || "",
      s.visitor_email,
      s.visitor_phone || "",
      s.property_name || "",
      s.status,
      s.source_page || "",
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `submissions-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Communications</h1>
          <p className="text-muted-foreground mt-1">
            {todayCount} new {todayCount === 1 ? "submission" : "submissions"} today · {submissions.length} total
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 me-2" /> Refresh
          </Button>
          <Button variant="outline" onClick={exportCSV}>
            <Download className="w-4 h-4 me-2" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Realtime banner */}
      {bannerVisible && (
        <div className="flex items-center justify-between bg-primary/10 border border-primary/20 rounded-lg p-3 px-4">
          <span className="text-sm text-primary font-medium">
            🔔 {newCount} new {newCount === 1 ? "submission" : "submissions"} received
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="h-7"
              onClick={() => { refetch(); setBannerVisible(false); setNewCount(0); }}>
              View
            </Button>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0"
              onClick={() => { setBannerVisible(false); setNewCount(0); }}>
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search name, email, phone..." value={search} onChange={(e) => setSearch(e.target.value)} className="ps-9" />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Form type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {Object.entries(FORM_TYPE_LABELS).map(([v, l]) => (
              <SelectItem key={v} value={v}>{l}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {Object.entries(STATUS_STYLES).map(([v, s]) => (
              <SelectItem key={v} value={v}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Visitor</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Property</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-end">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                  No submissions found
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((s) => (
                <TableRow key={s.id} className="cursor-pointer hover:bg-muted/30" onClick={() => setSelectedId(s.id)}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">{s.visitor_name || "—"}</p>
                      <p className="text-xs text-muted-foreground">{s.visitor_email}</p>
                      {s.visitor_phone && <p className="text-xs text-muted-foreground">{s.visitor_phone}</p>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs bg-muted px-2 py-1 rounded-full">
                      {FORM_TYPE_LABELS[s.form_type] || s.form_type}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{s.property_name || "—"}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Select
                      value={s.status}
                      onValueChange={(v) => updateStatusMutation.mutate({ id: s.id, status: v })}
                    >
                      <SelectTrigger className="w-[130px] h-8" onClick={(e) => e.stopPropagation()}>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border ${STATUS_STYLES[s.status]?.className}`}>
                          {STATUS_STYLES[s.status]?.label || s.status}
                        </span>
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(STATUS_STYLES).map(([v, st]) => (
                          <SelectItem key={v} value={v}>{st.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1.5">
                      {s.email_sent ? (
                        <span className="text-xs text-primary flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> Sent
                        </span>
                      ) : (
                        <>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Pending
                          </span>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-6 w-6"
                                  disabled={resendingId === s.id}
                                  onClick={(e) => { e.stopPropagation(); resendEmailMutation.mutate(s); }}
                                >
                                  {resendingId === s.id
                                    ? <Loader2 className="w-3 h-3 animate-spin" />
                                    : <RotateCcw className="w-3 h-3" />}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Resend email</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {s.created_at ? formatDistanceToNow(new Date(s.created_at), { addSuffix: true }) : "—"}
                  </TableCell>
                  <TableCell className="text-end">
                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setSelectedId(s.id); }}>
                      <Eye className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedId} onOpenChange={() => setSelectedId(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Submission Detail</DialogTitle>
          </DialogHeader>
          {selectedSubmission && (
            <ScrollArea className="flex-1">
              <div className="space-y-6 pe-4">
                {/* Visitor info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Visitor</h3>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{selectedSubmission.visitor_name || "—"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <a href={`mailto:${selectedSubmission.visitor_email}`} className="text-primary hover:underline text-sm">
                        {selectedSubmission.visitor_email}
                      </a>
                    </div>
                    {selectedSubmission.visitor_phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <a href={`tel:${selectedSubmission.visitor_phone}`} className="text-sm">{selectedSubmission.visitor_phone}</a>
                      </div>
                    )}
                    {selectedSubmission.property_name && (
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{selectedSubmission.property_name}</span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-3">
                    <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Submission</h3>
                    <div>
                      <span className="text-xs bg-muted px-2 py-1 rounded-full">
                        {FORM_TYPE_LABELS[selectedSubmission.form_type]}
                      </span>
                    </div>
                    <div>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border ${STATUS_STYLES[selectedSubmission.status]?.className}`}>
                        {STATUS_STYLES[selectedSubmission.status]?.label}
                      </span>
                    </div>
                    {selectedSubmission.created_at && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        {format(new Date(selectedSubmission.created_at), "PPp")}
                      </div>
                    )}
                    {selectedSubmission.source_page && (
                      <p className="text-xs text-muted-foreground">Source: {selectedSubmission.source_page}</p>
                    )}
                  </div>
                </div>

                {/* Details */}
                {(selectedSubmission.visitor_message || selectedSubmission.budget_range || selectedSubmission.viewing_date || selectedSubmission.callback_time) && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Details</h3>
                      {selectedSubmission.visitor_message && (
                        <div className="bg-muted rounded-lg p-3">
                          <p className="text-sm">{selectedSubmission.visitor_message}</p>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        {selectedSubmission.budget_range && (
                          <div><span className="text-muted-foreground">Budget: </span>{selectedSubmission.budget_range}</div>
                        )}
                        {selectedSubmission.unit_type_interest && (
                          <div><span className="text-muted-foreground">Units: </span>{selectedSubmission.unit_type_interest}</div>
                        )}
                        {selectedSubmission.viewing_date && (
                          <div><span className="text-muted-foreground">Viewing: </span>{selectedSubmission.viewing_date} {selectedSubmission.viewing_time}</div>
                        )}
                        {selectedSubmission.callback_time && (
                          <div><span className="text-muted-foreground">Callback time: </span>{selectedSubmission.callback_time}</div>
                        )}
                        {selectedSubmission.preferred_contact && (
                          <div><span className="text-muted-foreground">Contact via: </span>{selectedSubmission.preferred_contact}</div>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {/* Status update */}
                <Separator />
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Update Status</h3>
                  <Select
                    value={selectedSubmission.status}
                    onValueChange={(v) => updateStatusMutation.mutate({ id: selectedSubmission.id, status: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_STYLES).map(([v, st]) => (
                        <SelectItem key={v} value={v}>{st.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Internal Notes</h3>
                  <Textarea
                    value={notesValue}
                    onChange={(e) => setNotesValue(e.target.value)}
                    placeholder="Add internal notes..."
                    rows={3}
                    className="resize-none"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={updateNotesMutation.isPending}
                    onClick={() => updateNotesMutation.mutate({ id: selectedSubmission.id, notes: notesValue })}
                  >
                    {updateNotesMutation.isPending ? <Loader2 className="w-3 h-3 me-1 animate-spin" /> : null}
                    Save Notes
                  </Button>
                </div>

                {/* Email log */}
                {emailLogs.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Email History</h3>
                      <div className="space-y-2">
                        {emailLogs.map((log) => (
                          <div key={log.id} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                            <Mail className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{log.subject}</p>
                              <p className="text-xs text-muted-foreground">
                                To: {log.recipient_email} · {log.recipient_type}
                              </p>
                              {log.error_message && (
                                <p className="text-xs text-destructive mt-1">{log.error_message}</p>
                              )}
                            </div>
                            <div className="text-end flex-shrink-0 flex flex-col items-end gap-1">
                              <span className={`text-xs px-2 py-0.5 rounded-full border ${
                                log.status === "sent" ? "bg-primary/10 text-primary border-primary/20" :
                                log.status === "queued" ? "bg-muted text-muted-foreground border-muted" :
                                "bg-destructive/10 text-destructive border-destructive/20"
                              }`}>
                                {log.status}
                              </span>
                              {log.created_at && (
                                <p className="text-xs text-muted-foreground">
                                  {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Quick actions */}
                <Separator />
                <div className="flex gap-2 flex-wrap">
                  {/* Resend email — shown when email not yet sent or last log was not sent */}
                  {(!selectedSubmission.email_sent || emailLogs.some(l => l.status !== "sent")) && (
                    <Button
                      size="sm"
                      variant="default"
                      disabled={resendingId === selectedSubmission.id}
                      onClick={() => resendEmailMutation.mutate(selectedSubmission)}
                    >
                      {resendingId === selectedSubmission.id
                        ? <Loader2 className="w-3 h-3 me-1 animate-spin" />
                        : <RotateCcw className="w-3 h-3 me-1" />}
                      {selectedSubmission.email_sent ? "Resend Email" : "Send Email"}
                    </Button>
                  )}
                  <a href={`mailto:${selectedSubmission.visitor_email}`} target="_blank" rel="noreferrer">
                    <Button size="sm" variant="outline">
                      <Mail className="w-3 h-3 me-1" /> Reply via Email
                    </Button>
                  </a>
                  {selectedSubmission.visitor_phone && (
                    <a href={`https://wa.me/${selectedSubmission.visitor_phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">
                      <Button size="sm" variant="outline">
                        <MessageSquare className="w-3 h-3 me-1" /> WhatsApp
                      </Button>
                    </a>
                  )}
                  {selectedSubmission.visitor_phone && (
                    <a href={`tel:${selectedSubmission.visitor_phone}`}>
                      <Button size="sm" variant="outline">
                        <Phone className="w-3 h-3 me-1" /> Call
                      </Button>
                    </a>
                  )}
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
