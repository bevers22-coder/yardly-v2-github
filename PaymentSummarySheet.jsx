import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Loader2, CheckCircle2 } from "lucide-react";
import { calculatePayout, generateReceiptNumber, processPayment } from "@/lib/payments";
import { toast } from "@/components/ui/use-toast";

function Row({ label, value, muted }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`font-semibold ${muted ? "text-destructive" : ""}`}>{value}</span>
    </div>
  );
}

export default function PaymentSummarySheet({ open, onOpenChange, job }) {
  const navigate = useNavigate();
  const [processing, setProcessing] = useState(false);
  const { total, fee, payout } = calculatePayout(job?.budget);

  const confirm = async () => {
    setProcessing(true);
    try {
      await processPayment({ amount: total, jobId: job.id });
      const receiptNo = generateReceiptNumber(job.id);
      await base44.entities.Job.update(job.id, {
        status: "Completed",
        paid: true,
        platform_fee: fee,
        worker_payout: payout,
        receipt_number: receiptNo,
        completed_date: new Date().toISOString(),
      });
      await base44.entities.Notification.create({
        user_id: job.worker_id,
        type: "application",
        title: "Payment released",
        body: `Your payout of $${payout.toFixed(2)} for "${job.title}" is on the way.`,
        job_id: job.id,
        job_title: job.title,
        read: false,
      });
      onOpenChange(false);
      navigate(`/receipt/${job.id}`);
    } catch (err) {
      toast({ title: "Payment failed", description: err.message, variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl">
        <SheetHeader>
          <SheetTitle>Approve & release payment</SheetTitle>
          <SheetDescription className="text-left">Review the payment summary before releasing funds to your worker.</SheetDescription>
        </SheetHeader>
        <div className="mt-4 space-y-4">
          <div className="bg-card rounded-2xl border border-border/60 p-4 space-y-2">
            <Row label="Job price" value={`$${total.toFixed(2)}`} />
            <Row label="SideUp fee (10%)" value={`-$${fee.toFixed(2)}`} muted />
            <div className="border-t border-border pt-2 flex items-center justify-between">
              <span className="font-semibold">Worker receives</span>
              <span className="font-bold text-accent text-lg">${payout.toFixed(2)}</span>
            </div>
          </div>
          <button
            onClick={confirm}
            disabled={processing}
            className="w-full h-14 rounded-2xl bg-accent text-accent-foreground font-semibold flex items-center justify-center gap-2 disabled:opacity-40"
          >
            {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CheckCircle2 className="w-5 h-5" /> Confirm & pay</>}
          </button>
          <p className="text-xs text-muted-foreground text-center">Simulated payment — no real charge. Connect Stripe later.</p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
