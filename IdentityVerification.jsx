import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { IDENTITY_PROVIDER_CONFIGURED, IDENTITY_PROVIDER_NAME } from "@/lib/identityVerification";
import {
  IdCard, Loader2, Upload, Camera, ShieldCheck, Check, ArrowRight,
  RefreshCw, AlertCircle, Clock, ArrowLeft,
} from "lucide-react";
import OnboardingShell from "@/components/OnboardingShell";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/lib/AuthContext";

const DISABLED = ["Posting jobs", "Applying for jobs", "Messaging", "Payments"];
const POLL_INTERVAL = 15000; // re-check for an external/webhook approval while waiting

// status: loading | not_configured | form | submitted | pending | approved | failed | provider_error
const STATE_BADGE = {
  not_configured: { label: "Demo Verification", className: "bg-amber-100 text-amber-700" },
  form: { label: "Not Started", className: "bg-muted text-muted-foreground" },
  submitted: { label: "Verification Submitted", className: "bg-brand-blue-light text-primary" },
  pending: { label: "Pending", className: "bg-amber-100 text-amber-700" },
  approved: { label: "Verified", className: "bg-brand-green-light text-accent" },
  failed: { label: "Failed — Retry Required", className: "bg-destructive/10 text-destructive" },
  provider_error: { label: "Provider Error", className: "bg-destructive/10 text-destructive" },
};

const Badge = ({ status }) => {
  const b = STATE_BADGE[status];
  if (!b) return null;
  return <span className={`text-xs font-medium px-3 py-1.5 rounded-full ${b.className}`}>{b.label}</span>;
};

const UploadBox = ({ label, value, onClick, icon: Icon }) => (
  <button
    onClick={onClick}
    className={`w-full rounded-3xl border-2 border-dashed transition p-6 flex flex-col items-center gap-3 ${
      value ? "border-accent bg-brand-green-light/50" : "border-border bg-muted/40"
    }`}
  >
    {value ? (
      <>
        <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center">
          <Check className="w-5 h-5 text-accent-foreground" />
        </div>
        <span className="text-sm font-medium text-accent">Uploaded</span>
      </>
    ) : (
      <>
        <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center shadow-sm">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span className="text-xs text-muted-foreground">Tap to upload</span>
      </>
    )}
  </button>
);

const ChecklistRow = ({ label, done }) => (
  <div className="flex items-center gap-3">
    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${done ? "bg-accent" : "bg-muted border border-border"}`}>
      {done ? <Check className="w-3.5 h-3.5 text-accent-foreground" /> : <span className="w-2 h-2 rounded-full bg-muted-foreground/40" />}
    </div>
    <span className={`text-sm ${done ? "text-foreground font-medium" : "text-muted-foreground"}`}>{label}</span>
  </div>
);

export default function IdentityVerification() {
  const [idPhoto, setIdPhoto] = useState(null);
  const [selfie, setSelfie] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [checking, setChecking] = useState(false);
  const [status, setStatus] = useState("loading");
  const [failReason, setFailReason] = useState("");
  const [demoLoading, setDemoLoading] = useState(false);
  const { user, refreshUser } = useAuth();
  const idInputRef = useRef(null);
  const selfieInputRef = useRef(null);
  const pollRef = useRef(null);
  const navigate = useNavigate();

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  // Reads the real, server-side identity_status (updated by a provider webhook
  // when a real provider is configured). Does NOT invent a result.
  const checkStatus = useCallback(async () => {
    setChecking(true);
    try {
      const u = await refreshUser();
      if (u?.identity_status === "approved") {
        stopPolling();
        setStatus("approved");
        toast({ title: "Identity verified!" });
        try {
          await base44.entities.Notification.create({
            user_id: u.id,
            type: "application",
            title: "Identity verified",
            body: "Your identity has been verified. You can now use SideUp.",
            read: false,
          });
        } catch {}
      } else if (u?.identity_status === "rejected") {
        stopPolling();
        setStatus("failed");
        setFailReason("Your documents were not accepted. Please re-submit them.");
      }
      // otherwise still pending — keep waiting (no fake approval)
    } catch {
      // transient network blip — stay in current state, don't fail the whole thing
    } finally {
      setChecking(false);
    }
  }, [stopPolling, refreshUser]);

  const startPolling = useCallback(() => {
    stopPolling();
    pollRef.current = setInterval(() => {
      checkStatus();
    }, POLL_INTERVAL);
  }, [stopPolling, checkStatus]);

  // Initial status check — uses the centralized auth user (already resolved by
  // the time this protected page renders). No independent me() call.
  useEffect(() => {
    if (!user) return; // protected route guarantees user; safety only
    if (user.identity_status === "approved") {
      navigate("/profile-setup", { replace: true });
      return;
    }
    if (!IDENTITY_PROVIDER_CONFIGURED) {
      setStatus("not_configured");
      return;
    }
    if (user.identity_status === "pending") {
      setStatus("pending");
      startPolling();
    } else if (user.identity_status === "rejected") {
      setStatus("failed");
      setFailReason("Your documents were not accepted. Please re-submit them.");
    } else {
      setStatus("form");
    }
    return () => {
      stopPolling();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, navigate]);

  const handleFile = async (e, setter) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
      setter(file_url);
    } catch (err) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  // Submits documents to the real verification provider (only reachable when a
  // provider is configured). Never marks the user verified — approval comes only
  // from the provider via the webhook writing identity_status = "approved".
  const handleSubmit = async () => {
    if (!idPhoto || !selfie) {
      toast({ title: "Upload both your ID and a selfie", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    setStatus("submitted");
    try {
      // Backend contract (see src/lib/identityVerification.js): creates a real
      // provider verification session and saves identity_status = "pending".
      await base44.functions.invoke("create-identity-verification", {
        idDocumentUrl: idPhoto,
        selfieUrl: selfie,
      });
      setStatus("pending");
      toast({ title: "Documents submitted", description: "We'll review them shortly." });
      startPolling();
    } catch (err) {
      setStatus("provider_error");
      setFailReason(err.message || "The verification provider could not be reached.");
      toast({ title: "Verification provider error", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const retry = () => {
    setFailReason("");
    setStatus("form");
  };

  // DEMO / DEVELOPMENT ONLY: simulates a successful verification when no real
  // provider is connected. Clearly labeled as demo — never collects real ID
  // documents, and only runs while IDENTITY_PROVIDER_CONFIGURED is false.
  const handleDemoVerify = async () => {
    setDemoLoading(true);
    try {
      await base44.auth.updateMe({ identity_status: "approved" });
      setStatus("approved");
      toast({ title: "Demo verification complete" });
    } catch (err) {
      toast({ title: "Could not complete demo verification", description: err.message, variant: "destructive" });
    } finally {
      setDemoLoading(false);
    }
  };

  // --- States ---

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">Checking your verification status…</p>
      </div>
    );
  }

  // No real provider connected — DEMO / DEVELOPMENT flow. Clearly labeled,
  // collects no real ID documents, shows no endless spinner, and never claims
  // a real identity check is processing.
  if (status === "not_configured") {
    return (
      <OnboardingShell
        completed={3}
        icon={IdCard}
        iconBg="bg-amber-100"
        iconColor="text-amber-600"
        title="Demo Identity Verification"
        onBack={() => navigate("/verify-phone")}
      >
        <div className="flex flex-col items-center text-center">
          <Badge status="not_configured" />
          <h2 className="text-xl font-bold font-heading mt-4">Demo verification (no provider connected)</h2>
          <p className="text-muted-foreground mt-2">
            SideUp hasn't connected a real identity-verification provider yet, so this is a{" "}
            <span className="font-medium text-foreground">demo</span> verification for testing. No real ID documents
            are collected or stored. Real identity verification will become available once SideUp connects an
            approved verification provider.
          </p>

          <div className="bg-muted/50 rounded-2xl p-4 mt-6 w-full text-left space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Onboarding checklist</p>
            <ChecklistRow label="Email verified" done />
            <ChecklistRow label="Phone verified" done={!!user?.phone_verified} />
            <ChecklistRow label="Identity verified (Demo)" done={false} />
          </div>

          <button
            onClick={handleDemoVerify}
            disabled={demoLoading}
            className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 mt-6 disabled:opacity-50"
          >
            {demoLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
            Complete Demo Verification
          </button>
          <p className="text-xs text-muted-foreground mt-3">
            This marks your identity as verified for development/testing only.
          </p>
        </div>
      </OnboardingShell>
    );
  }

  if (status === "provider_error") {
    return (
      <OnboardingShell
        completed={3}
        icon={IdCard}
        iconBg="bg-brand-green-light"
        iconColor="text-accent"
        title="Verification provider error"
        onBack={() => navigate("/verify-phone")}
      >
        <div className="flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mb-5">
            <AlertCircle className="w-9 h-9 text-destructive" />
          </div>
          <Badge status="provider_error" />
          <h2 className="text-xl font-bold font-heading mt-4">We couldn't reach the verification service.</h2>
          <p className="text-muted-foreground mt-2">
            {failReason || "The identity-verification provider could not be reached. Please try again in a moment."}
          </p>
          <button
            onClick={retry}
            className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 mt-8"
          >
            <RefreshCw className="w-5 h-5" /> Try again
          </button>
        </div>
      </OnboardingShell>
    );
  }

  if (status === "pending") {
    return (
      <OnboardingShell
        completed={3}
        icon={IdCard}
        iconBg="bg-brand-green-light"
        iconColor="text-accent"
        title="Verification in progress"
        onBack={() => navigate("/verify-phone")}
      >
        <div className="flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-full bg-brand-green-light flex items-center justify-center mb-5">
            <Clock className="w-9 h-9 text-accent" />
          </div>
          <Badge status="pending" />
          <h2 className="text-xl font-bold font-heading mt-4">Your documents are under review.</h2>
          <p className="text-muted-foreground mt-2">
            Your identity must be verified before you can use SideUp. This is handled by{" "}
            {IDENTITY_PROVIDER_NAME || "our verification provider"} and usually takes a short while. You can leave
            this page and come back — we'll keep your pending status saved and notify you when it's done.
          </p>
          <div className="bg-muted/50 rounded-2xl p-4 mt-6 w-full text-left">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Temporarily disabled until verified
            </p>
            <div className="space-y-2">
              {DISABLED.map((d) => (
                <div key={d} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50" /> {d}
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-3 mt-6 w-full">
            <button
              onClick={() => navigate(-1)}
              className="flex-1 h-12 rounded-2xl border border-border font-medium flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" /> Leave page
            </button>
            <button
              onClick={checkStatus}
              disabled={checking}
              className="flex-1 h-12 rounded-2xl border border-border font-medium flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {checking ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Check status
            </button>
          </div>
        </div>
      </OnboardingShell>
    );
  }

  if (status === "approved") {
    return (
      <OnboardingShell completed={4} icon={ShieldCheck} iconBg="bg-brand-green-light" iconColor="text-accent" title="You're verified!">
        <div className="flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-full bg-brand-green-light flex items-center justify-center mb-5">
            <Check className="w-10 h-10 text-accent" />
          </div>
          <Badge status="approved" />
          <p className="text-muted-foreground mt-4">Your identity has been confirmed. One last step — set up your profile.</p>
          <div className="bg-muted/50 rounded-2xl p-4 mt-6 w-full text-left space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Onboarding checklist</p>
            <ChecklistRow label="Email verified" done />
            <ChecklistRow label="Phone verified" done={!!user?.phone_verified} />
            <ChecklistRow label="Identity verified (Demo)" done />
          </div>
          <button
            onClick={() => navigate("/profile-setup", { replace: true })}
            className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 mt-8"
          >
            Continue <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </OnboardingShell>
    );
  }

  if (status === "failed") {
    return (
      <OnboardingShell
        completed={3}
        icon={IdCard}
        iconBg="bg-brand-green-light"
        iconColor="text-accent"
        title="Verification could not complete"
        onBack={() => navigate("/verify-phone")}
      >
        <div className="flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mb-5">
            <AlertCircle className="w-9 h-9 text-destructive" />
          </div>
          <Badge status="failed" />
          <h2 className="text-xl font-bold font-heading mt-4">We couldn't verify your identity.</h2>
          <p className="text-muted-foreground mt-2">
            {failReason || "Something went wrong with your submission. Please try again."}
          </p>
          <button
            onClick={retry}
            className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 mt-8"
          >
            <RefreshCw className="w-5 h-5" /> Try again
          </button>
        </div>
      </OnboardingShell>
    );
  }

  // status === "form" (Not Started) — only shown when a real provider is configured.
  return (
    <OnboardingShell
      completed={3}
      icon={IdCard}
      iconBg="bg-brand-green-light"
      iconColor="text-accent"
      title="Verify your identity"
      subtitle={`Upload a photo ID and a selfie so ${IDENTITY_PROVIDER_NAME || "our provider"} can verify you.`}
      onBack={() => navigate("/verify-phone")}
    >
      <div className="space-y-4">
        <input
          ref={idInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFile(e, setIdPhoto)}
        />
        <input
          ref={selfieInputRef}
          type="file"
          accept="image/*"
          capture="user"
          className="hidden"
          onChange={(e) => handleFile(e, setSelfie)}
        />
        <UploadBox label="Photo ID (driver's license)" value={idPhoto} onClick={() => idInputRef.current?.click()} icon={Upload} />
        <UploadBox label="Take a selfie" value={selfie} onClick={() => selfieInputRef.current?.click()} icon={Camera} />
        {uploading && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Uploading…
          </div>
        )}
      </div>

      <button
        onClick={handleSubmit}
        disabled={!idPhoto || !selfie || uploading || submitting}
        className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-semibold disabled:opacity-40 flex items-center justify-center mt-6"
      >
        {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Submit for verification"}
      </button>
      <p className="text-xs text-muted-foreground text-center mt-4 flex items-center justify-center gap-1.5">
        <ShieldCheck className="w-3.5 h-3.5 text-accent" /> Documents are encrypted and never shared.
      </p>
    </OnboardingShell>
  );
}
