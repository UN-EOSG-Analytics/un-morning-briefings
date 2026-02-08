"use client";

import { signIn } from "next-auth/react";
import { useState, FormEvent, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Lock,
  AlertCircle,
  Mail,
  CheckCircle2,
  UserPlus,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/SelectField";
import { TEAMS } from "@/lib/teams";

function LoginPageContent() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [registrationEmail, setRegistrationEmail] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();

  // Registration form state
  const [regFormData, setRegFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    team: "",
  });

  useEffect(() => {
    const verified = searchParams.get("verified");
    const errorParam = searchParams.get("error");
    const message = searchParams.get("message");
    const deleted = searchParams.get("deleted");
    const reset = searchParams.get("reset");

    if (deleted === "true") {
      setSuccess("Your account has been deleted successfully.");
    } else if (reset === "success") {
      setSuccess("Password reset successful! You can now log in with your new password.");
    } else if (verified === "true") {
      if (message === "already") {
        setSuccess("Your email is verified! You can log in now.");
      } else {
        setSuccess("Email verified successfully! You can now log in.");
      }
    } else if (errorParam === "invalid_token") {
      setError(
        "Invalid verification link. Please try again or request a new link.",
      );
    } else if (errorParam === "token_expired") {
      setError("Verification link has expired. Please register again.");
    } else if (errorParam === "verification_failed") {
      setError("Email verification failed. Please try again.");
    }
  }, [searchParams]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(
          "Invalid email or password. Please check your credentials and try again.",
        );
      } else if (result?.ok) {
        window.location.href = "https://briefings.eosg.dev/";
      }
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    // Validate fields
    if (!regFormData.email.endsWith("@un.org")) {
      setError("Please use a valid @un.org email address");
      return;
    }

    if (regFormData.password.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    if (regFormData.password !== regFormData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!regFormData.firstName || !regFormData.lastName || !regFormData.team) {
      setError("All fields are required");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: regFormData.email,
          password: regFormData.password,
          firstName: regFormData.firstName,
          lastName: regFormData.lastName,
          team: regFormData.team,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Registration failed");
        return;
      }

      setRegistrationEmail(regFormData.email);
      setRegistrationSuccess(true);
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    setShowRegister(false);
    setRegistrationSuccess(false);
    setError("");
    setRegFormData({
      email: "",
      password: "",
      confirmPassword: "",
      firstName: "",
      lastName: "",
      team: "",
    });
  };

  return (
    <div className="flex items-center justify-center bg-slate-50 px-4 py-20">
      <div className="w-full max-w-md">
        {/* Registration Success Message */}
        {registrationSuccess ? (
          <div className="rounded-lg bg-white p-8 shadow-lg">
            <div className="mb-4 flex items-center justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <CheckCircle2 className="h-10 w-10 text-green-600" />
              </div>
            </div>
            <h2 className="mb-2 text-center text-xl font-semibold text-slate-900">
              Check Your Email
            </h2>
            <p className="mb-6 text-center text-sm text-slate-600">
              We&apos;ve sent a verification link to{" "}
              <strong>{registrationEmail}</strong>
            </p>
            <div className="mb-6 flex items-start gap-3 rounded-md bg-blue-50 p-4">
              <Mail className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
              <div className="text-sm text-slate-700">
                <p className="mb-1 font-medium">Please verify your email</p>
                <p className="text-slate-600">
                  Click the link in the email we sent you to activate your
                  account. The link will expire in 24 hours.
                </p>
              </div>
            </div>
            <Button
              onClick={handleBackToLogin}
              className="w-full bg-un-blue hover:bg-un-blue/90"
            >
              Back to Login
            </Button>
          </div>
        ) : showRegister ? (
          /* Registration Form */
          <div className="rounded-lg bg-white p-8 shadow-lg">
            <div className="mb-8 text-left">
              <Button
                variant="ghost"
                onClick={handleBackToLogin}
                className="mb-4 -ml-2 text-slate-600 hover:text-slate-900"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Login
              </Button>
              <h1 className="mb-2 text-2xl font-semibold text-slate-900">
                Create Account
              </h1>
              <p className="text-sm text-slate-600">
                Register with your @un.org email address
              </p>
            </div>

            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              {error && (
                <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3">
                  <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="firstName"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    First Name
                  </label>
                  <input
                    id="firstName"
                    type="text"
                    required
                    value={regFormData.firstName}
                    onChange={(e) =>
                      setRegFormData({
                        ...regFormData,
                        firstName: e.target.value,
                      })
                    }
                    className="block w-full rounded-md border border-slate-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-un-blue focus:outline-none"
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <label
                    htmlFor="lastName"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Last Name
                  </label>
                  <input
                    id="lastName"
                    type="text"
                    required
                    value={regFormData.lastName}
                    onChange={(e) =>
                      setRegFormData({
                        ...regFormData,
                        lastName: e.target.value,
                      })
                    }
                    className="block w-full rounded-md border border-slate-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-un-blue focus:outline-none"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="regEmail"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Email Address
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Mail className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    id="regEmail"
                    type="email"
                    required
                    value={regFormData.email}
                    onChange={(e) =>
                      setRegFormData({ ...regFormData, email: e.target.value })
                    }
                    className="block w-full rounded-md border border-slate-300 py-2 pr-3 pl-10 focus:border-transparent focus:ring-2 focus:ring-un-blue focus:outline-none"
                    placeholder="your.name@un.org"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div>
                <SelectField
                  label="Team"
                  placeholder="Select a team..."
                  value={regFormData.team}
                  onValueChange={(value) =>
                    setRegFormData({ ...regFormData, team: value })
                  }
                  options={TEAMS}
                  required={true}
                  className="w-full"
                />
              </div>

              <div>
                <label
                  htmlFor="regPassword"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Password
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Lock className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    id="regPassword"
                    type="password"
                    required
                    value={regFormData.password}
                    onChange={(e) =>
                      setRegFormData({
                        ...regFormData,
                        password: e.target.value,
                      })
                    }
                    className="block w-full rounded-md border border-slate-300 py-2 pr-3 pl-10 focus:border-transparent focus:ring-2 focus:ring-un-blue focus:outline-none"
                    placeholder="Minimum 8 characters"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Confirm Password
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Lock className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    id="confirmPassword"
                    type="password"
                    required
                    value={regFormData.confirmPassword}
                    onChange={(e) =>
                      setRegFormData({
                        ...regFormData,
                        confirmPassword: e.target.value,
                      })
                    }
                    className="block w-full rounded-md border border-slate-300 py-2 pr-3 pl-10 focus:border-transparent focus:ring-2 focus:ring-un-blue focus:outline-none"
                    placeholder="Re-enter password"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-un-blue py-2 text-white hover:bg-un-blue/95"
              >
                {isLoading ? "Creating Account..." : "Create Account"}
              </Button>
            </form>

            <div className="mt-8 text-center text-xs text-slate-500">
              <p>© {new Date().getFullYear()} United Nations</p>
            </div>
          </div>
        ) : (
          /* Login Form */
          <div className="rounded-lg bg-white p-8 shadow-lg">
            {/* Title */}
            <div className="mb-8 text-left">
              <h1 className="mb-2 text-2xl font-semibold text-slate-900">
                Morning Briefing System
              </h1>
              <p className="text-sm text-slate-600">
                Sign in with your UN account
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Email Address
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Mail className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full rounded-md border border-slate-300 py-2 pr-3 pl-10 focus:border-transparent focus:ring-2 focus:ring-un-blue focus:outline-none"
                    placeholder="your.name@un.org"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-slate-700"
                  >
                    Password
                  </label>
                  <a
                    href="/forgot-password"
                    className="text-xs text-un-blue hover:text-un-blue/80 transition-colors"
                  >
                    Forgot password?
                  </a>
                </div>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Lock className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full rounded-md border border-slate-300 py-2 pr-3 pl-10 focus:border-transparent focus:ring-2 focus:ring-un-blue focus:outline-none"
                    placeholder="Enter your password"
                    disabled={isLoading}
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3">
                  <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              {success && (
                <div className="flex items-start gap-2 rounded-md border border-green-200 bg-green-50 p-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" />
                  <p className="text-sm text-green-600">{success}</p>
                </div>
              )}

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-un-blue py-2 text-white hover:bg-un-blue/95"
              >
                {isLoading ? "Logging in..." : "Login"}
              </Button>
            </form>

            {/* Register Section */}
            <div className="mt-6 border-t border-slate-200 pt-6">
              <p className="mb-3 text-center text-sm text-slate-600">
                Don&apos;t have an account?
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowRegister(true)}
                className="w-full"
                disabled={isLoading}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Create Account
              </Button>
            </div>

            {/* Footer */}
            <div className="mt-8 text-center text-xs text-slate-500">
              <p>© {new Date().getFullYear()} United Nations</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginPageContent />
    </Suspense>
  );
}
