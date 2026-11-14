import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import WorkerJobCard from "@/components/WorkerJobCard";
import ApplyModal from "@/components/ApplyModal";
import EmptyState from "@/components/EmptyState";
import { MARKETPLACE_STATUSES } from "@/lib/jobStatus";
import { estimateDistance } from "@/lib/distance";
import { Loader2, Briefcase, ShieldCheck, MapPin, Search, SlidersHorizontal } from "lucide-react";
import { CATEGORIES } from "@/lib/categories";
import { canHelperApplyToJob, hasEligibilityInfo } from "@/lib/eligibility";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "@/components/ui/use-toast";

const DISTANCE_OPTIONS = [
  { key: "any", label: "Any distance" },
  { key: "5", label: "Within 5 mi" },
  { key: "10", label: "Within 10 mi" },
  { key: "25", label: "Within 25 mi" },
];
const PAY_OPTIONS = [
  { key: "any", label: "Any pay" },
  { key: "50", label: "$50+" },
  { key: "100", label: "$100+" },
  { key: "200", label: "$200+" },
];
const DATE_OPTIONS = [
  { key: "any", label: "Any date" },
  { key: "week", label: "This week" },
  { key: "month", label: "This month" },
];

export default function NearbyJobs() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userIdRef = useRef(null);
  const [profile, setProfile] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [savedIds, setSavedIds] = useState(new Set());
  const [appliedIds, setAppliedIds] = useState(new Set());
  const [ratings, setRatings] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const [query, setQuery] = useState("");
  const [distanceFilter, setDistanceFilter] = useState("any");
  const [payFilter, setPayFilter] = useState("any");
  const [dateFilter, setDateFilter] = useState("any");
  const [applyJob, setApplyJob] = useState(null);

  useEffect(() => {
    if (!user?.id) return;
    userIdRef.current = user.id;
    let alive = true;
    Promise.all([
      base44.entities.Job.list("-created_date", 80),
      base44.entities.WorkerProfile.list("-rating_avg", 100),
    ])
      .then(async ([all, profs]) => {
        if (!alive) return;
        const prof = profs.find((p) => p.user_id === user.id) || null;
        setProfile(prof);
        const [apps, saved, reviews] = await Promise.all([
          base44.entities.Application.filter({ worker_id: user.id }, "-created_date", 100),
          base44.entities.SavedJob.filter({ user_id: user.id }, "-created_date", 100),
          base44.entities.Review.list("-created_date", 200),
        ]);
        const rmap = {};
        reviews.forEach((r) => {
          rmap[r.reviewee_id] = rmap[r.reviewee_id] || { sum: 0, count: 0 };
          rmap[r.reviewee_id].sum += r.rating;
          rmap[r.reviewee_id].count += 1;
        });
        Object.keys(rmap).forEach((k) => {
          rmap[k] = { avg: rmap[k].sum / rmap[k].count, count: rmap[k].count };
        });
        if (alive) {
          setRatings(rmap);
          setAppliedIds(new Set(apps.map((a) => a.job_id)));
          setSavedIds(new Set(saved.map((s) => s.job_id)));
          setJobs(all.filter((j) => MARKETPLACE_STATUSES.includes(j.status) && j.created_by_id !== user.id));
        }
      })
      .finally(() => alive && setLoading(false));
    const unsub = base44.entities.Job.subscribe((event) => {
      const j = event.data;
      const uid = userIdRef.current;
      if (!j || !uid) return;
      setJobs((prev) => {
        const idx = prev.findIndex((x) => x.id === j.id);
        const isMarket = MARKETPLACE_STATUSES.includes(j.status);
        const isMine = j.created_by_id === uid;
        if (event.type === "delete") return prev.filter((x) => x.id !== j.id);
        if (idx === -1) {
          if (event.type === "create" && isMarket && !isMine) return [j, ...prev];
          return prev;
        }
        if (isMarket && !isMine) {
          const next = [...prev];
          next[idx] = { ...prev[idx], ...j };
          return next;
        }
        return prev.filter((x) => x.id !== j.id);
      });
    });
    return () => {
      alive = false;
      unsub();
    };
  }, [user?.id]);

  const toggleSave = async (jobId) => {
    if (!user) return;
    try {
      if (savedIds.has(jobId)) {
        const found = await base44.entities.SavedJob.filter({ job_id: jobId, user_id: user.id });
        if (found[0]) await base44.entities.SavedJob.delete(found[0].id);
        setSavedIds((prev) => {
          const n = new Set(prev);
          n.delete(jobId);
          return n;
        });
      } else {
        await base44.entities.SavedJob.create({ job_id: jobId, user_id: user.id });
        setSavedIds((prev) => new Set(prev).add(jobId));
      }
    } catch (err) {
      toast({ title: "Could not update saved jobs", description: err.message, variant: "destructive" });
    }
  };

  const handleApply = (job) => {
    const elig = canHelperApplyToJob(profile, job);
    if (!elig.eligible) {
      toast({ title: "Not eligible to apply", description: elig.reason });
      return;
    }
    setApplyJob(job);
  };

  const onApplied = (jobId) => {
    setAppliedIds((prev) => new Set(prev).add(jobId));
    setApplyJob(null);
  };

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center pt-32">
        <div className="w-7 h-7 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const verified = profile && user?.identity_status === "approved";
  const q = query.trim().toLowerCase();
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const filtered = jobs
    .filter((j) => filter === "All" || j.category === filter)
    .filter(
      (j) =>
        !q ||
        (j.title || "").toLowerCase().includes(q) ||
        (j.description || "").toLowerCase().includes(q) ||
        (j.address || "").toLowerCase().includes(q) ||
        (j.category || "").toLowerCase().includes(q)
    )
    .filter((j) => {
      if (distanceFilter === "any") return true;
      if (!profile?.city) return true;
      return estimateDistance(j.address, profile.city) <= Number(distanceFilter);
    })
    .filter((j) => {
      if (payFilter === "any") return true;
      const pay = j.budget_max ?? j.budget ?? 0;
      return pay >= Number(payFilter);
    })
    .filter((j) => {
      if (dateFilter === "any") return true;
      if (!j.job_date) return false;
      const d = new Date(j.job_date);
      if (d < startOfToday) return false;
      const days = (d - startOfToday) / 86400000;
      return dateFilter === "week" ? days <= 7 : days <= 31;
    });

  const locationNeeded = distanceFilter !== "any" && !profile?.city;
  const activeFilters = [distanceFilter, payFilter, dateFilter].filter((v) => v !== "any").length;
  const clearFilters = () => {
    setDistanceFilter("any");
    setPayFilter("any");
    setDateFilter("any");
  };

  return (
    <div className="px-5 pt-12 pb-4">
      <div className="mb-5">
        <p className="text-sm text-muted-foreground flex items-center gap-1">
          <MapPin className="w-3.5 h-3.5 text-primary" /> Nearby jobs
        </p>
        <h1 className="text-2xl font-bold font-heading">Available work</h1>
      </div>

      {!verified ? (
        <div className="bg-card rounded-3xl border border-border/60 p-6 text-center">
          <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-7 h-7 text-amber-600" />
          </div>
          <h2 className="font-semibold text-lg">Verification required</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Only verified workers can browse and apply for jobs. Complete your identity verification to continue.
          </p>
          <button
            onClick={() => navigate("/verify-identity")}
            className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-semibold mt-5"
          >
            Verify identity
          </button>
        </div>
      ) : (
        <>
          {profile && !hasEligibilityInfo(profile) && (
            <div className="bg-amber-100/70 dark:bg-amber-500/10 rounded-2xl p-4 mb-4 text-sm text-amber-800 dark:text-amber-200">
              <p className="font-medium">Complete your eligibility info</p>
              <p className="mt-0.5">Add your date of birth and service area to your profile so you can apply for jobs.</p>
              <button onClick={() => navigate("/profile")} className="text-primary font-medium mt-2">Update profile</button>
            </div>
          )}
          {locationNeeded && (
            <p className="text-xs text-amber-600 dark:text-amber-300 mb-3">Location needed to calculate distance. Add your city in your profile.</p>
          )}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search jobs, categories, areas…"
              className="w-full h-11 rounded-2xl border border-input bg-background pl-9 pr-4 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 mb-3">
            {["All", ...CATEGORIES.map((c) => c.key)].map((key) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`px-3.5 h-8 rounded-full text-xs font-medium whitespace-nowrap border transition ${
                  filter === key ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border text-muted-foreground"
                }`}
              >
                {key}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-2 mb-4">
            <select value={distanceFilter} onChange={(e) => setDistanceFilter(e.target.value)} className="h-9 rounded-xl border border-input bg-background px-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary">
              {DISTANCE_OPTIONS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
            </select>
            <select value={payFilter} onChange={(e) => setPayFilter(e.target.value)} className="h-9 rounded-xl border border-input bg-background px-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary">
              {PAY_OPTIONS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
            </select>
            <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="h-9 rounded-xl border border-input bg-background px-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary">
              {DATE_OPTIONS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
            </select>
          </div>

          {activeFilters > 0 && (
            <button onClick={clearFilters} className="text-xs text-primary font-medium mb-3 flex items-center gap-1">
              <SlidersHorizontal className="w-3.5 h-3.5" /> Clear filters ({activeFilters})
            </button>
          )}

          {filtered.length === 0 ? (
            <EmptyState
              icon={Briefcase}
              title="No jobs found"
              description="Try a different search or filter — new jobs are posted all the time."
            />
          ) : (
            <div className="space-y-3">
              {filtered.map((job) => (
                <WorkerJobCard
                  key={job.id}
                  job={job}
                  workerCity={profile?.city}
                  homeownerRating={ratings}
                  applied={appliedIds.has(job.id)}
                  saved={savedIds.has(job.id)}
                  onApply={() => handleApply(job)}
                  onToggleSave={() => toggleSave(job.id)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {applyJob && (
        <ApplyModal
          open={!!applyJob}
          onOpenChange={(o) => !o && setApplyJob(null)}
          job={applyJob}
          user={user}
          onApplied={() => onApplied(applyJob.id)}
        />
      )}
    </div>
  );
}
