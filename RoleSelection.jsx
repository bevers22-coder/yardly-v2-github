import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Home, Wrench, Loader2, Check } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

export default function RoleSelection() {
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleContinue = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      await base44.auth.updateMe({ role: selected });
      navigate("/verify-phone", { replace: true });
    } catch (err) {
      toast({ title: "Something went wrong", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const options = [
    {
      key: "homeowner",
      title: "I'm a Homeowner",
      desc: "Post jobs, hire verified workers, and pay securely through the app.",
      icon: Home,
      gradient: "from-brand-blue-light to-brand-blue/10",
    },
    {
      key: "worker",
      title: "I'm a Worker",
      desc: "Find local jobs, apply, get hired, and build your reputation.",
      icon: Wrench,
      gradient: "from-brand-green-light to-brand-green/10",
    },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-md mx-auto px-6 py-12">
      <div className="mb-10">
        <p className="text-sm font-semibold text-primary mb-2">Welcome to SideUp</p>
        <h1 className="text-3xl font-bold tracking-tight font-heading">How will you use SideUp?</h1>
        <p className="text-muted-foreground mt-2">Choose your role to get started.</p>
      </div>

      <div className="space-y-4 flex-1">
        {options.map((opt) => {
          const Icon = opt.icon;
          const active = selected === opt.key;
          return (
            <button
              key={opt.key}
              onClick={() => setSelected(opt.key)}
              className={`w-full text-left p-5 rounded-3xl border-2 transition relative bg-gradient-to-br ${opt.gradient} ${
                active ? "border-primary shadow-lg shadow-primary/10" : "border-transparent"
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-background flex items-center justify-center shadow-sm">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">{opt.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{opt.desc}</p>
                </div>
                {active && (
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                    <Check className="w-4 h-4 text-primary-foreground" />
                  </div>
                )}
              </div>
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
    </div>
  );
}
