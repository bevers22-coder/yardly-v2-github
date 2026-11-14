import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { ArrowLeft, CheckCircle2, Star, Printer, Home } from "lucide-react";
import EmptyState from "@/components/EmptyState";

export default function Receipt() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    let alive = true;
    base44.entities.Job.get(id)
      .then((j) => {
        if (!alive) return;
        setJob(j);
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [id, user?.id]);

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center pt-32">
        <div className="w-7 h-7 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }
  if (!job || job.status !== "Completed") {
    return <EmptyState icon={CheckCircle2} title="Receipt unavailable" description="This job hasn't been completed yet." action={<button onClick={() => navigate(-1)} className="text-primary font-medium">Go back</button>} />;
  }

  const total = Number(job.budget) || 0;
  const fee = Number(job.platform_fee) || 0;
  const payout = Number(job.worker_payout) || 0;
  const isHomeowner = job.created_by_id === user.id;
  const completed = job.completed_date ? new Date(job.completed_date) : new Date();

  return (
    <div className="min-h-screen bg-background max-w-md mx-auto px-5 pt-12 pb-10">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="text-muted-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold font-heading flex-1">Receipt</h1>
      </div>

      <div className="bg-card rounded-3xl border border-border/60 p-6">
        <div className="flex flex-col items-center text-center pb-5 border-b border-border">
          <div className="w-14 h-14 rounded-full bg-brand-green-light flex items-center justify-center mb-3">
            <CheckCircle2 className="w-7 h-7 text-accent" />
          </div>
          <h2 className="font-bold text-lg font-heading">Payment complete</h2>
          <p className="text-sm text-muted-foreground">{job.title}</p>
        </div>

        <div className="space-y-3 py-5 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Receipt #</span><span className="font-mono font-medium">{job.receipt_number || "—"}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Date completed</span><span className="font-medium">{completed.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Job category</span><span className="font-medium">{job.category}</span></div>
          <div className="border-t border-border pt-3 space-y-2">
            <div className="flex justify-between"><span className="text-muted-foreground">Total paid</span><span className="font-semibold">${total.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">SideUp platform fee</span><span className="font-semibold text-destructive">${fee.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Worker payout</span><span className="font-bold text-accent">${payout.toFixed(2)}</span></div>
          </div>
        </div>

        <button onClick={() => window.print()} className="w-full h-11 rounded-2xl border border-border font-medium text-sm flex items-center justify-center gap-2 mb-2">
          <Printer className="w-4 h-4" /> Save / print receipt
        </button>
      </div>

      <button
        onClick={() => navigate(`/job/${job.id}`)}
        className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 mt-4"
      >
        <Star className="w-4 h-4" /> Leave a review
      </button>
      <button
        onClick={() => navigate(isHomeowner ? "/homeowner" : "/worker")}
        className="w-full h-11 rounded-2xl border border-border font-medium text-sm flex items-center justify-center gap-2 mt-2"
      >
        <Home className="w-4 h-4" /> Back to dashboard
      </button>
    </div>
  );
}
