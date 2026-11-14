import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import JobCard from "@/components/JobCard";
import EmptyState from "@/components/EmptyState";
import NotificationsSheet from "@/components/NotificationsSheet";
import { Briefcase, Bookmark, CheckCircle2, ClipboardList, Hammer, Wallet, ArrowRight, MapPin, Shield } from "lucide-react";
import { MARKETPLACE_STATUSES } from "@/lib/jobStatus";
import { useAuth } from "@/lib/AuthContext";

const TABS = [
  { key: "submitted", label: "Submitted" },
  { key: "accepted", label: "Accepted" },
  { key: "active", label: "Active" },
  { key: "completed", label: "Completed" },
  { key: "saved", label: "Saved" },
];

export default function WorkerDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [savedJobs, setSavedJobs] = useState([]);
  const [tab, setTab] = useState("submitted");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    let alive = true;
    base44.entities.Job.list("-created_date", 100)
      .then(async (all) => {
        if (!alive) return;
        setJobs(all);
        const [apps, saved] = await Promise.all([
          base44.entities.Application.filter({ worker_id: user.id }, "-created_date", 100),
          base44.entities.SavedJob.filter({ user_id: user.id }, "-created_date", 50),
        ]);
        if (!alive) return;
        setApplications(apps);
        const ids = new Set(saved.map((s) => s.job_id));
        setSavedJobs(all.filter((j) => ids.has(j.id)));
      })
      .finally(() => alive && setLoading(false));
    const unsub = base44.entities.Job.subscribe((event) => {
      if (event.type !== "update") return;
      setJobs((prev) => {
        const idx = prev.findIndex((j) => j.id === event.data.id);
        if (idx === -1) return prev;
        const next = [...prev];
        next[idx] = { ...prev[idx], ...event.data };
        return next;
      });
    });
    return () => {
      alive = false;
      unsub();
    };
  }, [user?.id]);

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center pt-32">
        <div className="w-7 h-7 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const myJobMap = new Map(jobs.map((j) => [j.id, j]));
  const submittedJobs = applications
    .filter((a) => a.status === "pending")
    .map((a) => myJobMap.get(a.job_id))
    .filter(Boolean);
  const acceptedJobs = jobs.filter((j) => j.worker_id === user.id && j.status === "Assigned");
  const activeJobs = jobs.filter((j) => j.worker_id === user.id && j.status === "In Progress");
  const completedJobs = jobs.filter((j) => j.worker_id === user.id && j.status === "Completed");

  const earnings = completedJobs.reduce((sum, j) => sum + Number(j.worker_payout || 0), 0);
  const availableJobs = jobs.filter((j) => MARKETPLACE_STATUSES.includes(j.status) && j.created_by_id !== user.id);

  const lists = {
    submitted: submittedJobs,
    accepted: acceptedJobs,
    active: activeJobs,
    completed: completedJobs,
    saved: savedJobs,
  };

  const emptyConfig = {
    submitted: { icon: ClipboardList, title: "No applications yet", description: "Apply to jobs from the Nearby feed to track them here.", action: { label: "Find jobs", to: "/nearby-jobs" } },
    accepted: { icon: CheckCircle2, title: "No accepted jobs", description: "When a homeowner accepts you, the job shows up here." },
    active: { icon: Hammer, title: "No active jobs", description: "Jobs you've started will appear here." },
    completed: { icon: Briefcase, title: "No completed jobs", description: "Finished jobs will be listed here." },
    saved: { icon: Bookmark, title: "No saved jobs", description: "Save jobs from the Nearby feed to revisit them later.", action: { label: "Browse jobs", to: "/nearby-jobs" } },
  };

  const current = lists[tab];
  const cfg = emptyConfig[tab];

  return (
    <div className="px-5 pt-12 pb-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm text-muted-foreground">Hello</p>
          <h1 className="text-2xl font-bold font-heading">{user?.full_name || "Worker"}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/safety" className="w-10 h-10 rounded-full border border-border flex items-center justify-center text-foreground">
            <Shield className="w-5 h-5" />
          </Link>
          <NotificationsSheet userId={user?.id} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-6">
        <div className="bg-card rounded-2xl border border-border/60 p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Wallet className="w-4 h-4 text-accent" />
            <span className="text-xs font-medium">Earnings</span>
          </div>
          <p className="text-2xl font-bold font-heading text-foreground">${earnings.toFixed(0)}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{completedJobs.length} {completedJobs.length === 1 ? "job" : "jobs"} completed</p>
        </div>
        <button
          onClick={() => navigate("/nearby-jobs")}
          className="bg-gradient-to-br from-brand-blue-light to-brand-green-light/50 dark:from-brand-blue/10 dark:to-brand-green/10 rounded-2xl border border-border/60 p-4 text-left"
        >
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <MapPin className="w-4 h-4 text-primary" />
            <span className="text-xs font-medium">Available now</span>
          </div>
          <p className="text-2xl font-bold font-heading text-foreground">{availableJobs.length}</p>
          <p className="text-[11px] text-primary mt-0.5 flex items-center gap-0.5">
            Browse jobs <ArrowRight className="w-3 h-3" />
          </p>
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 mb-4">
        {TABS.map((t) => {
          const count = lists[t.key].length;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3.5 h-9 rounded-full text-sm font-medium whitespace-nowrap border transition flex items-center gap-1.5 ${
                tab === t.key ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border text-muted-foreground"
              }`}
            >
              {t.label}
              {count > 0 && <span className="text-[11px] opacity-80">{count}</span>}
            </button>
          );
        })}
      </div>

      {current.length === 0 ? (
        <EmptyState
          icon={cfg.icon}
          title={cfg.title}
          description={cfg.description}
          action={cfg.action && <Link to={cfg.action.to} className="px-5 h-11 rounded-full bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center">{cfg.action.label}</Link>}
        />
      ) : (
        <div className="space-y-3">
          {current.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      )}
    </div>
  );
}
