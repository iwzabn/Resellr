import { Lock, Mail, UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthError, AuthLink, GoogleButton, OrDivider, SubmitButton } from "@/components/auth/parts";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { safeReturnTo } from "@/lib/authReturnTo";

/**
 * The /register page. Supabase emails a confirmation link; if confirmation is switched off
 * the visitor is signed in straight away and sent on.
 */
export function RegisterPage() {
  const returnTo = safeReturnTo();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [step, setStep] = useState("form");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function register(e) {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    setBusy(true);
    try {
      const { needsConfirmation } = await base44.auth.register({ email, password });
      if (needsConfirmation) setStep("check_email");
      else window.location.href = returnTo;
    } catch (err) {
      setError(err.message || "Registration failed");
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    setError("");
    try {
      await base44.auth.resendConfirmation(email);
      toast("Email sent", { description: "Check your inbox for a new confirmation link." });
    } catch (err) {
      setError(err.message || "Failed to resend the email");
    }
  }

  if (step === "check_email") {
    return (
      <AuthLayout icon={UserPlus} title="Check your email" subtitle="One more step">
        <AuthError>{error}</AuthError>
        <p className="mb-4 text-sm text-muted-foreground">
          We sent a confirmation link to <span className="font-medium text-foreground">{email}</span>. Open it to finish creating your account, then log in.
        </p>
        <p className="text-center text-sm text-muted-foreground">
          Didn't get it?{" "}
          <button type="button" onClick={resend} className="font-medium text-primary hover:underline">
            Resend
          </button>
        </p>
        <p className="mt-4 text-center text-sm">
          <AuthLink to="/login" returnTo={returnTo}>
            Back to log in
          </AuthLink>
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout icon={UserPlus} title="Create your account" subtitle="Sign up to get started">
      <GoogleButton returnTo={returnTo} onError={setError} />
      <OrDivider />
      <AuthError>{error}</AuthError>
      <form onSubmit={register} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="register-email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input id="register-email" type="email" autoComplete="email" autoFocus placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 pl-10" disabled={busy} required />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="register-password">Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input id="register-password" type="password" autoComplete="new-password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 pl-10" disabled={busy} required />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="register-confirm">Confirm password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input id="register-confirm" type="password" autoComplete="new-password" placeholder="••••••••" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="h-12 pl-10" disabled={busy} required />
          </div>
        </div>
        <SubmitButton busy={busy} busyLabel="Creating account...">
          Create account
        </SubmitButton>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <AuthLink to="/login" returnTo={returnTo}>
          Log in
        </AuthLink>
      </p>
    </AuthLayout>
  );
}
