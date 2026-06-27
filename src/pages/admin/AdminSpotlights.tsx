import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Star, Loader2, Film } from "lucide-react";
import { toast } from "sonner";
import type { Spotlight, SpotlightProvider } from "@/lib/spotlightVideo";
import { getPosterUrl } from "@/lib/spotlightVideo";

type PropertyOption = { id: string; name_en: string };
type StatRow = {
  id: string; title_en: string; impressions: number; plays: number;
  click_throughs: number; completed: number; play_rate_pct: number | null;
  plays_en: number; plays_ar: number;
};

const EMPTY: Partial<Spotlight> = {
  title_en: "", title_ar: "", hook_en: "", hook_ar: "",
  video_provider: "youtube", video_url: "", thumbnail_url: "",
  community_en: "", community_ar: "", property_id: null,
  sort_order: 0, is_published: true, is_featured: false,
};

export default function AdminSpotlights() {
  const [rows, setRows] = useState<Spotlight[]>([]);
  const [properties, setProperties] = useState<PropertyOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<Partial<Spotlight>>(EMPTY);
  const [saving, setSaving] = useState(false);

  const [stats, setStats] = useState<StatRow[]>([]);
  const [range, setRange] = useState<"7" | "30" | "all">("all");

  useEffect(() => { load(); loadProperties(); }, []);
  useEffect(() => { loadStats(); }, [range]);

  async function load() {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("spotlights")
      .select("*")
      .order("sort_order", { ascending: false })
      .order("published_at", { ascending: false });
    if (error) { toast.error("Failed to load spotlights (is the migration applied?)"); console.error(error); }
    else setRows((data || []) as Spotlight[]);
    setLoading(false);
  }

  async function loadProperties() {
    const { data } = await supabase.from("properties").select("id, name_en").order("name_en");
    setProperties((data || []) as PropertyOption[]);
  }

  async function loadStats() {
    if (range === "all") {
      const { data } = await (supabase as any).from("spotlight_stats").select("*");
      setStats((data || []) as StatRow[]);
      return;
    }
    // Windowed: aggregate raw events client-side.
    const since = new Date(Date.now() - Number(range) * 864e5).toISOString();
    const { data: ev } = await (supabase as any)
      .from("spotlight_events")
      .select("spotlight_id, event_type, locale, created_at")
      .gte("created_at", since);
    const byId: Record<string, StatRow> = {};
    rows.forEach((r) => { byId[r.id] = { id: r.id, title_en: r.title_en, impressions: 0, plays: 0, click_throughs: 0, completed: 0, play_rate_pct: 0, plays_en: 0, plays_ar: 0 }; });
    (ev || []).forEach((e: any) => {
      const s = byId[e.spotlight_id]; if (!s) return;
      if (e.event_type === "impression") s.impressions++;
      else if (e.event_type === "play") { s.plays++; if (e.locale === "ar") s.plays_ar++; else s.plays_en++; }
      else if (e.event_type === "click_through") s.click_throughs++;
      else if (e.event_type === "progress_100") s.completed++;
    });
    Object.values(byId).forEach((s) => { s.play_rate_pct = s.impressions ? Math.round((1000 * s.plays / s.impressions)) / 10 : 0; });
    setStats(Object.values(byId));
  }

  function openCreate() { setForm(EMPTY); setDialogOpen(true); }
  function openEdit(s: Spotlight) { setForm({ ...s }); setDialogOpen(true); }

  async function save() {
    if (!form.title_en?.trim() || !form.title_ar?.trim() || !form.video_url?.trim()) {
      toast.error("Title (EN), Title (AR) and Video URL are required");
      return;
    }
    setSaving(true);
    const payload = {
      title_en: form.title_en, title_ar: form.title_ar,
      hook_en: form.hook_en || null, hook_ar: form.hook_ar || null,
      video_provider: form.video_provider || "youtube",
      video_url: form.video_url,
      thumbnail_url: form.thumbnail_url || null,
      community_en: form.community_en || null, community_ar: form.community_ar || null,
      property_id: form.property_id || null,
      sort_order: Number(form.sort_order) || 0,
      is_published: !!form.is_published,
      is_featured: !!form.is_featured,
      updated_at: new Date().toISOString(),
    };
    const q = form.id
      ? (supabase as any).from("spotlights").update(payload).eq("id", form.id)
      : (supabase as any).from("spotlights").insert(payload);
    const { error } = await q;
    setSaving(false);
    if (error) { toast.error(`Save failed: ${error.message}`); return; }
    toast.success(form.id ? "Spotlight updated" : "Spotlight created");
    setDialogOpen(false);
    load();
  }

  async function remove(id: string) {
    const { error } = await (supabase as any).from("spotlights").delete().eq("id", id);
    if (error) toast.error("Delete failed");
    else { toast.success("Deleted"); load(); }
  }

  async function toggle(id: string, field: "is_published" | "is_featured", value: boolean) {
    const { error } = await (supabase as any).from("spotlights").update({ [field]: value }).eq("id", id);
    if (error) toast.error("Update failed");
    else load();
  }

  const totals = useMemo(() => stats.reduce((a, s) => ({
    impressions: a.impressions + (s.impressions || 0),
    plays: a.plays + (s.plays || 0),
    clicks: a.clicks + (s.click_throughs || 0),
    plays_en: a.plays_en + (s.plays_en || 0),
    plays_ar: a.plays_ar + (s.plays_ar || 0),
  }), { impressions: 0, plays: 0, clicks: 0, plays_en: 0, plays_ar: 0 }), [stats]);
  const overallRate = totals.impressions ? Math.round((1000 * totals.plays / totals.impressions)) / 10 : 0;

  const set = (patch: Partial<Spotlight>) => setForm((f) => ({ ...f, ...patch }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold flex items-center gap-2"><Film className="w-7 h-7 text-primary" /> Spotlight — Project Videos</h1>
          <p className="text-muted-foreground mt-1">Manage the project-video showcase and view engagement.</p>
        </div>
        <Button onClick={openCreate}><Plus className="me-2 h-4 w-4" /> New Video</Button>
      </div>

      <Tabs defaultValue="manage">
        <TabsList>
          <TabsTrigger value="manage">Manage</TabsTrigger>
          <TabsTrigger value="stats">Stats</TabsTrigger>
        </TabsList>

        {/* ── Manage ─────────────────────────────────────────────── */}
        <TabsContent value="manage" className="mt-4">
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Video</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Community</TableHead>
                  <TableHead className="text-center">Order</TableHead>
                  <TableHead className="text-center">Featured</TableHead>
                  <TableHead className="text-center">Published</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>
                ) : rows.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No videos yet — add your first project video.</TableCell></TableRow>
                ) : rows.map((s) => {
                  const poster = getPosterUrl(s);
                  return (
                    <TableRow key={s.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-16 h-10 bg-secondary border border-border overflow-hidden flex items-center justify-center flex-shrink-0">
                            {poster ? <img src={poster} alt="" className="w-full h-full object-cover" /> : <Film className="w-4 h-4 text-muted-foreground" />}
                          </div>
                          <div>
                            <div className="font-medium">{s.title_en}</div>
                            <div className="text-sm text-muted-foreground" dir="rtl">{s.title_ar}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell><Badge variant="outline" className="capitalize">{s.video_provider}</Badge></TableCell>
                      <TableCell className="text-muted-foreground">{s.community_en || "—"}</TableCell>
                      <TableCell className="text-center">{s.sort_order}</TableCell>
                      <TableCell className="text-center">
                        <Button variant="ghost" size="icon" onClick={() => toggle(s.id, "is_featured", !s.is_featured)}>
                          <Star className={`h-4 w-4 ${s.is_featured ? "fill-yellow-400 text-yellow-400" : ""}`} />
                        </Button>
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch checked={s.is_published} onCheckedChange={(v) => toggle(s.id, "is_published", v)} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(s)}><Pencil className="h-4 w-4" /></Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button></AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete video?</AlertDialogTitle>
                                <AlertDialogDescription>This permanently deletes "{s.title_en}" and its analytics events.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => remove(s.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ── Stats ──────────────────────────────────────────────── */}
        <TabsContent value="stats" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Select value={range} onValueChange={(v) => setRange(v as any)}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: "Impressions", value: totals.impressions },
              { label: "Plays", value: totals.plays },
              { label: "Play-rate", value: `${overallRate}%` },
              { label: "Click-throughs", value: totals.clicks },
              { label: "Plays EN / AR", value: `${totals.plays_en} / ${totals.plays_ar}` },
            ].map((c) => (
              <div key={c.label} className="border rounded-lg p-4 bg-card">
                <div className="text-sm text-muted-foreground">{c.label}</div>
                <div className="mt-1 text-2xl font-semibold">{c.value}</div>
              </div>
            ))}
          </div>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Video</TableHead>
                  <TableHead className="text-end">Impressions</TableHead>
                  <TableHead className="text-end">Plays</TableHead>
                  <TableHead className="text-end">Play-rate</TableHead>
                  <TableHead className="text-end">Click-throughs</TableHead>
                  <TableHead className="text-end">Completed</TableHead>
                  <TableHead className="text-end">Plays EN / AR</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No data yet.</TableCell></TableRow>
                ) : [...stats].sort((a, b) => (b.plays || 0) - (a.plays || 0)).map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.title_en}</TableCell>
                    <TableCell className="text-end">{s.impressions || 0}</TableCell>
                    <TableCell className="text-end">{s.plays || 0}</TableCell>
                    <TableCell className="text-end">{s.play_rate_pct ?? 0}%</TableCell>
                    <TableCell className="text-end">{s.click_throughs || 0}</TableCell>
                    <TableCell className="text-end">{s.completed || 0}</TableCell>
                    <TableCell className="text-end">{s.plays_en || 0} / {s.plays_ar || 0}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="text-xs text-muted-foreground">"Completed" only applies to self-hosted MP4 videos; YouTube/Instagram can't report progress.</p>
        </TabsContent>
      </Tabs>

      {/* ── Create / Edit dialog ─────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{form.id ? "Edit video" : "New video"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Title (EN) *"><Input value={form.title_en || ""} onChange={(e) => set({ title_en: e.target.value })} /></Field>
              <Field label="Title (AR) *"><Input dir="rtl" value={form.title_ar || ""} onChange={(e) => set({ title_ar: e.target.value })} /></Field>
              <Field label="Hook (EN)"><Input value={form.hook_en || ""} onChange={(e) => set({ hook_en: e.target.value })} /></Field>
              <Field label="Hook (AR)"><Input dir="rtl" value={form.hook_ar || ""} onChange={(e) => set({ hook_ar: e.target.value })} /></Field>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Provider">
                <Select value={form.video_provider} onValueChange={(v) => set({ video_provider: v as SpotlightProvider })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="youtube">YouTube</SelectItem>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="mp4">MP4 (self-hosted)</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Video URL *"><Input value={form.video_url || ""} onChange={(e) => set({ video_url: e.target.value })} placeholder="https://…" /></Field>
            </div>
            <Field label="Thumbnail URL (recommended for Instagram / MP4)"><Input value={form.thumbnail_url || ""} onChange={(e) => set({ thumbnail_url: e.target.value })} placeholder="https://… (optional)" /></Field>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Community (EN)"><Input value={form.community_en || ""} onChange={(e) => set({ community_en: e.target.value })} /></Field>
              <Field label="Community (AR)"><Input dir="rtl" value={form.community_ar || ""} onChange={(e) => set({ community_ar: e.target.value })} /></Field>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Linked property (optional)">
                <Select value={form.property_id || "none"} onValueChange={(v) => set({ property_id: v === "none" ? null : v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— None —</SelectItem>
                    {properties.map((p) => <SelectItem key={p.id} value={p.id}>{p.name_en}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Sort order (higher = earlier)"><Input type="number" value={form.sort_order ?? 0} onChange={(e) => set({ sort_order: Number(e.target.value) })} /></Field>
            </div>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-sm"><Switch checked={!!form.is_featured} onCheckedChange={(v) => set({ is_featured: v })} /> Featured (homepage big one)</label>
              <label className="flex items-center gap-2 text-sm"><Switch checked={!!form.is_published} onCheckedChange={(v) => set({ is_published: v })} /> Published</label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 me-2 animate-spin" /> : null}Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
