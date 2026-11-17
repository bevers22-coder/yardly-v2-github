import React from "react";
import { ShieldCheck, MapPin, MessageSquare, Eye, Check, X, Clock, DollarSign } from "lucide-react";
import RatingStars from "@/components/RatingStars";
import { relativeTime } from "@/lib/format";

export default function ApplicantCard({ application, worker, completedJobs, distance, onMessage, onViewProfile, onAccept, onDecline, disabled }) {
  if (!worker) return null;
  const firstName = (worker.full_name || "").split(" ")[0] || "Worker";
  const responseRate = worker.response_rate ?? 95;
  const pending = application.status === "pending";
  const categories = (worker.categories || []).slice(0, 3);

  return (
    <div className="bg-card rounded-3xl border border-border/60 p-4">
      <div className="flex items-start gap-3">
        <div className="w-14 h-14 rounded-full overflow-hidden bg-brand-green-light flex items-center justify-center font-semibold text-accent text-lg flex-shrink-0">
          {worker.avatar_url ? (
            <img src={worker.avatar_url} alt={worker.full_name} className="w-full h-full object-cover" />
          ) : (
            worker.full_name?.[0] || "?"
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="font-semibold truncate">{firstName}</h3>
            {worker.verified && <ShieldCheck className="w-4 h-4 text-accent flex-shrink-0" />}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <RatingStars rating={worker.rating_avg} />
            <span className="text-xs text-muted-foreground">
              {(worker.rating_avg ?? 5).toFixed(1)} · {worker.rating_count || 0} reviews
            </span>
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Check className="w-3 h-3 text-accent" /> {completedJobs} jobs done</span>
            <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3 text-primary" /> {responseRate}% response</span>
            <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-primary" /> Applied {relativeTime(application.created_date)}</span>
            {distance != null && <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-primary" /> {Number(distance).toFixed(1)} mi</span>}
          </div>
          {worker.hourly_rate > 0 && (
            <div className="flex items-center gap-1 mt-1.5 text-xs">
              <DollarSign className="w-3 h-3 text-accent" />
              <span className="font-medium text-foreground">${worker.hourly_rate}/hr</span>
            </div>
          )}
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {categories.map((c) => (
                <span key={c} className="px-2 py-0.5 rounded-full bg-muted text-[11px] font-medium text-muted-foreground">{c}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-3">
        <div className="rounded-2xl bg-brand-blue-light/60 p-2.5">
          <p className="text-[11px] text-muted-foreground">Proposed price</p>
          <p className="font-bold text-primary">${Number(application.price_offer || 0).toFixed(0)}</p>
        </div>
        <div className="rounded-2xl bg-brand-green-light/60 p-2.5">
          <p className="text-[11px] text-muted-foreground">Est. completion</p>
          <p className="font-bold text-accent text-sm flex items-center gap-1">
            <Clock className="w-3 h-3" /> {application.estimated_completion}
          </p>
        </div>
      </div>

      {application.introduction && <p className="text-sm text-foreground mt-3">{application.introduction}</p>}
      {application.message && <p className="text-sm text-muted-foreground mt-1.5 italic">"{application.message}"</p>}

      {pending ? (
        <div className="mt-4 space-y-2">
          <div className="flex gap-2">
            <button
              onClick={onMessage}
              className="flex-1 h-10 rounded-full border border-border text-sm font-medium flex items-center justify-center gap-1.5"
            >
              <MessageSquare className="w-4 h-4" /> Message
            </button>
            <button
              onClick={onViewProfile}
              className="flex-1 h-10 rounded-full border border-border text-sm font-medium flex items-center justify-center gap-1.5"
            >
              <Eye className="w-4 h-4" /> Profile
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onDecline}
              disabled={disabled}
              className="flex-1 h-11 rounded-full border border-border text-destructive text-sm font-semibold flex items-center justify-center gap-1 disabled:opacity-50"
            >
              <X className="w-4 h-4" /> Decline
            </button>
            <button
              onClick={onAccept}
              disabled={disabled}
              className="flex-[1.4] h-11 rounded-full bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-1 disabled:opacity-50"
            >
              <Check className="w-4 h-4" /> Accept
            </button>
          </div>
        </div>
      ) : (
        <div
          className={`mt-4 text-center text-sm font-medium rounded-2xl py-2 ${
            application.status === "accepted" ? "bg-brand-green-light text-accent" : "bg-muted text-muted-foreground"
          }`}
        >
          {application.status === "accepted" ? "✓ Accepted" : "Declined"}
        </div>
      )}
    </div>
  );
}
