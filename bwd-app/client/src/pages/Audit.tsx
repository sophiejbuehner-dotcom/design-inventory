import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "../components/Layout";
import { Plus, Trash2, Loader2, X, DollarSign, Receipt } from "lucide-react";
import { useForm } from "react-hook-form";
import { apiRequest } from "../lib/queryClient";
import { format } from "date-fns";

function AddExpenseModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { data: cats = [] } = useQuery<any[]>({ queryKey: ["/api/categories"], queryFn: async () => (await fetch("/api/categories", { credentials: "include" })).json() });
  const { register, handleSubmit, watch, setValue } = useForm({
    defaultValues: { quantity: 1, unitCost: "0.00", totalCost: "0.00", purchaseDate: new Date().toISOString().split("T")[0] }
  });

  const qty = watch("quantity");
  const unit = watch("unitCost");

  const mutation = useMutation({
    mutationFn: async (data: any) => (await apiRequest("POST", "/api/expenses", data)).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/expenses"] }); onClose(); },
  });

  const updateTotal = () => setValue("totalCost", ((parseFloat(unit) || 0) * (parseInt(String(qty)) || 1)).toFixed(2));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-display font-bold">Add Expense</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="p-6 space-y-4">
          <div>
            <label className="text-sm font-medium block mb-1.5">Description *</label>
            <input {...register("description", { required: true })} className="w-full h-10 px-3 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="What was purchased..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium block mb-1.5">Vendor *</label>
              <input {...register("vendor", { required: true })} className="w-full h-10 px-3 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5">Category *</label>
              <input {...register("category", { required: true })} list="expense-cats"
                className="w-full h-10 px-3 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              <datalist id="expense-cats">{cats.map((c: any) => <option key={c.id} value={c.name} />)}</datalist>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium block mb-1.5">Quantity</label>
              <input {...register("quantity", { valueAsNumber: true })} type="number" min="1" onChange={(e) => { register("quantity").onChange(e); setTimeout(updateTotal, 0); }}
                className="w-full h-10 px-3 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5">Unit Cost ($)</label>
              <input {...register("unitCost")} onChange={(e) => { register("unitCost").onChange(e); setTimeout(updateTotal, 0); }}
                className="w-full h-10 px-3 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5">Total ($)</label>
              <input {...register("totalCost")} readOnly className="w-full h-10 px-3 rounded-lg border border-input text-sm bg-muted" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium block mb-1.5">Purchase Date *</label>
              <input {...register("purchaseDate", { required: true })} type="date"
                className="w-full h-10 px-3 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5">Invoice # (optional)</label>
              <input {...register("invoiceNumber")} className="w-full h-10 px-3 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1.5">Notes (optional)</label>
            <input {...register("notes")} className="w-full h-10 px-3 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-input text-sm hover:bg-muted">Cancel</button>
            <button type="submit" disabled={mutation.isPending} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2">
              {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />} Save Expense
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Audit() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");

  const { data: expenses = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/expenses"],
    queryFn: async () => (await fetch("/api/expenses", { credentials: "include" })).json(),
  });

  const { data: summary } = useQuery<any>({
    queryKey: ["/api/expenses/summary"],
    queryFn: async () => (await fetch("/api/expenses/summary", { credentials: "include" })).json(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/expenses/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/expenses"] }); qc.invalidateQueries({ queryKey: ["/api/expenses/summary"] }); },
  });

  const filtered = expenses.filter((e: any) =>
    !search || [e.description, e.vendor, e.category].some((v) => v?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <Layout>
      {showModal && <AddExpenseModal onClose={() => setShowModal(false)} />}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-primary">Audit of Goods</h1>
          <p className="text-muted-foreground mt-1">Track purchases and expenses</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90">
          <Plus className="w-4 h-4" /> Add Expense
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground">Total Spend</p>
            <DollarSign className="w-4 h-4 text-muted-foreground/50" />
          </div>
          <p className="text-3xl font-bold font-mono">${summary?.totalSpend?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || "0.00"}</p>
        </div>
        <div className="bg-white border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground">Total Purchases</p>
            <Receipt className="w-4 h-4 text-muted-foreground/50" />
          </div>
          <p className="text-3xl font-bold">{summary?.expenseCount || 0}</p>
        </div>
      </div>

      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search expenses..."
        className="w-full max-w-sm h-10 px-3 rounded-lg border border-input bg-white text-sm focus:outline-none focus:ring-2 focus:ring-ring" />

      <div className="bg-white border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Description</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Vendor</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Category</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Total</th>
                <th className="w-12 px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr><td colSpan={6} className="text-center py-12"><Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">No expenses yet.</td></tr>
              ) : filtered.map((e: any) => (
                <tr key={e.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{format(new Date(e.purchaseDate), "MMM d, yyyy")}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{e.description}</p>
                    {e.invoiceNumber && <p className="text-xs text-muted-foreground">Inv: {e.invoiceNumber}</p>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{e.vendor}</td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="px-2 py-0.5 bg-secondary text-secondary-foreground rounded-full text-xs">{e.category}</span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-medium">${e.totalCost}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => { if (confirm("Delete this expense?")) deleteMutation.mutate(e.id); }}
                      className="p-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
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
