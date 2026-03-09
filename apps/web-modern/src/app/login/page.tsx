// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Input, Divider } from "@heroui/react";
import { motion } from "framer-motion";
import {
  Hexagon,
  Mail,
  Lock,
  Building2,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  Fingerprint,
  Smartphone,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import {
  detectPasskeyCapabilities,
  authenticateWithPasskey,
  startConditionalAuthentication,
  type PasskeyCapabilities,
} from "@/lib/passkeys";

export default function LoginPage() {
  const router = useRouter();
  const {
    login,
    loginWithPasskey,
    isAuthenticated,
    isLoading: authLoading,
  } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isPasskeyLoading, setIsPasskeyLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tenantSlug, setTenantSlug] = useState("");

  // Passkey capabilities
  const [passkeyCapabilities, setPasskeyCapabilities] =
    useState<PasskeyCapabilities | null>(null);
  const conditionalAbortRef = useRef<AbortController | null>(null);

  // Detect passkey capabilities on mount
  useEffect(() => {
    detectPasskeyCapabilities().then(setPasskeyCapabilities);
  }, []);

  // Start conditional mediation (passkey autofill) once when capabilities are known.
  // Does NOT re-fire when tenantSlug changes — conditional mediation is a
  // one-shot browser API that waits for user interaction with the autofill prompt.
  useEffect(() => {
    if (!passkeyCapabilities?.conditionalMediation) return;
    if (authLoading || isAuthenticated) return;

    startConditionalAuthentication().then((result) => {
      if (result) {
        loginWithPasskey(result);
        router.push("/dashboard");
      }
    });

    return () => {
      conditionalAbortRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passkeyCapabilities?.conditionalMediation, authLoading, isAuthenticated]);

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.push("/dashboard");
    }
  }, [authLoading, isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (!email || !password || !tenantSlug) {
        throw new Error("Please fill in all fields");
      }

      await login(email, password, tenantSlug);
      setPassword("");
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
      setPassword("");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasskeyLogin = async () => {
    setError(null);
    setIsPasskeyLoading(true);

    try {
      const result = await authenticateWithPasskey({
        tenantSlug: tenantSlug || undefined,
        email: email || undefined,
      });

      loginWithPasskey(result);
      router.push("/dashboard");
    } catch (err) {
      // Don't show error if user cancelled the prompt
      const message =
        err instanceof Error ? err.message : "Passkey login failed";
      if (
        !message.includes("AbortError") &&
        !message.includes("cancelled") &&
        !message.includes("not allowed")
      ) {
        setError(message);
      }
    } finally {
      setIsPasskeyLoading(false);
    }
  };

  if (authLoading) {
    return null;
  }

  const showPasskeyButton = passkeyCapabilities?.webauthnSupported;
  const hasPlatformAuth = passkeyCapabilities?.platformAuthenticator;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      {/* Background decorations */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
      <div className="absolute top-1/2 left-1/2 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative"
      >
        {/* Glass card container */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          {/* Logo and Header */}
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2 mb-6">
              <motion.div
                whileHover={{ rotate: 180 }}
                transition={{ duration: 0.5 }}
              >
                <Hexagon className="w-10 h-10 text-indigo-400" />
              </motion.div>
              <span className="text-2xl font-bold text-gradient">NEXUS</span>
            </Link>
            <h1 className="text-2xl font-bold text-white mb-2">
              Welcome back
            </h1>
            <p className="text-white/50">Sign in to your account to continue</p>
          </div>

          {/* Error Alert */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3"
            >
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-400">{error}</p>
            </motion.div>
          )}

          {/* Passkey Sign-in Button */}
          {showPasskeyButton && (
            <>
              <Button
                onPress={handlePasskeyLogin}
                isLoading={isPasskeyLoading}
                className="w-full bg-white/10 border border-white/20 text-white font-semibold h-12 hover:bg-white/15 transition-colors mb-2"
                startContent={
                  !isPasskeyLoading &&
                  (hasPlatformAuth ? (
                    <Fingerprint className="w-5 h-5" />
                  ) : (
                    <Smartphone className="w-5 h-5" />
                  ))
                }
              >
                {isPasskeyLoading
                  ? "Waiting for passkey..."
                  : "Sign in with a passkey"}
              </Button>

              {/* Divider between passkey and password */}
              <div className="my-6 flex items-center gap-4">
                <Divider className="flex-1 bg-white/10" />
                <span className="text-white/30 text-sm">
                  or continue with password
                </span>
                <Divider className="flex-1 bg-white/10" />
              </div>
            </>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Tenant Field */}
            <Input
              type="text"
              placeholder="Organization (e.g., acme)"
              value={tenantSlug}
              onValueChange={setTenantSlug}
              startContent={
                <Building2 className="w-4 h-4 text-white/40 flex-shrink-0" />
              }
              classNames={{
                input: "text-white placeholder:text-white/50",
                inputWrapper: [
                  "bg-white/5",
                  "border border-white/10",
                  "hover:bg-white/10",
                  "group-data-[focus=true]:bg-white/10",
                  "group-data-[focus=true]:border-indigo-500/50",
                  "h-12",
                ],
              }}
              isRequired
            />

            {/* Email Field - with webauthn autocomplete for conditional mediation */}
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onValueChange={setEmail}
              autoComplete="username webauthn"
              startContent={
                <Mail className="w-4 h-4 text-white/40 flex-shrink-0" />
              }
              classNames={{
                input: "text-white placeholder:text-white/50",
                inputWrapper: [
                  "bg-white/5",
                  "border border-white/10",
                  "hover:bg-white/10",
                  "group-data-[focus=true]:bg-white/10",
                  "group-data-[focus=true]:border-indigo-500/50",
                  "h-12",
                ],
              }}
              isRequired
            />

            {/* Password Field */}
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onValueChange={setPassword}
              autoComplete="current-password"
              startContent={
                <Lock className="w-4 h-4 text-white/40 flex-shrink-0" />
              }
              endContent={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-white/40 hover:text-white/70 transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              }
              classNames={{
                input: "text-white placeholder:text-white/50",
                inputWrapper: [
                  "bg-white/5",
                  "border border-white/10",
                  "hover:bg-white/10",
                  "group-data-[focus=true]:bg-white/10",
                  "group-data-[focus=true]:border-indigo-500/50",
                  "h-12",
                ],
              }}
              isRequired
            />

            {/* Forgot Password Link */}
            <div className="flex justify-end">
              <Link
                href="/forgot-password"
                className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                Forgot password?
              </Link>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              isLoading={isLoading}
              className="w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 text-white font-semibold h-12 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-shadow"
              endContent={!isLoading && <ArrowRight className="w-4 h-4" />}
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          {/* Divider */}
          <div className="my-8 flex items-center gap-4">
            <Divider className="flex-1 bg-white/10" />
            <span className="text-white/30 text-sm">or</span>
            <Divider className="flex-1 bg-white/10" />
          </div>

          {/* Sign Up Link */}
          <p className="text-center text-white/50">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="text-indigo-400 hover:text-indigo-300 transition-colors font-medium"
            >
              Sign up
            </Link>
          </p>

          {/* About Link */}
          <p className="text-center text-white/30 text-sm mt-6">
            <Link
              href="/about"
              className="hover:text-white/50 transition-colors"
            >
              About Project NEXUS
            </Link>
          </p>
        </div>

        {/* Bottom decoration */}
        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-3/4 h-8 bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-indigo-500/20 blur-xl rounded-full" />
      </motion.div>
    </div>
  );
}
