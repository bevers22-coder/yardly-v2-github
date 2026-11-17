import React from "react";

export default function Logo({ size = "md", className = "" }) {
  const box = size === "lg" ? "w-16 h-16" : size === "sm" ? "w-9 h-9" : "w-12 h-12";
  const letter = size === "lg" ? "text-3xl" : size === "sm" ? "text-lg" : "text-2xl";
  const text = size === "lg" ? "text-3xl" : size === "sm" ? "text-lg" : "text-xl";
  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <div className={`${box} rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-sm`}>
        <span className={`${letter} font-bold text-white font-heading`}>S</span>
      </div>
      <span className={`${text} font-bold font-heading tracking-tight text-foreground`}>
        Side<span className="text-primary">Up</span>
      </span>
    </div>
  );
}
