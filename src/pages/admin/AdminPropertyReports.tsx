import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Eye, FileDown, MessageSquare, Building2 } from "lucide-react";

type PropertyRow = {
  id: string;
  name_en: string;
  slug: string;
  location_en: string | null;
  publish_status: "active" | "draft" | "expired";
  publish_start_date: string | null;
  publish_expiry_date: string | null;
};

type Stats = {
  views: number;
  inquiries: number;
  brochures: number;
  floor_plans: number;
  plates: number;
};

export default function AdminPropertyReports() {
  const [rows, setRows] = useState<PropertyRow[]>([]);
  const [stats, setStats] = useState<Record<string, Stats>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  async function load() {
    setIsLoading(true);

    const { data: props } = await (supabase as any)
      .from("properties")
      .select("id,name_en,slug,location_en,publish_status,publish_start_date,publish_expiry_date")
      .order("name_en", { ascending: true });

    const propsList = (props ?? []) as PropertyRow[];
    setRows(propsList);

    // Fetch tracking aggregates in parallel
    const [viewsRes, downloadsRes, inquiriesRes] = await Promise.all([
      (supabase as any).from("property_views").select("property_id"),
      (supabase as any).from("property_downloads").select("property_id,asset_kind"),
      (supabase as any).from("inquiries").select("property_id"),
    ]);

    const next: Record<string, Stats> = {};
    propsList.forEach((p) => {
      next[p.id] = { views: 0, inquiries: 0, brochures: 0, floor_plans: 0, plates: 0 };
    });

    (viewsRes.data ?? []).forEach((v: any) => {
      if (next[v.property_id]) next[v.property_id].views += 1;
    });
    (downloadsRes.data ?? []).forEach((d: any) => {
      const s = next[d.property_id];
      if (!s) return;
      if (d.asset_kind === "brochure") s.brochures += 1;
      else if (d.asset_kind === "floor_plan") s.floor_plans += 1;
      else if (d.asset_kind === "plate") s.plates += 1;
    });
    (inquiriesRes.data ?? []).forEach((i: any) => {
      if (i.property_id && next[i.property_id]) next[i.property_id].inquiries += 1;
    });

    setStats(next);
    setIsLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return rows.filter(
      (r) =>
        r.name_en.toLowerCase().includes(q) ||
        (r.location_en ?? "").toLowerCase().includes(q),
    );
  }, [rows, search]);

  const totals = useMemo(() => {
    return filtered.reduce(
      (acc, r) => {
        const s = stats[r.id];
        if (s) {
          acc.views += s.views;
          acc.inquiries += s.inquiries;
          acc.brochures += s.brochures;
          acc.floor_plans += s.floor_plans;
          acc.plates += s.plates;
        }
        return acc;
      },
      { views: 0, inquiries: 0, brochures: 0, floor_plans: 0, plates: 0 },
    );
  }, [filtered, stats]);

  function exportCsv() {
    const headers = [
      "Property",
      "Location",
      "Publish Status",
      "Start Date",
      "Expiry Date",
      "Views",
      "Inquiries",
      "Brochure Downloads",
      "Floor Plan Downloads",
      "Plate Downloads",
    ];
    const lines = [headers.join(",")];
    filtered.forEach((r) => {
      const s = stats[r.id] ?? { views: 0, inquiries: 0, brochures: 0, floor_plans: 0, plates: 0 };
      lines.push(
        [
          JSON.stringify(r.name_en),
          JSON.stringify(r.location_en ?? ""),
          r.publish_status,
          r.publish_start_date ?? "",
          r.publish_expiry_date ?? "",
          s.views,
          s.inquiries,
          s.brochures,
          s.floor_plans,
          s.plates,
        ].join(","),
      );
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `property-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function statusBadge(s: PropertyRow["publish_status"]) {
    if (s === "active") return <Badge className="bg-green-500/10 text-green-700">Active</Badge>;
    if (s === "draft") return <Badge variant="secondary">Draft</Badge>;
    return <Badge className="bg-red-500/10 text-red-700">Expired</Badge>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Property Reports</h1>
          <p className="text-muted-foreground mt-1">
            Views, inquiries and document downloads per property
          </p>
        </div>
        <Button variant="outline" onClick={exportCsv} disabled={isLoading || filtered.length === 0}>
          <FileDown className="w-4 h-4 me-2" />
          Export CSV
        </Button>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: "Total Views", value: totals.views, icon: Eye },
          { label: "Inquiries", value: totals.inquiries, icon: MessageSquare },
          { label: "Brochures", value: totals.brochures, icon: FileDown },
          { label: "Floor Plans", value: totals.floor_plans, icon: FileDown },
          { label: "Plates", value: totals.plates, icon: FileDown },
        ].map((c) => (
          <div key={c.label} className="border rounded-lg p-4 bg-card">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <c.icon className="w-4 h-4" />
              {c.label}
            </div>
            <div className="mt-1 text-2xl font-semibold">{c.value}</div>
          </div>
        ))}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search properties..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="ps-9"
        />
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Property</TableHead>
              <TableHead>Publish</TableHead>
              <TableHead className="text-end">Views</TableHead>
              <TableHead className="text-end">Inquiries</TableHead>
              <TableHead className="text-end">Brochures</TableHead>
              <TableHead className="text-end">Floor Plans</TableHead>
              <TableHead className="text-end">Plates</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  <Building2 className="w-6 h-6 mx-auto mb-2" />
                  No properties found
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((r) => {
                const s = stats[r.id] ?? { views: 0, inquiries: 0, brochures: 0, floor_plans: 0, plates: 0 };
                return (
                  <TableRow key={r.id}>
                    <TableCell>
                      <Link to={`/admin/properties/${r.id}/edit`} className="font-medium hover:underline">
                        {r.name_en}
                      </Link>
                      <div className="text-xs text-muted-foreground">{r.location_en}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {statusBadge(r.publish_status)}
                        {(r.publish_start_date || r.publish_expiry_date) && (
                          <div className="text-xs text-muted-foreground">
                            {r.publish_start_date ?? "—"} → {r.publish_expiry_date ?? "—"}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-end font-medium">{s.views}</TableCell>
                    <TableCell className="text-end font-medium">{s.inquiries}</TableCell>
                    <TableCell className="text-end font-medium">{s.brochures}</TableCell>
                    <TableCell className="text-end font-medium">{s.floor_plans}</TableCell>
                    <TableCell className="text-end font-medium">{s.plates}</TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
