// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Button,
  Chip,
  Skeleton,
  Switch,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Textarea,
  useDisclosure,
} from "@heroui/react";
import {
  Shield,
  Download,
  Trash2,
  Clock,
  AlertTriangle,
  Cookie,
  ShieldAlert,
  Check,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { ProtectedRoute } from "@/components/protected-route";
import { MotionGlassCard } from "@/components/glass-card";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import { logger } from "@/lib/logger";
import { containerVariantsFast, itemVariants } from "@/lib/animations";

interface DataExport {
  id: number;
  status: string;
  requested_at: string;
  completed_at?: string;
  download_url?: string;
}

interface ConsentSettings {
  marketing_emails: boolean;
  analytics: boolean;
  third_party_sharing: boolean;
  updated_at: string;
}

interface BreachNotification {
  id: number;
  title: string;
  description: string;
  severity: string;
  created_at: string;
  acknowledged: boolean;
}

interface CookiePreferences {
  analytics: boolean;
  marketing: boolean;
  functional: boolean;
}

export default function PrivacyPage() {
  return <ProtectedRoute><PrivacyContent /></ProtectedRoute>;
}

function PrivacyContent() {
  const { user, logout } = useAuth();
  const [exports, setExports] = useState<DataExport[]>([]);
  const [consent, setConsent] = useState<ConsentSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [breachNotifications, setBreachNotifications] = useState<BreachNotification[]>([]);
  const [cookiePrefs, setCookiePrefs] = useState<CookiePreferences | null>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [exp, con, breaches, cookies] = await Promise.allSettled([
        api.getMyDataExports(),
        api.getConsentSettings(),
        api.getBreachNotifications(),
        api.getCookieConsent(),
      ]);
      if (exp.status === "fulfilled") setExports(exp.value || []);
      if (con.status === "fulfilled") setConsent(con.value);
      if (breaches.status === "fulfilled") setBreachNotifications(breaches.value || []);
      if (cookies.status === "fulfilled") setCookiePrefs(cookies.value);
    } catch (error) {
      logger.error("Failed to fetch privacy data:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  const handleExport = async () => {
    setIsExporting(true);
    try {
      await api.requestDataExport();
      fetchData();
    } catch (error) {
      logger.error("Failed to request export:", error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleConsentChange = async (key: string, value: boolean) => {
    try {
      await api.updateConsentSettings({ [key]: value });
      setConsent((prev) => prev ? { ...prev, [key]: value } : prev);
    } catch (error) {
      logger.error("Failed to update consent:", error);
    }
  };

  const handleAcknowledgeBreach = async (breachId: number) => {
    try {
      await api.acknowledgeBreachNotification(breachId);
      setBreachNotifications((prev) =>
        prev.map((b) => (b.id === breachId ? { ...b, acknowledged: true } : b))
      );
    } catch (error) {
      logger.error("Failed to acknowledge breach notification:", error);
    }
  };

  const handleCookieChange = async (key: string, value: boolean) => {
    try {
      await api.updateCookieConsent({ [key]: value });
      setCookiePrefs((prev) => prev ? { ...prev, [key]: value } : prev);
    } catch (error) {
      logger.error("Failed to update cookie consent:", error);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-500/20 text-red-400";
      case "high":
        return "bg-orange-500/20 text-orange-400";
      case "medium":
        return "bg-amber-500/20 text-amber-400";
      default:
        return "bg-gray-500/20 text-gray-400";
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await api.requestAccountDeletion({ reason: deleteReason || undefined });
      onClose();
      logout();
    } catch (error) {
      logger.error("Failed to request deletion:", error);
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar user={user} onLogout={logout} />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Shield className="w-8 h-8 text-indigo-400" />
            Privacy & Data
          </h1>
          <p className="text-white/50 mt-1">Manage your data and privacy settings</p>
        </div>

        {isLoading ? (
          <div className="space-y-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="p-6 rounded-xl bg-white/5 border border-white/10">
                <Skeleton className="w-3/4 h-5 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <motion.div variants={containerVariantsFast} initial="hidden" animate="visible" className="space-y-6">
            {/* Consent Settings */}
            {consent && (
              <MotionGlassCard variants={itemVariants} glow="none" padding="lg">
                <h2 className="text-lg font-semibold text-white mb-4">Consent Settings</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium">Marketing Emails</p>
                      <p className="text-sm text-white/40">Receive promotional emails and updates</p>
                    </div>
                    <Switch
                      isSelected={consent.marketing_emails}
                      onValueChange={(v) => handleConsentChange("marketing_emails", v)}
                      classNames={{ wrapper: "bg-white/10 group-data-[selected=true]:bg-indigo-500" }}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium">Analytics</p>
                      <p className="text-sm text-white/40">Allow usage data collection for improvements</p>
                    </div>
                    <Switch
                      isSelected={consent.analytics}
                      onValueChange={(v) => handleConsentChange("analytics", v)}
                      classNames={{ wrapper: "bg-white/10 group-data-[selected=true]:bg-indigo-500" }}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium">Third-party Sharing</p>
                      <p className="text-sm text-white/40">Share data with trusted partners</p>
                    </div>
                    <Switch
                      isSelected={consent.third_party_sharing}
                      onValueChange={(v) => handleConsentChange("third_party_sharing", v)}
                      classNames={{ wrapper: "bg-white/10 group-data-[selected=true]:bg-indigo-500" }}
                    />
                  </div>
                </div>
              </MotionGlassCard>
            )}

            {/* Data Export */}
            <MotionGlassCard variants={itemVariants} glow="none" padding="lg">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">Data Export</h2>
                <Button
                  className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white"
                  startContent={<Download className="w-4 h-4" />}
                  onPress={handleExport}
                  isLoading={isExporting}
                >
                  Request Export
                </Button>
              </div>
              {exports.length > 0 ? (
                <div className="space-y-3">
                  {exports.map((exp) => (
                    <div key={exp.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                      <div className="flex items-center gap-3">
                        <Clock className="w-4 h-4 text-white/40" />
                        <span className="text-sm text-white">
                          {new Date(exp.requested_at).toLocaleDateString()}
                        </span>
                        <Chip size="sm" variant="flat" className={
                          exp.status === "completed" ? "bg-emerald-500/20 text-emerald-400" :
                          exp.status === "processing" ? "bg-amber-500/20 text-amber-400" :
                          "bg-gray-500/20 text-gray-400"
                        }>
                          {exp.status}
                        </Chip>
                      </div>
                      {exp.download_url && (
                        <a href={exp.download_url} target="_blank" rel="noopener noreferrer">
                          <Button size="sm" className="bg-white/10 text-white" startContent={<Download className="w-3 h-3" />}>
                            Download
                          </Button>
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-white/50 text-center py-4">No exports requested</p>
              )}
            </MotionGlassCard>

            {/* Breach Notifications */}
            {breachNotifications.length > 0 && (
              <MotionGlassCard variants={itemVariants} glow="none" padding="lg">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-red-400" />
                  Breach Notifications
                </h2>
                <div className="space-y-3">
                  {breachNotifications.map((breach) => (
                    <div
                      key={breach.id}
                      className={`flex items-start justify-between p-4 rounded-lg border ${
                        breach.acknowledged
                          ? "bg-white/5 border-white/10 opacity-60"
                          : "bg-red-500/5 border-red-500/20"
                      }`}
                    >
                      <div className="flex-1 min-w-0 mr-4">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-white">{breach.title}</p>
                          <Chip
                            size="sm"
                            variant="flat"
                            className={getSeverityColor(breach.severity)}
                          >
                            {breach.severity}
                          </Chip>
                        </div>
                        <p className="text-sm text-white/60 mb-2">{breach.description}</p>
                        <p className="text-xs text-white/40">
                          {new Date(breach.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      {!breach.acknowledged ? (
                        <Button
                          size="sm"
                          className="bg-white/10 text-white hover:bg-white/20 flex-shrink-0"
                          startContent={<Check className="w-3 h-3" />}
                          onPress={() => handleAcknowledgeBreach(breach.id)}
                        >
                          Acknowledge
                        </Button>
                      ) : (
                        <Chip size="sm" variant="flat" className="bg-emerald-500/20 text-emerald-400 flex-shrink-0">
                          Acknowledged
                        </Chip>
                      )}
                    </div>
                  ))}
                </div>
              </MotionGlassCard>
            )}

            {/* Cookie Consent */}
            {cookiePrefs && (
              <MotionGlassCard variants={itemVariants} glow="none" padding="lg">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Cookie className="w-5 h-5 text-amber-400" />
                  Cookie Preferences
                </h2>
                <p className="text-sm text-white/50 mb-4">
                  Manage which types of cookies are used when you browse this platform.
                </p>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium">Analytics Cookies</p>
                      <p className="text-sm text-white/40">Help us understand how you use the platform</p>
                    </div>
                    <Switch
                      isSelected={cookiePrefs.analytics}
                      onValueChange={(v) => handleCookieChange("analytics", v)}
                      classNames={{ wrapper: "bg-white/10 group-data-[selected=true]:bg-indigo-500" }}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium">Marketing Cookies</p>
                      <p className="text-sm text-white/40">Used for personalised advertising and outreach</p>
                    </div>
                    <Switch
                      isSelected={cookiePrefs.marketing}
                      onValueChange={(v) => handleCookieChange("marketing", v)}
                      classNames={{ wrapper: "bg-white/10 group-data-[selected=true]:bg-indigo-500" }}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium">Functional Cookies</p>
                      <p className="text-sm text-white/40">Enable enhanced functionality and personalisation</p>
                    </div>
                    <Switch
                      isSelected={cookiePrefs.functional}
                      onValueChange={(v) => handleCookieChange("functional", v)}
                      classNames={{ wrapper: "bg-white/10 group-data-[selected=true]:bg-indigo-500" }}
                    />
                  </div>
                </div>
              </MotionGlassCard>
            )}

            {/* Delete Account */}
            <MotionGlassCard variants={itemVariants} glow="none" padding="lg">
              <h2 className="text-lg font-semibold text-red-400 mb-2 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Danger Zone
              </h2>
              <p className="text-sm text-white/50 mb-4">
                Permanently delete your account and all associated data. This action cannot be undone.
              </p>
              <Button
                className="bg-red-500/20 text-red-400"
                startContent={<Trash2 className="w-4 h-4" />}
                onPress={onOpen}
              >
                Delete My Account
              </Button>
            </MotionGlassCard>
          </motion.div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={isOpen} onClose={onClose} classNames={{ base: "bg-black/90 border border-white/10", header: "border-b border-white/10", footer: "border-t border-white/10" }}>
        <ModalContent>
          <ModalHeader className="text-red-400">Delete Account</ModalHeader>
          <ModalBody>
            <p className="text-white/70 mb-4">
              This will permanently delete your account and all data. This cannot be reversed.
            </p>
            <Textarea
              label="Reason (optional)"
              value={deleteReason}
              onValueChange={setDeleteReason}
              classNames={{ input: "text-white", inputWrapper: "bg-white/5 border border-white/10", label: "text-white/60" }}
              minRows={2}
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="light" className="text-white/50" onPress={onClose}>Cancel</Button>
            <Button className="bg-red-500 text-white" onPress={handleDeleteAccount}>
              Permanently Delete
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
