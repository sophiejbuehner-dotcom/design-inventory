import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Layout } from "../components/Layout";
import { ArrowLeft, Plus, Loader2, X, Package2, Trash2, CheckCircle2, RotateCcw, Wrench, Download } from "lucide-react";
import { apiRequest } from "../lib/queryClient";

const STATUS_COLORS: Record<string, string> = {
  pulled: "bg-blue-100 text-blue-700",
  returned: "bg-amber-100 text-amber-700",
  installed: "bg-green-100 text-green-700",
};

function AddItemModal({ projectId, onClose }: { projectId: number; onClose: () => void }) {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"existing" | "new">("existing");
  const [search, setSearch] = useState("");
  const { data: items = [] } = useQuery<any[]>({
    queryKey: ["/api/items", search],
    queryFn: async () => (await fetch(`/api/items${search ? `?search=${encodeURIComponent(search)}` : ""}`, { credentials: "include" })).json(),
  });

  const addMutation = useMutation({
    mutationFn: async (data: any) => (await apiRequest("POST", `/api/projects/${projectId}/items`, data)).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/projects"] }); onClose(); },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => (await apiRequest("POST", `/api/projects/${projectId}/create-item`, data)).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/projects"] }); qc.invalidateQueries({ queryKey: ["/api/items"] }); onClose(); },
  });

  const [newItem, setNewItem] = useState({ name: "", vendor: "", quantity: 1, price: "0.00", bwdPrice: "0.00", projectQuantity: 1 });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl w-full max-w-xl max-h-[85vh] flex flex-col shadow-xl">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-xl font-display font-bold">Add Item to Project</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex border-b border-border">
          {["existing", "new"].map((t) => (
            <button key={t} onClick={() => setTab(t as any)}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${tab === t ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"}`}>
              {t === "existing" ? "From Inventory" : "Order New Item"}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {tab === "existing" ? (
            <div className="space-y-3">
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search inventory..."
                className="w-full h-10 px-3 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {items.map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-md bg-secondary shrink-0 flex items-center justify-center overflow-hidden">
                        {item.imageUrl ? <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" /> : <Package2 className="w-4 h-4 text-muted-foreground/40" />}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{item.vendor} · Qty: {item.quantity}</p>
                      </div>
                    </div>
                    <button onClick={() => addMutation.mutate({ itemId: item.id, quantity: 1, status: "pulled" })}
                      disabled={addMutation.isPending}
                      className="shrink-0 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 disabled:opacity-50">
                      Add
                    </button>
                  </div>
                ))}
                {items.length === 0 && <p className="text-center text-sm text-muted-foreground py-6">No items found</p>}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Creates a new item in inventory and adds it to this project.</p>
              {[
                { label: "Item Name *", key: "name", type: "text" },
                { label: "Vendor", key: "vendor", type: "text" },
                { label: "Quantity in Inventory", key: "quantity", type: "number" },
                { label: "Quantity for Project", key: "projectQuantity", type: "number" },
                { label: "Client Price ($)", key: "price", type: "text" },
                { label: "BWD Price ($)", key: "bwdPrice", type: "text" },
              ].map(({ label, key, type }) => (
                <div key={key}>
                  <label className="text-sm font-medium block mb-1.5">{label}</label>
                  <input type={type} value={(newItem as any)[key]} onChange={(e) => setNewItem({ ...newItem, [key]: type === "number" ? parseInt(e.target.value) || 0 : e.target.value })}
                    className="w-full h-10 px-3 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
              ))}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-input text-sm hover:bg-muted">Cancel</button>
                <button onClick={() => createMutation.mutate(newItem)} disabled={!newItem.name || createMutation.isPending}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2">
                  {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />} Create & Add
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProjectDetails() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [showAddItem, setShowAddItem] = useState(false);

  const { data: project, isLoading } = useQuery<any>({
    queryKey: ["/api/projects", id],
    queryFn: async () => (await fetch(`/api/projects/${id}`, { credentials: "include" })).json(),
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ piId, data }: { piId: number; data: any }) => apiRequest("PATCH", `/api/projects/${id}/items/${piId}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/projects", id] }),
  });

  const removeItemMutation = useMutation({
    mutationFn: (piId: number) => apiRequest("DELETE", `/api/projects/${id}/items/${piId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/projects", id] }),
  });

  const archiveMutation = useMutation({
    mutationFn: (status: string) => apiRequest("PATCH", `/api/projects/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/projects", id] }),
  });

  const exportCSV = () => {
    if (!project?.items?.length) return;
    const rows = [["Item", "Vendor", "Quantity", "Status", "Notes"]];
    project.items.forEach((pi: any) => rows.push([pi.item?.name || "", pi.item?.vendor || "", pi.quantity, pi.status, pi.notes || ""]));
    const csv = rows.map(r => r.map((c: any) => `"${c}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = "data:text/csv," + encodeURIComponent(csv);
    a.download = `${project.name}-pull-list.csv`;
    a.click();
  };

  if (isLoading) return <Layout><div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div></Layout>;
  if (!project) return <Layout><p className="text-center py-20 text-muted-foreground">Project not found.</p></Layout>;

  const statusCounts = { pulled: 0, returned: 0, installed: 0 };
  project.items?.forEach((pi: any) => { if (pi.status in statusCounts) (statusCounts as any)[pi.status]++; });

  return (
    <Layout>
      {showAddItem && <AddItemModal projectId={parseInt(id!)} onClose={() => setShowAddItem(false)} />}

      <div>
        <Link href="/projects" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 w-fit">
          <ArrowLeft className="w-4 h-4" /> Back to Projects
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-display font-bold text-primary">{project.name}</h1>
              {project.status === "archived" && (
                <span className="px-2.5 py-0.5 bg-muted text-muted-foreground text-xs rounded-full font-medium">Archived</span>
              )}
            </div>
            {project.clientName && <p className="text-muted-foreground mt-1">{project.clientName}</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-input text-sm hover:bg-muted transition-colors">
              <Download className="w-4 h-4" /> Export CSV
            </button>
            <button onClick={() => archiveMutation.mutate(project.status === "archived" ? "active" : "archived")}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-input text-sm hover:bg-muted transition-colors">
              <Archive className="w-4 h-4" /> {project.status === "archived" ? "Restore" : "Archive"}
            </button>
            <button onClick={() => setShowAddItem(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90">
              <Plus className="w-4 h-4" /> Add Item
            </button>
          </div>
        </div>

        {/* Status summary */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {Object.entries(statusCounts).map(([status, count]) => (
            <div key={status} className="bg-white border border-border rounded-xl p-4 text-center">
              <p className="text-2xl font-bold">{count}</p>
              <p className="text-sm text-muted-foreground capitalize mt-0.5">{status}</p>
            </div>
          ))}
        </div>

        {/* Pull list */}
        <div className="bg-white border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="font-display font-semibold">Pull List ({project.items?.length || 0} items)</h2>
          </div>
          {!project.items?.length ? (
            <div className="text-center py-12 text-muted-foreground">
              No items yet.{" "}
              <button onClick={() => setShowAddItem(true)} className="text-primary hover:underline">Add your first item</button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {project.items.map((pi: any) => (
                <div key={pi.id} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/20 transition-colors">
                  <div className="w-10 h-10 rounded-md bg-secondary shrink-0 overflow-hidden flex items-center justify-center">
                    {pi.item?.imageUrl ? <img src={pi.item.imageUrl} alt={pi.item.name} className="w-full h-full object-cover" /> : <Package2 className="w-4 h-4 text-muted-foreground/40" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{pi.item?.name}</p>
                    <p className="text-xs text-muted-foreground">{pi.item?.vendor} · Qty: {pi.quantity}</p>
                    {pi.notes && <p className="text-xs text-muted-foreground mt-0.5 italic">{pi.notes}</p>}
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium shrink-0 ${STATUS_COLORS[pi.status] || "bg-muted text-muted-foreground"}`}>
                    {pi.status}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    <button title="Mark pulled" onClick={() => updateItemMutation.mutate({ piId: pi.id, data: { status: "pulled" } })}
                      className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground">
                      <Package2 className="w-4 h-4" />
                    </button>
                    <button title="Mark returned" onClick={() => updateItemMutation.mutate({ piId: pi.id, data: { status: "returned" } })}
                      className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground">
                      <RotateCcw className="w-4 h-4" />
                    </button>
                    <button title="Mark installed" onClick={() => updateItemMutation.mutate({ piId: pi.id, data: { status: "installed" } })}
                      className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground">
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => removeItemMutation.mutate(pi.id)} className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

function Archive(props: any) { return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="5" x="2" y="3" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><path d="M10 12h4"/></svg>; }
