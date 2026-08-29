"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { resetPasswordAction } from "@/features/auth/actions";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // inviteUserByEmail always uses Supabase's implicit/hash-fragment flow
  // (#access_token=...&refresh_token=...&type=invite) — it never supports
  // PKCE, so there's no server-side /auth/callback path for it. The
  // forgot-password flow (PKCE, via resetPasswordForEmail) already lands
  // here with a real cookie session already set by /auth/callback, so this
  // effect only has work to do when an invite hash is actually present.
  const [isProcessingInvite, setIsProcessingInvite] = useState(true);

  useEffect(() => {
    // All setState calls below run inside this async function's body, which
    // executes after the effect itself has returned — none of them are
    // synchronous within the effect body, avoiding cascading-render issues
    // even in the early-return branches.
    async function processInviteHash() {
      const hash = window.location.hash;

      if (!hash) {
        setIsProcessingInvite(false);
        return;
      }

      const params = new URLSearchParams(hash.slice(1));

      const hashError = params.get("error");
      if (hashError) {
        setError(
          params.get("error_code") === "otp_expired"
            ? "Your invite link has expired. Please ask an admin to resend it."
            : "Your invite link is invalid. Please request a new one."
        );
        setIsProcessingInvite(false);
        return;
      }

      if (!hash.includes("access_token")) {
        setIsProcessingInvite(false);
        return;
      }

      const access_token = params.get("access_token");
      const refresh_token = params.get("refresh_token");

      if (!access_token || !refresh_token) {
        setError("Your invite link is missing required data. Please request a new one.");
        setIsProcessingInvite(false);
        return;
      }

      const supabase = getSupabaseBrowserClient();
      const { error: sessionError } = await supabase.auth.setSession({
        access_token,
        refresh_token,
      });

      if (sessionError) {
        setError("Your invite link has expired or is invalid. Please request a new one.");
      } else {
        // Clear the tokens from the URL so they don't linger in browser
        // history / get shared accidentally via copy-paste of the URL.
        window.history.replaceState(null, "", window.location.pathname);
      }
      setIsProcessingInvite(false);
    }

    processInviteHash();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setIsLoading(true);

    try {
      const result = await resetPasswordAction({ password });

      if (result.error) {
        setError(result.error);
        return;
      }

      router.push("/auth/login?reset=success");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold">Set new password</CardTitle>
        <CardDescription>
          Choose a strong password for your account
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="password">New password</Label>
            <Input
              id="password"
              type="password"
              placeholder="enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              disabled={isLoading || isProcessingInvite}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm new password</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="re-enter your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
              disabled={isLoading || isProcessingInvite}
            />
          </div>
        </CardContent>

        <CardFooter>
          <Button type="submit" className="w-full" disabled={isLoading || isProcessingInvite}>
            {isProcessingInvite ? "Verifying link..." : isLoading ? "Updating..." : "Update password"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}