import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import ApplicantCard from "@/components/ApplicantCard";
import WorkerProfileSheet from "@/components/WorkerProfileSheet";
import EmptyState from "@/components/EmptyState";
import { ArrowLeft, UserCheck, Loader2 } from "lucide-react";
import { estimateDistance } from "@/lib/distance";
import { validateTransition } from "@/lib/jobStatus";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/lib/AuthContext";

export default function Applicants() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [job, setJob] = useState(null);
  const [applications, setApplications] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [allJobs, setAllJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [viewWorker, setViewWorker] = useState(null);

  useEffect(() => {
    if (!user?.id) return;
    let alive = true;
    Promise.all([
      base44.entities.Job.get(id),
      base44.entities.Application.filter({ job_id: id }, "-created_date", 50),
      base44.entities.WorkerProfile.list("-rating_avg", 100),
      base44.entities.Job.list("-created_date", 100),
    ])
      .then(([j, apps, profs, jobs]) => {
        if (!alive) return;
        setJob(j);
        setApplications(apps);
        setProfiles(profs);
        setAllJobs(jobs);
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [id, user?.id]);

  const completedCount = (workerId) =>
    allJobs.filter((j) => j.worker_id === workerId && j.status === "Completed").length;

  const profileFor = (workerId) => profiles.find((p) => p.user_id === workerId);

  const handleMessage = async (workerId, name) => {
    try {
      const existing = await base44.entities.Conversation.filter({
        job_id: id,
        homeowner_id: user.id,
        worker_id: workerId,
      });
      let conv = existing[0];
      if (!conv) {
        conv = await base44.entities.Conversation.create({
          job_id: id,
          job_title: job.title,
          homeowner_id: user.id,
          worker_id: workerId,
          homeowner_name: user.full_name || "Homeowner",
          worker_name: name || "Worker",
          last_message: "",
        });
      }
      navigate(`/chat/${conv.id}`);
    } catch (err) {
      toast({ title: "Could not open chat", description: err.message, variant: "destructive" });
    }
  };

  const handleAccept = async (application) => {
    const v = validateTransition(job.status, "Assigned");
    if (!v.valid) { toast({ title: "Cannot accept", description: v.error, variant: "destructive" }); return; }
    setActionLoading(true);
    try {
      await base44.entities.Application.update(application.id, { status: "accepted" });
      await base44.entities.Job.update(job.id, {
        worker_id: application.worker_id,
        status: "Assigned",
        accepted_application_id: application.id,
        assigned_date: new Date().toISOString(),
      });
      // Reveal the full job address to the accepted worker.
      const jobAddrs = await base44.entities.JobAddress.filter({ job_id: id });
      if (jobAddrs[0]) {
        await base44.entities.JobAddress.update(jobAddrs[0].id, { worker_id: application.worker_id }).catch(() => {});
      }
      const existing = await base44.entities.Conversation.filter({
        job_id: id,
        homeowner_id: user.id,
        worker_id: application.worker_id,
      });
      let conv = existing[0];
      if (!conv) {
        conv = await base44.entities.Conversation.create({
          job_id: id,
          job_title: job.title,
          homeowner_id: user.id,
          worker_id: application.worker_id,
          homeowner_name: user.full_name || "Homeowner",
          worker_name: application.worker_name || "Worker",
          last_message: "",
        });
      }
      await base44.entities.Conversation.update(conv.id, { pinned: true });
      await base44.entities.Notification.create({
        user_id: application.worker_id,
        type: "application",
        title: "Application accepted",
        body: `You were accepted for "${job.title}". The job is now assigned to you.`,
        job_id: id,
        job_title: job.title,
        application_id: application.id,
        read: false,
      });
      const others = applications.filter((a) => a.id !== application.id && a.status === "pending");
      if (others.length) {
        await base44.entities.Application.bulkUpdate(others.map((a) => ({ id: a.id, status: "declined" })));
        await Promise.all(
          others.map((a) =>
            base44.entities.Notification.create({
              user_id: a.worker_id,
              type: "application",
              title: "Application declined",
              body: `Your application for "${job.title}" was not selected.`,
              job_id: id,
              job_title: job.title,
              application_id: a.id,
              read: false,
            })
          )
        );
      }
      toast({ title: "Helper accepted", description: "The job is now assigned to this helper." });
      navigate(`/job/${id}`);
    } catch (err) {
      toast({ title: "Could not accept", description: err.message, variant: "destructive" });
      setActionLoading(false);
    }
  };

  const handleDecline = async (application) => {
    setActionLoading(true);
    try {
      await base44.entities.Application.update(application.id, { status: "declined" });
      await base44.entities.Notification.create({
        user_id: application.worker_id,
        type: "application",
        title: "Application declined",
        body: `Your application for "${job.title}" was not selected.`,
        job_id: id,
        job_title: job.title,
        application_id: application.id,
        read: false,
      });
      setApplications((prev) => prev.map((a) => (a.id === application.id ? { ...a, status: "declined" } : a)));
      toast({ title: "Applicant declined" });
    } catch (err) {
      toast({ title: "Could not decline", description: err.message, variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center pt-32">
        <div className="w-7 h-7 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!job) {
    return <EmptyState icon={UserCheck} title="Job not found" />;
  }

  if (job.created_by_id !== user?.id) {
    return <EmptyState icon={UserCheck} title="Not allowed" description="Only the job owner can review applications." />;
  }

  const sorted = [...applications].sort((a, b) => {
    const order = { pending: 0, accepted: 1, declined: 2 };
    return (order[a.status] ?? 3) - (order[b.status] ?? 3);
  });

  return (
    <div className="pb-32">
      <div className="px-5 pt-12 flex items-center gap-3 mb-4">
        <button onClick={() => navigate(-1)} className="text-muted-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold font-heading flex-1">Applicants</h1>
        <span className="text-sm text-muted-foreground">{applications.length}</span>
      </div>

      <div className="px-5">
        <p className="text-sm text-muted-foreground mb-4">{job.title}</p>

        {sorted.length === 0 ? (
          <EmptyState icon={UserCheck} title="No applicants yet" description="Workers will appear here when they apply." />
        ) : (
          <div className="space-y-3">
            {sorted.map((app) => {
              const worker = profileFor(app.worker_id);
              return (
                <ApplicantCard
                  key={app.id}
                  application={app}
                  worker={worker}
                  completedJobs={completedCount(app.worker_id)}
                  applyDate={app.created_date}
                  distance={worker ? estimateDistance(job.address, worker.city) : null}
                  onMessage={() => handleMessage(app.worker_id, app.worker_name)}
                  onViewProfile={() => setViewWorker(worker)}
                  onAccept={() => handleAccept(app)}
                  onDecline={() => handleDecline(app)}
                  disabled={actionLoading}
                />
              );
            })}
          </div>
        )}
      </div>

      <WorkerProfileSheet
        worker={viewWorker}
        completedJobs={viewWorker ? completedCount(viewWorker.user_id) : 0}
        open={!!viewWorker}
        onOpenChange={(o) => !o && setViewWorker(null)}
      />
    </div>
  );
}
