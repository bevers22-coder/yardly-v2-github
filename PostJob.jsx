import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { CATEGORIES, getCategory } from "@/lib/categories";
import { classifyJobSafety, RESTRICTED_JOB_MESSAGE } from "@/lib/safety";
import { generalArea } from "@/lib/distance";
import { Slider } from "@/components/ui/slider";
import { ArrowLeft, ArrowRight, Loader2, Camera, X, Check, DollarSign, Calendar, MapPin, Clock, Video, Send } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/lib/AuthContext";

const START_TIMES = ["Early Morning (6–8am)", "Morning (8–12pm)", "Afternoon (12–5pm)", "Evening (5–8pm)", "Anytime"];
const DURATIONS = ["< 1 hour", "1–2 hours", "2–4 hours", "Half day", "Full day", "Multi-day"];
const STEPS = ["Service", "Details", "Location", "Schedule & budget", "Review"];

const todayStr = () => new Date().toISOString().slice(0, 10);

export default function PostJob() {
  const [step, setStep] = useState(0);
  const [category, setCategory] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [jobDate, setJobDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [duration, setDuration] = useState("");
  const [photos, setPhotos] = useState([]);
  const [videoUrl, setVideoUrl] = useState(null);
  const [budgetType, setBudgetType] = useState("fixed");
  const [budgetRange, setBudgetRange] = useState([50, 150]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [published, setPublished] = useState(false);
  const [draftId, setDraftId] = useState(null);
  const { user } = useAuth();
  const fileRef = useRef(null);
  const videoRef = useRef(null);
  const navigate = useNavigate();

  const payload = (status = "Draft") => ({
    title: title || category || "Draft job",
    homeowner_name: user?.full_name || "",
    description,
    category,
    budget: budgetRange[1],
    budget_type: budgetType,
    budget_min: budgetRange[0],
    budget_max: budgetRange[1],
    job_date: jobDate || todayStr(),
    start_time: startTime,
    estimated_duration: duration,
    address,
    photos,
    video_url: videoUrl,
    status,
    applicants: [],
  });

  const handlePhotos = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const remaining = 10 - photos.length;
    const toUpload = files.slice(0, remaining);
    if (toUpload.length < files.length) toast({ title: "Max 10 photos", description: "Only the first 10 will be uploaded." });
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

  const handleVideo = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
      setVideoUrl(file_url);
    } catch (err) {
      toast({ title: "Video upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  // Autosave the job as a Draft in the database while the homeowner fills it out.
  const persistDraft = async () => {
    if (draftId) {
      await base44.entities.Job.update(draftId, payload("Draft"));
    } else {
      const created = await base44.entities.Job.create(payload("Draft"));
      setDraftId(created.id);
    }
  };

  const canNext = () => {
    if (step === 0) return !!category;
    if (step === 1) return title.trim() && description.trim();
    if (step === 2) return address.trim();
    if (step === 3) return jobDate && startTime && duration;
    return true;
  };

  const handleNext = async () => {
    if (step < STEPS.length - 1) {
      try {
        await persistDraft();
      } catch (err) {
        toast({ title: "Could not save draft", description: err.message, variant: "destructive" });
      }
      setStep(step + 1);
    } else {
      await publish();
    }
  };

  const publish = async () => {
    const safety = classifyJobSafety({ title, description, category });
    if (safety.level === "red") {
      toast({ title: "Job not eligible", description: RESTRICTED_JOB_MESSAGE, variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const fullAddr = address.trim();
      const jobData = { ...payload("Open"), address: generalArea(fullAddr), safety_level: safety.level };
      let jobId = draftId;
      if (draftId) {
        await base44.entities.Job.update(draftId, jobData);
      } else {
        const created = await base44.entities.Job.create(jobData);
        jobId = created.id;
      }
      // Store the full address in a separate, RLS-protected record so workers
      // only see the general area on the public Job record until accepted.
      if (jobId && fullAddr) {
        const existing = await base44.entities.JobAddress.filter({ job_id: jobId });
        if (existing.length > 0) {
          await base44.entities.JobAddress.update(existing[0].id, { address: fullAddr });
        } else {
          await base44.entities.JobAddress.create({ job_id: jobId, homeowner_id: user.id, address: fullAddr });
        }
      }
      setPublished(true);
    } catch (err) {
      toast({ title: "Could not publish job", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (published) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center max-w-md mx-auto px-6 text-center">
        <div className="w-20 h-20 rounded-full bg-brand-green-light flex items-center justify-center mb-6">
          <Check className="w-10 h-10 text-accent" />
        </div>
        <h1 className="text-2xl font-bold font-heading">Job published!</h1>
        <p className="text-muted-foreground mt-2">Nearby workers can now see your job and apply.</p>
        <button onClick={() => navigate("/homeowner", { replace: true })} className="mt-8 px-6 h-12 rounded-full bg-primary text-primary-foreground font-semibold">
          Back to home
        </button>
      </div>
    );
  }

  return (
    <div className="px-5 pt-12 pb-32">
      <div className="flex items-center gap-3 mb-6">
        {step > 0 ? (
          <button onClick={() => setStep(step - 1)} className="text-muted-foreground"><ArrowLeft className="w-5 h-5" /></button>
        ) : (
          <button onClick={() => navigate("/homeowner")} className="text-muted-foreground"><X className="w-5 h-5" /></button>
        )}
        <h1 className="text-xl font-bold font-heading flex-1">Post a job</h1>
        <span className="text-sm text-muted-foreground">Step {step + 1}/5</span>
      </div>

      <div className="flex gap-1.5 mb-8">
        {STEPS.map((_, i) => (
          <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-muted"}`} />
        ))}
      </div>

      {/* Step 1: Service / category */}
      {step === 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-1">What do you need done?</h2>
          <p className="text-sm text-muted-foreground mb-5">Pick a category for your job.</p>
          <div className="grid grid-cols-2 gap-3">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const active = category === cat.key;
              return (
                <button key={cat.key} onClick={() => setCategory(cat.key)} className={`p-4 rounded-3xl border-2 text-left transition ${active ? "border-primary shadow-md shadow-primary/10" : "border-border"}`}>
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center mb-2 ${cat.color}`}><Icon className="w-5 h-5" /></div>
                  <span className="font-semibold text-sm text-foreground">{cat.key}</span>
                  {active && <Check className="w-4 h-4 text-primary mt-1" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 2: Description and photos */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Job title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Mow front and back lawn" className="w-full h-12 rounded-2xl border border-input bg-background px-4 focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Detailed description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the job, size, tools needed, any access notes…" rows={4} className="w-full rounded-2xl border border-input bg-background px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Photos (up to 10)</label>
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotos} />
            <button onClick={() => fileRef.current?.click()} className="w-full rounded-2xl border-2 border-dashed border-border bg-muted/40 p-5 flex flex-col items-center gap-2">
              <Camera className="w-6 h-6 text-primary" />
              <span className="text-sm font-medium">{uploading ? "Uploading…" : `Add photos (${photos.length}/10)`}</span>
            </button>
            {photos.length > 0 && (
              <div className="grid grid-cols-4 gap-2 mt-3">
                {photos.map((url, i) => (
                  <div key={i} className="relative aspect-square rounded-xl overflow-hidden">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button onClick={() => setPhotos(photos.filter((_, idx) => idx !== i))} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center"><X className="w-3 h-3 text-white" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Optional video</label>
            <input ref={videoRef} type="file" accept="video/*" className="hidden" onChange={handleVideo} />
            {videoUrl ? (
              <div className="flex items-center justify-between rounded-2xl border border-border p-3">
                <span className="text-sm flex items-center gap-2"><Video className="w-4 h-4 text-primary" /> Video added</span>
                <button onClick={() => setVideoUrl(null)} className="text-xs text-destructive">Remove</button>
              </div>
            ) : (
              <button onClick={() => videoRef.current?.click()} className="w-full rounded-2xl border-2 border-dashed border-border bg-muted/40 p-4 flex items-center justify-center gap-2 text-sm font-medium">
                <Video className="w-5 h-5 text-primary" /> Add a video
              </button>
            )}
          </div>
        </div>
      )}

      {/* Step 3: Location */}
      {step === 2 && (
        <div>
          <h2 className="text-lg font-semibold mb-1">Where is the job?</h2>
          <p className="text-sm text-muted-foreground mb-5">Workers use this to estimate distance.</p>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Maple St, Austin, TX" className="w-full h-12 rounded-2xl border border-input bg-background pl-9 pr-4 focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <p className="text-xs text-muted-foreground mt-3">Only the approximate area is shown to workers until you accept one.</p>
        </div>
      )}

      {/* Step 4: Schedule & budget */}
      {step === 3 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold mb-1">When and how much?</h2>
          <p className="text-sm text-muted-foreground mb-2">Set the schedule and your budget.</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input type="date" value={jobDate} onChange={(e) => setJobDate(e.target.value)} className="w-full h-12 rounded-2xl border border-input bg-background pl-9 pr-2 focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Start time</label>
              <select value={startTime} onChange={(e) => setStartTime(e.target.value)} className="w-full h-12 rounded-2xl border border-input bg-background px-3 focus:outline-none focus:ring-2 focus:ring-primary">
                <option value="">Select</option>
                {START_TIMES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Estimated duration</label>
            <select value={duration} onChange={(e) => setDuration(e.target.value)} className="w-full h-12 rounded-2xl border border-input bg-background px-3 focus:outline-none focus:ring-2 focus:ring-primary">
              <option value="">Select</option>
              {DURATIONS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Budget</label>
            <div className="flex bg-muted rounded-full p-1 mb-4">
              <button onClick={() => setBudgetType("fixed")} className={`flex-1 h-10 rounded-full text-sm font-medium transition ${budgetType === "fixed" ? "bg-background shadow-sm" : "text-muted-foreground"}`}>Fixed Price</button>
              <button onClick={() => setBudgetType("hourly")} className={`flex-1 h-10 rounded-full text-sm font-medium transition ${budgetType === "hourly" ? "bg-background shadow-sm" : "text-muted-foreground"}`}>Hourly Rate</button>
            </div>
            <div className="bg-card rounded-3xl border border-border/60 p-6">
              <div className="flex items-center justify-between mb-5">
                <span className="text-sm text-muted-foreground">Range</span>
                <span className="font-semibold text-lg">${budgetRange[0]} – ${budgetRange[1]}{budgetType === "hourly" ? "/hr" : ""}</span>
              </div>
              <Slider value={budgetRange} onValueChange={setBudgetRange} min={10} max={500} step={5} />
              <div className="flex justify-between text-xs text-muted-foreground mt-3">
                <span>$10</span><span>$500</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 5: Review & publish */}
      {step === 4 && (
        <div>
          <h2 className="text-lg font-semibold mb-1">Review your job</h2>
          <p className="text-sm text-muted-foreground mb-5">Make sure everything looks right before publishing.</p>
          <div className="bg-card rounded-3xl border border-border/60 p-5 space-y-3">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getCategory(category).color}`}>{category}</span>
            <h3 className="font-bold text-lg">{title}</h3>
            <p className="text-sm text-muted-foreground">{description}</p>
            {photos.length > 0 && (
              <div className="flex gap-2 overflow-x-auto no-scrollbar">
                {photos.map((url, i) => <img key={i} src={url} alt="" className="w-20 h-20 rounded-xl object-cover flex-shrink-0" />)}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 pt-2 text-sm">
              <div className="flex items-center gap-2"><DollarSign className="w-4 h-4 text-accent" /> ${budgetRange[0]}–${budgetRange[1]}{budgetType === "hourly" ? "/hr" : ""}</div>
              <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-primary" /> {jobDate}</div>
              <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-primary" /> {startTime}</div>
              <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-primary" /> {duration}</div>
              <div className="flex items-center gap-2 col-span-2"><MapPin className="w-4 h-4 text-primary" /> {address}</div>
            </div>
          </div>
          <div className="text-center mt-6">
            <div className="w-16 h-16 rounded-full bg-brand-blue-light flex items-center justify-center mx-auto mb-3">
              <Send className="w-8 h-8 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">Your job will appear instantly in nearby workers' feeds.</p>
          </div>
        </div>
      )}

      <button
        onClick={handleNext}
        disabled={!canNext() || submitting || uploading}
        className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-semibold disabled:opacity-40 flex items-center justify-center gap-2 mt-8"
      >
        {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : step < STEPS.length - 1 ? <>Continue <ArrowRight className="w-4 h-4" /></> : "Publish job"}
      </button>
    </div>
  );
}
