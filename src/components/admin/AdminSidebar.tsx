import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useQueueCount, useNewSubmissionsCount, usePendingApprovalCount } from "@/hooks/useQueueCount";
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
  Mail,
  ClipboardCheck,
  Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";

function NavBadge({
  count,
  active,
  variant = "primary",
}: {
  count: number;
  active: boolean;
  variant?: "primary" | "destructive";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center min-w-[1.25rem] h-5 rounded-full px-1.5 text-xs font-semibold",
        active
          ? "bg-primary-foreground/20 text-primary-foreground"
          : variant === "destructive"
          ? "bg-destructive text-destructive-foreground"
          : "bg-primary text-primary-foreground"
      )}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

export default function AdminSidebar() {
  const location = useLocation();
  const { t } = useTranslation();
  const { signOut, user } = useAdminAuth();
  const queueCount = useQueueCount();
  const newSubmissionsCount = useNewSubmissionsCount();
  const pendingApprovalCount = usePendingApprovalCount();

  const navItems = [
    { href: "/admin", icon: LayoutDashboard, label: t("admin.nav.dashboard") },
    { href: "/admin/properties", icon: Building2, label: t("admin.nav.properties") },
    { href: "/admin/importer", icon: CloudDownload, label: t("admin.nav.autoImport") },
    { href: "/admin/importer/approval", icon: ClipboardCheck, label: t("admin.nav.approvals") },
    { href: "/admin/gallery", icon: Images, label: t("admin.nav.gallery") },
    { href: "/admin/amenities", icon: Sparkles, label: t("admin.nav.amenities") },
    { href: "/admin/communications", icon: Users, label: t("admin.nav.communications") },
    { href: "/admin/email", icon: Mail, label: t("admin.nav.email") },
    { href: "/admin/insights", icon: Newspaper, label: t("admin.nav.insights") },
    { href: "/admin/home-content", icon: Home, label: t("admin.nav.homePage") },
    { href: "/admin/about", icon: FileText, label: t("admin.nav.aboutPage") },
    { href: "/admin/translations", icon: Languages, label: t("admin.nav.translations") },
    { href: "/admin/settings", icon: Settings, label: t("admin.nav.settings") },
  ];

  const isActive = (href: string) => {
    if (href === "/admin") {
      return location.pathname === "/admin";
    }
    return location.pathname.startsWith(href);
  };

  return (
    <aside className="w-64 bg-card border-e border-border flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <h1 className="text-xl font-semibold">{t("admin.brand")}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t("admin.brandSubtitle")}
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
            <item.icon className="w-5 h-5 shrink-0" />
            <span className="flex-1">{item.label}</span>
            {item.href === "/admin/importer" && queueCount > 0 && (
              <NavBadge count={queueCount} active={isActive(item.href)} />
            )}
            {item.href === "/admin/importer/approval" && pendingApprovalCount > 0 && (
              <NavBadge count={pendingApprovalCount} active={isActive(item.href)} variant="destructive" />
            )}
            {item.href === "/admin/communications" && newSubmissionsCount > 0 && (
              <NavBadge count={newSubmissionsCount} active={isActive(item.href)} variant="destructive" />
            )}
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
          {t("admin.viewSite")}
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
          {t("admin.signOut")}
        </Button>
      </div>
    </aside>
  );
}
