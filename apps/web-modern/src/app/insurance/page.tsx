// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

"use client";

import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import {
  Button,
  Chip,
  Skeleton,
} from "@heroui/react";
import {
  ShieldCheck,
  Upload,
  Trash2,
  FileText,
  Calendar,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { ProtectedRoute } from "@/components/protected-route";
import { MotionGlassCard } from "@/components/glass-card";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import { logger } from "@/lib/logger";
import { containerVariantsFast, itemVariants } from "@/lib/animations";

interface Certificate {
  id: number;
  type: string;
  provider: string;
  policy_number: string;
  valid_from: string;
  valid_until: string;
  status: string;
  document_url?: string;
}

const statusColors: Record<string, string> = {
  active: "bg-emerald-500/20 text-emerald-400",
  expired: "bg-red-500/20 text-red-400",
  pending: "bg-amber-500/20 text-amber-400",
};

export default function InsurancePage() {
  return <ProtectedRoute><InsuranceContent /></ProtectedRoute>;
}

function InsuranceContent() {
  const { user, logout } = useAuth();
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchCerts = () => {
    setIsLoading(true);
    api.getMyCertificates()
      .then((data) => setCerts(data || []))
      .catch((error) => logger.error("Failed to fetch certificates:", error))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => { fetchCerts(); }, []);
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("document", file);
      await api.uploadCertificate(formData);
      fetchCerts();
    } catch (error) {
      logger.error("Failed to upload certificate:", error);
      setActionError(error instanceof Error ? error.message : "Failed to upload certificate.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.deleteCertificate(id);
      setCerts((prev) => prev.filter((c) => c.id !== id));
    } catch (error) {
      logger.error("Failed to delete certificate:", error);
      setActionError(error instanceof Error ? error.message : "Failed to delete certificate.");
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar user={user} onLogout={logout} />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <ShieldCheck className="w-8 h-8 text-indigo-400" />
              Insurance Certificates
            </h1>
            <p className="text-white/50 mt-1">Manage your insurance documents</p>
          </div>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              className="hidden"
              onChange={handleUpload}
            />
            <Button
              className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white"
              startContent={<Upload className="w-4 h-4" />}
              onPress={() => fileInputRef.current?.click()}
              isLoading={isUploading}
            >
              Upload
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="p-6 rounded-xl bg-white/5 border border-white/10">
                <Skeleton className="w-3/4 h-5 rounded" />
              </div>
            ))}
          </div>
        ) : certs.length > 0 ? (
          <motion.div variants={containerVariantsFast} initial="hidden" animate="visible" className="space-y-4">
            {certs.map((cert) => (
              <MotionGlassCard key={cert.id} variants={itemVariants} glow="none" padding="md">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-white font-medium">{cert.type}</p>
                      <Chip size="sm" variant="flat" className={statusColors[cert.status] || ""}>
                        {cert.status}
                      </Chip>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-white/40 mt-1">
                      <span>{cert.provider}</span>
                      <span>#{cert.policy_number}</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(cert.valid_from).toLocaleDateString()} - {new Date(cert.valid_until).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {cert.document_url && (
                      <a href={cert.document_url} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" className="bg-white/10 text-white">View</Button>
                      </a>
                    )}
                    <Button
                      size="sm"
                      isIconOnly
                      className="bg-red-500/20 text-red-400"
                      onPress={() => handleDelete(cert.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </MotionGlassCard>
            ))}
          </motion.div>
        ) : (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
              <ShieldCheck className="w-8 h-8 text-white/20" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No certificates</h3>
            <p className="text-white/50 mb-6">Upload your insurance certificates here.</p>
            <Button
              className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white"
              startContent={<Upload className="w-4 h-4" />}
              onPress={() => fileInputRef.current?.click()}
            >
              Upload Certificate
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
