import React from "react";
import { Link } from "react-router-dom";
import { MapPin, Calendar, DollarSign, MessageSquare, ChevronRight, ShieldCheck, Users } from "lucide-react";
import { getCategory } from "@/lib/categories";
import { statusBadgeClass, statusLabel } from "@/lib/jobStatus";
import RatingStars from "@/components/RatingStars";

export default function HomeownerJobCard({ job, worker, onChat }) {
  const cat = getCategory(job.category);
  const Icon = cat.icon;
  const photo = job.photos?.[0];
  const assigned = ["Assigned", "In Progress"].includes(job.status) && worker;
  const applicantCount = job.applicants?.length || 0;
  const showApplications = ["Open", "Application Pending"].includes(job.status) && applicantCount > 0;

  return (
    <div className="bg-card rounded-3xl overflow-hidden border border-border/60 shadow-sm">
      <Link to={`/job/${job.id}`} className="block">
        {photo && (
          <div className="h-36 bg-muted overflow-hidden">
            <img src={photo} alt={job.title} className="w-full h-full object-cover" />
          </div>
        )}
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cat.color}`}>
              <Icon className="w-3.5 h-3.5" /> {job.category}
            </span>
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${statusBadgeClass(job.status)}`}>
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
            <div className="flex items-center gap-3">
              {showApplications && (
                <span className="text-xs font-medium text-primary flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" /> {applicantCount} {applicantCount === 1 ? "applicant" : "applicants"}
                </span>
              )}
              {job.job_date && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(job.job_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              )}
            </div>
          </div>
        </div>
      </Link>

      {showApplications && (
        <div className="px-4 pb-4">
          <Link
            to={`/job/${job.id}/applicants`}
            className="w-full h-10 rounded-full bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-1.5"
          >
            <Users className="w-4 h-4" /> View applications
          </Link>
        </div>
      )}

      {assigned && (
        <div className="px-4 pb-4">
          <div className="flex items-center gap-3 rounded-2xl bg-brand-blue-light/50 dark:bg-brand-blue/10 p-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-brand-blue-light dark:bg-brand-blue/20 flex items-center justify-center font-semibold text-primary overflow-hidden flex-shrink-0">
              {worker.avatar_url ? (
                <img src={worker.avatar_url} alt={worker.full_name} className="w-full h-full object-cover" />
              ) : (
                worker.full_name?.[0] || "?"
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <p className="font-medium text-sm truncate">{worker.full_name}</p>
                {worker.verified && <ShieldCheck className="w-3.5 h-3.5 text-accent flex-shrink-0" />}
              </div>
              <RatingStars rating={worker.rating_avg} size={12} showNumber count={worker.rating_count} />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onChat}
              className="flex-1 h-10 rounded-full bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-1.5"
            >
              <MessageSquare className="w-4 h-4" /> Chat
            </button>
            <Link
              to={`/job/${job.id}`}
              className="flex-1 h-10 rounded-full border border-border text-foreground text-sm font-semibold flex items-center justify-center gap-1.5"
            >
              Details <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
