import React from "react";
import { Link } from "react-router-dom";
import { MapPin, Calendar, DollarSign } from "lucide-react";
import { getCategory } from "@/lib/categories";
import { statusBadgeClass, statusLabel } from "@/lib/jobStatus";

export default function JobCard({ job }) {
  const cat = getCategory(job.category);
  const Icon = cat.icon;
  const photo = job.photos?.[0];

  return (
    <Link
      to={`/job/${job.id}`}
      className="block bg-card rounded-3xl overflow-hidden border border-border/60 shadow-sm active:scale-[0.98] transition"
    >
      {photo && (
        <div className="h-36 bg-muted overflow-hidden">
          <img src={photo} alt={job.title} className="w-full h-full object-cover" />
        </div>
      )}
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cat.color}`}>
            <Icon className="w-3.5 h-3.5" />
            {job.category}
          </span>
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusBadgeClass(job.status)}`}>
            {statusLabel(job.status)}
          </span>
        </div>
        <h3 className="font-semibold text-foreground line-clamp-1">{job.title}</h3>
        {job.address && (
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
            <MapPin className="w-3 h-3" /> {job.address}
          </p>
        )}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/60">
          <span className="text-sm font-semibold text-foreground flex items-center gap-1">
            <DollarSign className="w-3.5 h-3.5 text-accent" />
            {job.budget_min != null && job.budget_max != null
              ? `${job.budget_min}–${job.budget_max}${job.budget_type === "hourly" ? "/hr" : ""}`
              : Number(job.budget || 0).toFixed(0)}
          </span>
          {job.job_date && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {new Date(job.job_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
