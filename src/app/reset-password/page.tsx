"use client";

import { useState, FormEvent, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, ArrowLeft, CheckCircle2, AlertCircle, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";

function ResetPasswordContent() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [tokenValid, setTokenValid] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  useEffect(() => {
    // Validate token on page load
    const validateToken = async () => {
      if (!token) {
        setError("No reset token provided. Please request a new password reset link.");
        setIsValidating(false);
        return;
      }

      try {
        const response = await fetch(
          `/api/auth/reset-password?token=${encodeURIComponent(token)}`
        );
        const data = await response.json();

        if (data.valid) {
          setTokenValid(true);
        } else {
          setError(data.message || "Invalid or expired reset token");
        }
      } catch {
        setError("Error validating reset token. Please try again.");
      } finally {
        setIsValidating(false);
      }
    };

    validateToken();
  }, [token]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    // Validate passwords match
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    // Validate password length
    if (password.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        // Redirect to login after 2 seconds
        setTimeout(() => {
          router.push("/login?reset=success");
        }, 2000);
      } else {
        setError(data.message || "An error occurred. Please try again.");
      }
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-un-blue">
            <Lock className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">
            Set New Password
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Enter your new password below
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-8 shadow-lg">
          {isValidating ? (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-un-blue border-t-transparent"></div>
              <p className="mt-4 text-sm text-slate-600">Validating reset token...</p>
            </div>
          ) : success ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-lg bg-green-50 p-4">
                <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-green-900">
                    Password reset successful!
                  </p>
                  <p className="mt-1 text-xs text-green-700">
                    Redirecting you to login...
                  </p>
                </div>
              </div>
            </div>
          ) : !tokenValid ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-lg bg-red-50 p-4">
                <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600" />
                <div>
                  <p className="text-sm font-medium text-red-900">
                    Invalid Reset Link
                  </p>
                  <p className="mt-1 text-xs text-red-700">{error}</p>
                </div>
              </div>
              <Button
                onClick={() => router.push("/forgot-password")}
                className="w-full bg-un-blue hover:bg-un-blue/90"
              >
                Request New Reset Link
              </Button>
              <Button
                onClick={() => router.push("/login")}
                variant="outline"
                className="w-full"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Login
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="flex items-start gap-3 rounded-lg bg-red-50 p-4">
                  <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600" />
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-slate-700"
                >
                  New Password
                </label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-10 text-slate-900 placeholder-slate-400 focus:border-un-blue focus:outline-none focus:ring-2 focus:ring-un-blue/20"
                    placeholder="Enter new password"
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Must be at least 8 characters long
                </p>
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-slate-700"
                >
                  Confirm New Password
                </label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="block w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-10 text-slate-900 placeholder-slate-400 focus:border-un-blue focus:outline-none focus:ring-2 focus:ring-un-blue/20"
                    placeholder="Confirm new password"
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-un-blue hover:bg-un-blue/90"
                >
                  {isLoading ? "Resetting Password..." : "Reset Password"}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => router.push("/login")}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Login
                </Button>
              </div>
            </form>
          )}
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-slate-500">
            Your password will be securely encrypted and stored.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-un-blue border-t-transparent"></div>
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
