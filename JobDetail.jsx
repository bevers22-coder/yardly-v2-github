import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { getCategory } from "@/lib/categories";
import { generalArea } from "@/lib/distance";
import { canHelperApplyToJob } from "@/lib/eligibility";
import { validateTransition } from "@/lib/jobStatus";
import { notifyJobStatusChange } from "@/lib/jobNotifications";
import RatingStars from "@/components/RatingStars";
import EmptyState from "@/components/EmptyState";
import ApplyModal from "@/components/ApplyModal";
import ReportProblemSheet from "@/components/ReportProblemSheet";
import CompleteJobSheet from "@/components/CompleteJobSheet";
import {
  ArrowLeft, MapPin, Calendar, DollarSign, MessageSquare, Check, Loader2,
  Star, Briefcase, Bookmark, Navigation, Flag, ShieldCheck, CheckCircle2, PlayCircle,
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";

const ACTIVE_STATUSES = ["Assigned", "In Progress"];

const STATUS_LABELS = {
  Draft: "Draft",
  Open: "Open",
  "Application Pending": "Application pending",
  Assigned: "Assigned",
  "In Progress": "In progress",
  Completed: "Completed",
  Cancelled: "Cancelled",
};

export default function JobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const { user } = useAuth();
  const [workerProfile, setWorkerProfile] = useState(null);
  const [homeownerRating, setHomeownerRating] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [myReview, setMyReview] = useState(null);
  const [saved, setSaved] = useState(false);
  const [jobAddress, setJobAddress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [showApply, setShowApply] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  useEffect(() => {
    if (!user?.id) return;
    let alive = true;
    base44.entities.Job.get(id)
      .then(async (j) => {
        if (!alive) return;
        setJob(j);
        const [profs, revs, convs, hoReviews, savedJobs, jobAddrs] = await Promise.all([
          base44.entities.WorkerProfile.list("-rating_avg", 50),
          base44.entities.Review.filter({ job_id: id }, "-created_date", 20),
          base44.entities.Conversation.filter({ job_id: id }, "-created_date", 10),
          base44.entities.Review.filter({ reviewee_id: j.created_by_id }, "-created_date", 100),
          user.role === "worker" ? base44.entities.SavedJob.filter({ job_id: id, user_id: user.id }) : Promise.resolve([]),
          base44.entities.JobAddress.filter({ job_id: id }),
        ]);
        if (!alive) return;
        setJobAddress(jobAddrs[0] || null);
        setConversations(convs);
        setReviews(revs);
        setMyReview(revs.find((r) => r.reviewer_id === user.id) || null);
        if (hoReviews.length > 0) {
          const avg = hoReviews.reduce((s, r) => s + r.rating, 0) / hoReviews.length;
          setHomeownerRating({ avg, count: hoReviews.length });
        }
        if (j.worker_id) setWorkerProfile(profs.find((p) => p.user_id === j.worker_id) || null);
        if (user.role === "worker") {
          const prof = profs.find((p) => p.user_id === user.id) || null;
          setWorkerProfile(prof);
          setSaved(savedJobs.length > 0);
        }
      })
      .catch(() => toast({ title: "Job not found", variant: "destructive" }))
      .finally(() => setLoading(false));
    return () => {
      alive = false;
    };
  }, [id, user?.id]);

  // Realtime: keep the job status in sync without a manual refresh.
  useEffect(() => {
    const unsub = base44.entities.Job.subscribe((event) => {
      if ((event.type === "update" || event.type === "delete") && event.data?.id === id) {
        setJob((prev) => (prev ? { ...prev, ...event.data } : prev));
      }
    });
    return unsub;
  }, [id]);

  const refreshJob = async () => {
    const j = await base44.entities.Job.get(id);
    setJob(j);
  };

  const startOrFindConversation = async (otherUserId, otherName) => {
    const existing = await base44.entities.Conversation.filter({
      job_id: id,
      homeowner_id: user.role === "homeowner" ? user.id : otherUserId,
      worker_id: user.role === "worker" ? user.id : otherUserId,
    });
    if (existing.length > 0) return existing[0];
    const meName = user.full_name || (user.role === "homeowner" ? "Homeowner" : "Worker");
    return base44.entities.Conversation.create({
      job_id: id,
      job_title: job.title,
      homeowner_id: user.role === "homeowner" ? user.id : otherUserId,
      worker_id: user.role === "worker" ? user.id : otherUserId,
      homeowner_name: user.role === "homeowner" ? meName : otherName,
      worker_name: user.role === "worker" ? meName : otherName,
      last_message: "",
    });
  };

  const handleMessage = async (otherUserId, otherName) => {
    const conv = await startOrFindConversation(otherUserId, otherName);
    navigate(`/chat/${conv.id}`);
  };

  const handleSave = async () => {
    if (saved) {
      const existing = await base44.entities.SavedJob.filter({ job_id: id, user_id: user.id });
      if (existing[0]) await base44.entities.SavedJob.delete(existing[0].id);
      setSaved(false);
    } else {
      await base44.entities.SavedJob.create({ job_id: id, user_id: user.id });
      setSaved(true);
    }
  };

  const handleDirections = () => {
    if (!job.address) {
      toast({ title: "No address on file", variant: "destructive" });
      return;
    }
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.address)}`, "_blank");
  };

  // Worker starts an assigned job: Assigned -> In Progress.
  const handleStart = async () => {
    const v = validateTransition(job.status, "In Progress");
    if (!v.valid) { toast({ title: "Cannot start", description: v.error, variant: "destructive" }); return; }
    setActionLoading(true);
    try {
      await base44.entities.Job.update(job.id, { status: "In Progress" });
      await notifyJobStatusChange(job, "In Progress", job.created_by_id);
      await refreshJob();
      toast({ title: "Job started" });
    } catch (err) {
      toast({ title: "Could not update", description: err.message, variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    const v = validateTransition(job.status, "Cancelled");
    if (!v.valid) { toast({ title: "Cannot cancel", description: v.error, variant: "destructive" }); return; }
    setActionLoading(true);
    try {
      await base44.entities.Job.update(job.id, { status: "Cancelled" });
      if (job.worker_id) {
        await notifyJobStatusChange(job, "Cancelled", job.worker_id);
      }
      const applicants = (job.applicants || []).filter((wid) => wid !== job.worker_id);
      await Promise.all(
        applicants.map((wid) =>
          base44.entities.Notification.create({
            user_id: wid,
            type: "application",
            title: "Job cancelled",
            body: `The job "${job.title}" was cancelled by the homeowner.`,
            job_id: id,
            job_title: job.title,
            read: false,
          })
        )
      );
      await refreshJob();
      toast({ title: "Job cancelled" });
    } catch (err) {
      toast({ title: "Could not cancel", description: err.message, variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  const submitReview = async () => {
    setActionLoading(true);
    try {
      const revieweeId = user.role === "homeowner" ? job.worker_id : job.created_by_id;
      await base44.entities.Review.create({
        job_id: id,
        reviewee_id: revieweeId,
        reviewer_id: user.id,
        reviewer_name: user.full_name || "Anonymous",
        rating,
        comment,
        reviewer_role: user.role,
      });
      if (user.role === "homeowner" && workerProfile) {
        const profReviews = await base44.entities.Review.filter({ reviewee_id: revieweeId });
        const avg = profReviews.reduce((s, r) => s + r.rating, 0) / profReviews.length;
        await base44.entities.WorkerProfile.update(workerProfile.id, {
          rating_avg: avg,
          rating_count: profReviews.length,
        });
      }
      const revs = await base44.entities.Review.filter({ job_id: id }, "-created_date", 20);
      setReviews(revs);
      setMyReview(revs.find((r) => r.reviewer_id === user.id));
      setShowReview(false);
      toast({ title: "Review posted!" });
    } catch (err) {
      toast({ title: "Could not post review", description: err.message, variant: "destructive" });
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
    return <EmptyState icon={Briefcase} title="Job not found" action={<Link to="/homeowner" className="text-primary font-medium">Go home</Link>} />;
  }

  const cat = getCategory(job.category);
  const Icon = cat.icon;
  const isHomeowner = user.role === "homeowner" && job.created_by_id === user.id;
  const isWorker = user.role === "worker";
  const applied = (job.applicants || []).includes(user.id);
  const eligibility = isWorker ? canHelperApplyToJob(workerProfile, job) : { eligible: true, reason: "", code: "ok" };
  const isHiredWorker = job.worker_id === user.id;
  const statusLabel = STATUS_LABELS[job.status] || job.status;
  const showFullAddress = isHomeowner || isHiredWorker;
  const displayAddress = showFullAddress ? (jobAddress?.address || job.address) : job.address;

  const homeownerName = isHomeowner ? user.full_name : job.homeowner_name || conversations[0]?.homeowner_name || "Homeowner";
  const workerName = workerProfile?.full_name || "Worker";
  const otherUserId = isHomeowner ? job.worker_id : job.created_by_id;
  const otherName = isHomeowner ? workerName : homeownerName;
  const isActiveJob = ACTIVE_STATUSES.includes(job.status) && ((isHomeowner && job.worker_id) || isHiredWorker);
  const showHomeownerSummary = isWorker && !isHiredWorker;

  return (
    <div className="pb-32">
      <div className="px-5 pt-12 flex items-center gap-3 mb-4">
        <button onClick={() => navigate(-1)} className="text-muted-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold font-heading flex-1 truncate">{job.title}</h1>
      </div>

      {job.photos?.length > 0 && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar px-5 mb-4">
          {job.photos.map((url, i) => (
            <img key={i} src={url} alt="" className="w-64 h-44 rounded-2xl object-cover flex-shrink-0" />
          ))}
        </div>
      )}

      <div className="px-5 space-y-4">
        <div className="flex items-center justify-between">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${cat.color}`}>
            <Icon className="w-3.5 h-3.5" /> {job.category}
          </span>
          <span className="text-xs font-medium text-muted-foreground px-3 py-1.5 rounded-full bg-muted">{statusLabel}</span>
        </div>

        <div className="bg-card rounded-3xl border border-border/60 p-5 space-y-3">
          {job.description && <p className="text-sm text-foreground">{job.description}</p>}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-accent" />
              <div>
                <p className="text-xs text-muted-foreground">Budget</p>
                <p className="font-semibold">
                  {job.budget_min != null && job.budget_max != null
                    ? `$${job.budget_min}–$${job.budget_max}${job.budget_type === "hourly" ? "/hr" : ""}`
                    : `$${Number(job.budget).toFixed(0)}`}
                </p>
              </div>
            </div>
            {job.job_date && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Date</p>
                  <p className="font-semibold">{new Date(job.job_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
                </div>
              </div>
            )}
            {job.start_time && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Start</p>
                  <p className="font-semibold text-sm">{job.start_time}</p>
                </div>
              </div>
            )}
            {job.estimated_duration && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Duration</p>
                  <p className="font-semibold text-sm">{job.estimated_duration}</p>
                </div>
              </div>
            )}
            {job.address && (
              <div className="flex items-center gap-2 col-span-2">
                <MapPin className="w-4 h-4 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">{showFullAddress ? "Location" : "General area"}</p>
                  <p className="font-semibold text-sm">{displayAddress}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Homeowner summary (workers only, before assignment) */}
        {showHomeownerSummary && (
          <div className="bg-card rounded-3xl border border-border/60 p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Homeowner</p>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-brand-blue-light flex items-center justify-center font-semibold text-primary text-lg flex-shrink-0">
                {homeownerName?.[0] || "?"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-semibold truncate">{homeownerName}</h3>
                  <ShieldCheck className="w-4 h-4 text-accent flex-shrink-0" />
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {homeownerRating && homeownerRating.count > 0 ? (
                    <RatingStars rating={homeownerRating.avg} size={12} showNumber count={homeownerRating.count} />
                  ) : (
                    <span className="text-xs text-muted-foreground">New homeowner</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-accent" /> Verified homeowner
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Active job panel (both homeowner & hired worker) */}
        {isActiveJob && (
          <div className="bg-card rounded-3xl border border-border/60 p-5 space-y-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-accent" />
              <span className="text-sm font-semibold">Active job</span>
              <span className="ml-auto text-xs font-medium px-3 py-1 rounded-full bg-muted">{statusLabel}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Homeowner</p>
                <p className="font-semibold text-sm">{homeownerName}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Worker</p>
                <p className="font-semibold text-sm">{workerName}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Budget</p>
                <p className="font-semibold text-sm">${Number(job.budget).toFixed(0)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Scheduled</p>
                <p className="font-semibold text-sm">
                  {job.job_date ? new Date(job.job_date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground">Address</p>
                <p className="font-semibold text-sm">{job.address || "—"}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleMessage(otherUserId, otherName)}
                className="h-11 rounded-2xl bg-muted text-foreground text-sm font-semibold flex items-center justify-center gap-1.5"
              >
                <MessageSquare className="w-4 h-4" /> Chat
              </button>
              <button
                onClick={handleDirections}
                className="h-11 rounded-2xl bg-muted text-foreground text-sm font-semibold flex items-center justify-center gap-1.5"
              >
                <Navigation className="w-4 h-4" /> Directions
              </button>
            </div>
            {isHiredWorker && job.status === "Assigned" && (
              <button
                onClick={handleStart}
                disabled={actionLoading}
                className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2"
              >
                <PlayCircle className="w-5 h-5" /> Start job
              </button>
            )}
            {isHiredWorker && job.status === "In Progress" && (
              <button
                onClick={() => setShowComplete(true)}
                className="w-full h-12 rounded-2xl bg-accent text-accent-foreground font-semibold flex items-center justify-center gap-2"
              >
                <Check className="w-5 h-5" /> Mark complete
              </button>
            )}
            <button
              onClick={() => setShowReport(true)}
              className="w-full h-11 rounded-2xl border border-destructive/30 text-destructive text-sm font-medium flex items-center justify-center gap-1.5"
            >
              <Flag className="w-4 h-4" /> Report problem
            </button>
          </div>
        )}

        {/* Completion summary */}
        {job.status === "Completed" && (job.completion_photos?.length || job.completion_notes) && (
          <div className="bg-card rounded-3xl border border-border/60 p-5 space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-accent" />
              <span className="font-semibold text-sm">Work completed</span>
            </div>
            {job.completion_photos?.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {job.completion_photos.map((url, i) => (
                  <img key={i} src={url} alt="" className="w-full aspect-square rounded-xl object-cover" />
                ))}
              </div>
            )}
            {job.completion_notes && <p className="text-sm text-muted-foreground">{job.completion_notes}</p>}
          </div>
        )}

        {/* Homeowner: applicants review */}
        {isHomeowner && ["Open", "Application Pending"].includes(job.status) && (
          <button
            onClick={() => navigate(`/job/${id}/applicants`)}
            className="w-full bg-card rounded-3xl border border-border/60 p-4 flex items-center justify-between"
          >
            <div className="text-left">
              <h2 className="font-semibold">Applicants</h2>
              <p className="text-sm text-muted-foreground">
                {(job.applicants || []).length} {(job.applicants || []).length === 1 ? "worker has" : "workers have"} applied
              </p>
            </div>
            <span className="px-4 h-10 rounded-full bg-primary text-primary-foreground text-sm font-semibold flex items-center">
              Review
            </span>
          </button>
        )}

        {/* Homeowner: cancel job */}
        {isHomeowner && ["Open", "Application Pending", "Assigned"].includes(job.status) && (
          <button
            onClick={handleCancel}
            disabled={actionLoading}
            className="w-full h-11 rounded-2xl border border-destructive/30 text-destructive text-sm font-medium"
          >
            Cancel job
          </button>
        )}

        {/* Worker actions */}
        {isWorker && ["Open", "Application Pending"].includes(job.status) && !applied && (
          <>
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className={`flex-1 h-12 rounded-2xl border font-medium flex items-center justify-center gap-2 ${saved ? "border-primary text-primary bg-brand-blue-light" : "border-border text-foreground"}`}
              >
                <Bookmark className={`w-4 h-4 ${saved ? "fill-primary" : ""}`} /> {saved ? "Saved" : "Save"}
              </button>
            </div>
            {!eligibility.eligible ? (
              <div className="bg-amber-100/70 dark:bg-amber-500/10 rounded-2xl p-4 text-sm text-amber-800 dark:text-amber-200 space-y-1">
                <p>{eligibility.reason}</p>
                {eligibility.code === "incomplete" && (
                  <Link to="/profile" className="text-primary font-medium">Complete your profile</Link>
                )}
              </div>
            ) : (
              <button
                onClick={() => setShowApply(true)}
                className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2"
              >
                <Check className="w-5 h-5" /> Apply for Job
              </button>
            )}
          </>
        )}
        {isWorker && applied && ["Open", "Application Pending"].includes(job.status) && (
          <div className="bg-brand-blue-light rounded-2xl p-4 text-center text-sm font-medium text-primary">
            Application Sent — waiting for the homeowner.
          </div>
        )}
        {isWorker && applied && !isHiredWorker && (
          <button onClick={() => handleMessage(job.created_by_id, homeownerName)} className="w-full h-12 rounded-2xl border border-border font-medium flex items-center justify-center gap-2">
            <MessageSquare className="w-4 h-4" /> Message homeowner
          </button>
        )}

        {/* Reviews */}
        {job.status === "Completed" && !myReview && (isHomeowner || isHiredWorker) && (
          <>
            {!showReview ? (
              <button onClick={() => setShowReview(true)} className="w-full h-12 rounded-2xl border border-border font-medium flex items-center justify-center gap-2">
                <Star className="w-4 h-4 text-amber-400" /> Leave a review
              </button>
            ) : (
              <div className="bg-card rounded-3xl border border-border/60 p-5 space-y-3">
                <h3 className="font-semibold">Rate your experience</h3>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <button key={i} onClick={() => setRating(i)}>
                      <Star className={`w-8 h-8 ${i <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
                    </button>
                  ))}
                </div>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Share details about your experience…"
                  rows={3}
                  className="w-full rounded-2xl border border-input bg-background px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
                <button onClick={submitReview} disabled={actionLoading} className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-semibold flex items-center justify-center">
                  {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Post review"}
                </button>
              </div>
            )}
          </>
        )}

        {reviews.length > 0 && (
          <div>
            <h2 className="font-semibold mb-2">Reviews</h2>
            <div className="space-y-2">
              {reviews.map((r) => (
                <div key={r.id} className="bg-card rounded-2xl border border-border/60 p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm">{r.reviewer_name}</span>
                    <RatingStars rating={r.rating} />
                  </div>
                  {r.comment && <p className="text-sm text-muted-foreground">{r.comment}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {isWorker && ["Open", "Application Pending"].includes(job.status) && !applied && eligibility.eligible && (
        <ApplyModal open={showApply} onOpenChange={setShowApply} job={job} user={user} onApplied={refreshJob} />
      )}

      <ReportProblemSheet
        open={showReport}
        onOpenChange={setShowReport}
        job={job}
        user={user}
        otherUserId={otherUserId}
      />
      <CompleteJobSheet
        open={showComplete}
        onOpenChange={setShowComplete}
        job={job}
        user={user}
        onDone={refreshJob}
      />
    </div>
  );
}
