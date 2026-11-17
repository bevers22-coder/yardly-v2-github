import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";

const Spinner = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-background">
    <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
  </div>
);

// Prevents a homeowner from landing on a worker-only screen (and vice versa)
// after an account switch. The role comes from the centralized auth user —
// never from the URL or stale state.
export function HomeownerGuard({ children }) {
  const { user, isLoadingAuth, authChecked } = useAuth();
  if (isLoadingAuth || !authChecked) return <Spinner />;
  if (!user) return <Navigate to="/welcome" replace />;
  if (user.role === "admin") return children;
  if (user.role !== "homeowner") return <Navigate to="/nearby-jobs" replace />;
  return children;
}

export function WorkerGuard({ children }) {
  const { user, isLoadingAuth, authChecked } = useAuth();
  if (isLoadingAuth || !authChecked) return <Spinner />;
  if (!user) return <Navigate to="/welcome" replace />;
  if (user.role === "admin") return children;
  if (user.role !== "worker") return <Navigate to="/homeowner" replace />;
  return children;
}
