// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Button,
  Divider,
  Input,
  Switch,
} from "@heroui/react";
import {
  Settings,
  User,
  Bell,
  Shield,
  Save,
  ArrowLeft,
  ChevronRight,
  Lock,
  Eye,
  FileText,
  Mail,
  Sliders,
  Flag,
} from "lucide-react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { ProtectedRoute } from "@/components/protected-route";
import { MotionGlassCard } from "@/components/glass-card";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import { logger } from "@/lib/logger";

export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <SettingsContent />
    </ProtectedRoute>
  );
}

function SettingsContent() {
  const { user, logout, refreshUser } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Profile settings
  const [firstName, setFirstName] = useState(user?.first_name || "");
  const [lastName, setLastName] = useState(user?.last_name || "");

  // Notification preferences (UI only - backend not implemented)
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [messageNotifications, setMessageNotifications] = useState(true);
  const [connectionNotifications, setConnectionNotifications] = useState(true);
  useEffect(() => {
    if (user) {
      setFirstName(user.first_name);
      setLastName(user.last_name);
    }
  }, [user]);

  const handleSaveProfile = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    setSaveError(null);
    try {
      await api.updateCurrentUser({
        first_name: firstName,
        last_name: lastName,
      });
      await refreshUser();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      logger.error("Failed to update profile:", error);
      setSaveError(error instanceof Error ? error.message : "Failed to save profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="min-h-screen">
      <Navbar user={user} onLogout={logout} />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-white/60 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Settings className="w-8 h-8 text-indigo-400" />
            Settings
          </h1>
          <p className="text-white/50 mt-1">
            Manage your account preferences
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          {/* Profile Settings */}
          <MotionGlassCard variants={itemVariants} glow="none" padding="lg">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                <User className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Profile</h2>
                <p className="text-sm text-white/50">
                  Update your personal information
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-white/60 mb-2 block">
                    First Name
                  </label>
                  <Input
                    value={firstName}
                    onValueChange={setFirstName}
                    classNames={{
                      input: "text-white placeholder:text-white/30",
                      inputWrapper: [
                        "bg-white/5",
                        "border border-white/10",
                        "hover:bg-white/10",
                        "group-data-[focus=true]:bg-white/10",
                        "group-data-[focus=true]:border-indigo-500/50",
                      ],
                    }}
                  />
                </div>
                <div>
                  <label className="text-sm text-white/60 mb-2 block">
                    Last Name
                  </label>
                  <Input
                    value={lastName}
                    onValueChange={setLastName}
                    classNames={{
                      input: "text-white placeholder:text-white/30",
                      inputWrapper: [
                        "bg-white/5",
                        "border border-white/10",
                        "hover:bg-white/10",
                        "group-data-[focus=true]:bg-white/10",
                        "group-data-[focus=true]:border-indigo-500/50",
                      ],
                    }}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm text-white/60 mb-2 block">
                  Email
                </label>
                <Input
                  value={user?.email || ""}
                  isReadOnly
                  classNames={{
                    input: "text-white/50",
                    inputWrapper: [
                      "bg-white/5",
                      "border border-white/10",
                      "cursor-not-allowed",
                    ],
                  }}
                />
                <p className="text-xs text-white/40 mt-1">
                  Email cannot be changed
                </p>
              </div>

              <div className="flex items-center gap-3 pt-4">
                <Button
                  className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white"
                  startContent={<Save className="w-4 h-4" />}
                  onPress={handleSaveProfile}
                  isLoading={isSaving}
                >
                  Save Changes
                </Button>
                {saveSuccess && (
                  <span className="text-emerald-400 text-sm">
                    Profile updated successfully!
                  </span>
                )}
                {saveError && (
                  <span className="text-red-400 text-sm">
                    {saveError}
                  </span>
                )}
              </div>
            </div>
          </MotionGlassCard>

          {/* Notification Settings */}
          <MotionGlassCard variants={itemVariants} glow="none" padding="lg">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <Bell className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Notifications
                </h2>
                <p className="text-sm text-white/50">
                  Configure how you receive updates
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-white font-medium">Email Notifications</p>
                  <p className="text-sm text-white/50">
                    Receive updates via email
                  </p>
                </div>
                <Switch
                  isSelected={emailNotifications}
                  onValueChange={setEmailNotifications}
                  classNames={{
                    wrapper: "bg-white/10 group-data-[selected=true]:bg-indigo-500",
                  }}
                />
              </div>

              <Divider className="bg-white/10" />

              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-white font-medium">Push Notifications</p>
                  <p className="text-sm text-white/50">
                    Browser push notifications
                  </p>
                </div>
                <Switch
                  isSelected={pushNotifications}
                  onValueChange={setPushNotifications}
                  classNames={{
                    wrapper: "bg-white/10 group-data-[selected=true]:bg-indigo-500",
                  }}
                />
              </div>

              <Divider className="bg-white/10" />

              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-white font-medium">Message Alerts</p>
                  <p className="text-sm text-white/50">
                    Get notified of new messages
                  </p>
                </div>
                <Switch
                  isSelected={messageNotifications}
                  onValueChange={setMessageNotifications}
                  classNames={{
                    wrapper: "bg-white/10 group-data-[selected=true]:bg-indigo-500",
                  }}
                />
              </div>

              <Divider className="bg-white/10" />

              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-white font-medium">Connection Requests</p>
                  <p className="text-sm text-white/50">
                    Alerts for new connections
                  </p>
                </div>
                <Switch
                  isSelected={connectionNotifications}
                  onValueChange={setConnectionNotifications}
                  classNames={{
                    wrapper: "bg-white/10 group-data-[selected=true]:bg-indigo-500",
                  }}
                />
              </div>
            </div>

            <p className="text-xs text-white/40 mt-4">
              Note: Notification preferences are stored locally. Full
              notification settings will be available in a future update.
            </p>
          </MotionGlassCard>

          {/* Quick Links */}
          <MotionGlassCard variants={itemVariants} glow="none" padding="lg">
            <h2 className="text-lg font-semibold text-white mb-4">Account & Security</h2>
            <div className="space-y-2">
              <Link href="/security">
                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                  <div className="flex items-center gap-3">
                    <Lock className="w-5 h-5 text-emerald-400" />
                    <div>
                      <p className="text-white font-medium">Security</p>
                      <p className="text-sm text-white/40">2FA, passkeys, active sessions</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/30" />
                </div>
              </Link>
              <Link href="/preferences">
                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                  <div className="flex items-center gap-3">
                    <Sliders className="w-5 h-5 text-indigo-400" />
                    <div>
                      <p className="text-white font-medium">Preferences</p>
                      <p className="text-sm text-white/40">Language, timezone, display</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/30" />
                </div>
              </Link>
              <Link href="/privacy">
                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                  <div className="flex items-center gap-3">
                    <Eye className="w-5 h-5 text-purple-400" />
                    <div>
                      <p className="text-white font-medium">Privacy & Data</p>
                      <p className="text-sm text-white/40">Consent, data exports, account deletion</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/30" />
                </div>
              </Link>
              <Link href="/push-notifications">
                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                  <div className="flex items-center gap-3">
                    <Bell className="w-5 h-5 text-cyan-400" />
                    <div>
                      <p className="text-white font-medium">Push Notifications</p>
                      <p className="text-sm text-white/40">Manage notification categories</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/30" />
                </div>
              </Link>
              <Link href="/newsletter">
                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-amber-400" />
                    <div>
                      <p className="text-white font-medium">Newsletter</p>
                      <p className="text-sm text-white/40">Subscription & topic preferences</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/30" />
                </div>
              </Link>
              <Link href="/legal">
                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-white/60" />
                    <div>
                      <p className="text-white font-medium">Legal Documents</p>
                      <p className="text-sm text-white/40">Terms, privacy policy, agreements</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/30" />
                </div>
              </Link>
              <Link href="/reports">
                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                  <div className="flex items-center gap-3">
                    <Flag className="w-5 h-5 text-red-400" />
                    <div>
                      <p className="text-white font-medium">My Reports</p>
                      <p className="text-sm text-white/40">Content you have reported</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/30" />
                </div>
              </Link>
              <Link href="/availability">
                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                  <div className="flex items-center gap-3">
                    <Settings className="w-5 h-5 text-blue-400" />
                    <div>
                      <p className="text-white font-medium">Availability</p>
                      <p className="text-sm text-white/40">Weekly schedule & exceptions</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/30" />
                </div>
              </Link>
              <Link href="/insurance">
                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-teal-400" />
                    <div>
                      <p className="text-white font-medium">Insurance Certificates</p>
                      <p className="text-sm text-white/40">Upload and manage certificates</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/30" />
                </div>
              </Link>
            </div>
          </MotionGlassCard>

          {/* Danger Zone */}
          <MotionGlassCard
            variants={itemVariants}
            glow="none"
            padding="lg"
            className="border-red-500/30"
          >
            <h2 className="text-lg font-semibold text-red-400 mb-4">
              Danger Zone
            </h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">Log Out</p>
                <p className="text-sm text-white/50">
                  Sign out of your account on this device
                </p>
              </div>
              <Button
                className="bg-red-500/20 text-red-400 hover:bg-red-500/30"
                onPress={logout}
              >
                Log Out
              </Button>
            </div>
          </MotionGlassCard>
        </motion.div>
      </div>
    </div>
  );
}
