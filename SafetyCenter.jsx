import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import {
  ArrowLeft, Shield, ShieldAlert, ShieldX, Ban, Flag, AlertTriangle,
  Lock, Phone, Users, Baby, CheckCircle2, X,
} from "lucide-react";
import { PROHIBITED_JOBS, SAFETY_LEVEL_META, RESTRICTED_JOB_MESSAGE } from "@/lib/safety";
import { ELIGIBILITY_NOTICE } from "@/lib/age";
import { toast } from "@/components/ui/use-toast";

const REPORT_TYPES = [
  { key: "safety_concern", label: "Report a Safety Concern", icon: ShieldAlert, desc: "Something about a job or interaction felt unsafe." },
  { key: "report_user", label: "Report a User", icon: Flag, desc: "Report inappropriate or unsafe behavior from another user." },
  { key: "block_request", label: "Block a User", icon: Ban, desc: "Request to block another user from contacting you." },
];

function Card({ icon: Icon, title, children, accent = "text-primary" }) {
  return (
    <div className="bg-card rounded-3xl border border-border/60 p-5">
      <div className="flex items-center gap-2 mb-3">
        <Icon className={`w-5 h-5 ${accent}`} />
        <h2 className="font-bold font-heading text-foreground">{title}</h2>
      </div>
      <div className="text-sm text-muted-foreground space-y-2">{children}</div>
    </div>
  );
}

export default function SafetyCenter() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [reportType, setReportType] = useState(null);
  const [description, setDescription] = useState("");
  const [targetName, setTargetName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    base44.auth
      .me()
      .then((u) => setUser(u))
      .catch(() => setUser(null))
      .finally(() => setAuthChecked(true));
  }, []);

  const openReport = (type) => {
    if (!user) {
      toast({ title: "Log in to report", description: "You need an account to file a report.", variant: "destructive" });
      navigate("/welcome");
      return;
    }
    setReportType(type);
    setDescription("");
    setTargetName("");
  };

  const submitReport = async () => {
    if (!description.trim()) {
      toast({ title: "Add a description", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      await base44.entities.SafetyReport.create({
        reporter_id: user.id,
        reporter_name: user.full_name || "",
        type: reportType,
        description: description.trim(),
        target_user_name: targetName.trim(),
        status: "open",
      });
      // Log a notification event for the future admin safety workflow. The
      // report itself is private (reporter-only via RLS); this confirms to the
      // reporter that it was received.
      await base44.entities.Notification.create({
        user_id: user.id,
        type: "safety",
        title: "Safety report received",
        body: "Your report was logged and will be reviewed by the SideUp team.",
        read: false,
      }).catch(() => {});
      setReportType(null);
      toast({ title: "Report submitted", description: "Our team will review it. If you're in immediate danger, call 911." });
    } catch (err) {
      toast({ title: "Could not submit", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="px-5 pt-12 pb-12 max-w-md mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="text-muted-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold font-heading flex-1 flex items-center gap-2">
          <Shield className="w-5 h-5 text-accent" /> Safety Center
        </h1>
      </div>

      <div className="bg-gradient-to-br from-brand-blue-light to-brand-green-light/50 dark:from-brand-blue/10 dark:to-brand-green/10 rounded-3xl border border-border/60 p-5 mb-6">
        <p className="font-semibold text-foreground">People helping people, safely.</p>
        <p className="text-sm text-muted-foreground mt-1">
          SideUp is built for small, safe, everyday neighborhood jobs. Only perform the work described in the listing. Keep communication in SideUp. If something feels unsafe, stop and report it.
        </p>
      </div>

      {/* Report actions */}
      <div className="space-y-3 mb-6">
        {REPORT_TYPES.map((r) => {
          const Icon = r.icon;
          return (
            <button
              key={r.key}
              onClick={() => openReport(r.key)}
              className="w-full bg-card rounded-2xl border border-border/60 p-4 flex items-center gap-3 text-left active:scale-[0.99] transition"
            >
              <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center flex-shrink-0">
                <Icon className="w-5 h-5 text-destructive" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground text-sm">{r.label}</p>
                <p className="text-xs text-muted-foreground">{r.desc}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Safety levels */}
      <Card icon={Shield} title="Job safety levels" accent="text-accent">
        <div className="space-y-2">
          {Object.entries(SAFETY_LEVEL_META).map(([key, meta]) => (
            <div key={key} className="flex items-start gap-2">
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${meta.color}`}>{meta.label}</span>
              <span className="flex-1">{meta.description}</span>
            </div>
          ))}
        </div>
      </Card>

      <div className="mt-4">
        <Card icon={ShieldX} title="Prohibited jobs" accent="text-destructive">
          <ul className="space-y-1.5">
            {PROHIBITED_JOBS.map((j) => (
              <li key={j} className="flex items-start gap-2">
                <X className="w-3.5 h-3.5 text-destructive mt-1 flex-shrink-0" />
                <span>{j}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs mt-3 p-2 rounded-xl bg-destructive/10 text-destructive">{RESTRICTED_JOB_MESSAGE}</p>
        </Card>
      </div>

      <div className="mt-4">
        <Card icon={Baby} title="Minor safety" accent="text-primary">
          <p>{ELIGIBILITY_NOTICE}</p>
          <p>SideUp does not assume a job is legally permitted based on age alone. Some jobs may require parent/guardian consent, supervision, or may not be allowed.</p>
        </Card>
      </div>

      <div className="mt-4">
        <Card icon={Users} title="Parent / guardian" accent="text-primary">
          <p>Helpers can record parent/guardian involvement and an emergency contact on their profile. Parent/guardian approval does not by itself make a job legally permissible.</p>
        </Card>
      </div>

      <div className="mt-4">
        <Card icon={Lock} title="Privacy" accent="text-primary">
          <p>SideUp never displays a minor's exact birth date, home address, private phone number, or financial information. Workers see only an approximate job location until a job is accepted.</p>
        </Card>
      </div>

      <div className="mt-4">
        <Card icon={AlertTriangle} title="Payments, verification & insurance" accent="text-amber-600 dark:text-amber-300">
          <p>Payments are currently disabled while SideUp completes its payment and legal setup.</p>
          <p>Identity verification and background checks are not connected yet.</p>
          <p>SideUp is a prototype and does not currently provide insurance coverage.</p>
        </Card>
      </div>

      <div className="mt-4">
        <Card icon={Phone} title="Emergency guidance" accent="text-destructive">
          <p>If you are in immediate danger, call <span className="font-semibold text-foreground">911</span> (or your local emergency number) first, then report it here.</p>
        </Card>
      </div>

      {/* Report sheet */}
      <Sheet open={!!reportType} onOpenChange={(o) => !o && setReportType(null)}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[92vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{REPORT_TYPES.find((r) => r.key === reportType)?.label || "Report"}</SheetTitle>
            <SheetDescription className="text-left">
              Describe what happened. Include a user name or job if relevant. Reports are reviewed by the SideUp team.
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Who or what is this about? (optional)</label>
              <input
                value={targetName}
                onChange={(e) => setTargetName(e.target.value)}
                placeholder="User name or job title"
                className="w-full h-12 rounded-2xl border border-input bg-background px-4 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">What happened? *</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Describe the concern…"
                className="w-full rounded-2xl border border-input bg-background px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
            </div>
            <button
              onClick={submitReport}
              disabled={submitting}
              className="w-full h-14 rounded-2xl bg-destructive text-destructive-foreground font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" /> Submit report
                </>
              )}
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
