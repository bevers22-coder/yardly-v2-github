import React from "react";
import { useAuth } from "@/lib/AuthContext";
import { AlertCircle, RefreshCw } from "lucide-react";

// Shown when session initialization fails (e.g. settings timeout, network
// error). Gives the user a retry button instead of a blank screen or spinner.
export default function SessionError({ message }) {
  const { checkAppState } = useAuth();
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-background px-6 text-center">
      <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
        <AlertCircle className="w-8 h-8 text-destructive" />
      </div>
      <h2 className="text-lg font-bold font-heading mb-2">Couldn't load your session</h2>
      <p className="text-sm text-muted-foreground mb-6 max-w-xs">
        {message || "We couldn't connect to your account. Please try again."}
      </p>
      <button
        onClick={() => checkAppState()}
        className="px-6 h-12 rounded-2xl bg-primary text-primary-foreground font-semibold flex items-center gap-2"
      >
        <RefreshCw className="w-4 h-4" /> Retry
      </button>
    </div>
  );
}
