import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "../components/Layout";
import { Plus, Trash2, Loader2, CheckCircle2, XCircle, ExternalLink } from "lucide-react";
import { apiRequest } from "../lib/queryClient";
import { useAuth } from "../App";

function TagManager({ title, endpoint }: { title: string; endpoint: string }) {
  const qc = useQueryClient();
  const [input, setInput] = useState("");
  const { data: items = [] } = useQuery<any[]>({ queryKey: [endpoint], queryFn: async () => (await fetch(endpoint, { credentials: "include" })).json() });

  const addMutation = useMutation({
    mutationFn: async (name: string) => (await apiRequest("POST", endpoint, { name })).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [endpoint] }); setInput(""); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `${endpoint}/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: [endpoint] }),
  });

  return (
    <div>
      <h3 className="font-medium mb-3">{title}</h3>
      <div className="flex gap-2 mb-3">
        <input value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && input.trim()) { addMutation.mutate(input.trim()); } }}
          placeholder={`Add ${title.toLowerCase()}...`}
          className="flex-1 h-9 px-3 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        <button onClick={() => input.trim() && addMutation.mutate(input.trim())} disabled={!input.trim() || addMutation.isPending}
          className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 disabled:opacity-50">
          <Plus className="w-4 h-4" />
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((item: any) => (
          <div key={item.id} className="flex items-center gap-1.5 px-3 py-1 bg-secondary rounded-full text-sm">
            <span>{item.name}</span>
            <button onClick={() => deleteMutation.mutate(item.id)} className="text-muted-foreground hover:text-destructive transition-colors">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}
        {items.length === 0 && <p className="text-sm text-muted-foreground">No {title.toLowerCase()} yet</p>}
      </div>
    </div>
  );
}

function ConnectionCard({ title, description, status, children }: { title: string; description: string; status: boolean | null; children?: React.ReactNode }) {
  return (
    <div className="bg-white border border-border rounded-xl p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-medium">{title}</h3>
          <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
        </div>
        {status !== null && (
          <div className={`flex items-center gap-1.5 text-sm ${status ? "text-green-600" : "text-muted-foreground"}`}>
            {status ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
            {status ? "Connected" : "Not connected"}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}

export default function Settings() {
  const { user } = useAuth();

  const { data: googleStatus } = useQuery<any>({
    queryKey: ["/api/google-sheets/status"],
    queryFn: async () => (await fetch("/api/google-sheets/status", { credentials: "include" })).json(),
  });

  const { data: qbStatus } = useQuery<any>({
    queryKey: ["/api/quickbooks/status"],
    queryFn: async () => (await fetch("/api/quickbooks/status", { credentials: "include" })).json(),
  });

  const { data: qbConfigured } = useQuery<any>({
    queryKey: ["/api/quickbooks/configured"],
    queryFn: async () => (await fetch("/api/quickbooks/configured", { credentials: "include" })).json(),
  });

  return (
    <Layout>
      <div>
        <h1 className="text-3xl font-display font-bold text-primary">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account and integrations</p>
      </div>

      {/* Account */}
      <section>
        <h2 className="text-lg font-display font-semibold mb-4">Account</h2>
        <div className="bg-white border border-border rounded-xl p-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
              {user?.name?.split(" ").map(n => n[0]).join("").slice(0, 2)}
            </div>
            <div>
              <p className="font-medium">{user?.name}</p>
              <p className="text-sm text-muted-foreground">@{user?.username} · {user?.companyName}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Inventory management */}
      <section>
        <h2 className="text-lg font-display font-semibold mb-4">Inventory Setup</h2>
        <div className="bg-white border border-border rounded-xl p-5 space-y-6">
          <TagManager title="Categories" endpoint="/api/categories" />
          <div className="border-t border-border pt-6">
            <TagManager title="Locations" endpoint="/api/locations" />
          </div>
        </div>
      </section>

      {/* Integrations */}
      <section>
        <h2 className="text-lg font-display font-semibold mb-4">Integrations</h2>
        <div className="space-y-4">
          <ConnectionCard
            title="Google Sheets"
            description="Import inventory and export pull lists to Google Sheets"
            status={googleStatus?.connected ?? null}>
            {googleStatus?.configured ? (
              <div className="flex gap-2 mt-3">
                {googleStatus?.connected ? (
                  <button onClick={() => fetch("/api/google/disconnect", { method: "POST", credentials: "include" }).then(() => window.location.reload())}
                    className="px-3 py-1.5 border border-input rounded-lg text-sm hover:bg-muted transition-colors">
                    Disconnect
                  </button>
                ) : (
                  <a href="/api/google/connect"
                    className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 transition-colors flex items-center gap-1.5">
                    <ExternalLink className="w-3.5 h-3.5" /> Connect Google Sheets
                  </a>
                )}
              </div>
            ) : (
              <p className="text-sm text-amber-600 mt-2 bg-amber-50 px-3 py-2 rounded-lg">
                Set <code className="font-mono text-xs">GOOGLE_CLIENT_ID</code> and <code className="font-mono text-xs">GOOGLE_CLIENT_SECRET</code> in Railway Variables to enable this.
              </p>
            )}
          </ConnectionCard>

          <ConnectionCard
            title="QuickBooks Online"
            description="Export expenses as bills and projects as invoices"
            status={qbStatus?.connected ?? null}>
            {qbConfigured?.configured ? (
              <div className="flex gap-2 mt-3">
                {qbStatus?.connected ? (
                  <button className="px-3 py-1.5 border border-input rounded-lg text-sm hover:bg-muted">Disconnect</button>
                ) : (
                  <a href="/api/quickbooks/connect"
                    className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 flex items-center gap-1.5">
                    <ExternalLink className="w-3.5 h-3.5" /> Connect QuickBooks
                  </a>
                )}
              </div>
            ) : (
              <p className="text-sm text-amber-600 mt-2 bg-amber-50 px-3 py-2 rounded-lg">
                Set <code className="font-mono text-xs">QB_CLIENT_ID</code> and <code className="font-mono text-xs">QB_CLIENT_SECRET</code> in Railway Variables to enable this.
              </p>
            )}
          </ConnectionCard>

          <ConnectionCard
            title="Image Uploads"
            description="Upload product photos stored in AWS S3 or Cloudflare R2"
            status={null}>
            <p className="text-sm text-muted-foreground mt-2">
              Set <code className="font-mono text-xs">AWS_ACCESS_KEY_ID</code>, <code className="font-mono text-xs">AWS_SECRET_ACCESS_KEY</code>, and <code className="font-mono text-xs">AWS_S3_BUCKET</code> in Railway Variables to enable image uploads.
            </p>
          </ConnectionCard>
        </div>
      </section>
    </Layout>
  );
}
