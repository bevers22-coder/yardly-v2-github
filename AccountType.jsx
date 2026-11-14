import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Home, Wrench, Check, Loader2 } from "lucide-react";
import OnboardingShell from "@/components/OnboardingShell";
import { GUEST_MODE, setGuestRole } from "@/lib/guestMode";
import { useAuth } from "@/lib/AuthContext";

export default function AccountType() {
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && (user.role === "homeowner" || user.role === "worker")) {
      navigate("/", { replace: true });
    }
  }, [user, navigate]);

  const handleContinue = async () => {
    if (!selected) return;
    setLoading(true);
    if (GUEST_MODE) {
      setGuestRole(selected);
      navigate("/", { replace: true });
      return;
    }
    localStorage.setItem("yardly_pending_role", selected);
    try {
      if (user) {
        await base44.auth.updateMe({ role: selected });
        localStorage.removeItem("yardly_pending_role");
        navigate("/verify-phone", { replace: true });
      } else {
        navigate("/register", { replace: true });
      }
    } catch {
      setLoading(false);
    }
  };

  const options = [
    { key: "homeowner", title: "Homeowner", desc: "I need help with jobs around my home.", icon: Home, bg: "bg-brand-blue-light", color: "text-brand-blue" },
    { key: "worker", title: "Worker", desc: "I want to earn money completing jobs.", icon: Wrench, bg: "bg-brand-green-light", color: "text-brand-green" },
  ];

  return (
    <OnboardingShell completed={0} title="How will you use SideUp?" subtitle="Choose your account type — it determines your experience.">
      <div className="space-y-4">
        {options.map((opt) => {
          const Icon = opt.icon;
          const active = selected === opt.key;
          return (
            <button
              key={opt.key}
              onClick={() => setSelected(opt.key)}
              className={`w-full text-left p-5 rounded-3xl border-2 transition flex items-center gap-4 ${
                active ? "border-primary shadow-lg shadow-primary/10 bg-primary/5" : "border-border"
              }`}
            >
              <div className={`w-14 h-14 rounded-2xl ${opt.bg} flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-7 h-7 ${opt.color}`} />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground text-lg">{opt.title}</h3>
                <p className="text-sm text-muted-foreground mt-0.5">{opt.desc}</p>
              </div>
              {active && (
                <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                  <Check className="w-4 h-4 text-primary-foreground" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      <button
        onClick={handleContinue}
        disabled={!selected || loading}
        className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-semibold disabled:opacity-40 flex items-center justify-center mt-8"
      >
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Continue"}
      </button>
    </OnboardingShell>
  );
}
