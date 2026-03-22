import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "../components/Layout";
import { Plus, Search, Package2, Pencil, Trash2, Loader2, X, ExternalLink, Settings2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { apiRequest } from "../lib/queryClient";

const TRACKING_STATUSES = ["ordered", "shipped", "out_for_delivery", "delivered"];

function CategoryManagerModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [input, setInput] = useState("");
  const { data: cats = [] } = useQuery<any[]>({
    queryKey: ["/api/categories"],
    queryFn: async () => (await fetch("/api/categories", { credentials: "include" })).json(),
  });

  const addMutation = useMutation({
    mutationFn: async (name: string) => (await apiRequest("POST", "/api/categories", { name })).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/categories"] }); setInput(""); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/categories/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/categories"] }),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-lg font-display font-bold">Manage Categories</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && input.trim()) addMutation.mutate(input.trim()); }}
              placeholder="New category name..."
              className="flex-1 h-9 px-3 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              onClick={() => input.trim() && addMutation.mutate(input.trim())}
              disabled={!input.trim() || addMutation.isPending}
              className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="flex flex-wrap gap-2 min-h-[40px]">
            {cats.map((cat: any) => (
              <div key={cat.id} className="flex items-center gap-1.5 px-3 py-1 bg-secondary rounded-full text-sm">
                <span>{cat.name}</span>
                <button onClick={() => deleteMutation.mutate(cat.id)} className="text-muted-foreground hover:text-destructive transition-colors ml-0.5">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            {cats.length === 0 && <p className="text-sm text-muted-foreground">No categories yet</p>}
          </div>
        </div>
        <div className="flex justify-end p-5 pt-0">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-input text-sm hover:bg-muted transition-colors">Done</button>
        </div>
      </div>
    </div>
  );
}

function ItemModal({ item, onClose }: { item?: any; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: cats = [] } = useQuery<any[]>({ queryKey: ["/api/categories"], queryFn: async () => (await fetch("/api/categories", { credentials: "include" })).json() });
  const { data: locs = [] } = useQuery<any[]>({ queryKey: ["/api/locations"], queryFn: async () => (await fetch("/api/locations", { credentials: "include" })).json() });

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: item || { quantity: 0, cost: "0.00", price: "0.00", bwdPrice: "0.00" }
  });

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      if (item) return (await apiRequest("PATCH", `/api/items/${item.id}`, data)).json();
      return (await apiRequest("POST", "/api/items", data)).json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/items"] }); onClose(); },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-display font-bold">{item ? "Edit Item" : "Add Item"}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="text-sm font-medium block mb-1.5">Item Name *</label>
              <input {...register("name", { required: true })} className="w-full h-10 px-3 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5">SKU</label>
              <input {...register("sku")} className="w-full h-10 px-3 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5">Vendor</label>
              <input {...register("vendor")} className="w-full h-10 px-3 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5">Category</label>
              <input {...register("category")} list="cats" className="w-full h-10 px-3 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              <datalist id="cats">{cats.map((c: any) => <option key={c.id} value={c.name} />)}</datalist>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5">Location</label>
              <input {...register("location")} list="locs" className="w-full h-10 px-3 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              <datalist id="locs">{locs.map((l: any) => <option key={l.id} value={l.name} />)}</datalist>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5">Quantity</label>
              <input {...register("quantity", { valueAsNumber: true })} type="number" className="w-full h-10 px-3 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5">Dimensions</label>
              <input {...register("dimensions")} className="w-full h-10 px-3 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder='e.g. 24"W x 36"H' />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5">Cost ($)</label>
              <input {...register("cost")} className="w-full h-10 px-3 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="0.00" />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5">Client Price ($)</label>
              <input {...register("price")} className="w-full h-10 px-3 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="0.00" />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5">BWD Price ($)</label>
              <input {...register("bwdPrice")} className="w-full h-10 px-3 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="0.00" />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5">Image URL</label>
              <input {...register("imageUrl")} type="url" className="w-full h-10 px-3 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm font-medium block mb-1.5">Product Link</label>
              <input {...register("link")} type="url" className="w-full h-10 px-3 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5">Tracking Number</label>
              <input {...register("trackingNumber")} className="w-full h-10 px-3 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5">Carrier</label>
              <select {...register("carrier")} className="w-full h-10 px-3 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-background">
                <option value="">Select carrier</option>
                {["FedEx", "UPS", "USPS", "DHL"].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5">Tracking Status</label>
              <select {...register("trackingStatus")} className="w-full h-10 px-3 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-background">
                {TRACKING_STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5">PO Number</label>
              <input {...register("poNumber")} className="w-full h-10 px-3 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5">Vendor Invoice #</label>
              <input {...register("vendorInvoiceNumber")} className="w-full h-10 px-3 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm font-medium block mb-1.5">Notes</label>
              <textarea {...register("notes")} rows={3} className="w-full px-3 py-2 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-input text-sm hover:bg-muted transition-colors">Cancel</button>
            <button type="submit" disabled={mutation.isPending} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2">
              {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {item ? "Save Changes" : "Add Item"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Inventory() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [modalItem, setModalItem] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);

  const { data: items = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/items", search],
    queryFn: async () => {
      const url = search ? `/api/items?search=${encodeURIComponent(search)}` : "/api/items";
      return (await fetch(url, { credentials: "include" })).json();
    },
  });

  const { data: cats = [] } = useQuery<any[]>({
    queryKey: ["/api/categories"],
    queryFn: async () => (await fetch("/api/categories", { credentials: "include" })).json(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/items/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/items"] }),
  });

  const filteredItems = activeCategory
    ? items.filter((item: any) => item.category === activeCategory)
    : items;

  return (
    <Layout>
      {showModal && <ItemModal item={modalItem} onClose={() => { setShowModal(false); setModalItem(null); }} />}
      {showCategoryManager && <CategoryManagerModal onClose={() => setShowCategoryManager(false)} />}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-primary">Inventory</h1>
          <p className="text-muted-foreground mt-1">Manage your complete catalog of accessories and furniture.</p>
        </div>
        <button onClick={() => { setModalItem(null); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors self-start sm:self-auto">
          <Plus className="w-4 h-4" /> Add New Item
        </button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or category..."
            className="w-72 h-10 pl-9 pr-3 rounded-lg border border-input bg-white text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 flex-1 min-w-0">
          <button
            onClick={() => setActiveCategory(null)}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeCategory === null ? "bg-primary text-primary-foreground" : "border border-input bg-white hover:bg-muted text-foreground"}`}
          >
            All
          </button>
          {cats.map((cat: any) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(activeCategory === cat.name ? null : cat.name)}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeCategory === cat.name ? "bg-primary text-primary-foreground" : "border border-input bg-white hover:bg-muted text-foreground"}`}
            >
              {cat.name}
            </button>
          ))}
          <button
            onClick={() => setShowCategoryManager(true)}
            title="Manage categories"
            className="shrink-0 p-1.5 rounded-lg border border-input bg-white hover:bg-muted transition-colors text-muted-foreground"
          >
            <Settings2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="bg-white border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Item</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Category</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Location</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Qty</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Client $</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">BWD $</th>
                <th className="px-4 py-3 w-24"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr><td colSpan={7} className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /></td></tr>
              ) : filteredItems.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-muted-foreground">
                  {search ? "No items match your search." : activeCategory ? `No items in "${activeCategory}".` : "No items yet. Click \"Add New Item\" to get started."}
                </td></tr>
              ) : filteredItems.map((item: any) => (
                <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-md bg-secondary overflow-hidden shrink-0 flex items-center justify-center">
                        {item.imageUrl ? <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" /> : <Package2 className="w-4 h-4 text-muted-foreground/40" />}
                      </div>
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{item.vendor || item.sku || ""}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{item.category || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{item.location || "—"}</td>
                  <td className="px-4 py-3 text-right">{item.quantity}</td>
                  <td className="px-4 py-3 text-right font-mono hidden sm:table-cell">${item.price}</td>
                  <td className="px-4 py-3 text-right font-mono hidden sm:table-cell">${item.bwdPrice}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {item.link && <a href={item.link} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground"><ExternalLink className="w-4 h-4" /></a>}
                      <button onClick={() => { setModalItem(item); setShowModal(true); }} className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => { if (confirm("Delete this item?")) deleteMutation.mutate(item.id); }} className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}
