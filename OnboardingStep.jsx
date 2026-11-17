import React from "react";
import { ArrowLeft } from "lucide-react";

export default function OnboardingStep({
  step,
  total = 5,
  icon: Icon,
  iconBg = "bg-brand-blue-light",
  iconColor = "text-primary",
  title,
  subtitle,
  onBack,
  children,
}) {
  return (
    <div className="min-h-screen bg-background flex flex-col max-w-md mx-auto px-6 py-12">
      {onBack && (
        <button
          onClick={onBack}
          className="mb-8 text-muted-foreground flex items-center gap-1 text-sm self-start"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
      )}
      <div className="mb-8">
        {Icon && (
          <div className={`w-14 h-14 rounded-2xl ${iconBg} flex items-center justify-center mb-4`}>
            <Icon className={`w-7 h-7 ${iconColor}`} />
          </div>
        )}
        <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-2">
          Step {step} of {total}
        </p>
        <h1 className="text-3xl font-bold tracking-tight font-heading">{title}</h1>
        {subtitle && <p className="text-muted-foreground mt-2">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
