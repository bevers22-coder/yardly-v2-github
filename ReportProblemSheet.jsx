import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Loader2, Flag } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

export default function ReportProblemSheet({ open, onOpenChange, job, user, otherUserId }) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const canSubmit = text.trim().length >= 5;

  const submit = async () => {
    setLoading(true);
    try {
      await base44.entities.Notification.create({
        user_id: otherUserId,
        type: "application",
        title: "Problem reported",
        body: `${user?.full_name || "A user"} reported a problem on "${job?.title}": ${text.trim()}`,
        job_id: job?.id,
        job_title: job?.title,
        read: false,
      });
      toast({ title: "Problem reported", description: "The other party has been notified." });
      setText("");
      onOpenChange(false);
    } catch (err) {
      toast({ title: "Could not submit", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Flag className="w-4 h-4 text-destructive" /> Report a problem
          </SheetTitle>
          <SheetDescription className="text-left">
            Describe the issue with this job. The other party will be notified.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-3 space-y-3">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            placeholder="Describe what went wrong…"
            className="w-full rounded-2xl border border-input bg-background px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />
          <button
            onClick={submit}
            disabled={!canSubmit || loading}
            className="w-full h-12 rounded-2xl bg-destructive text-destructive-foreground font-semibold disabled:opacity-40 flex items-center justify-center"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Submit report"}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
