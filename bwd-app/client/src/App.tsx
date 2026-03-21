import { Switch, Route, useLocation, Redirect } from "wouter";
import { QueryClientProvider, useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "./lib/queryClient";
import { createContext, useContext } from "react";
import { Loader2 } from "lucide-react";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Inventory from "./pages/Inventory";
import ProjectsList from "./pages/ProjectsList";
import ProjectDetails from "./pages/ProjectDetails";
import OrderTracking from "./pages/OrderTracking";
import Audit from "./pages/Audit";
import Settings from "./pages/Settings";

type AuthUser = { id: number; username: string; name: string; companyName: string };
interface AuthContextType { user: AuthUser | null; isLoading: boolean; logout: () => void }
const AuthContext = createContext<AuthContextType>({ user: null, isLoading: true, logout: () => {} });
export const useAuth = () => useContext(AuthContext);

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [, setLocation] = useLocation();
  const { data: user, isLoading } = useQuery<AuthUser | null>({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        if (!res.ok) return null;
        return res.json();
      } catch { return null; }
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
  const logoutMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/auth/logout"),
    onSuccess: () => { queryClient.clear(); setLocation("/login"); },
  });
  return (
    <AuthContext.Provider value={{ user: user ?? null, isLoading, logout: () => logoutMutation.mutate() }}>
      {children}
    </AuthContext.Provider>
  );
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!user) return <Redirect to="/login" />;
  return <Component />;
}

function PublicRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (user) return <Redirect to="/" />;
  return <Component />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Switch>
          <Route path="/login">{() => <PublicRoute component={Login} />}</Route>
          <Route path="/register">{() => <PublicRoute component={Register} />}</Route>
          <Route path="/">{() => <ProtectedRoute component={Dashboard} />}</Route>
          <Route path="/inventory">{() => <ProtectedRoute component={Inventory} />}</Route>
          <Route path="/projects">{() => <ProtectedRoute component={ProjectsList} />}</Route>
          <Route path="/projects/:id">{() => <ProtectedRoute component={ProjectDetails} />}</Route>
          <Route path="/order-tracking">{() => <ProtectedRoute component={OrderTracking} />}</Route>
          <Route path="/audit">{() => <ProtectedRoute component={Audit} />}</Route>
          <Route path="/settings">{() => <ProtectedRoute component={Settings} />}</Route>
          <Route>{() => <Redirect to="/" />}</Route>
        </Switch>
      </AuthProvider>
    </QueryClientProvider>
  );
}
