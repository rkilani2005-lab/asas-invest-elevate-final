import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Check, X, Eye, Loader2, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

type Submission = {
  id: string;
  status: string;
  seller_name: string;
  seller_email: string;
  seller_phone: string | null;
  preferred_language: string | null;
  property_name_en: string;
  property_name_ar: string | null;
  category: string;
  unit_type: string | null;
  location_en: string | null;
  location_ar: string | null;
  developer_en: string | null;
  developer_ar: string | null;
  bedrooms: string | null;
  bathrooms: string | null;
  size_sqft: string | null;
  price_aed: string | null;
  description_en: string | null;
  description_ar: string | null;
  photos: string[] | null;
  video_url: string | null;
  admin_notes: string | null;
  approved_property_id: string | null;
  reviewed_at: string | null;
  created_at: string;
};

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);

export default function AdminSellerSubmissions() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState<string>("pending");
  const [active, setActive] = useState<Submission | null>(null);
  const [notes, setNotes] = useState("");
  const [working, setWorking] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["seller_submissions", tab],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seller_submissions" as any)
        .select("*")
        .eq("status", tab)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Submission[];
    },
  });

  const refresh = () =>
    qc.invalidateQueries({ queryKey: ["seller_submissions"] });

  const openSubmission = (s: Submission) => {
    setActive(s);
    setNotes(s.admin_notes || "");
  };

  const reject = async () => {
    if (!active) return;
    setWorking(true);
    const { error } = await supabase
      .from("seller_submissions" as any)
      .update({
        status: "rejected",
        admin_notes: notes,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", active.id);
    setWorking(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Submission rejected" });
    setActive(null);
    refresh();
  };

  const approve = async () => {
    if (!active) return;
    setWorking(true);
    try {
      // 1. Create property row
      const baseSlug = slugify(active.property_name_en) || `listing-${Date.now()}`;
      const slug = `${baseSlug}-${active.id.slice(0, 6)}`;

      const propertyType = active.category === "commercial" ? "ready" : "ready"; // user-listed = ready/resale

      const { data: prop, error: propErr } = await supabase
        .from("properties")
        .insert([
          {
            slug,
            name_en: active.property_name_en,
            name_ar: active.property_name_ar,
            category: active.category as any,
            type: propertyType as any,
            status: "available" as any,
            location_en: active.location_en,
            location_ar: active.location_ar,
            developer_en: active.developer_en,
            developer_ar: active.developer_ar,
            unit_types: active.unit_type ? [active.unit_type] : [],
            size_range: active.size_sqft
              ? `${active.size_sqft} sqft`
              : null,
            price_range: active.price_aed
              ? `AED ${active.price_aed}`
              : null,
            overview_en: active.description_en,
            overview_ar: active.description_ar,
            video_url: active.video_url,
            office_type:
              active.category === "commercial" ? active.unit_type : null,
          } as any,
        ])
        .select("id")
        .single();
      if (propErr) throw propErr;

      // 2. Insert media rows for each photo
      const photos = active.photos || [];
      if (photos.length > 0) {
        const mediaRows = photos.map((url, idx) => ({
          property_id: prop.id,
          type: idx === 0 ? "hero" : "interior",
          url,
          order_index: idx,
        }));
        const { error: mErr } = await supabase
          .from("media")
          .insert(mediaRows as any);
        if (mErr) throw mErr;
      }

      // 3. Mark submission approved
      const { error: upErr } = await supabase
        .from("seller_submissions" as any)
        .update({
          status: "approved",
          admin_notes: notes,
          reviewed_at: new Date().toISOString(),
          approved_property_id: prop.id,
        })
        .eq("id", active.id);
      if (upErr) throw upErr;

      toast({
        title: "Approved & published",
        description: `Listed as /${slug}`,
      });
      setActive(null);
      refresh();
    } catch (err: any) {
      toast({
        title: "Approval failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setWorking(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete submission permanently?")) return;
    const { error } = await supabase
      .from("seller_submissions" as any)
      .delete()
      .eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Deleted" });
    refresh();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold mb-2">Seller Submissions</h1>
        <p className="text-muted-foreground text-sm">
          Review property listings submitted by sellers. Approving creates a live property entry.
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="mb-6">
        <TabsList>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="text-center py-12">
          <Loader2 className="h-6 w-6 mx-auto animate-spin text-muted-foreground" />
        </div>
      ) : !data || data.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-lg">
          <p className="text-muted-foreground">No {tab} submissions.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.map((s) => (
            <div
              key={s.id}
              className="bg-card border border-border rounded-lg p-4 flex flex-col md:flex-row md:items-center gap-4"
            >
              {s.photos && s.photos[0] && (
                <img
                  src={s.photos[0]}
                  alt=""
                  className="w-full md:w-24 h-24 object-cover rounded"
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-medium truncate">{s.property_name_en}</h3>
                  <Badge variant="outline" className="text-xs">
                    {s.category}
                  </Badge>
                  {s.unit_type && (
                    <Badge variant="secondary" className="text-xs">
                      {s.unit_type}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {s.seller_name} · {s.seller_email}
                  {s.seller_phone ? ` · ${s.seller_phone}` : ""}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {s.location_en || "—"} ·{" "}
                  {s.price_aed ? `AED ${s.price_aed}` : "Price n/a"} ·{" "}
                  {format(new Date(s.created_at), "MMM d, yyyy")}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openSubmission(s)}
                >
                  <Eye className="h-4 w-4 me-1" /> Review
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => remove(s.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Review Dialog */}
      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {active && (
            <>
              <DialogHeader>
                <DialogTitle>{active.property_name_en}</DialogTitle>
                {active.property_name_ar && (
                  <p className="text-sm text-muted-foreground" dir="rtl">
                    {active.property_name_ar}
                  </p>
                )}
              </DialogHeader>

              <div className="space-y-4 text-sm">
                <Section title="Seller">
                  <Row label="Name" value={active.seller_name} />
                  <Row label="Email" value={active.seller_email} />
                  <Row label="Phone" value={active.seller_phone} />
                  <Row label="Language" value={active.preferred_language} />
                </Section>

                <Section title="Property">
                  <Row label="Category" value={active.category} />
                  <Row label="Unit type" value={active.unit_type} />
                  <Row label="Location (EN)" value={active.location_en} />
                  <Row label="Location (AR)" value={active.location_ar} rtl />
                  <Row label="Developer (EN)" value={active.developer_en} />
                  <Row label="Developer (AR)" value={active.developer_ar} rtl />
                  <Row label="Bedrooms" value={active.bedrooms} />
                  <Row label="Bathrooms" value={active.bathrooms} />
                  <Row label="Size" value={active.size_sqft && `${active.size_sqft} sqft`} />
                  <Row label="Price" value={active.price_aed && `AED ${active.price_aed}`} />
                </Section>

                {(active.description_en || active.description_ar) && (
                  <Section title="Description">
                    {active.description_en && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">English</p>
                        <p className="whitespace-pre-wrap">{active.description_en}</p>
                      </div>
                    )}
                    {active.description_ar && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Arabic</p>
                        <p className="whitespace-pre-wrap" dir="rtl">
                          {active.description_ar}
                        </p>
                      </div>
                    )}
                  </Section>
                )}

                {active.photos && active.photos.length > 0 && (
                  <Section title={`Photos (${active.photos.length})`}>
                    <div className="grid grid-cols-3 gap-2">
                      {active.photos.map((u, i) => (
                        <a key={i} href={u} target="_blank" rel="noreferrer">
                          <img
                            src={u}
                            alt=""
                            className="w-full aspect-square object-cover rounded"
                          />
                        </a>
                      ))}
                    </div>
                  </Section>
                )}

                {active.video_url && (
                  <Section title="Video">
                    <a
                      href={active.video_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-accent underline break-all text-sm"
                      dir="ltr"
                    >
                      {active.video_url}
                    </a>
                  </Section>
                )}

                {active.status === "pending" && (
                  <Section title="Admin notes (optional)">
                    <Textarea
                      rows={3}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Internal notes or rejection reason"
                    />
                  </Section>
                )}

                {active.approved_property_id && (
                  <p className="text-xs text-muted-foreground">
                    Linked property ID: {active.approved_property_id}
                  </p>
                )}
              </div>

              {active.status === "pending" && (
                <DialogFooter className="gap-2">
                  <Button
                    variant="outline"
                    onClick={reject}
                    disabled={working}
                  >
                    <X className="h-4 w-4 me-1" /> Reject
                  </Button>
                  <Button onClick={approve} disabled={working}>
                    {working ? (
                      <Loader2 className="h-4 w-4 me-1 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4 me-1" />
                    )}
                    Approve & Publish
                  </Button>
                </DialogFooter>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

const Section = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <div className="space-y-2 border-t border-border pt-3">
    <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
      {title}
    </h4>
    {children}
  </div>
);

const Row = ({
  label,
  value,
  rtl,
}: {
  label: string;
  value?: string | null;
  rtl?: boolean;
}) =>
  value ? (
    <div className="flex gap-3">
      <span className="text-muted-foreground w-32 shrink-0">{label}</span>
      <span dir={rtl ? "rtl" : undefined}>{value}</span>
    </div>
  ) : null;
