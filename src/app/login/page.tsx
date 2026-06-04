"use client";

import { useEffect, useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useTheme } from "next-themes";
import {
  Wallet,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  LogIn,
  UserPlus,
  ShieldCheck,
  AlertCircle,
  Loader2,
  Sun,
  Moon,
} from "lucide-react";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type Flow = "signIn" | "signUp";

function passwordScore(pwd: string): number {
  let score = 0;
  if (pwd.length >= 8) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  return score;
}

const STRENGTH = [
  { label: t.auth.strengthWeak, color: "bg-destructive" },
  { label: t.auth.strengthFair, color: "bg-amber-500" },
  { label: t.auth.strengthGood, color: "bg-emerald-500" },
  { label: t.auth.strengthStrong, color: "bg-primary" },
];

export default function LoginPage() {
  const { signIn } = useAuthActions();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [flow, setFlow] = useState<Flow>("signIn");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");

  useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === "dark";
  const isSignUp = flow === "signUp";
  const score = passwordScore(password);
  const strength = password ? STRENGTH[Math.max(0, score - 1)] : null;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = new FormData(e.currentTarget);
    form.set("flow", flow);
    try {
      await signIn("password", form);
      // Middleware redirects to "/" once authenticated.
    } catch {
      setError(isSignUp ? t.auth.error : t.auth.invalidCredentials);
      setLoading(false);
    }
  };

  const switchFlow = () => {
    setFlow(isSignUp ? "signIn" : "signUp");
    setError(null);
    setPassword("");
    setShowPassword(false);
  };

  return (
    <div className="relative min-h-svh overflow-hidden bg-background">
      {/* Ambient gradient blobs */}
      <div className="pointer-events-none absolute -top-40 -left-32 h-96 w-96 rounded-full gradient-primary opacity-20 blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 -right-32 h-112 w-md rounded-full gradient-primary opacity-10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 left-1/4 h-80 w-80 rounded-full gradient-primary opacity-15 blur-3xl" />

      {/* Theme toggle */}
      <button
        type="button"
        onClick={() => setTheme(isDark ? "light" : "dark")}
        aria-label="Theme"
        className="absolute top-5 right-5 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-card/60 text-muted-foreground backdrop-blur transition-colors hover:text-foreground"
      >
        {mounted && isDark ? (
          <Sun className="h-4.5 w-4.5" />
        ) : (
          <Moon className="h-4.5 w-4.5" />
        )}
      </button>

      {/* Content */}
      <div className="relative z-10 mx-auto flex min-h-svh w-full max-w-md flex-col justify-center px-6 py-12">
        {/* Logo */}
        <div className="mb-9 flex flex-col items-center text-center">
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-[1.75rem] gradient-primary shadow-soft">
            <Wallet className="h-9 w-9 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            {t.appName}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">{t.auth.tagline}</p>
        </div>

        {/* Card */}
        <div className="rounded-[1.75rem] border border-border/60 bg-card/70 p-7 shadow-soft backdrop-blur-xl">
          <h2 className="text-xl font-bold text-foreground">
            {isSignUp ? t.auth.welcomeNew : t.auth.welcome}
          </h2>
          <p className="mt-1 mb-6 text-sm text-muted-foreground">
            {isSignUp ? t.auth.signUpTitle : t.auth.signInSubtitle}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <Field
                id="name"
                name="name"
                type="text"
                label={t.auth.name}
                placeholder={t.auth.namePlaceholder}
                autoComplete="name"
                icon={<User className="h-4.5 w-4.5" />}
              />
            )}

            <Field
              id="email"
              name="email"
              type="email"
              required
              label={t.auth.email}
              placeholder={t.auth.emailPlaceholder}
              autoComplete="email"
              icon={<Mail className="h-4.5 w-4.5" />}
            />

            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="ml-1 text-xs font-semibold text-muted-foreground"
              >
                {t.auth.password}
              </label>
              <div className="flex min-h-13 items-center overflow-hidden rounded-2xl border border-input bg-background/60 transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
                <span className="flex h-13 w-12 items-center justify-center text-muted-foreground">
                  <Lock className="h-4.5 w-4.5" />
                </span>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                  placeholder={t.auth.passwordPlaceholder}
                  className="h-full flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/70"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={
                    showPassword ? t.auth.hidePassword : t.auth.showPassword
                  }
                  className="px-4 text-muted-foreground transition-colors hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="h-4.5 w-4.5" />
                  ) : (
                    <Eye className="h-4.5 w-4.5" />
                  )}
                </button>
              </div>

              {/* Password strength (sign up only) */}
              {isSignUp && password && strength && (
                <div className="flex items-center gap-2 pt-1">
                  <div className="flex flex-1 gap-1">
                    {[0, 1, 2, 3].map((i) => (
                      <span
                        key={i}
                        className={cn(
                          "h-1.5 flex-1 rounded-full transition-colors",
                          i < score ? strength.color : "bg-border",
                        )}
                      />
                    ))}
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">
                    {strength.label}
                  </span>
                </div>
              )}
            </div>

            {error && (
              <div
                role="alert"
                className="flex items-center gap-2 rounded-xl border border-destructive/25 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
              >
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex h-13 w-full items-center justify-center gap-2 rounded-full gradient-primary text-base font-semibold text-white shadow-soft transition-opacity hover:opacity-95 disabled:opacity-70"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  {isSignUp ? (
                    <UserPlus className="h-4.5 w-4.5" />
                  ) : (
                    <LogIn className="h-4.5 w-4.5" />
                  )}
                  {isSignUp ? t.auth.signUp : t.auth.signIn}
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">{t.auth.or}</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          {/* Switch flow */}
          <div className="text-center text-sm text-muted-foreground">
            {isSignUp ? t.auth.haveAccount : t.auth.noAccount}{" "}
            <button
              type="button"
              onClick={switchFlow}
              className="font-semibold text-primary hover:underline"
            >
              {isSignUp ? t.auth.backToSignIn : t.auth.createOne}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>{t.auth.secure}</span>
        </div>
      </div>
    </div>
  );
}

function Field({
  id,
  name,
  type,
  label,
  placeholder,
  autoComplete,
  required,
  icon,
}: {
  id: string;
  name: string;
  type: string;
  label: string;
  placeholder: string;
  autoComplete: string;
  required?: boolean;
  icon: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="ml-1 text-xs font-semibold text-muted-foreground"
      >
        {label}
      </label>
      <div className="flex min-h-13 items-center overflow-hidden rounded-2xl border border-input bg-background/60 transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
        <span className="flex h-13 w-12 items-center justify-center text-muted-foreground">
          {icon}
        </span>
        <input
          id={id}
          name={name}
          type={type}
          required={required}
          autoComplete={autoComplete}
          placeholder={placeholder}
          className="h-full flex-1 bg-transparent pr-4 text-sm text-foreground outline-none placeholder:text-muted-foreground/70"
        />
      </div>
    </div>
  );
}
