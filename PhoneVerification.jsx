import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Phone, Loader2, ShieldCheck } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import OnboardingShell from "@/components/OnboardingShell";
import { toast } from "@/components/ui/use-toast";

export default function PhoneVerification() {
  const [phone, setPhone] = useState("");
  const [stage, setStage] = useState("phone");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [sentCode, setSentCode] = useState("");
  const navigate = useNavigate();

  const handleSend = (e) => {
    e.preventDefault();
    if (phone.replace(/\D/g, "").length < 10) {
      toast({ title: "Enter a valid phone number", variant: "destructive" });
      return;
    }
    setLoading(true);
    const generated = String(Math.floor(100000 + Math.random() * 900000));
    setSentCode(generated);
    setTimeout(() => {
      setLoading(false);
      setStage("code");
      toast({ title: "Verification code sent", description: `Demo code: ${generated}` });
    }, 800);
  };

  const handleVerify = async () => {
    if (code.length < 6) return;
    setLoading(true);
    try {
      if (code !== sentCode) throw new Error("Incorrect code. Please try again.");
      await base44.auth.updateMe({ phone, phone_verified: true });
      navigate("/verify-identity", { replace: true });
    } catch (err) {
      toast({ title: "Verification failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <OnboardingShell
      completed={2}
      icon={Phone}
      iconBg="bg-brand-blue-light"
      iconColor="text-primary"
      title="Verify your phone"
      subtitle="We'll send a code to confirm your number."
      onBack={() => navigate("/")}
    >
      {stage === "phone" ? (
        <form onSubmit={handleSend} className="space-y-4">
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1 (555) 000-0000"
            className="w-full h-14 rounded-2xl border border-input bg-background px-4 text-lg font-medium focus:outline-none focus:ring-2 focus:ring-primary"
            autoFocus
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-semibold disabled:opacity-50 flex items-center justify-center"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Send code"}
          </button>
        </form>
      ) : (
        <div className="space-y-6">
          <p className="text-sm text-muted-foreground">Enter the 6-digit code sent to {phone}</p>
          <div className="flex justify-center">
            <InputOTP maxLength={6} value={code} onChange={setCode} autoFocus>
              <InputOTPGroup>
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <InputOTPSlot key={i} index={i} />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </div>
          <button
            onClick={handleVerify}
            disabled={loading || code.length < 6}
            className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-semibold disabled:opacity-50 flex items-center justify-center"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify phone"}
          </button>
          <button onClick={() => setStage("phone")} className="w-full text-sm text-muted-foreground font-medium">
            Change number
          </button>
        </div>
      )}

      <div className="mt-10 flex items-center gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="w-4 h-4 text-accent" /> Your number is kept private and only used for verification.
      </div>
    </OnboardingShell>
  );
}
