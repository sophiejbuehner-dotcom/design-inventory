import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../lib/queryClient";
import { Loader2, Package2 } from "lucide-react";
import { useState } from "react";

const schema = z.object({
  username: z.string().min(1, "Required"),
  password: z.string().min(1, "Required"),
});

export default function Login() {
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const [error, setError] = useState("");

  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(schema) });

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data), credentials: "include" });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
      return res.json();
    },
    onSuccess: (user) => { qc.setQueryData(["/api/auth/me"], user); setLocation("/"); },
    onError: (e: Error) => setError(e.message),
  });

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl border border-border shadow-sm p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
              <Package2 className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-2xl font-display font-bold text-primary">Welcome Back</h1>
            <p className="text-muted-foreground text-sm mt-1">Sign in to your inventory account</p>
          </div>

          <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
            {error && <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-lg">{error}</div>}
            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">Username</label>
              <input {...register("username")} autoCapitalize="none" autoCorrect="off"
                className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Enter username" />
              {errors.username && <p className="text-destructive text-xs mt-1">{errors.username.message as string}</p>}
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">Password</label>
              <input {...register("password")} type="password"
                className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Enter password" />
              {errors.password && <p className="text-destructive text-xs mt-1">{errors.password.message as string}</p>}
            </div>
            <button type="submit" disabled={mutation.isPending}
              className="w-full h-10 bg-primary text-primary-foreground rounded-lg text-sm font-medium flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-50">
              {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Sign In
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Don't have an account?{" "}
            <Link href="/register" className="text-primary hover:underline font-medium">Create one</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
