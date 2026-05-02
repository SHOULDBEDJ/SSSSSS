import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  LayoutDashboard, CalendarCheck2, Boxes, Wallet, Truck, BarChart3, Link2,
  LogOut, Settings, IndianRupee, User, Image as ImageIcon, Menu,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useI18n } from "@/context/I18nContext";
import { Button } from "@/components/ui/button";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { BusinessLogo } from "@/components/BusinessLogo";
import { ModuleKey } from "@/lib/permissions";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

type NavItem = { to: string; key: ModuleKey; icon: any };

const navItems: NavItem[] = [
  { to: "/dashboard", key: "dashboard", icon: LayoutDashboard },
  { to: "/bookings", key: "bookings", icon: CalendarCheck2 },
  { to: "/inventory", key: "inventory", icon: Boxes },
  { to: "/expenses", key: "expenses", icon: Wallet },
  { to: "/vendors", key: "vendors", icon: Truck },
  { to: "/reports", key: "reports", icon: BarChart3 },
  { to: "/order-link", key: "orderLink", icon: Link2 },
  { to: "/gallery", key: "gallery", icon: ImageIcon },
  { to: "/profile", key: "profile", icon: User },
  { to: "/settings", key: "settings", icon: Settings },
];

const SidebarContent = ({
  onNavigate,
  onLogout,
  email,
  t,
}: {
  onNavigate?: () => void;
  onLogout: () => void;
  email?: string;
  t: (k: string) => string;
}) => (
  <>
    <div className="flex items-center gap-3 px-6 py-6 border-b border-sidebar-border">
      <BusinessLogo size={44} />
      <div className="min-w-0">
        <div className="font-display text-lg leading-tight truncate">ShivaShakti</div>
        <div className="text-[11px] uppercase tracking-[0.18em] text-sidebar-foreground/60">
          Shamiyana
        </div>
      </div>
    </div>
    <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
      {navItems.map(({ to, key, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors ${
              isActive
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
            }`
          }
        >
          <Icon className="h-5 w-5" />
          <span className="text-base">{t(key)}</span>
        </NavLink>
      ))}
    </nav>
    <div className="px-4 py-4 border-t border-sidebar-border space-y-2">
      <div className="text-xs text-sidebar-foreground/60 truncate">{email}</div>
      <Button
        variant="outline"
        size="sm"
        onClick={onLogout}
        className="w-full bg-transparent border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      >
        <LogOut className="mr-2 h-4 w-4" /> {t("signOut")}
      </Button>
    </div>
  </>
);

export const AppLayout = () => {
  const { signOut, user } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => { await signOut(); navigate("/auth"); };

  return (
    <ErrorBoundary>
      <div className="flex h-screen bg-background selection:bg-primary/10 selection:text-primary">
        {/* Desktop sidebar */}
        <aside className="hidden md:flex w-64 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border shadow-xl z-30">
          <SidebarContent onLogout={handleLogout} email={user?.email} t={t} />
        </aside>

        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Top bar — hamburger on mobile, language/logout right side */}
          <header className="sticky top-0 z-20 flex items-center justify-between px-4 md:px-8 h-16 border-b border-border bg-card/80 backdrop-blur-md">
            <div className="flex items-center gap-4">
              {/* Hamburger (mobile only) */}
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden h-10 w-10 hover:bg-muted"
                    aria-label={t("menu")}
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="left"
                  className="p-0 w-72 bg-sidebar text-sidebar-foreground border-sidebar-border"
                >
                  <div className="flex flex-col h-full">
                    <SidebarContent
                      onNavigate={() => setMobileOpen(false)}
                      onLogout={() => { setMobileOpen(false); handleLogout(); }}
                      email={user?.email}
                      t={t}
                    />
                  </div>
                </SheetContent>
              </Sheet>

              {/* Breadcrumbs / Page Context */}
              <div className="hidden sm:block">
                <Breadcrumb>
                  <BreadcrumbList>
                    <BreadcrumbItem>
                      <BreadcrumbLink href="/dashboard" className="text-muted-foreground hover:text-primary transition-colors">
                        {t("dashboard")}
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbPage className="font-bold text-foreground">
                        {t(window.location.pathname.split("/")[1]) || "Page"}
                      </BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
              </div>

              {/* Mobile brand */}
              <div className="md:hidden flex items-center gap-2">
                <BusinessLogo size={28} />
                <div className="font-display text-base font-bold tracking-tight">ShivaShakti</div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center px-3 py-1.5 rounded-full bg-success/10 text-success text-[10px] font-black uppercase tracking-widest border border-success/20">
                <div className="w-1.5 h-1.5 rounded-full bg-success mr-2 animate-pulse" />
                Live Sync Active
              </div>
              <LanguageToggle />
            </div>
          </header>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="p-4 md:p-8 max-w-[1400px] mx-auto animate-in fade-in slide-in-from-bottom-2 duration-500">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </ErrorBoundary>
  );
};
