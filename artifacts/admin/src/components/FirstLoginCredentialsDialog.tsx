/**
 * Optional post-login popup for the seeded super-admin while they are
 * still on the default credentials. Lets them update username and/or
 * password, or skip. Owns its `open` state locally because a derived
 * `open` would auto-close mid-submit when the password API clears
 * `usingDefaultCredentials` — that would hide partial-failure errors
 * for a subsequent username PATCH.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAdminAuth } from "@/lib/adminAuthContext";

const DOCUMENTED_DEFAULT_PASSWORD = "Toqeerkhan@123.com";

function validateStrength(pw: string): string | null {
  if (pw.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Z]/.test(pw)) return "Password must contain at least 1 uppercase letter.";
  if (!/[0-9]/.test(pw)) return "Password must contain at least 1 number.";
  return null;
}

type StrengthLevel = 0 | 1 | 2 | 3 | 4;

function computeStrength(pw: string): StrengthLevel {
  if (!pw) return 0;
  if (pw.length < 8) return 1;
  if (!/[A-Z]/.test(pw)) return 2;
  if (!/[0-9]/.test(pw)) return 3;
  return 4;
}

const STRENGTH_META: Record<StrengthLevel, { label: string; bar: string; text: string }> = {
  0: { label: "", bar: "", text: "" },
  1: { label: "Weak", bar: "bg-red-500", text: "text-red-500" },
  2: { label: "Fair", bar: "bg-orange-400", text: "text-orange-400" },
  3: { label: "Good", bar: "bg-amber-400", text: "text-amber-500" },
  4: { label: "Strong", bar: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400" },
};

export function FirstLoginCredentialsDialog() {
  const [, setLocation] = useLocation();
  const { state, changePassword, updateOwnProfile, dismissDefaultCredentialsPrompt } =
    useAdminAuth();
  const { toast } = useToast();

  const wantsToShow = useMemo(
    () =>
      !!state.accessToken &&
      !!state.usingDefaultCredentials &&
      !state.defaultCredentialsDismissed,
    [state.accessToken, state.usingDefaultCredentials, state.defaultCredentialsDismissed],
  );

  const [open, setOpen] = useState(wantsToShow);

  /* Open when conditions are met */
  useEffect(() => {
    if (wantsToShow) setOpen(true);
  }, [wantsToShow]);

  /* Close on logout */
  useEffect(() => {
    if (!state.accessToken) setOpen(false);
  }, [state.accessToken]);

  const [username, setUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [passwordSavedThisSession, setPasswordSavedThisSession] = useState(false);

  /* Reset form fields when dialog opens */
  useEffect(() => {
    if (open) {
      setUsername(state.user?.username ?? "");
      setNewPassword("");
      setConfirmPassword("");
      setFormError(null);
      setPasswordSavedThisSession(false);
      setShowPasswords(false);
    }
  }, [open, state.user?.username]);

  /* FIX 1: Clear formError whenever user edits any field */
  useEffect(() => {
    if (formError) setFormError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username, newPassword, confirmPassword]);

  /* FIX 2: Stable skip handler */
  const handleSkip = useCallback(() => {
    dismissDefaultCredentialsPrompt();
    setOpen(false);
  }, [dismissDefaultCredentialsPrompt]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmedUsername = username.trim();
    const currentUsername = state.user?.username ?? "";
    const wantsUsernameChange =
      trimmedUsername.length > 0 && trimmedUsername !== currentUsername;
    const wantsPasswordChange =
      !passwordSavedThisSession &&
      (newPassword.length > 0 || confirmPassword.length > 0);

    if (!wantsUsernameChange && !wantsPasswordChange) {
      setFormError(
        passwordSavedThisSession
          ? "Pick a new username, or click Skip for now."
          : "Update your username, password, or both — or click Skip for now.",
      );
      return;
    }

    if (wantsPasswordChange) {
      if (newPassword !== confirmPassword) {
        setFormError("The new password and confirmation do not match.");
        return;
      }
      const strengthError = validateStrength(newPassword);
      if (strengthError) { setFormError(strengthError); return; }
      if (newPassword === DOCUMENTED_DEFAULT_PASSWORD) {
        setFormError("The new password must be different from the default.");
        return;
      }
    }

    setSubmitting(true);

    /*
     * FIX 3: Track whether password was saved in THIS execution with a
     * local variable. React state updates (setPasswordSavedThisSession)
     * are async — reading `passwordSavedThisSession` later in the same
     * call would still return the stale `false` value, producing the
     * wrong error message when username change fails after a successful
     * password change.
     */
    let pwSavedNow = passwordSavedThisSession;

    try {
      if (wantsPasswordChange) {
        try {
          await changePassword(DOCUMENTED_DEFAULT_PASSWORD, newPassword);
          pwSavedNow = true;
          setPasswordSavedThisSession(true);
          setNewPassword("");
          setConfirmPassword("");
        } catch (err) {
          setFormError(err instanceof Error ? err.message : "Failed to update your password.");
          return;
        }
      }
      if (wantsUsernameChange) {
        try {
          await updateOwnProfile({ username: trimmedUsername });
        } catch (err) {
          const baseMsg =
            err instanceof Error ? err.message : "Failed to update your username.";
          /* FIX 3 continued: use local `pwSavedNow` not stale state */
          setFormError(
            pwSavedNow
              ? `Password was updated, but username change failed: ${baseMsg}`
              : baseMsg,
          );
          return;
        }
      }
      toast({
        title: "Credentials updated",
        description:
          wantsPasswordChange && wantsUsernameChange
            ? "Use your new username and password on next login."
            : wantsPasswordChange
              ? "Use your new password on next login."
              : "Use your new username on next login.",
      });
      dismissDefaultCredentialsPrompt();
      setOpen(false);
    } finally {
      setSubmitting(false);
    }
  }, [
    username,
    newPassword,
    confirmPassword,
    passwordSavedThisSession,
    state.user?.username,
    changePassword,
    updateOwnProfile,
    dismissDefaultCredentialsPrompt,
    toast,
  ]);

  const strengthLevel = computeStrength(newPassword);
  const sm = STRENGTH_META[strengthLevel];

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => { if (!next && !submitting) handleSkip(); }}
    >
      <DialogContent
        className="sm:max-w-md p-0 overflow-hidden rounded-2xl border-0 shadow-2xl
          [&>button[aria-label='Close\\ dialog']]:top-3.5 [&>button[aria-label='Close\\ dialog']]:right-3.5
          [&>button[aria-label='Close\\ dialog']]:h-7 [&>button[aria-label='Close\\ dialog']]:w-7
          [&>button[aria-label='Close\\ dialog']]:rounded-full
          [&>button[aria-label='Close\\ dialog']]:bg-white/15
          [&>button[aria-label='Close\\ dialog']]:text-white
          [&>button[aria-label='Close\\ dialog']]:hover:bg-white/25
          [&>button[aria-label='Close\\ dialog']]:hover:text-white
          [&>button[aria-label='Close\\ dialog']]:backdrop-blur-sm"
        data-testid="dialog-first-login-credentials"
      >
        {/* ── Header ───────────────────────────────────────────── */}
        <div className="relative bg-gradient-to-br from-amber-500 via-amber-400 to-orange-500 px-6 pt-6 pb-5">
          {/* subtle grid texture */}
          <div
            className="pointer-events-none absolute inset-0 opacity-10"
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg,transparent,transparent 19px,rgba(255,255,255,.4) 19px,rgba(255,255,255,.4) 20px),repeating-linear-gradient(90deg,transparent,transparent 19px,rgba(255,255,255,.4) 19px,rgba(255,255,255,.4) 20px)",
            }}
          />
          <div className="relative flex items-start gap-4 pr-7">
            {/* icon badge */}
            <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20 shadow-lg ring-1 ring-white/30 backdrop-blur-sm">
              <KeyRound className="h-5 w-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-white leading-tight tracking-tight">
                Secure your admin account
              </DialogTitle>
              <DialogDescription className="mt-1 text-[13px] leading-snug text-white/80">
                You're using default credentials — set a unique username and password.
              </DialogDescription>
              {/* security badge */}
              <span className="mt-2.5 inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-white/90 backdrop-blur-sm">
                <ShieldCheck className="h-3 w-3" />
                Action required
              </span>
            </div>
          </div>
        </div>

        {/* ── Body ─────────────────────────────────────────────── */}
        <form onSubmit={handleSubmit} className="bg-background">

          <div className="px-6 pt-5 pb-1 space-y-5">

            {/* Username */}
            <div className="space-y-1.5">
              <label
                htmlFor="flcd-username"
                className="block text-[11px] font-semibold uppercase tracking-widest text-muted-foreground"
              >
                Username
              </label>
              <Input
                id="flcd-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={state.user?.username ?? "admin"}
                autoComplete="username"
                disabled={submitting}
                className="h-10 rounded-lg border-border/70 bg-muted/40 text-sm focus:border-amber-400 focus:ring-amber-400/20 transition-colors"
                data-testid="input-new-username"
              />
              <p className="text-[12px] text-muted-foreground/70">
                Leave unchanged to keep the current username.
              </p>
            </div>

          {/* Password section */}
          {passwordSavedThisSession ? (
            /* FIX 4: aria-live so screen readers announce the success */
            <div
              role="status"
              aria-live="polite"
              className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 flex items-start gap-3"
              data-testid="text-password-saved"
            >
              <div className="w-8 h-8 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
            ) : (
              <div className="space-y-4">
                {/* new password */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="flcd-new"
                    className="block text-[11px] font-semibold uppercase tracking-widest text-muted-foreground"
                  >
                    New password
                  </label>
                  <div className="relative">
                    <Input
                      id="flcd-new"
                      type={showPasswords ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min 8 chars, 1 uppercase, 1 number"
                      autoComplete="new-password"
                      disabled={submitting}
                      className="h-10 rounded-lg border-border/70 bg-muted/40 pr-10 text-sm focus:border-amber-400 focus:ring-amber-400/20 transition-colors"
                      data-testid="input-new-password"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 flex w-9 items-center justify-center rounded-r-lg text-muted-foreground/60 hover:text-muted-foreground transition-colors focus-visible:outline-none"
                      onClick={() => setShowPasswords((v) => !v)}
                      aria-label={showPasswords ? "Hide password" : "Show password"}
                      aria-pressed={showPasswords}
                    >
                      {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>

                  {/* strength meter */}
                  {newPassword.length > 0 && (
                    <div className="space-y-1.5 pt-0.5">
                      <div className="flex gap-1">
                        {([1, 2, 3, 4] as const).map((bar) => (
                          <div
                            key={bar}
                            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                              strengthLevel >= bar ? sm.bar : "bg-border/60"
                            }`}
                          />
                        ))}
                      </div>
                      {strengthLevel > 0 && (
                        <p className={`text-[11px] font-semibold ${sm.text}`}>
                          {sm.label}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Password strength indicator */}
                {newPassword.length > 0 && (
                  /* FIX 4: aria-live so screen readers announce strength changes */
                  <div className="space-y-1.5" role="status" aria-live="polite">
                    <div className="flex gap-1" aria-hidden="true">
                      {([1, 2, 3, 4] as const).map((bar) => (
                        <div
                          key={bar}
                          className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                            strengthLevel >= bar
                              ? STRENGTH_COLORS[strengthLevel]
                              : "bg-border"
                          }`}
                        />
                      ))}
                    </div>
                    {strengthLevel > 0 && (
                      <p className={`text-xs font-medium ${STRENGTH_TEXT_COLORS[strengthLevel]}`}>
                        {STRENGTH_LABELS[strengthLevel]}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Error */}
            {formError && (
              <div
                className="flex items-start gap-2.5 rounded-xl border border-destructive/25 bg-destructive/8 px-3.5 py-2.5"
                data-testid="text-credentials-error"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                <p className="text-[13px] leading-snug text-destructive">{formError}</p>
              </div>
            )}
          </div>

          {/* FIX 4: role="alert" so screen readers announce errors immediately */}
          {formError && (
            <div
              role="alert"
              aria-live="assertive"
              className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2.5 flex items-start gap-2.5"
              data-testid="text-credentials-error"
            >
              <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" aria-hidden="true" />
              <p className="text-sm text-destructive leading-snug">{formError}</p>
            </div>
          )}

          {/* Footer — negative horizontal margin bleeds to DialogContent edge (p-0) */}
          <div className="-mx-6 px-6 py-4 border-t border-border flex flex-col sm:flex-row items-center gap-2">
            <Button
              type="button"
              onClick={() => { handleSkip(); setLocation("/set-new-password"); }}
              disabled={submitting}
              className="flex items-center gap-1 text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded disabled:opacity-40"
              data-testid="button-open-full-screen"
            >
              Open the full password screen
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleSkip}
              disabled={submitting}
              data-testid="button-skip-credentials"
            >
              Skip for now
            </Button>
            <Button type="submit" disabled={submitting} data-testid="button-save-credentials">
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Saving…
                </>
              ) : (
                "Save changes"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default FirstLoginCredentialsDialog;