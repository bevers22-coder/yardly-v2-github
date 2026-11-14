import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { CheckCircle2, Loader2, ArrowRight } from "lucide-react";

export default function ThankYou() {
  const [params] = useSearchParams();
  const jobId = params.get("job");
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [paid, setPaid] = useState(false);

  useEffect(() => {
    let attempts = 0;
    const check = async () => {
      attempts++;
      try {
        const job = await base44.entities.Job.get(jobId);
        if (job.paid === true) {
          setPaid(true);
          setChecking(false);
          return;
        }
        if (attempts < 8) {
          setTimeout(check, 1500);
        } else {
          setPaid(false);
          setChecking(false);
        }
      } catch {
        setChecking(false);
      }
    };
    if (jobId) check();
    else setChecking(false);
  }, [jobId]);

  if (checking) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center max-w-md mx-auto px-6">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
        <h2 className="text-xl font-bold font-heading">Confirming your payment…</h2>
        <p className="text-muted-foreground mt-2 text-center">We're verifying your transaction. Hang tight.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center max-w-md mx-auto px-6 text-center">
      <div className="w-20 h-20 rounded-full bg-brand-green-light flex items-center justify-center mb-6">
        <CheckCircle2 className="w-10 h-10 text-accent" />
      </div>
      <h1 className="text-2xl font-bold font-heading">{paid ? "Payment complete!" : "Thanks!"}</h1>
      <p className="text-muted-foreground mt-2">
        {paid ? "Your worker has been paid. Consider leaving a review." : "If your payment went through, your job will be marked paid shortly."}
      </p>
      <button
        onClick={() => navigate(jobId ? `/job/${jobId}` : "/homeowner", { replace: true })}
        className="mt-8 inline-flex items-center gap-2 px-6 h-12 rounded-full bg-primary text-primary-foreground font-semibold"
      >
        {paid ? "Leave a review" : "Back to home"} <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}
