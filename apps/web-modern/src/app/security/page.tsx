// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Button,
  Input,
  Skeleton,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Chip,
} from "@heroui/react";
import {
  Shield,
  ShieldCheck,
  ShieldOff,
  Key,
  Smartphone,
  Monitor,
  Trash2,
  Copy,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { ProtectedRoute } from "@/components/protected-route";
import { GlassCard, MotionGlassCard } from "@/components/glass-card";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import { logger } from "@/lib/logger";
import { containerVariantsFast, itemVariants } from "@/lib/animations";

interface Passkey {
  id: number;
  name: string;
  created_at: string;
  last_used_at?: string;
}

interface Session {
  id: number;
  ip_address: string;
  user_agent: string;
  device_info: string;
  is_current: boolean;
  created_at: string;
  last_activity_at: string;
  expires_at: string;
}

export default function SecurityPage() {
  return (
    <ProtectedRoute>
      <SecurityContent />
    </ProtectedRoute>
  );
}

function SecurityContent() {
  const { user, logout } = useAuth();
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [manualKey, setManualKey] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  const { isOpen: isSetupOpen, onOpen: onSetupOpenRaw, onClose: onSetupCloseRaw } = useDisclosure();
  const { isOpen: isDisableOpen, onOpen: onDisableOpenRaw, onClose: onDisableCloseRaw } = useDisclosure();
  const { isOpen: isBackupOpen, onOpen: onBackupOpen, onClose: onBackupClose } = useDisclosure();

  const onSetupOpen = () => { setError(""); setVerifyCode(""); onSetupOpenRaw(); };
  const onSetupClose = () => { setVerifyCode(""); onSetupCloseRaw(); };
  const onDisableOpen = () => { setError(""); setDisableCode(""); onDisableOpenRaw(); };
  const onDisableClose = () => { setDisableCode(""); onDisableCloseRaw(); };

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [tfaStatus, passkeysData, sessionsData] = await Promise.allSettled([
        api.get2FAStatus(),
        api.getPasskeys(),
        api.getSessions(),
      ]);
      if (tfaStatus.status === "fulfilled") {
        setIs2FAEnabled(tfaStatus.value?.enabled || false);
      }
      if (passkeysData.status === "fulfilled") {
        setPasskeys(passkeysData.value || []);
      }
      if (sessionsData.status === "fulfilled") {
        setSessions(sessionsData.value?.data || []);
      }
    } catch (err) {
      logger.error("Failed to fetch security data:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);
  const handleSetup2FA = async () => {
    setActionLoading("setup");
    setError("");
    try {
      const data = await api.setup2FA();
      setQrCodeUrl(data.qr_code_url);
      setManualKey(data.manual_entry_key);
      onSetupOpen();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start 2FA setup");
    } finally {
      setActionLoading(null);
    }
  };

  const handleVerifySetup = async () => {
    if (!verifyCode) return;
    setActionLoading("verify");
    setError("");
    try {
      const result = await api.verify2FASetup(verifyCode);
      if (result.success) {
        setIs2FAEnabled(true);
        onSetupClose();
        setVerifyCode("");
        if (result.backup_codes) {
          setBackupCodes(result.backup_codes);
          onBackupOpen();
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid code");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDisable2FA = async () => {
    if (!disableCode) return;
    setActionLoading("disable");
    setError("");
    try {
      await api.disable2FA(disableCode);
      setIs2FAEnabled(false);
      onDisableClose();
      setDisableCode("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid code");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeletePasskey = async (id: number) => {
    try {
      await api.deletePasskey(id);
      setPasskeys((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      logger.error("Failed to delete passkey:", err);
    }
  };

  const handleTerminateSession = async (id: number) => {
    try {
      await api.terminateSession(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      logger.error("Failed to terminate session:", err);
    }
  };

  const handleTerminateAll = async () => {
    try {
      await api.terminateAllOtherSessions();
      setSessions((prev) => prev.filter((s) => s.is_current));
    } catch (err) {
      logger.error("Failed to terminate sessions:", err);
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar user={user} onLogout={logout} />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Shield className="w-8 h-8 text-indigo-400" />
            Security
          </h1>
          <p className="text-white/50 mt-1">
            Manage your account security settings
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="p-6 rounded-xl bg-white/5 border border-white/10">
                <Skeleton className="w-1/3 h-6 rounded mb-4" />
                <Skeleton className="w-full h-12 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <motion.div
            variants={containerVariantsFast}
            initial="hidden"
            animate="visible"
            className="space-y-6"
          >
            {/* 2FA Section */}
            <MotionGlassCard variants={itemVariants} glow="none" padding="lg">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
                    is2FAEnabled ? "bg-emerald-500/20" : "bg-white/5"
                  }`}>
                    {is2FAEnabled ? (
                      <ShieldCheck className="w-6 h-6 text-emerald-400" />
                    ) : (
                      <ShieldOff className="w-6 h-6 text-white/40" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">
                      Two-Factor Authentication
                    </h2>
                    <p className="text-sm text-white/50 mt-1">
                      {is2FAEnabled
                        ? "Your account is protected with an authenticator app."
                        : "Add an extra layer of security with TOTP-based 2FA."}
                    </p>
                  </div>
                </div>
                {is2FAEnabled ? (
                  <Button
                    className="bg-red-500/20 text-red-400"
                    size="sm"
                    onPress={onDisableOpen}
                  >
                    Disable
                  </Button>
                ) : (
                  <Button
                    className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white"
                    size="sm"
                    onPress={handleSetup2FA}
                    isLoading={actionLoading === "setup"}
                  >
                    Enable
                  </Button>
                )}
              </div>
            </MotionGlassCard>

            {/* Passkeys Section */}
            <MotionGlassCard variants={itemVariants} glow="none" padding="lg">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Key className="w-5 h-5 text-indigo-400" />
                  Passkeys
                </h2>
              </div>
              {passkeys.length > 0 ? (
                <div className="space-y-3">
                  {passkeys.map((passkey) => (
                    <div
                      key={passkey.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10"
                    >
                      <div className="flex items-center gap-3">
                        <Key className="w-4 h-4 text-white/40" />
                        <div>
                          <p className="text-sm text-white font-medium">{passkey.name}</p>
                          <p className="text-xs text-white/40">
                            Added {new Date(passkey.created_at).toLocaleDateString()}
                            {passkey.last_used_at && ` · Last used ${new Date(passkey.last_used_at).toLocaleDateString()}`}
                          </p>
                        </div>
                      </div>
                      <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        className="text-red-400 hover:bg-red-500/20"
                        onPress={() => handleDeletePasskey(passkey.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-white/50">
                  No passkeys registered. You can add passkeys from the login page.
                </p>
              )}
            </MotionGlassCard>

            {/* Active Sessions */}
            <MotionGlassCard variants={itemVariants} glow="none" padding="lg">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Monitor className="w-5 h-5 text-indigo-400" />
                  Active Sessions
                </h2>
                {sessions.filter((s) => !s.is_current).length > 0 && (
                  <Button
                    size="sm"
                    className="bg-red-500/20 text-red-400"
                    onPress={handleTerminateAll}
                  >
                    Sign out all others
                  </Button>
                )}
              </div>
              <div className="space-y-3">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10"
                  >
                    <div className="flex items-center gap-3">
                      {session.device_info?.toLowerCase().includes("mobile") ? (
                        <Smartphone className="w-4 h-4 text-white/40" />
                      ) : (
                        <Monitor className="w-4 h-4 text-white/40" />
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-white font-medium">
                            {session.device_info || "Unknown Device"}
                          </p>
                          {session.is_current && (
                            <Chip size="sm" variant="flat" className="bg-emerald-500/20 text-emerald-400">
                              This device
                            </Chip>
                          )}
                        </div>
                        <p className="text-xs text-white/40">
                          {session.ip_address} · Last active{" "}
                          {new Date(session.last_activity_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    {!session.is_current && (
                      <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        className="text-red-400 hover:bg-red-500/20"
                        onPress={() => handleTerminateSession(session.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </MotionGlassCard>
          </motion.div>
        )}
      </div>

      {/* 2FA Setup Modal */}
      <Modal
        isOpen={isSetupOpen}
        onClose={onSetupClose}
        size="lg"
        classNames={{
          base: "bg-black/90 border border-white/10",
          header: "border-b border-white/10",
          body: "py-6",
          footer: "border-t border-white/10",
        }}
      >
        <ModalContent>
          <ModalHeader className="text-white">Set Up Two-Factor Authentication</ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <p className="text-white/70">
                Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.):
              </p>
              {qrCodeUrl && (
                <div className="flex justify-center p-4 bg-white rounded-lg">
                  <img src={qrCodeUrl} alt="2FA QR Code" className="w-48 h-48" />
                </div>
              )}
              <p className="text-sm text-white/50">
                Or enter this key manually: <code className="text-indigo-400 bg-white/5 px-2 py-1 rounded">{manualKey}</code>
              </p>
              <Input
                label="Verification Code"
                placeholder="Enter 6-digit code"
                value={verifyCode}
                onValueChange={setVerifyCode}
                maxLength={6}
                classNames={{
                  input: "text-white placeholder:text-white/30",
                  inputWrapper: "bg-white/5 border border-white/10",
                  label: "text-white/60",
                }}
              />
              {error && (
                <p className="text-sm text-red-400 flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" /> {error}
                </p>
              )}
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" className="text-white/70" onPress={onSetupClose}>
              Cancel
            </Button>
            <Button
              className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white"
              onPress={handleVerifySetup}
              isLoading={actionLoading === "verify"}
              isDisabled={verifyCode.length !== 6}
            >
              Verify & Enable
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Disable 2FA Modal */}
      <Modal
        isOpen={isDisableOpen}
        onClose={onDisableClose}
        classNames={{
          base: "bg-black/90 border border-white/10",
          header: "border-b border-white/10",
          body: "py-6",
          footer: "border-t border-white/10",
        }}
      >
        <ModalContent>
          <ModalHeader className="text-white">Disable Two-Factor Authentication</ModalHeader>
          <ModalBody>
            <p className="text-white/70 mb-4">
              Enter your authenticator code to confirm disabling 2FA.
            </p>
            <Input
              label="Verification Code"
              placeholder="Enter 6-digit code"
              value={disableCode}
              onValueChange={setDisableCode}
              maxLength={6}
              classNames={{
                input: "text-white placeholder:text-white/30",
                inputWrapper: "bg-white/5 border border-white/10",
                label: "text-white/60",
              }}
            />
            {error && (
              <p className="text-sm text-red-400 mt-2 flex items-center gap-1">
                <AlertTriangle className="w-4 h-4" /> {error}
              </p>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="light" className="text-white/70" onPress={onDisableClose}>
              Cancel
            </Button>
            <Button
              className="bg-red-500 text-white"
              onPress={handleDisable2FA}
              isLoading={actionLoading === "disable"}
              isDisabled={disableCode.length !== 6}
            >
              Disable 2FA
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Backup Codes Modal */}
      <Modal
        isOpen={isBackupOpen}
        onClose={onBackupClose}
        classNames={{
          base: "bg-black/90 border border-white/10",
          header: "border-b border-white/10",
          body: "py-6",
          footer: "border-t border-white/10",
        }}
      >
        <ModalContent>
          <ModalHeader className="text-white flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            2FA Enabled Successfully
          </ModalHeader>
          <ModalBody>
            <p className="text-white/70 mb-4">
              Save these backup codes in a safe place. You can use them to access your account if you lose your authenticator device.
            </p>
            <div className="grid grid-cols-2 gap-2 p-4 bg-white/5 rounded-lg border border-white/10">
              {backupCodes.map((code, i) => (
                <code key={i} className="text-white font-mono text-sm">{code}</code>
              ))}
            </div>
          </ModalBody>
          <ModalFooter>
            <Button
              className="bg-white/10 text-white"
              startContent={<Copy className="w-4 h-4" />}
              onPress={() => {
                navigator.clipboard.writeText(backupCodes.join("\n"));
              }}
            >
              Copy Codes
            </Button>
            <Button
              className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white"
              onPress={onBackupClose}
            >
              Done
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
