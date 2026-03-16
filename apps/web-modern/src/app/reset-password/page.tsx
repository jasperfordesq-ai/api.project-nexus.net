// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button, Input } from "@heroui/react";
import { motion } from "framer-motion";
import {
  Hexagon,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { api } from "@/lib/api";
import { validatePassword } from "@/lib/validation";

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Form state
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Check if token is present
  const [invalidToken, setInvalidToken] = useState(false);

  useEffect(() => {
    if (!token) {
      setInvalidToken(true);
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!password) {
      setError("Password is required");
      return;
    }

    const pwValidation = validatePassword(password);
    if (!pwValidation.isValid) {
      setError(`Password requires: ${pwValidation.errors.join(", ")}`);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!token) {
      setError("Invalid reset token");
      return;
    }

    setIsLoading(true);

    try {
      await api.resetPassword(token, password);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset password");
    } finally {
      setIsLoading(false);
    }
  };

  if (invalidToken) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12">
        <div className="absolute top-0 left-0 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />

        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full max-w-md relative"
        >
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl text-center">
            <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-10 h-10 text-red-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Invalid Reset Link
            </h2>
            <p className="text-white/60 mb-6">
              This password reset link is invalid or has expired.
              Please request a new one.
            </p>
            <Link href="/forgot-password">
              <Button
                className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white"
              >
                Request New Link
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12">
        <div className="absolute top-0 left-0 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />

        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full max-w-md relative"
        >
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl text-center">
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Password Reset!
            </h2>
            <p className="text-white/60 mb-6">
              Your password has been reset successfully.
              You can now sign in with your new password.
            </p>
            <Link href="/login">
              <Button
                className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white"
              >
                Sign In
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

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
            <h1 className="text-2xl font-bold text-white mb-2">Set new password</h1>
            <p className="text-white/50">
              Your new password must be at least 8 characters.
            </p>
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

          {/* Reset Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Password Field */}
            <Input
              type={showPassword ? "text" : "password"}
              label="New Password"
              placeholder="Enter new password"
              value={password}
              onValueChange={setPassword}
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
                label: "text-white/70",
                input: "text-white placeholder:text-white/30",
                inputWrapper: [
                  "bg-white/5",
                  "border border-white/10",
                  "hover:bg-white/10",
                  "group-data-[focus=true]:bg-white/10",
                  "group-data-[focus=true]:border-indigo-500/50",
                ],
              }}
              isRequired
            />

            {/* Confirm Password Field */}
            <Input
              type={showConfirmPassword ? "text" : "password"}
              label="Confirm Password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onValueChange={setConfirmPassword}
              startContent={
                <Lock className="w-4 h-4 text-white/40 flex-shrink-0" />
              }
              endContent={
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="text-white/40 hover:text-white/70 transition-colors"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              }
              classNames={{
                label: "text-white/70",
                input: "text-white placeholder:text-white/30",
                inputWrapper: [
                  "bg-white/5",
                  "border border-white/10",
                  "hover:bg-white/10",
                  "group-data-[focus=true]:bg-white/10",
                  "group-data-[focus=true]:border-indigo-500/50",
                ],
              }}
              isRequired
            />

            {/* Submit Button */}
            <Button
              type="submit"
              isLoading={isLoading}
              isDisabled={isLoading}
              className="w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 text-white font-semibold h-12 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-shadow"
              endContent={!isLoading && <ArrowRight className="w-4 h-4" />}
            >
              {isLoading ? "Resetting..." : "Reset Password"}
            </Button>
          </form>

          {/* Back to login link */}
          <p className="text-center text-white/50 mt-6">
            <Link
              href="/login"
              className="text-indigo-400 hover:text-indigo-300 transition-colors font-medium"
            >
              Back to Sign In
            </Link>
          </p>
        </div>

        {/* Bottom decoration */}
        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-3/4 h-8 bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-indigo-500/20 blur-xl rounded-full" />
      </motion.div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-white">Loading...</div>
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
