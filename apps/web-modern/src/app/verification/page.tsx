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
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from "@heroui/react";
import {
  ShieldCheck,
  Mail,
  Phone,
  MapPin,
  UserCheck,
  Upload,
  CheckCircle2,
  Clock,
  XCircle,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { ProtectedRoute } from "@/components/protected-route";
import { MotionGlassCard } from "@/components/glass-card";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import { logger } from "@/lib/logger";
import { containerVariantsFast, itemVariants } from "@/lib/animations";

interface Verification {
  type: string;
  status: string;
  verified_at?: string;
}

const typeConfig: Record<string, { icon: typeof Mail; label: string; description: string }> = {
  identity: {
    icon: UserCheck,
    label: "Identity",
    description: "Verify your identity with a government-issued ID",
  },
  email: {
    icon: Mail,
    label: "Email",
    description: "Confirm your email address",
  },
  phone: {
    icon: Phone,
    label: "Phone",
    description: "Verify your phone number via SMS",
  },
  address: {
    icon: MapPin,
    label: "Address",
    description: "Confirm your residential address with a utility bill or statement",
  },
};

const statusConfig: Record<string, { color: string; icon: typeof CheckCircle2; label: string }> = {
  verified: {
    color: "bg-emerald-500/20 text-emerald-400",
    icon: CheckCircle2,
    label: "Verified",
  },
  pending: {
    color: "bg-amber-500/20 text-amber-400",
    icon: Clock,
    label: "Pending",
  },
  unverified: {
    color: "bg-white/10 text-white/40",
    icon: XCircle,
    label: "Not Verified",
  },
  rejected: {
    color: "bg-red-500/20 text-red-400",
    icon: XCircle,
    label: "Rejected",
  },
};

export default function VerificationPage() {
  return (
    <ProtectedRoute>
      <VerificationContent />
    </ProtectedRoute>
  );
}

function VerificationContent() {
  const { user, logout } = useAuth();
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();

  const fetchVerifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await api.getVerificationStatus();
      setVerifications(response?.verifications || []);
    } catch (error) {
      logger.error("Failed to fetch verification status:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchVerifications(); }, [fetchVerifications]);
  const getVerificationStatus = (type: string): Verification | undefined => {
    return verifications.find((v) => v.type === type);
  };

  const handleRequestVerification = (type: string) => {
    setSelectedType(type);
    setSelectedFile(null);
    onOpen();
  };

  const handleSubmit = async () => {
    if (!selectedType) return;
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("type", selectedType);
      if (selectedFile) {
        formData.append("document", selectedFile);
      }
      await api.requestVerification(selectedType, formData);
      onClose();
      await fetchVerifications();
    } catch (error) {
      logger.error("Failed to request verification:", error);
      setSubmitError(error instanceof Error ? error.message : "Failed to submit verification request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const verifiedCount = verifications.filter((v) => v.status === "verified").length;
  const totalTypes = Object.keys(typeConfig).length;

  return (
    <div className="min-h-screen">
      <Navbar user={user} onLogout={logout} />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-indigo-400" />
            Verification Badges
          </h1>
          <p className="text-white/50 mt-1">
            Verify your identity to build trust within the community
          </p>
        </div>

        {/* Summary card */}
        <MotionGlassCard
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          glow="none"
          padding="lg"
          hover={false}
          className="mb-8"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-indigo-500/20 flex items-center justify-center">
              <ShieldCheck className="w-7 h-7 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                {verifiedCount} of {totalTypes} Verified
              </h2>
              <p className="text-sm text-white/50">
                {verifiedCount === totalTypes
                  ? "All verifications complete — fully trusted member"
                  : "Complete more verifications to increase your trust level"}
              </p>
            </div>
            {verifiedCount === totalTypes && (
              <div className="ml-auto">
                <Chip size="lg" variant="flat" className="bg-emerald-500/20 text-emerald-400">
                  Fully Verified
                </Chip>
              </div>
            )}
          </div>
        </MotionGlassCard>

        {/* Verification types */}
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="p-6 rounded-xl bg-white/5 border border-white/10">
                <Skeleton className="w-3/4 h-6 rounded mb-4" />
                <Skeleton className="w-full h-4 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <motion.div
            variants={containerVariantsFast}
            initial="hidden"
            animate="visible"
            className="space-y-4"
          >
            {Object.entries(typeConfig).map(([type, config]) => {
              const verification = getVerificationStatus(type);
              const status = verification?.status || "unverified";
              const sConfig = statusConfig[status] || statusConfig.unverified;
              const TypeIcon = config.icon;
              const StatusIcon = sConfig.icon;

              return (
                <MotionGlassCard
                  key={type}
                  variants={itemVariants}
                  glow="none"
                  padding="lg"
                  hover
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                      <TypeIcon className="w-6 h-6 text-indigo-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-semibold text-white">
                          {config.label}
                        </h3>
                        <Chip
                          size="sm"
                          variant="flat"
                          startContent={<StatusIcon className="w-3 h-3" />}
                          className={sConfig.color}
                        >
                          {sConfig.label}
                        </Chip>
                      </div>
                      <p className="text-sm text-white/50">{config.description}</p>
                      {verification?.verified_at && (
                        <p className="text-xs text-white/30 mt-1">
                          Verified on {new Date(verification.verified_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    {status !== "verified" && status !== "pending" && (
                      <Button
                        size="sm"
                        variant="flat"
                        className="bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 shrink-0"
                        startContent={<Upload className="w-4 h-4" />}
                        onPress={() => handleRequestVerification(type)}
                      >
                        Verify
                      </Button>
                    )}
                  </div>
                </MotionGlassCard>
              );
            })}
          </motion.div>
        )}

        {/* Earned badges section */}
        {verifiedCount > 0 && (
          <div className="mt-10">
            <h2 className="text-xl font-semibold text-white mb-4">Earned Badges</h2>
            <motion.div
              variants={containerVariantsFast}
              initial="hidden"
              animate="visible"
              className="flex flex-wrap gap-4"
            >
              {verifications
                .filter((v) => v.status === "verified")
                .map((v) => {
                  const config = typeConfig[v.type];
                  if (!config) return null;
                  const BadgeIcon = config.icon;
                  return (
                    <motion.div
                      key={v.type}
                      variants={itemVariants}
                      className="flex flex-col items-center gap-2 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20"
                    >
                      <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                        <BadgeIcon className="w-6 h-6 text-emerald-400" />
                      </div>
                      <span className="text-sm font-medium text-emerald-400">
                        {config.label}
                      </span>
                    </motion.div>
                  );
                })}
            </motion.div>
          </div>
        )}
      </div>

      {/* Verification request modal */}
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        classNames={{
          base: "bg-gray-900/95 border border-white/10 backdrop-blur-xl",
          header: "border-b border-white/10",
          footer: "border-t border-white/10",
        }}
      >
        <ModalContent>
          <ModalHeader className="text-white">
            Request {selectedType ? typeConfig[selectedType]?.label : ""} Verification
          </ModalHeader>
          <ModalBody>
            <p className="text-sm text-white/60 mb-4">
              {selectedType ? typeConfig[selectedType]?.description : ""}
            </p>
            {submitError && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
                {submitError}
              </div>
            )}
            <div className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center">
              <input
                type="file"
                id="verification-file"
                className="hidden"
                accept="image/*,.pdf"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              />
              <label
                htmlFor="verification-file"
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                <Upload className="w-8 h-8 text-white/30" />
                {selectedFile ? (
                  <span className="text-sm text-indigo-400">{selectedFile.name}</span>
                ) : (
                  <>
                    <span className="text-sm text-white/50">
                      Click to upload a supporting document
                    </span>
                    <span className="text-xs text-white/30">
                      PNG, JPG, or PDF up to 10MB
                    </span>
                  </>
                )}
              </label>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" className="text-white/60" onPress={onClose}>
              Cancel
            </Button>
            <Button
              className="bg-indigo-500 text-white"
              isLoading={isSubmitting}
              onPress={handleSubmit}
            >
              Submit
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
