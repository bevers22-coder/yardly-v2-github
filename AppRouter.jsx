import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";

// Single role/onboarding router. Derives the current user from the centralized
// AuthContext — never fetches base44.auth.me() independently, so it can't race
// or show a stale dashboard after an account switch.
export default function AppRouter() {
  const { user, isLoadingAuth, authChecked } = useAuth();

  if (isLoadingAuth || !authChecked) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/welcome" replace />;
  if (user.role === "admin") return <Navigate to="/homeowner" replace />;
  if (user.role !== "homeowner" && user.role !== "worker") return <Navigate to="/welcome" replace />;
  if (!user.phone_verified) return <Navigate to="/verify-phone" replace />;
  if (user.identity_status !== "approved") return <Navigate to="/verify-identity" replace />;
  if (!user.profile_completed) return <Navigate to="/profile-setup" replace />;
  if (user.role === "homeowner") return <Navigate to="/homeowner" replace />;
  if (user.role === "worker") return <Navigate to="/nearby-jobs" replace />;
  return <Navigate to="/welcome" replace />;
}
