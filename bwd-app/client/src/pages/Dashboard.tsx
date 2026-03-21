import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Layout } from "../components/Layout";
import { Package2, FolderOpen, Archive, ArrowRight, Plus, Loader2 } from "lucide-react";
import { format } from "date-fns";

export default function Dashboard() {
  const { data: projects = [], isLoading: pLoading } = useQuery<any[]>({ queryKey: ["/api/projects"], queryFn: async () => { const r = await fetch("/api/projects", { credentials: "include" }); return r.json(); } });
  const { data: items = [], isLoading: iLoading } = useQuery<any[]>({ queryKey: ["/api/items"], queryFn: async () => { const r = await fetch("/api/items", { credentials: "include" }); return r.json(); } });

  const active = projects.filter((p: any) => p.status !== "archived");
  const archived = projects.filter((p: any) => p.status === "archived");

  return (
    <Layout>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-primary">BWD Inventory Overview</h1>
          <p className="text-muted-foreground mt-1">Manage your inventory and projects</p>
        </div>
        <Link href="/projects">
          <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
            <Plus className="w-4 h-4" /> New Project
          </button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Catalog Items", value: items.length, href: "/inventory", icon: Package2 },
          { label: "Active Projects", value: active.length, href: "/projects", icon: FolderOpen },
          { label: "Archived Projects", value: archived.length, href: "/projects", icon: Archive },
        ].map(({ label, value, href, icon: Icon }) => (
          <Link key={label} href={href}>
            <div className="bg-white border border-border rounded-xl p-6 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-muted-foreground">{label}</p>
                <Icon className="w-4 h-4 text-primary/40" />
              </div>
              <p className="text-3xl font-display font-bold text-foreground">{iLoading || pLoading ? "—" : value}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Active projects */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-display font-bold">Current Projects</h2>
          <Link href="/projects" className="flex items-center gap-1 text-sm text-primary hover:underline">
            View all <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        {pLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : active.length === 0 ? (
          <div className="border border-dashed border-border rounded-xl p-12 text-center text-muted-foreground">
            No active projects yet.{" "}
            <Link href="/projects" className="text-primary hover:underline">Create one</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {active.map((p: any) => (
              <Link key={p.id} href={`/projects/${p.id}`}>
                <div className="bg-white border border-border rounded-xl p-5 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-display font-semibold text-lg group-hover:text-primary transition-colors">{p.name}</h3>
                    <ArrowRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                  </div>
                  {p.clientName && <p className="text-sm text-muted-foreground mb-3">{p.clientName}</p>}
                  <p className="text-xs text-muted-foreground">
                    Started {format(new Date(p.createdAt), "MMM d, yyyy")}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Recent inventory */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-display font-bold">Recent Inventory</h2>
          <Link href="/inventory" className="flex items-center gap-1 text-sm text-primary hover:underline">
            Browse catalog <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="bg-white border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Item</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Category</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Qty</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Client Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {iLoading ? (
                <tr><td colSpan={4} className="text-center py-8 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></td></tr>
              ) : items.slice(0, 6).map((item: any) => (
                <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-md bg-secondary overflow-hidden shrink-0 flex items-center justify-center">
                        {item.imageUrl ? <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" /> : <Package2 className="w-4 h-4 text-muted-foreground/40" />}
                      </div>
                      <div>
                        <p className="font-medium">{item.name}</p>
                        {item.vendor && <p className="text-xs text-muted-foreground">{item.vendor}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{item.category || "—"}</td>
                  <td className="px-4 py-3 text-right">{item.quantity}</td>
                  <td className="px-4 py-3 text-right font-mono hidden md:table-cell">${item.price}</td>
                </tr>
              ))}
              {!iLoading && items.length === 0 && (
                <tr><td colSpan={4} className="text-center py-8 text-muted-foreground">No items yet. <Link href="/inventory" className="text-primary hover:underline">Add your first item</Link></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </Layout>
  );
}
