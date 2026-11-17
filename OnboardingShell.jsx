import React from "react";
import { ArrowLeft, Check } from "lucide-react";
import Logo from "@/components/Logo";

const STEPS = ["Account Created", "Email Verified", "Phone Verified", "Identity Verified", "Profile Setup"];

export default function OnboardingShell({
  completed = 0,
  title,
  subtitle,
  icon: Icon,
  iconBg = "bg-brand-blue-light",
  iconColor = "text-primary",
  onBack,
  children,
}) {
  return (
    <div className="min-h-screen bg-background flex flex-col max-w-md mx-auto px-6 pt-10 pb-10">
      <div className="flex items-center justify-between mb-8">
        {onBack ? (
          <button onClick={onBack} className="text-muted-foreground flex items-center gap-1 text-sm -ml-1">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        ) : (
          <span />
        )}
        <Logo size="sm" />
      </div>

      <div className="mb-6">
        {Icon && (
          <div className={`w-14 h-14 rounded-2xl ${iconBg} flex items-center justify-center mb-4`}>
            <Icon className={`w-7 h-7 ${iconColor}`} />
          </div>
        )}
        <h1 className="text-3xl font-bold tracking-tight font-heading">{title}</h1>
        {subtitle && <p className="text-muted-foreground mt-2">{subtitle}</p>}
      </div>

      <div className="bg-muted/50 rounded-2xl p-4 mb-6">
        <div className="space-y-2.5">
          {STEPS.map((label, i) => {
            const done = i < completed;
            const active = i === completed;
            return (
              <div key={label} className="flex items-center gap-3">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                    done ? "bg-accent" : active ? "bg-primary" : "bg-background border border-border"
                  }`}
                >
                  {done ? (
                    <Check className="w-3.5 h-3.5 text-accent-foreground" />
                  ) : active ? (
                    <span className="w-2 h-2 rounded-full bg-primary-foreground" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-muted-foreground/40" />
                  )}
                </div>
                <span
                  className={`text-sm ${
                    done ? "text-foreground font-medium" : active ? "text-foreground font-semibold" : "text-muted-foreground"
                  }`}
                >
                  {label}
                </span>
                {active && <span className="ml-auto text-xs text-primary font-medium">In progress</span>}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex-1">{children}</div>
    </div>
  );
}
