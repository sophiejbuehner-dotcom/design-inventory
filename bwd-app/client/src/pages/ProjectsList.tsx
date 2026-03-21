import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Layout } from "../components/Layout";
import { Plus, FolderOpen, Archive, Loader2, X, ArrowRight, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { apiRequest } from "../lib/queryClient";
import { format } from "date-fns";

function NewProjectModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { register, handleSubmit } = useForm();
  const mutation = useMutation({
    mutationFn: async (data: any) => (await apiRequest("POST", "/api/projects", data)).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/projects"] }); onClose(); },
  });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-display font-bold">New Project</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="p-6 space-y-4">
          <div>
            <label className="text-sm font-medium block mb-1.5">Project Name *</label>
            <input {...register("name", { required: true })} className="w-full h-10 px-3 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Living Room Redesign" />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1.5">Client Name</label>
            <input {...register("clientName")} className="w-full h-10 px-3 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Smith Residence" />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1.5">Notes</label>
            <textarea {...register("notes")} rows={3} className="w-full px-3 py-2 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-input text-sm hover:bg-muted">Cancel</button>
            <button type="submit" disabled={mutation.isPending} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2">
              {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />} Create Project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ProjectsList({ showArchived = false }: { showArchived?: boolean }) {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const { data: projects = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/projects"],
    queryFn: async () => (await fetch("/api/projects", { credentials: "include" })).json(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/projects/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/projects"] }),
  });

  const archiveMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => apiRequest("PATCH", `/api/projects/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/projects"] }),
  });

  const active = projects.filter((p: any) => p.status !== "archived");
  const archived = projects.filter((p: any) => p.status === "archived");
  const displayed = showArchived ? archived : active;

  return (
    <Layout>
      {showModal && <NewProjectModal onClose={() => setShowModal(false)} />}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-primary">
            {showArchived ? "Archived Projects" : "Projects"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {showArchived ? "Completed project history" : "Manage your active client projects"}
          </p>
        </div>
        {!showArchived && (
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90">
            <Plus className="w-4 h-4" /> New Project
          </button>
        )}
      </div>

      {!showArchived && archived.length > 0 && (
        <Link href="/projects/archived" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors w-fit">
          <Archive className="w-4 h-4" /> View {archived.length} archived project{archived.length !== 1 ? "s" : ""}
          <ArrowRight className="w-3 h-3" />
        </Link>
      )}

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : displayed.length === 0 ? (
        <div className="border border-dashed border-border rounded-xl p-16 text-center text-muted-foreground">
          {showArchived ? "No archived projects." : "No projects yet. Create your first project to get started."}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayed.map((p: any) => (
            <div key={p.id} className="bg-white border border-border rounded-xl p-5 hover:shadow-md transition-all group relative">
              <Link href={`/projects/${p.id}`} className="block mb-3">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 pr-8">
                    <h3 className="font-display font-semibold text-lg group-hover:text-primary transition-colors truncate">{p.name}</h3>
                    {p.clientName && <p className="text-sm text-muted-foreground mt-0.5">{p.clientName}</p>}
                  </div>
                  <FolderOpen className="w-5 h-5 text-muted-foreground/30 group-hover:text-primary/30 transition-colors shrink-0" />
                </div>
              </Link>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">{format(new Date(p.createdAt), "MMM d, yyyy")}</p>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => archiveMutation.mutate({ id: p.id, status: p.status === "archived" ? "active" : "archived" })}
                    className="p-1.5 rounded-md hover:bg-muted text-muted-foreground text-xs flex items-center gap-1">
                    <Archive className="w-3.5 h-3.5" />
                    {p.status === "archived" ? "Restore" : "Archive"}
                  </button>
                  <button onClick={() => { if (confirm("Delete this project?")) deleteMutation.mutate(p.id); }}
                    className="p-1.5 rounded-md hover:bg-muted text-muted-foreground">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}
