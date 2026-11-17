import React from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Calendar, Clock, Bookmark, Check, DollarSign } from "lucide-react";
import { getCategory } from "@/lib/categories";
import { estimateDistance, formatDistance } from "@/lib/distance";
import { relativeTime } from "@/lib/format";
import RatingStars from "@/components/RatingStars";

export default function WorkerJobCard({ job, workerCity, homeownerRating, applied, saved, onApply, onToggleSave }) {
  const navigate = useNavigate();
  const cat = getCategory(job.category);
  const Icon = cat.icon;
  const photo = job.photos?.[0];
  const dist = estimateDistance(job.address, workerCity);
  const rating = homeownerRating?.[job.created_by_id];
  const payRange =
    job.budget_min != null && job.budget_max != null
      ? `$${job.budget_min}–$${job.budget_max}${job.budget_type === "hourly" ? "/hr" : ""}`
      : `$${Number(job.budget || 0).toFixed(0)}${job.budget_type === "hourly" ? "/hr" : ""}`;

  return (
    <div className="bg-card rounded-3xl overflow-hidden border border-border/60 shadow-sm">
      {photo && (
        <div className="h-32 bg-muted overflow-hidden">
          <img src={photo} alt={job.title} className="w-full h-full object-cover" />
        </div>
      )}
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cat.color}`}>
            <Icon className="w-3.5 h-3.5" /> {job.category}
          </span>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="w-3 h-3" /> {relativeTime(job.created_date)}
          </span>
        </div>
        <h3 className="font-semibold text-foreground line-clamp-1">{job.title}</h3>
        {job.description && <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{job.description}</p>}

        <div className="flex items-center gap-1.5 mt-2">
          {rating && rating.count > 0 ? (
            <RatingStars rating={rating.avg} size={12} showNumber count={rating.count} />
          ) : (
            <span className="text-xs text-muted-foreground">New homeowner</span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
          <div className="flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5 text-accent" /> <span className="font-semibold">{payRange}</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <MapPin className="w-3.5 h-3.5 text-primary" /> {formatDistance(dist)}
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Calendar className="w-3.5 h-3.5 text-primary" /> {job.job_date ? new Date(job.job_date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Clock className="w-3.5 h-3.5 text-primary" /> {job.start_time || "—"}
          </div>
          {job.estimated_duration && (
            <div className="flex items-center gap-1.5 text-muted-foreground col-span-2">
              <Clock className="w-3.5 h-3.5 text-primary" /> {job.estimated_duration}
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-3">
          <button
            onClick={onToggleSave}
            className={`w-11 h-11 rounded-2xl border flex items-center justify-center flex-shrink-0 ${
              saved ? "border-primary text-primary bg-brand-blue-light" : "border-border text-foreground"
            }`}
            aria-label="Save job"
          >
            <Bookmark className={`w-4 h-4 ${saved ? "fill-primary" : ""}`} />
          </button>
          <button
            onClick={() => navigate(`/job/${job.id}`)}
            className="flex-1 h-11 rounded-2xl border border-border text-foreground text-sm font-semibold flex items-center justify-center"
          >
            View Job
          </button>
          <button
            onClick={onApply}
            disabled={applied}
            className={`flex-1 h-11 rounded-2xl font-semibold text-sm flex items-center justify-center gap-1.5 ${
              applied ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground"
            }`}
          >
            {applied ? (
              <>
                <Check className="w-4 h-4" /> Application Sent
              </>
            ) : (
              "Apply"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
