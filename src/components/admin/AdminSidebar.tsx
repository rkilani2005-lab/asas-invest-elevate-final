import { Link, useLocation } from "react-router-dom";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useQueueCount } from "@/hooks/useQueueCount";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Building2,
  Users,
  Languages,
  Settings,
  LogOut,
  ExternalLink,
  Newspaper,
  Home,
  Sparkles,
  Images,
  FileText,
  CloudDownload,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/admin", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/admin/properties", icon: Building2, label: "Properties" },
  { href: "/admin/importer", icon: CloudDownload, label: "Auto Import" },
  { href: "/admin/gallery", icon: Images, label: "Gallery" },
  { href: "/admin/amenities", icon: Sparkles, label: "Amenity Library" },
  { href: "/admin/communications", icon: Users, label: "Communications" },
  { href: "/admin/insights", icon: Newspaper, label: "Insights" },
  { href: "/admin/home-content", icon: Home, label: "Home Page" },
  { href: "/admin/about", icon: FileText, label: "About Page" },
  { href: "/admin/translations", icon: Languages, label: "Translations" },
  { href: "/admin/settings", icon: Settings, label: "Settings" },
];

export default function AdminSidebar() {
  const location = useLocation();
  const { signOut, user } = useAdminAuth();

  const isActive = (href: string) => {
    if (href === "/admin") {
      return location.pathname === "/admin";
    }
    return location.pathname.startsWith(href);
  };

  return (
    <aside className="w-64 bg-card border-r border-border flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <h1 className="text-xl font-semibold">Asas CMS</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Content Management
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
              isActive(item.href)
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border space-y-2">
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          View Site
        </a>
        <div className="px-3 py-2 text-xs text-muted-foreground truncate">
          {user?.email}
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive"
          onClick={signOut}
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </Button>
      </div>
    </aside>
  );
}
