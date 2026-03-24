"use client";

import { signIn } from "next-auth/react";
import { useState, FormEvent, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle,
  Mail,
  CheckCircle2,
  ArrowLeft,
} from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/SelectField";
import { TEAMS } from "@/lib/teams";
import labels from "@/lib/labels.json";

const inputClass =
  "block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-un-blue focus:ring-1 focus:ring-un-blue focus:outline-none disabled:opacity-50 transition-colors";

function LoginPageContent() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [registrationEmail, setRegistrationEmail] = useState("");
  const searchParams = useSearchParams();

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
      setSuccess(labels.auth.messages.accountDeleted);
    } else if (reset === "success") {
      setSuccess(labels.auth.messages.passwordResetSuccess);
    } else if (verified === "true") {
      if (message === "already") {
        setSuccess(labels.auth.messages.emailAlreadyVerified);
      } else {
        setSuccess(labels.auth.messages.emailVerified);
      }
    } else if (errorParam === "invalid_token") {
      setError(labels.auth.messages.invalidVerificationLink);
    } else if (errorParam === "token_expired") {
      setError(labels.auth.messages.tokenExpired);
    } else if (errorParam === "verification_failed") {
      setError(labels.auth.messages.verificationFailed);
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
        setError(labels.auth.messages.invalidCredentials);
      } else if (result?.ok) {
        window.location.href = "/";
      }
    } catch {
      setError(labels.auth.messages.genericError);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (!regFormData.email.endsWith("@un.org")) {
      setError(labels.auth.validation.invalidEmail);
      return;
    }
    if (regFormData.password.length < 8) {
      setError(labels.auth.validation.passwordMinLength);
      return;
    }
    if (regFormData.password !== regFormData.confirmPassword) {
      setError(labels.auth.validation.passwordMismatch);
      return;
    }
    if (!regFormData.firstName || !regFormData.lastName || !regFormData.team) {
      setError(labels.auth.validation.allFieldsRequired);
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
        setError(data.error || labels.auth.messages.genericError);
        return;
      }
      setRegistrationEmail(regFormData.email);
      setRegistrationSuccess(true);
    } catch {
      setError(labels.auth.messages.genericError);
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

  const Logo = () => (
    <Image
      src="/images/UN_Logo_Stacked_Colour_English.svg"
      alt="UN Logo"
      width={100}
      height={40}
      className="h-10 w-auto"
      priority
    />
  );

  const ErrorBanner = ({ message }: { message: string }) => (
    <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2.5">
      <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
      <p className="text-sm text-red-600">{message}</p>
    </div>
  );

  const SuccessBanner = ({ message }: { message: string }) => (
    <div className="flex items-start gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-2.5">
      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" />
      <p className="text-sm text-green-700">{message}</p>
    </div>
  );

  return (
    <div className="w-full max-w-sm">
      {registrationSuccess ? (
        /* Registration Success */
        <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <Logo />
          <div className="mt-8 mb-6 flex flex-col items-center text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-50">
              <CheckCircle2 className="h-7 w-7 text-green-500" />
            </div>
            <h2 className="mb-1 text-lg font-semibold text-slate-900">
              {labels.auth.register.checkEmail}
            </h2>
            <p className="text-sm text-slate-500">
              {labels.auth.register.verificationSent}{" "}
              <span className="font-medium text-slate-700">{registrationEmail}</span>
            </p>
          </div>
          <div className="mb-6 flex items-start gap-3 rounded-lg bg-slate-50 p-3">
            <Mail className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" />
            <div className="text-sm text-slate-600">
              <p className="font-medium text-slate-700">{labels.auth.register.verifyPrompt}</p>
              <p className="mt-0.5">{labels.auth.register.verifyDescription}</p>
            </div>
          </div>
          <Button
            onClick={handleBackToLogin}
            className="w-full bg-un-blue text-white hover:bg-un-blue/90"
          >
            {labels.auth.register.backToLogin}
          </Button>
        </div>
      ) : showRegister ? (
        /* Registration Form */
        <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <Logo />
          <div className="mt-6 mb-6">
            <button
              onClick={handleBackToLogin}
              className="mb-4 flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {labels.auth.register.backToLogin}
            </button>
            <h1 className="text-xl font-semibold text-slate-900">
              {labels.auth.register.title}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {labels.auth.register.subtitle}
            </p>
          </div>

          <form onSubmit={handleRegisterSubmit} className="space-y-4">
            {error && <ErrorBanner message={error} />}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="firstName" className="mb-1.5 block text-sm font-medium text-slate-700">
                  {labels.auth.register.firstName}
                </label>
                <input
                  id="firstName"
                  type="text"
                  required
                  value={regFormData.firstName}
                  onChange={(e) => setRegFormData({ ...regFormData, firstName: e.target.value })}
                  className={inputClass}
                  disabled={isLoading}
                />
              </div>
              <div>
                <label htmlFor="lastName" className="mb-1.5 block text-sm font-medium text-slate-700">
                  {labels.auth.register.lastName}
                </label>
                <input
                  id="lastName"
                  type="text"
                  required
                  value={regFormData.lastName}
                  onChange={(e) => setRegFormData({ ...regFormData, lastName: e.target.value })}
                  className={inputClass}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div>
              <label htmlFor="regEmail" className="mb-1.5 block text-sm font-medium text-slate-700">
                {labels.auth.login.emailLabel}
              </label>
              <input
                id="regEmail"
                type="email"
                required
                value={regFormData.email}
                onChange={(e) => setRegFormData({ ...regFormData, email: e.target.value })}
                className={inputClass}
                placeholder={labels.auth.login.emailPlaceholder}
                disabled={isLoading}
              />
            </div>

            <div>
              <SelectField
                label="Team"
                placeholder="Select a team..."
                value={regFormData.team}
                onValueChange={(value) => setRegFormData({ ...regFormData, team: value })}
                options={TEAMS}
                required={true}
                className="w-full"
              />
            </div>

            <div>
              <label htmlFor="regPassword" className="mb-1.5 block text-sm font-medium text-slate-700">
                {labels.auth.register.password}
              </label>
              <input
                id="regPassword"
                type="password"
                required
                value={regFormData.password}
                onChange={(e) => setRegFormData({ ...regFormData, password: e.target.value })}
                className={inputClass}
                placeholder={labels.auth.register.passwordPlaceholder}
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="mb-1.5 block text-sm font-medium text-slate-700">
                {labels.auth.register.confirmPassword}
              </label>
              <input
                id="confirmPassword"
                type="password"
                required
                value={regFormData.confirmPassword}
                onChange={(e) => setRegFormData({ ...regFormData, confirmPassword: e.target.value })}
                className={inputClass}
                placeholder={labels.auth.register.confirmPlaceholder}
                disabled={isLoading}
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-un-blue text-white hover:bg-un-blue/90"
            >
              {isLoading ? labels.auth.register.submitLoading : labels.auth.register.submitButton}
            </Button>
          </form>
        </div>
      ) : (
        /* Login Form */
        <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <Logo />
          <div className="mt-6 mb-6">
            <h1 className="text-xl font-semibold text-slate-900">
              {labels.auth.login.title}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {labels.auth.login.subtitle}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">
                {labels.auth.login.emailLabel}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
                placeholder={labels.auth.login.emailPlaceholder}
                disabled={isLoading}
              />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-medium text-slate-700">
                  {labels.auth.login.passwordLabel}
                </label>
                <a
                  href="/forgot-password"
                  className="text-xs text-un-blue hover:text-un-blue/80 transition-colors"
                >
                  {labels.auth.login.forgotPassword}
                </a>
              </div>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
                placeholder={labels.auth.login.passwordPlaceholder}
                disabled={isLoading}
              />
            </div>

            {error && <ErrorBanner message={error} />}
            {success && <SuccessBanner message={success} />}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-un-blue text-white hover:bg-un-blue/90"
            >
              {isLoading ? labels.auth.login.loginLoading : labels.auth.login.loginButton}
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-slate-500">
            {labels.auth.login.noAccount}{" "}
            <button
              type="button"
              onClick={() => setShowRegister(true)}
              disabled={isLoading}
              className="font-medium text-un-blue hover:text-un-blue/80 transition-colors disabled:opacity-50"
            >
              {labels.auth.login.createAccount}
            </button>
          </p>
        </div>
      )}
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
