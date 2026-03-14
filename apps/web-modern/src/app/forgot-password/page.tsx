// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, Input } from "@heroui/react";
import { motion } from "framer-motion";
import {
  Hexagon,
  Mail,
  Building2,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { api } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form state
  const [email, setEmail] = useState("");
  const [tenantSlug, setTenantSlug] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError("Email is required");
      return;
    }

    if (!tenantSlug.trim()) {
      setError("Organization is required");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setIsLoading(true);

    try {
      await api.requestPasswordReset(email.trim(), tenantSlug.trim());
      setSuccess(true);
    } catch (err) {
      // Don't reveal if email exists or not for security
      // Just show success message anyway
      setSuccess(true);
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12">
        {/* Background decorations */}
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
              Check your email
            </h2>
            <p className="text-white/60 mb-6">
              If an account exists with <span className="text-white">{email}</span>,
              you will receive a password reset link shortly.
            </p>
            <p className="text-white/40 text-sm mb-6">
              Don&apos;t see the email? Check your spam folder.
            </p>
            <div className="space-y-3">
              <Button
                onPress={() => {
                  setSuccess(false);
                  setEmail("");
                }}
                variant="flat"
                className="w-full bg-white/10 text-white hover:bg-white/20"
              >
                Try another email
              </Button>
              <Link href="/login" className="block">
                <Button
                  className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white"
                >
                  Back to Sign In
                </Button>
              </Link>
            </div>
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
          {/* Back Link */}
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-white/50 hover:text-white transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back to sign in</span>
          </Link>

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
            <h1 className="text-2xl font-bold text-white mb-2">Forgot password?</h1>
            <p className="text-white/50">
              No worries, we&apos;ll send you reset instructions.
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
            {/* Tenant Field */}
            <Input
              type="text"
              label="Organization"
              placeholder="Enter your tenant slug (e.g., acme)"
              value={tenantSlug}
              onValueChange={setTenantSlug}
              startContent={
                <Building2 className="w-4 h-4 text-white/40 flex-shrink-0" />
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

            {/* Email Field */}
            <Input
              type="email"
              label="Email"
              placeholder="Enter your email"
              value={email}
              onValueChange={setEmail}
              startContent={
                <Mail className="w-4 h-4 text-white/40 flex-shrink-0" />
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
              {isLoading ? "Sending..." : "Reset Password"}
            </Button>
          </form>

          {/* Remember password link */}
          <p className="text-center text-white/50 mt-6">
            Remember your password?{" "}
            <Link
              href="/login"
              className="text-indigo-400 hover:text-indigo-300 transition-colors font-medium"
            >
              Sign in
            </Link>
          </p>
        </div>

        {/* Bottom decoration */}
        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-3/4 h-8 bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-indigo-500/20 blur-xl rounded-full" />
      </motion.div>
    </div>
  );
}
