import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, Languages, FileText } from "lucide-react";

interface DashboardStats {
  totalProperties: number;
  offPlanProperties: number;
  readyProperties: number;
  newInquiries: number;
  totalInquiries: number;
  translations: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalProperties: 0,
    offPlanProperties: 0,
    readyProperties: 0,
    newInquiries: 0,
    totalInquiries: 0,
    translations: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [
          { count: totalProperties },
          { count: offPlanCount },
          { count: readyCount },
          { count: totalInquiries },
          { count: newInquiries },
          { count: translations },
        ] = await Promise.all([
          supabase.from("properties").select("*", { count: "exact", head: true }),
          supabase.from("properties").select("*", { count: "exact", head: true }).eq("type", "off-plan"),
          supabase.from("properties").select("*", { count: "exact", head: true }).eq("type", "ready"),
          supabase.from("inquiries").select("*", { count: "exact", head: true }),
          supabase.from("inquiries").select("*", { count: "exact", head: true }).eq("status", "new"),
          supabase.from("translations").select("*", { count: "exact", head: true }),
        ]);

        setStats({
          totalProperties: totalProperties ?? 0,
          offPlanProperties: offPlanCount ?? 0,
          readyProperties: readyCount ?? 0,
          totalInquiries: totalInquiries ?? 0,
          newInquiries: newInquiries ?? 0,
          translations: translations ?? 0,
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchStats();
  }, []);

  const statCards = [
    {
      title: "Total Properties",
      value: stats.totalProperties,
      description: `${stats.offPlanProperties} off-plan, ${stats.readyProperties} ready`,
      icon: Building2,
    },
    {
      title: "New Inquiries",
      value: stats.newInquiries,
      description: `${stats.totalInquiries} total inquiries`,
      icon: Users,
    },
    {
      title: "Translations",
      value: stats.translations,
      description: "UI text entries",
      icon: Languages,
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Overview of your site content and activity
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {statCards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <card.icon className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {isLoading ? "..." : card.value}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {card.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <a
            href="/admin/properties"
            className="p-4 rounded-lg border border-border hover:bg-muted transition-colors text-center"
          >
            <Building2 className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
            <span className="text-sm font-medium">Manage Properties</span>
          </a>
          <a
            href="/admin/inquiries"
            className="p-4 rounded-lg border border-border hover:bg-muted transition-colors text-center"
          >
            <Users className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
            <span className="text-sm font-medium">View Inquiries</span>
          </a>
          <a
            href="/admin/translations"
            className="p-4 rounded-lg border border-border hover:bg-muted transition-colors text-center"
          >
            <Languages className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
            <span className="text-sm font-medium">Edit Translations</span>
          </a>
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="p-4 rounded-lg border border-border hover:bg-muted transition-colors text-center"
          >
            <FileText className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
            <span className="text-sm font-medium">Preview Site</span>
          </a>
        </CardContent>
      </Card>
    </div>
  );
}
