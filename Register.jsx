import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Mail, Lock, Loader2 } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import GoogleIcon from "@/components/GoogleIcon";
import AppleIcon from "@/components/AppleIcon";
import OnboardingShell from "@/components/OnboardingShell";
import { toast } from "@/components/ui/use-toast";

export default function Register() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!firstName.trim() || !lastName.trim()) {
      setError("Please enter your first and last name");
      return;
    }
    setLoading(true);
    try {
      await base44.auth.register({ email, password });
      setShowOtp(true);
    } catch (err) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setError("");
    setLoading(true);
    try {
      const result = await base44.auth.verifyOtp({ email, otpCode });
      if (result?.access_token) base44.auth.setToken(result.access_token);
      const pendingRole = localStorage.getItem("yardly_pending_role");
      const updates = { full_name: `${firstName.trim()} ${lastName.trim()}`.trim() };
      if (pendingRole) updates.role = pendingRole;
      try {
        await base44.auth.updateMe(updates);
      } catch {}
      if (pendingRole) localStorage.removeItem("yardly_pending_role");
      window.location.href = "/";
    } catch (err) {
      setError(err.message || "Invalid verification code");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    try {
      await base44.auth.resendOtp(email);
      toast({ title: "Code sent", description: "Check your email for the new code." });
    } catch (err) {
      setError(err.message || "Failed to resend code");
    }
  };

  const handleGoogle = () => base44.auth.loginWithProvider("google", "/");
  const handleApple = () => base44.auth.loginWithProvider("apple", "/");

  if (showOtp) {
    return (
      <OnboardingShell
        completed={1}
        icon={Mail}
        iconBg="bg-brand-blue-light"
        iconColor="text-primary"
        title="Verify your email"
        subtitle={`We sent a 6-digit code to ${email}`}
        onBack={() => setShowOtp(false)}
      >
        {error && <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}
        <div className="flex justify-center mb-6">
          <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode} autoFocus autoComplete="one-time-code">
            <InputOTPGroup>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <InputOTPSlot key={i} index={i} />
              ))}
            </InputOTPGroup>
          </InputOTP>
        </div>
        <button
          onClick={handleVerify}
          disabled={loading || otpCode.length < 6}
          className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-semibold disabled:opacity-50 flex items-center justify-center"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify email"}
        </button>
        <p className="text-center text-sm text-muted-foreground mt-4">
          Didn't receive the code?{" "}
          <button onClick={handleResend} className="text-primary font-medium hover:underline">
            Resend
          </button>
        </p>
      </OnboardingShell>
    );
  }

  return (
    <OnboardingShell completed={0} title="Create your account" subtitle="Sign up to continue onboarding." onBack={() => navigate("/role")}>
      <div className="space-y-3 mb-5">
        <button
          onClick={handleGoogle}
          className="w-full h-12 rounded-2xl border border-border bg-background font-medium flex items-center justify-center gap-2 text-sm"
        >
          <GoogleIcon className="w-5 h-5" /> Continue with Google
        </button>
        <button
          onClick={handleApple}
          className="w-full h-12 rounded-2xl border border-border bg-background font-medium flex items-center justify-center gap-2 text-sm"
        >
          <AppleIcon className="w-5 h-5" /> Continue with Apple
        </button>
      </div>

      <div className="relative mb-5">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-3 text-muted-foreground">or sign up with email</span>
        </div>
      </div>

      {error && <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium mb-1.5 block">First name</label>
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Jamie"
              className="w-full h-12 rounded-2xl border border-input bg-background px-4 focus:outline-none focus:ring-2 focus:ring-primary"
              required
              autoFocus
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Last name</label>
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Lee"
              className="w-full h-12 rounded-2xl border border-input bg-background px-4 focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block">Email</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full h-12 rounded-2xl border border-input bg-background pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block">Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full h-12 rounded-2xl border border-input bg-background pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-semibold disabled:opacity-50 flex items-center justify-center"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Create account"}
        </button>
      </form>

      <p className="text-center text-sm text-muted-foreground mt-6">
        Already have an account?{" "}
        <Link to="/login" className="text-primary font-medium hover:underline">
          Log in
        </Link>
      </p>
    </OnboardingShell>
  );
}
