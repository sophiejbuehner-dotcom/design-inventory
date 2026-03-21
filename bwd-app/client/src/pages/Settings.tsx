import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "../components/Layout";
import { Plus, Trash2, Loader2, CheckCircle2, XCircle, ExternalLink, Upload, Download, FileSpreadsheet } from "lucide-react";
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

function GoogleSheetsPanel({ configured, connected }: { configured: boolean; connected: boolean }) {
  const qc = useQueryClient();
  const [importState, setImportState] = useState<"idle" | "selecting" | "picking-sheet">("idle");
  const [spreadsheets, setSpreadsheets] = useState<any[]>([]);
  const [selectedSpreadsheet, setSelectedSpreadsheet] = useState<{ id: string; name: string } | null>(null);
  const [sheets, setSheets] = useState<any[]>([]);
  const [selectedSheet, setSelectedSheet] = useState("");
  const [exportUrl, setExportUrl] = useState("");
  const [statusMsg, setStatusMsg] = useState("");

  const disconnectMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/google/disconnect"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/google-sheets/status"] }),
  });

  const exportMutation = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/api/sheets/export/inventory")).json(),
    onSuccess: (data) => { setExportUrl(data.url); setStatusMsg(""); },
    onError: () => setStatusMsg("Export failed. Please try again."),
  });

  const importMutation = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/api/sheets/import/inventory", {
      spreadsheetId: selectedSpreadsheet!.id,
      sheetName: selectedSheet || undefined,
    })).json(),
    onSuccess: (data) => {
      setStatusMsg(`Imported ${data.imported} items successfully.`);
      setImportState("idle");
      setSelectedSpreadsheet(null);
      setSelectedSheet("");
      qc.invalidateQueries({ queryKey: ["/api/items"] });
    },
    onError: () => setStatusMsg("Import failed. Check that your sheet has a 'Name' column."),
  });

  const loadSpreadsheets = async () => {
    setImportState("selecting");
    setStatusMsg("");
    try {
      const res = await fetch("/api/sheets/spreadsheets", { credentials: "include" });
      const data = await res.json();
      setSpreadsheets(data.spreadsheets || []);
    } catch {
      setStatusMsg("Could not load spreadsheets. Please try again.");
      setImportState("idle");
    }
  };

  const selectSpreadsheet = async (ss: { id: string; name: string }) => {
    setSelectedSpreadsheet(ss);
    setImportState("picking-sheet");
    try {
      const res = await fetch(`/api/sheets/${ss.id}/sheets`, { credentials: "include" });
      const data = await res.json();
      setSheets(data.sheets || []);
      setSelectedSheet(data.sheets?.[0]?.title || "");
    } catch {
      setSheets([]);
    }
  };

  if (!configured) {
    return (
      <p className="text-sm text-amber-600 mt-2 bg-amber-50 px-3 py-2 rounded-lg">
        Set <code className="font-mono text-xs">GOOGLE_CLIENT_ID</code> and <code className="font-mono text-xs">GOOGLE_CLIENT_SECRET</code> in Railway Variables to enable this.
      </p>
    );
  }

  if (!connected) {
    return (
      <div className="mt-3">
        <a href="/api/google/connect"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 transition-colors">
          <ExternalLink className="w-3.5 h-3.5" /> Connect Google Account
        </a>
        <p className="text-xs text-muted-foreground mt-2">Connect once per account — your credentials are saved securely.</p>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-4">
      {/* Export */}
      <div className="border border-border rounded-lg p-4">
        <h4 className="text-sm font-medium mb-1 flex items-center gap-2"><Download className="w-4 h-4 text-muted-foreground" /> Export Inventory to Sheets</h4>
        <p className="text-xs text-muted-foreground mb-3">Creates a new Google Sheet with all your inventory items.</p>
        {exportUrl ? (
          <div className="flex items-center gap-3">
            <a href={exportUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">
              <FileSpreadsheet className="w-3.5 h-3.5" /> Open Sheet
            </a>
            <button onClick={() => setExportUrl("")} className="text-xs text-muted-foreground hover:text-foreground">Export again</button>
          </div>
        ) : (
          <button onClick={() => exportMutation.mutate()} disabled={exportMutation.isPending}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-input rounded-lg text-sm hover:bg-muted disabled:opacity-50">
            {exportMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            {exportMutation.isPending ? "Exporting..." : "Export All Inventory"}
          </button>
        )}
      </div>

      {/* Import */}
      <div className="border border-border rounded-lg p-4">
        <h4 className="text-sm font-medium mb-1 flex items-center gap-2"><Upload className="w-4 h-4 text-muted-foreground" /> Import Inventory from Sheets</h4>
        <p className="text-xs text-muted-foreground mb-3">
          Your sheet must have a <code className="font-mono">Name</code> column. Optional columns: SKU, Vendor, Category, Location, Quantity, Cost, Price, BWD Price, Notes.
        </p>

        {importState === "idle" && (
          <button onClick={loadSpreadsheets}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-input rounded-lg text-sm hover:bg-muted">
            <FileSpreadsheet className="w-3.5 h-3.5" /> Choose a Spreadsheet
          </button>
        )}

        {importState === "selecting" && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Select a spreadsheet from your Google Drive:</p>
            {spreadsheets.length === 0 && <p className="text-sm text-muted-foreground">No spreadsheets found.</p>}
            <div className="max-h-48 overflow-y-auto space-y-1">
              {spreadsheets.map((ss: any) => (
                <button key={ss.id} onClick={() => selectSpreadsheet(ss)}
                  className="w-full text-left px-3 py-2 rounded-lg border border-border hover:bg-muted text-sm truncate">
                  {ss.name}
                </button>
              ))}
            </div>
            <button onClick={() => setImportState("idle")} className="text-xs text-muted-foreground hover:text-foreground">Cancel</button>
          </div>
        )}

        {importState === "picking-sheet" && selectedSpreadsheet && (
          <div className="space-y-3">
            <p className="text-sm font-medium truncate">{selectedSpreadsheet.name}</p>
            {sheets.length > 1 && (
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Select sheet tab:</label>
                <select value={selectedSheet} onChange={(e) => setSelectedSheet(e.target.value)}
                  className="h-9 px-3 rounded-lg border border-input text-sm w-full focus:outline-none focus:ring-2 focus:ring-ring">
                  {sheets.map((s: any) => <option key={s.id} value={s.title}>{s.title}</option>)}
                </select>
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={() => importMutation.mutate()} disabled={importMutation.isPending}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 disabled:opacity-50">
                {importMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                {importMutation.isPending ? "Importing..." : "Import Items"}
              </button>
              <button onClick={() => { setImportState("idle"); setSelectedSpreadsheet(null); }} className="px-3 py-1.5 border border-input rounded-lg text-sm hover:bg-muted">Cancel</button>
            </div>
          </div>
        )}

        {statusMsg && (
          <p className={`text-xs mt-2 ${statusMsg.includes("failed") || statusMsg.includes("Check") ? "text-red-600" : "text-green-600"}`}>
            {statusMsg}
          </p>
        )}
      </div>

      {/* Disconnect */}
      <div className="flex justify-end">
        <button onClick={() => disconnectMutation.mutate()} disabled={disconnectMutation.isPending}
          className="text-xs text-muted-foreground hover:text-destructive transition-colors">
          {disconnectMutation.isPending ? "Disconnecting..." : "Disconnect Google Account"}
        </button>
      </div>
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
            <GoogleSheetsPanel
              configured={googleStatus?.configured ?? false}
              connected={googleStatus?.connected ?? false}
            />
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
