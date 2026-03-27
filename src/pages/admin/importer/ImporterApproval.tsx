import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CheckCircle2, XCircle, AlertCircle, ChevronDown, ChevronUp,
  Loader2, RefreshCw, Building2, MapPin, User, Calendar,
  Image, BarChart3, ClipboardCheck,
} from "lucide-react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

async function callEdgeFunction(fn: string, body: Record<string, unknown>) {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${fn}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

function CompletionBar({ value }: { value: number }) {
  const color = value >= 80 ? "bg-green-500" : value >= 60 ? "bg-yellow-500" : "bg-red-400";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Field completeness</span>
        <span className="font-medium">{value}%</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function ApprovalCard({ job, onAction }: { job: Record<string, unknown>; onAction: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState("english");
  const [notes, setNotes] = useState("");
  const [acting, setActing] = useState<"approve" | "reject" | null>(null);

  const errors: string[] = (job.validation_errors as string[]) || [];
  const warnings: string[] = (job.validation_warnings as string[]) || [];
  const completeness = (job.field_completeness as number) || 0;
  const isRejected = job.approval_status === "rejected";

  const handleAction = async (action: "approve" | "reject") => {
    if (action === "reject" && !notes.trim()) {
      toast.error("Please add notes explaining what needs to be fixed before rejecting.");
      return;
    }
    setActing(action);
    try {
      await callEdgeFunction("approve-property", {
        job_id: job.id,
        action,
        review_notes: notes.trim() || null,
        reviewed_by: (await supabase.auth.getUser()).data.user?.email || "admin",
      });
      toast.success(action === "approve" ? "Property approved — publishing started" : "Property rejected — content team notified");
      onAction();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    } finally {
      setActing(null);
    }
  };

  const highlights = (job.highlights_en as string || "").split("|").filter(Boolean);
  const highlightsAr = (job.highlights_ar as string || "").split("|").filter(Boolean);

  return (
    <Card className={`overflow-hidden transition-all ${isRejected ? "opacity-60 border-red-200" : "border-border"}`}>
      {/* Header row */}
      <div
        className="flex items-center gap-4 p-4 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-base truncate">{job.name_en as string || job.folder_name as string}</h3>
            {job.name_ar && <span className="text-sm text-muted-foreground font-arabic" dir="rtl">{job.name_ar as string}</span>}
            <Badge variant="outline" className="text-xs capitalize">{job.type as string}</Badge>
            {isRejected && <Badge variant="destructive" className="text-xs">Rejected</Badge>}
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
            {job.developer_en && <span className="flex items-center gap-1"><User className="w-3 h-3" />{job.developer_en as string}</span>}
            {job.location_en && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{job.location_en as string}</span>}
            {job.handover_date && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{job.handover_date as string}</span>}
            <span className="flex items-center gap-1"><Image className="w-3 h-3" />{job.image_count as number || 0} images</span>
            <span>Added {formatDistanceToNow(new Date(job.created_at as string), { addSuffix: true })}</span>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden sm:block w-32">
            <CompletionBar value={completeness} />
          </div>
          {errors.length > 0 && (
            <Badge variant="destructive" className="text-xs gap-1">
              <XCircle className="w-3 h-3" />{errors.length} error{errors.length > 1 ? "s" : ""}
            </Badge>
          )}
          {warnings.length > 0 && (
            <Badge className="text-xs gap-1 bg-yellow-500/10 text-yellow-700 hover:bg-yellow-500/20">
              <AlertCircle className="w-3 h-3" />{warnings.length} warning{warnings.length > 1 ? "s" : ""}
            </Badge>
          )}
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t">
          <div className="p-4 space-y-4">
            {/* Validation */}
            {(errors.length > 0 || warnings.length > 0) && (
              <div className="space-y-2">
                {errors.map((e, i) => (
                  <Alert key={i} variant="destructive" className="py-2">
                    <XCircle className="h-3.5 w-3.5" />
                    <AlertDescription className="text-xs">{e}</AlertDescription>
                  </Alert>
                ))}
                {warnings.map((w, i) => (
                  <Alert key={i} className="py-2 border-yellow-200 bg-yellow-50 text-yellow-800">
                    <AlertCircle className="h-3.5 w-3.5 text-yellow-600" />
                    <AlertDescription className="text-xs">{w}</AlertDescription>
                  </Alert>
                ))}
              </div>
            )}

            {/* Bilingual content preview */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="h-8">
                <TabsTrigger value="english" className="text-xs h-7">English</TabsTrigger>
                <TabsTrigger value="arabic" className="text-xs h-7">العربية</TabsTrigger>
                <TabsTrigger value="investment" className="text-xs h-7">Investment</TabsTrigger>
              </TabsList>

              <TabsContent value="english" className="mt-3 space-y-3">
                {job.tagline_en && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Tagline</p>
                    <p className="text-sm italic">{job.tagline_en as string}</p>
                  </div>
                )}
                {job.overview_en && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Overview</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">{job.overview_en as string}</p>
                  </div>
                )}
                {highlights.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Highlights</p>
                    <ul className="space-y-1">
                      {highlights.map((h, i) => (
                        <li key={i} className="text-sm flex items-start gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />{h}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="arabic" className="mt-3 space-y-3" dir="rtl">
                {job.tagline_ar && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 text-right">الشعار</p>
                    <p className="text-sm italic font-arabic">{job.tagline_ar as string}</p>
                  </div>
                )}
                {job.overview_ar && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 text-right">النظرة العامة</p>
                    <p className="text-sm text-muted-foreground leading-relaxed font-arabic">{job.overview_ar as string}</p>
                  </div>
                )}
                {highlightsAr.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 text-right">المميزات</p>
                    <ul className="space-y-1">
                      {highlightsAr.map((h, i) => (
                        <li key={i} className="text-sm flex items-start gap-2 justify-end font-arabic">{h}<CheckCircle2 className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" /></li>
                      ))}
                    </ul>
                  </div>
                )}
                {!job.overview_ar && !job.tagline_ar && (
                  <p className="text-sm text-muted-foreground text-center py-4">No Arabic content generated</p>
                )}
              </TabsContent>

              <TabsContent value="investment" className="mt-3 space-y-3">
                {job.investment_en && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Investment Copy (EN)</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">{job.investment_en as string}</p>
                  </div>
                )}
                {job.investment_ar && (
                  <div dir="rtl">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 text-right">نص الاستثمار (AR)</p>
                    <p className="text-sm text-muted-foreground leading-relaxed font-arabic">{job.investment_ar as string}</p>
                  </div>
                )}
                {job.price_range && (
                  <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                    <BarChart3 className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Price Range</p>
                      <p className="text-sm font-semibold">{job.price_range as string}</p>
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>

            {/* Review notes + action buttons */}
            {!isRejected && (
              <div className="space-y-3 pt-2 border-t">
                <div className="space-y-1.5">
                  <Label htmlFor={`notes-${job.id}`} className="text-xs">
                    Admin Notes <span className="text-muted-foreground">(required when rejecting)</span>
                  </Label>
                  <Textarea
                    id={`notes-${job.id}`}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add notes for the content team, or approval comments..."
                    className="text-sm resize-none h-20"
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/5 border-destructive/30"
                    onClick={() => handleAction("reject")}
                    disabled={!!acting || errors.length > 0}
                  >
                    {acting === "reject" ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5 mr-1.5" />}
                    Reject & Notify Team
                  </Button>
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => handleAction("approve")}
                    disabled={!!acting || errors.length > 0}
                  >
                    {acting === "approve" ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />}
                    Approve & Publish
                  </Button>
                </div>
                {errors.length > 0 && (
                  <p className="text-xs text-destructive text-center">Fix all errors before approving</p>
                )}
              </div>
            )}

            {isRejected && job.review_notes && (
              <div className="pt-2 border-t">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Rejection Notes</p>
                <p className="text-sm text-muted-foreground">{job.review_notes as string}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Rejected by {job.reviewed_by as string} · {job.reviewed_at ? formatDistanceToNow(new Date(job.reviewed_at as string), { addSuffix: true }) : ""}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

export default function ImporterApproval() {
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected">("pending");
  const queryClient = useQueryClient();

  const { data: jobs = [], isLoading, refetch } = useQuery({
    queryKey: ["approval-jobs", filter],
    queryFn: async () => {
      const statusMap = {
        pending: "pending_review",
        approved: "approved",
        rejected: "rejected",
      };
      const query = supabase
        .from("import_jobs")
        .select("*") as any;
      const { data } = await query
        .eq("approval_status", statusMap[filter])
        .order("created_at", { ascending: false });
      return data || [];
    },
    refetchInterval: 20000,
  });

  const { data: counts } = useQuery({
    queryKey: ["approval-counts"],
    queryFn: async () => {
      const [pending, approved, rejected] = await Promise.all([
        supabase.from("import_jobs").select("*", { count: "exact", head: true }).eq("approval_status", "pending_review"),
        supabase.from("import_jobs").select("*", { count: "exact", head: true }).eq("approval_status", "approved"),
        supabase.from("import_jobs").select("*", { count: "exact", head: true }).eq("approval_status", "rejected"),
      ]);
      return { pending: pending.count ?? 0, approved: approved.count ?? 0, rejected: rejected.count ?? 0 };
    },
    refetchInterval: 20000,
  });

  const onAction = () => {
    queryClient.invalidateQueries({ queryKey: ["approval-jobs"] });
    queryClient.invalidateQueries({ queryKey: ["approval-counts"] });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold flex items-center gap-2">
            <ClipboardCheck className="w-7 h-7" /> Property Approvals
          </h1>
          <p className="text-muted-foreground mt-1">
            Review imported properties before they go live on the website
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh
        </Button>
      </div>

      {/* Status tabs */}
      <div className="flex gap-2 flex-wrap">
        {([
          { key: "pending", label: "Pending Review", count: counts?.pending ?? 0, color: "bg-yellow-500" },
          { key: "approved", label: "Approved", count: counts?.approved ?? 0, color: "bg-green-500" },
          { key: "rejected", label: "Rejected", count: counts?.rejected ?? 0, color: "bg-red-500" },
        ] as const).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
              filter === tab.key ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:bg-muted"
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={`inline-flex items-center justify-center min-w-[1.25rem] h-5 rounded-full px-1.5 text-xs font-bold ${filter === tab.key ? "bg-white/20 text-white" : `${tab.color}/10 text-${tab.color.replace("bg-","")}`} `}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Property cards */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Building2 className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p className="font-medium">
            {filter === "pending" ? "No properties awaiting review" : `No ${filter} properties`}
          </p>
          {filter === "pending" && (
            <p className="text-sm mt-1">
              New imports will appear here if publishing mode is set to "Requires Admin Approval"
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <ApprovalCard key={job.id as string} job={job as Record<string, unknown>} onAction={onAction} />
          ))}
        </div>
      )}
    </div>
  );
}
