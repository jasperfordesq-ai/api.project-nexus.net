// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

"use client";

import { useState, useEffect } from "react";
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
  User,
  CheckCircle,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import { validatePassword, validateEmail } from "@/lib/validation";

export default function RegisterPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [tenantSlug, setTenantSlug] = useState("");

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.push("/dashboard");
    }
  }, [authLoading, isAuthenticated, router]);

  // Password validation state for real-time feedback
  const passwordValidation = validatePassword(password);

  const validateForm = (): string | null => {
    if (!firstName.trim()) return "First name is required";
    if (!lastName.trim()) return "Last name is required";

    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) return emailValidation.error;

    if (!tenantSlug.trim()) return "Organization is required";
    if (!password) return "Password is required";

    if (!passwordValidation.isValid) {
      return `Password requires: ${passwordValidation.errors.join(", ")}`;
    }

    if (password !== confirmPassword) return "Passwords do not match";

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);

    try {
      await api.register({
        email: email.trim(),
        password,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        tenant_slug: tenantSlug.trim(),
      });

      // Clear sensitive data from state
      setPassword("");
      setConfirmPassword("");

      setSuccess(true);

      // Redirect to dashboard after short delay
      setTimeout(() => {
        router.push("/dashboard");
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
      // Clear passwords on failed attempt as well
      setPassword("");
      setConfirmPassword("");
    } finally {
      setIsLoading(false);
    }
  };

  // Show nothing while checking auth state
  if (authLoading) {
    return null;
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl max-w-md">
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Welcome to NEXUS!
            </h2>
            <p className="text-white/60 mb-4">
              Your account has been created successfully. Redirecting to dashboard...
            </p>
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
            <h1 className="text-2xl font-bold text-white mb-2">Create an account</h1>
            <p className="text-white/50">Join the time banking community</p>
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

          {/* Registration Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-4">
              <Input
                type="text"
                label="First Name"
                placeholder="John"
                labelPlacement="outside"
                value={firstName}
                onValueChange={setFirstName}
                startContent={
                  <User className="w-4 h-4 text-white/40 flex-shrink-0" />
                }
                classNames={{
                  label: "text-white/70 text-sm",
                  input: "text-white placeholder:text-white/40",
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
              <Input
                type="text"
                label="Last Name"
                placeholder="Doe"
                labelPlacement="outside"
                value={lastName}
                onValueChange={setLastName}
                classNames={{
                  label: "text-white/70 text-sm",
                  input: "text-white placeholder:text-white/40",
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
            </div>

            {/* Tenant Field */}
            <Input
              type="text"
              label="Organization"
              placeholder="e.g., acme"
              labelPlacement="outside"
              value={tenantSlug}
              onValueChange={setTenantSlug}
              startContent={
                <Building2 className="w-4 h-4 text-white/40 flex-shrink-0" />
              }
              classNames={{
                label: "text-white/70 text-sm",
                input: "text-white placeholder:text-white/40",
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

            {/* Email Field */}
            <Input
              type="email"
              label="Email"
              placeholder="you@example.com"
              labelPlacement="outside"
              value={email}
              onValueChange={setEmail}
              startContent={
                <Mail className="w-4 h-4 text-white/40 flex-shrink-0" />
              }
              classNames={{
                label: "text-white/70 text-sm",
                input: "text-white placeholder:text-white/40",
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
              label="Password"
              placeholder="Create a strong password"
              labelPlacement="outside"
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
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              }
              classNames={{
                label: "text-white/70 text-sm",
                input: "text-white placeholder:text-white/40",
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

            {/* Confirm Password Field */}
            <Input
              type={showConfirmPassword ? "text" : "password"}
              label="Confirm Password"
              placeholder="Re-enter your password"
              labelPlacement="outside"
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
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              }
              classNames={{
                label: "text-white/70 text-sm",
                input: "text-white placeholder:text-white/40",
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

            {/* Password Requirements */}
            {password && (
              <div className="space-y-1">
                <p className="text-xs text-white/60 mb-2">Password requirements:</p>
                <div className="grid grid-cols-2 gap-1">
                  <span className={`text-xs flex items-center gap-1 ${passwordValidation.hasMinLength ? "text-emerald-400" : "text-white/40"}`}>
                    {passwordValidation.hasMinLength ? "✓" : "○"} 8+ characters
                  </span>
                  <span className={`text-xs flex items-center gap-1 ${passwordValidation.hasUppercase ? "text-emerald-400" : "text-white/40"}`}>
                    {passwordValidation.hasUppercase ? "✓" : "○"} Uppercase
                  </span>
                  <span className={`text-xs flex items-center gap-1 ${passwordValidation.hasLowercase ? "text-emerald-400" : "text-white/40"}`}>
                    {passwordValidation.hasLowercase ? "✓" : "○"} Lowercase
                  </span>
                  <span className={`text-xs flex items-center gap-1 ${passwordValidation.hasNumber ? "text-emerald-400" : "text-white/40"}`}>
                    {passwordValidation.hasNumber ? "✓" : "○"} Number
                  </span>
                  <span className={`text-xs flex items-center gap-1 ${passwordValidation.hasSpecialChar ? "text-emerald-400" : "text-white/40"}`}>
                    {passwordValidation.hasSpecialChar ? "✓" : "○"} Special char
                  </span>
                </div>
              </div>
            )}
            {!password && (
              <p className="text-xs text-white/40">
                Password must include uppercase, lowercase, number, and special character
              </p>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              isLoading={isLoading}
              className="w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 text-white font-semibold h-12 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-shadow mt-2"
              endContent={!isLoading && <ArrowRight className="w-4 h-4" />}
            >
              {isLoading ? "Creating account..." : "Create Account"}
            </Button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-4">
            <Divider className="flex-1 bg-white/10" />
            <span className="text-white/30 text-sm">or</span>
            <Divider className="flex-1 bg-white/10" />
          </div>

          {/* Sign In Link */}
          <p className="text-center text-white/50">
            Already have an account?{" "}
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
