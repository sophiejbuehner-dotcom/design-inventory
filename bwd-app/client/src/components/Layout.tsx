import { Link, useLocation } from "wouter";
import { LayoutDashboard, FolderOpen, Package2, Truck, ClipboardList, Settings, Menu, LogOut, PanelLeftClose, PanelLeft } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "../App";
import { cn } from "../lib/utils";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Projects", href: "/projects", icon: FolderOpen },
  { label: "Inventory", href: "/inventory", icon: Package2 },
  { label: "Order Tracking", href: "/order-tracking", icon: Truck },
  { label: "Audit of Goods", href: "/audit", icon: ClipboardList },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem("sidebar") === "true");
  const { user, logout } = useAuth();

  useEffect(() => { localStorage.setItem("sidebar", String(collapsed)); }, [collapsed]);

  const initials = user?.name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "U";

  const NavLinks = ({ mobile = false }: { mobile?: boolean }) => (
    <nav className={cn("flex-1 space-y-1", collapsed && !mobile ? "px-2" : "px-3")}>
      {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
        const active = location === href || (href !== "/" && location.startsWith(href));
        return (
          <Link key={href} href={href} onClick={() => setMobileOpen(false)}
            className={cn(
              "flex items-center rounded-lg text-sm font-medium transition-colors",
              collapsed && !mobile ? "justify-center p-3" : "gap-3 px-3 py-2.5",
              active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}>
            <Icon className="w-5 h-5 shrink-0" />
            {(!collapsed || mobile) && label}
          </Link>
        );
      })}
    </nav>
  );

  const SidebarContent = ({ mobile = false }: { mobile?: boolean }) => (
    <div className="flex flex-col h-full bg-white border-r border-border">
      <div className={cn("flex items-center p-4 border-b border-border", collapsed && !mobile ? "justify-center" : "justify-between")}>
        {(!collapsed || mobile) && (
          <h1 className="text-lg font-display font-bold text-primary truncate">Inventory Systems</h1>
        )}
        {!mobile && (
          <button onClick={() => setCollapsed(!collapsed)} className="p-1.5 rounded-md text-muted-foreground hover:bg-muted transition-colors">
            {collapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        )}
      </div>
      <div className="flex-1 py-4 overflow-y-auto">
        <NavLinks mobile={mobile} />
      </div>
      <div className={cn("p-3 border-t border-border", collapsed && !mobile ? "flex flex-col items-center gap-2" : "")}>
        {collapsed && !mobile ? (
          <>
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">{initials}</div>
            <button onClick={logout} className="p-1.5 rounded-md text-muted-foreground hover:bg-muted transition-colors"><LogOut className="w-4 h-4" /></button>
          </>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">{initials}</div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{user?.name}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.companyName}</p>
              </div>
            </div>
            <button onClick={logout} className="p-1.5 rounded-md text-muted-foreground hover:bg-muted transition-colors shrink-0"><LogOut className="w-4 h-4" /></button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop sidebar */}
      <aside className={cn("hidden md:block fixed inset-y-0 left-0 z-40 transition-all duration-300", collapsed ? "w-16" : "w-64")}>
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64">
            <SidebarContent mobile />
          </aside>
        </div>
      )}

      {/* Main content */}
      <main className={cn("flex-1 transition-all duration-300", collapsed ? "md:ml-16" : "md:ml-64")}>
        <div className="md:hidden flex items-center gap-3 p-4 border-b border-border bg-white">
          <button onClick={() => setMobileOpen(true)} className="p-2 rounded-md hover:bg-muted"><Menu className="w-5 h-5" /></button>
          <h1 className="font-display font-bold text-primary">Inventory Systems</h1>
        </div>
        <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8">
          {children}
        </div>
      </main>
    </div>
  );
}
