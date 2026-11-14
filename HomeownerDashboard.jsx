import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import HomeownerJobCard from "@/components/HomeownerJobCard";
import EmptyState from "@/components/EmptyState";
import NotificationsSheet from "@/components/NotificationsSheet";
import { Plus, Briefcase, Sparkles, ClipboardList, Users, CheckCircle2, Shield } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

function Section({ title, count, children, empty }) {
  return (
    <div className="mb-7">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-bold font-heading">{title}</h2>
        {count > 0 && <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{count}</span>}
      </div>
      {children}
    </div>
  );
}

export default function HomeownerDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    let alive = true;
    const load = async () => {
      try {
        const [all, profs] = await Promise.all([
          base44.entities.Job.list("-created_date", 100),
          base44.entities.WorkerProfile.list("-rating_avg", 100),
        ]);
        if (!alive) return;
        setProfiles(profs);
        setJobs(all.filter((j) => j.created_by_id === user.id));
      } finally {
        if (alive) setLoading(false);
      }
    };
    load();

    // Live-sync: when a Job record changes in the database (e.g. status flips
    // to "Assigned" after a homeowner accepts an application, or to "In
    // Progress" when the worker starts), update the local list so the dashboard
    // never shows stale state — even without a refresh.
    const unsub = base44.entities.Job.subscribe((event) => {
      if (event.type !== "update") return;
      setJobs((prev) => {
        const idx = prev.findIndex((j) => j.id === event.data.id);
        if (idx === -1) return prev;
        const updated = { ...prev[idx], ...event.data };
        const next = [...prev];
        next[idx] = updated;
        return next;
      });
    });

    return () => {
      alive = false;
      unsub();
    };
  }, [user?.id]);

  const profileFor = (workerId) => (workerId ? profiles.find((p) => p.user_id === workerId) || null : null);

  const handleChat = async (job) => {
    try {
      const workerName = profileFor(job.worker_id)?.full_name || "Worker";
      const existing = await base44.entities.Conversation.filter({
        job_id: job.id,
        homeowner_id: user.id,
        worker_id: job.worker_id,
      });
      let conv = existing[0];
      if (!conv) {
        conv = await base44.entities.Conversation.create({
          job_id: job.id,
          job_title: job.title,
          homeowner_id: user.id,
          worker_id: job.worker_id,
          homeowner_name: user.full_name || "Homeowner",
          worker_name: workerName,
          last_message: "",
        });
      }
      navigate(`/chat/${conv.id}`);
    } catch (err) {
      toast({ title: "Could not open chat", description: err.message, variant: "destructive" });
    }
  };

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center pt-32">
        <div className="w-7 h-7 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const pending = jobs.filter((j) => j.status === "Application Pending");
  const assigned = jobs.filter((j) => j.status === "Assigned");
  const inProgress = jobs.filter((j) => j.status === "In Progress");
  const open = jobs.filter((j) => j.status === "Open");
  const completed = jobs.filter((j) => ["Completed", "Cancelled"].includes(j.status));
  const totalApps = jobs.reduce((n, j) => n + (j.applicants?.length || 0), 0);
  const activeCount = pending.length + assigned.length + inProgress.length + open.length;

  return (
    <div className="px-5 pt-12 pb-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm text-muted-foreground">Welcome back</p>
          <h1 className="text-2xl font-bold font-heading">{user?.full_name || "Homeowner"}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/safety" className="w-10 h-10 rounded-full border border-border flex items-center justify-center text-foreground">
            <Shield className="w-5 h-5" />
          </Link>
          <NotificationsSheet userId={user?.id} />
        </div>
      </div>

      {jobs.length === 0 ? (
        <div className="bg-gradient-to-br from-brand-blue-light to-brand-green-light/60 dark:from-brand-blue/10 dark:to-brand-green/10 rounded-3xl p-6 mb-6 border border-border/60">
          <div className="w-12 h-12 rounded-2xl bg-background flex items-center justify-center mb-3 shadow-sm">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <h2 className="text-lg font-bold font-heading">Post your first job</h2>
          <p className="text-sm text-muted-foreground mt-1 mb-4">Get matched with verified local workers in minutes.</p>
          <Link
            to="/post-job"
            className="inline-flex items-center gap-2 px-5 h-11 rounded-full bg-primary text-primary-foreground font-semibold text-sm"
          >
            <Plus className="w-4 h-4" /> Post a job
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2 mb-6">
          <div className="bg-card rounded-2xl border border-border/60 p-3 text-center">
            <p className="text-xl font-bold font-heading text-foreground">{activeCount}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Active</p>
          </div>
          <div className="bg-card rounded-2xl border border-border/60 p-3 text-center">
            <p className="text-xl font-bold font-heading text-primary flex items-center justify-center gap-1">
              <Users className="w-4 h-4" />{totalApps}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Applications</p>
          </div>
          <div className="bg-card rounded-2xl border border-border/60 p-3 text-center">
            <p className="text-xl font-bold font-heading text-accent flex items-center justify-center gap-1">
              <CheckCircle2 className="w-4 h-4" />{completed.length}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Completed</p>
          </div>
        </div>
      )}

      {pending.length > 0 && (
        <Section title="Pending applications" count={pending.length}>
          <div className="space-y-3">
            {pending.map((job) => (
              <HomeownerJobCard key={job.id} job={job} worker={profileFor(job.worker_id)} onChat={() => handleChat(job)} />
            ))}
          </div>
        </Section>
      )}

      <Section title="Assigned" count={assigned.length}>
        {assigned.length === 0 ? (
          <EmptyState icon={Briefcase} title="No assigned jobs" description="When you accept a worker, the job shows up here." />
        ) : (
          <div className="space-y-3">
            {assigned.map((job) => (
              <HomeownerJobCard key={job.id} job={job} worker={profileFor(job.worker_id)} onChat={() => handleChat(job)} />
            ))}
          </div>
        )}
      </Section>

      <Section title="In progress" count={inProgress.length}>
        {inProgress.length === 0 ? (
          <EmptyState icon={Briefcase} title="No jobs in progress" description="Jobs your worker has started will appear here." />
        ) : (
          <div className="space-y-3">
            {inProgress.map((job) => (
              <HomeownerJobCard key={job.id} job={job} worker={profileFor(job.worker_id)} onChat={() => handleChat(job)} />
            ))}
          </div>
        )}
      </Section>

      {open.length > 0 && (
        <Section title="Open" count={open.length}>
          <div className="space-y-3">
            {open.map((job) => (
              <HomeownerJobCard key={job.id} job={job} worker={profileFor(job.worker_id)} onChat={() => handleChat(job)} />
            ))}
          </div>
        </Section>
      )}

      {completed.length > 0 && (
        <Section title="Completed" count={completed.length}>
          <div className="space-y-3">
            {completed.map((job) => (
              <HomeownerJobCard key={job.id} job={job} worker={profileFor(job.worker_id)} onChat={() => handleChat(job)} />
            ))}
          </div>
        </Section>
      )}

      {jobs.length > 0 && (
        <button
          onClick={() => navigate("/post-job")}
          className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 mt-2"
        >
          <Plus className="w-4 h-4" /> Post another job
        </button>
      )}
    </div>
  );
}
