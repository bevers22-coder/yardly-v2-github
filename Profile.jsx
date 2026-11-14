import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { ShieldCheck, Phone, IdCard, LogOut, Loader2, Home, Wrench, RotateCcw } from "lucide-react";
import RatingStars from "@/components/RatingStars";
import EligibilityEditor from "@/components/EligibilityEditor";
import { toast } from "@/components/ui/use-toast";
import ThemeToggle from "@/components/ThemeToggle";

export default function Profile() {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user?.id) return;
    let alive = true;
    (async () => {
      try {
        if (user.role === "worker" || user.worker_profile_id) {
          const profs = await base44.entities.WorkerProfile.list("-created_date", 50);
          if (alive) setProfile(profs.find((p) => p.user_id === user.id || p.id === user.worker_profile_id) || null);
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [user?.id]);

  const handleLogout = () => logout();

  const handleReset = async () => {
    if (!window.confirm("This will erase all your jobs, applications, messages, reviews, and onboarding, then restart your account fresh. Continue?")) return;
    setResetting(true);
    try {
      const me = user;
      const [myJobs, myApps, hoConvs, wConvs, myReviews, mySaved, myNotifs, myWorkerProfile] = await Promise.all([
        base44.entities.Job.filter({ created_by_id: me.id }),
        base44.entities.Application.filter({ worker_id: me.id }),
        base44.entities.Conversation.filter({ homeowner_id: me.id }),
        base44.entities.Conversation.filter({ worker_id: me.id }),
        base44.entities.Review.filter({ reviewer_id: me.id }),
        base44.entities.SavedJob.filter({ user_id: me.id }),
        base44.entities.Notification.filter({ user_id: me.id }),
        base44.entities.WorkerProfile.filter({ user_id: me.id }),
      ]);
      const convIds = [...hoConvs, ...wConvs].map((c) => c.id);
      await Promise.all(convIds.map((cid) => base44.entities.Message.deleteMany({ conversation_id: cid }).catch(() => {})));
      await Promise.all([
        ...convIds.map((cid) => base44.entities.Conversation.delete(cid).catch(() => {})),
        ...myJobs.map((j) => base44.entities.Job.delete(j.id).catch(() => {})),
        ...myApps.map((a) => base44.entities.Application.delete(a.id).catch(() => {})),
        ...myReviews.map((r) => base44.entities.Review.delete(r.id).catch(() => {})),
        ...mySaved.map((s) => base44.entities.SavedJob.delete(s.id).catch(() => {})),
        ...myNotifs.map((n) => base44.entities.Notification.delete(n.id).catch(() => {})),
        ...myWorkerProfile.map((p) => base44.entities.WorkerProfile.delete(p.id).catch(() => {})),
      ]);
      await base44.auth.updateMe({
        role: "user",
        phone_verified: false,
        identity_status: "pending",
        profile_completed: false,
        phone: "",
        avatar_url: "",
        bio: "",
        id_document_url: "",
        selfie_url: "",
        worker_profile_id: "",
      });
      localStorage.removeItem("yardly_pending_role");
      await base44.auth.logout();
      window.location.href = "/welcome";
    } catch (err) {
      toast({ title: "Reset failed", description: err.message, variant: "destructive" });
      setResetting(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center pt-32">
        <div className="w-7 h-7 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const RoleIcon = user.role === "worker" ? Wrench : Home;

  return (
    <div className="px-5 pt-12 pb-8">
      <div className="flex flex-col items-center mb-6">
        <div className="w-20 h-20 rounded-full bg-brand-blue-light flex items-center justify-center mb-3">
          <span className="text-2xl font-bold text-primary">{user?.full_name?.[0] || "?"}</span>
        </div>
        <h1 className="text-xl font-bold font-heading">{user?.full_name || "User"}</h1>
        <p className="text-sm text-muted-foreground">{user?.email}</p>
        <span className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted text-xs font-medium">
          <RoleIcon className="w-3.5 h-3.5" /> {user?.role === "worker" ? "Worker" : "Homeowner"}
        </span>
      </div>

      {profile && (
        <div className="bg-card rounded-3xl border border-border/60 p-5 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold">Worker stats</span>
            <RatingStars rating={profile.rating_avg} showNumber count={profile.rating_count} />
          </div>
          {profile.bio && <p className="text-sm text-muted-foreground">{profile.bio}</p>}
          {profile.hourly_rate > 0 && <p className="text-sm mt-2 font-medium">${profile.hourly_rate}/hr</p>}
        </div>
      )}

      {user?.role === "worker" && (
        <EligibilityEditor user={user} profile={profile} />
      )}

      <div className="bg-card rounded-3xl border border-border/60 p-5 mb-4 space-y-3">
        <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Verification</h2>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-green-light flex items-center justify-center">
            <ShieldCheck className="w-4 h-4 text-accent" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">Email verified</p>
          </div>
          <ShieldCheck className="w-4 h-4 text-accent" />
        </div>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-green-light flex items-center justify-center">
            <Phone className="w-4 h-4 text-accent" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">Phone verified</p>
            {user?.phone && <p className="text-xs text-muted-foreground">{user.phone}</p>}
          </div>
          <ShieldCheck className="w-4 h-4 text-accent" />
        </div>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-green-light flex items-center justify-center">
            <IdCard className="w-4 h-4 text-accent" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">Identity verified</p>
          </div>
          <ShieldCheck className="w-4 h-4 text-accent" />
        </div>
      </div>

      <ThemeToggle />

      <button
        onClick={handleReset}
        disabled={resetting}
        className="w-full h-12 rounded-2xl border border-border font-medium text-muted-foreground flex items-center justify-center gap-2"
      >
        {resetting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><RotateCcw className="w-4 h-4" /> Start over (reset account)</>}
      </button>
      <button
        onClick={handleLogout}
        className="w-full h-12 rounded-2xl border border-border font-medium text-destructive flex items-center justify-center gap-2 mt-2"
      >
        <LogOut className="w-4 h-4" /> Log out
      </button>
    </div>
  );
}
