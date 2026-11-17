import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Loader2, Camera, X, CheckCircle2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { notifyJobStatusChange } from "@/lib/jobNotifications";
import { validateTransition } from "@/lib/jobStatus";

export default function CompleteJobSheet({ open, onOpenChange, job, user, onDone }) {
  const [photos, setPhotos] = useState([]);
  const [notes, setNotes] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef(null);

  const reset = () => {
    setPhotos([]);
    setNotes("");
    setConfirmed(false);
  };

  const handleClose = (o) => {
    onOpenChange(o);
    if (!o) reset();
  };

  const handlePhotos = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const remaining = 10 - photos.length;
    const toUpload = files.slice(0, remaining);
    if (toUpload.length < files.length) toast({ title: "Max 10 photos" });
    setUploading(true);
    try {
      const urls = await Promise.all(toUpload.map((f) => base44.integrations.Core.UploadPublicFile({ file: f })));
      setPhotos((prev) => [...prev, ...urls.map((u) => u.file_url)]);
    } catch (err) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    if (!confirmed || photos.length === 0 || submitting) return;
    const v = validateTransition(job.status, "Completed");
    if (!v.valid) { toast({ title: "Cannot complete", description: v.error, variant: "destructive" }); return; }
    setSubmitting(true);
    try {
      await base44.entities.Job.update(job.id, {
        status: "Completed",
        completion_photos: photos,
        completion_notes: notes.trim(),
        completed_date: new Date().toISOString(),
      });
      await notifyJobStatusChange(job, "Completed", job.created_by_id);
      toast({ title: "Job marked complete" });
      handleClose(false);
      onDone?.();
    } catch (err) {
      toast({ title: "Could not submit", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = confirmed && photos.length > 0 && !uploading;

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[92vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Mark job complete</SheetTitle>
          <SheetDescription className="text-left">Upload completion photos and confirm the work is done.</SheetDescription>
        </SheetHeader>
        <div className="space-y-4 mt-2">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Completion photos * (up to 10)</label>
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotos} />
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full rounded-2xl border-2 border-dashed border-border bg-muted/40 p-5 flex flex-col items-center gap-2"
            >
              <Camera className="w-6 h-6 text-primary" />
              <span className="text-sm font-medium">{uploading ? "Uploading…" : `Add photos (${photos.length}/10)`}</span>
            </button>
            {photos.length > 0 && (
              <div className="grid grid-cols-4 gap-2 mt-3">
                {photos.map((url, i) => (
                  <div key={i} className="relative aspect-square rounded-xl overflow-hidden">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={() => setPhotos(photos.filter((_, idx) => idx !== i))}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Completion notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything the homeowner should know about the finished work?"
              rows={3}
              className="w-full rounded-2xl border border-input bg-background px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>
          <label className="flex items-start gap-3 p-3 rounded-2xl bg-muted/40 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-0.5 w-5 h-5 rounded accent-primary"
            />
            <span className="text-sm font-medium">I confirm this work has been completed.</span>
          </label>
          <button
            onClick={submit}
            disabled={!canSubmit || submitting}
            className="w-full h-14 rounded-2xl bg-accent text-accent-foreground font-semibold disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CheckCircle2 className="w-5 h-5" /> Mark complete</>}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
