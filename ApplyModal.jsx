import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

const DURATIONS = ["< 1 hour", "1–2 hours", "2–4 hours", "Half day", "Full day", "Multi-day"];

export default function ApplyModal({ open, onOpenChange, job, user, onApplied }) {
  const defaultPrice = job?.budget_max ?? job?.budget ?? "";
  const [introduction, setIntroduction] = useState("");
  const [priceOffer, setPriceOffer] = useState(String(defaultPrice));
  const [completion, setCompletion] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const canSubmit = introduction.trim() && priceOffer && completion;
  const budgetNote =
    job?.budget_min != null && job?.budget_max != null
      ? `$${job.budget_min}–$${job.budget_max}${job.budget_type === "hourly" ? "/hr" : ""}`
      : `$${Number(job?.budget ?? 0).toFixed(0)}`;

  const reset = () => {
    setIntroduction("");
    setPriceOffer(String(defaultPrice));
    setCompletion("");
    setMessage("");
    setSubmitted(false);
  };

  const handleClose = (o) => {
    onOpenChange(o);
    if (!o) {
      if (submitted) {
        reset();
        onApplied?.();
      }
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // Server-side apply: enforces self-application, eligibility, duplicates,
      // updates the job, and notifies the homeowner.
      const res = await base44.functions.invoke("apply-to-job", {
        job_id: job.id,
        introduction: introduction.trim(),
        price_offer: Number(priceOffer),
        estimated_completion: completion,
        message: message.trim(),
      });
      if (res?.data?.ok) {
        setSubmitted(true);
      } else {
        const msg = res?.data?.error || "Could not apply";
        toast({ title: "Could not apply", description: msg, variant: "destructive" });
      }
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || "Could not apply";
      toast({ title: "Could not apply", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[92vh] overflow-y-auto">
        {submitted ? (
          <div className="py-8 text-center">
            <div className="w-16 h-16 rounded-full bg-brand-green-light flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-accent" />
            </div>
            <h2 className="text-xl font-bold font-heading">Application Sent</h2>
            <p className="text-sm text-muted-foreground mt-2 px-4">
              The homeowner has been notified. You'll hear back soon — keep an eye on your messages.
            </p>
            <button
              onClick={() => handleClose(false)}
              className="mt-6 w-full h-12 rounded-2xl bg-primary text-primary-foreground font-semibold"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <SheetHeader>
              <SheetTitle>Apply for Job</SheetTitle>
              <SheetDescription className="text-left">Tell the homeowner why you're the right fit.</SheetDescription>
            </SheetHeader>
            <div className="space-y-4 mt-2">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Short introduction *</label>
                <textarea
                  value={introduction}
                  onChange={(e) => setIntroduction(e.target.value)}
                  placeholder="Hi! I have 5 years of experience with lawn care and can get this done quickly."
                  rows={3}
                  className="w-full rounded-2xl border border-input bg-background px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Proposed price ($) *</label>
                <input
                  type="number"
                  value={priceOffer}
                  onChange={(e) => setPriceOffer(e.target.value)}
                  placeholder="120"
                  className="w-full h-12 rounded-2xl border border-input bg-background px-4 focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="text-xs text-muted-foreground mt-1">Posted budget: {budgetNote}</p>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Estimated completion time *</label>
                <select
                  value={completion}
                  onChange={(e) => setCompletion(e.target.value)}
                  className="w-full h-12 rounded-2xl border border-input bg-background px-3 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select</option>
                  {DURATIONS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Message (optional)</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Anything else the homeowner should know?"
                  rows={2}
                  className="w-full rounded-2xl border border-input bg-background px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>
              <button
                onClick={handleSubmit}
                disabled={!canSubmit || loading}
                className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-semibold disabled:opacity-40 flex items-center justify-center"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Submit application"}
              </button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
