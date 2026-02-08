"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Mail, ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import labels from "@/lib/labels.json";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        setEmail(""); // Clear the form
      } else {
        setError(data.message || labels.auth.messages.genericError);
      }
    } catch {
      setError(labels.auth.messages.genericError);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-un-blue">
            <Mail className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">
            {labels.auth.forgotPassword.title}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            {labels.auth.forgotPassword.subtitle}
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-8 shadow-lg">
          {success ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-lg bg-green-50 p-4">
                <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-green-900">
                    {labels.auth.forgotPassword.successTitle}
                  </p>
                  <p className="mt-1 text-xs text-green-700">
                    {labels.auth.forgotPassword.successMessage}
                  </p>
                </div>
              </div>
              <Button
                onClick={() => router.push("/login")}
                className="w-full bg-un-blue hover:bg-un-blue/90"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                {labels.common.backToLogin}
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
                  htmlFor="email"
                  className="block text-sm font-medium text-slate-700"
                >
                  Email Address
                </label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-3 text-slate-900 placeholder-slate-400 focus:border-un-blue focus:outline-none focus:ring-2 focus:ring-un-blue/20"
                    placeholder={labels.auth.login.emailPlaceholder}
                  />
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {labels.auth.forgotPassword.emailHelper}
                </p>
              </div>

              <div className="space-y-3">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-un-blue hover:bg-un-blue/90"
                >
                  {isLoading ? labels.auth.forgotPassword.submitLoading : labels.auth.forgotPassword.submitButton}
                </Button>

                <Link href="/login" className="block">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    {labels.common.backToLogin}
                  </Button>
                </Link>
              </div>
            </form>
          )}
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-slate-500">
            {labels.auth.forgotPassword.securityNote}
          </p>
        </div>
      </div>
    </div>
  );
}
