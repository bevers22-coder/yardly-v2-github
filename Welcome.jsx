import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowRight, Shield, HandCoins } from "lucide-react";
import Logo from "@/components/Logo";

export default function Welcome() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let alive = true;
    base44.auth.isAuthenticated().then(async (isAuthed) => {
      if (!isAuthed) {
        if (alive) setChecking(false);
        return;
      }
      try {
        const u = await base44.auth.me();
        if (!alive) return;
        if (u.role === "homeowner" || u.role === "worker") {
          navigate("/", { replace: true });
          return;
        }
        const pending = localStorage.getItem("yardly_pending_role");
        if (pending === "homeowner" || pending === "worker") {
          await base44.auth.updateMe({ role: pending });
          localStorage.removeItem("yardly_pending_role");
          if (alive) navigate("/verify-phone", { replace: true });
          return;
        }
        if (alive) navigate("/role", { replace: true });
      } catch {
        if (alive) setChecking(false);
      }
    });
    return () => {
      alive = false;
    };
  }, [navigate]);

  if (checking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const needHelp = () => {
    localStorage.setItem("yardly_pending_role", "homeowner");
    navigate("/role");
  };
  const wantToEarn = () => {
    localStorage.setItem("yardly_pending_role", "worker");
    navigate("/role");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-md mx-auto px-6 py-12">
      <div className="flex-1 flex flex-col justify-center">
        <Logo size="lg" />
        <h1 className="text-4xl font-bold tracking-tight font-heading mt-10">Local help.</h1>
        <h1 className="text-4xl font-bold tracking-tight font-heading text-primary">Right around the corner.</h1>
        <p className="text-lg text-muted-foreground mt-4">
          Get small jobs done by people in your neighborhood — while giving local helpers a safe way to earn.
        </p>

        <div className="mt-10 space-y-3">
          <button
            onClick={needHelp}
            className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-semibold text-lg flex items-center justify-center gap-2 active:scale-[0.98] transition"
          >
            I Need Help <ArrowRight className="w-5 h-5" />
          </button>
          <button
            onClick={wantToEarn}
            className="w-full h-14 rounded-2xl bg-secondary text-secondary-foreground font-semibold text-lg flex items-center justify-center gap-2 active:scale-[0.98] transition"
          >
            <HandCoins className="w-5 h-5" /> I Want to Earn
          </button>
          <button
            onClick={() => navigate("/safety")}
            className="w-full h-12 rounded-2xl border border-border text-foreground font-medium flex items-center justify-center gap-2"
          >
            <Shield className="w-4 h-4 text-accent" /> Learn About Safety
          </button>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Already have an account?{" "}
          <Link to="/login" className="text-primary font-medium hover:underline">
            Log in
          </Link>
        </p>
      </div>
      <p className="text-center text-xs text-muted-foreground mt-8">
        SideUp is a prototype. No real payments, identity verification, or insurance yet.
      </p>
    </div>
  );
}
