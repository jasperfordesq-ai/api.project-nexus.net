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
} from "@heroui/react";
import { FileText, CheckCircle, AlertCircle } from "lucide-react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { ProtectedRoute } from "@/components/protected-route";
import { MotionGlassCard } from "@/components/glass-card";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import { logger } from "@/lib/logger";
import { containerVariantsFast, itemVariants } from "@/lib/animations";

interface LegalDoc {
  id: number;
  title: string;
  type: string;
  version: string;
  effective_date: string;
  requires_acceptance: boolean;
  accepted: boolean;
}

export default function LegalPage() {
  return <ProtectedRoute><LegalContent /></ProtectedRoute>;
}

function LegalContent() {
  const { user, logout } = useAuth();
  const [docs, setDocs] = useState<LegalDoc[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchDocs = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.getLegalDocuments();
      setDocs(data || []);
    } catch (error) {
      logger.error("Failed to fetch legal documents:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);
  const handleAccept = async (id: number) => {
    setActionError(null);
    try {
      await api.acceptLegalDocument(id);
      setDocs((prev) => prev.map((d) => d.id === id ? { ...d, accepted: true } : d));
    } catch (error) {
      logger.error("Failed to accept document:", error);
      setActionError(error instanceof Error ? error.message : "Failed to accept document.");
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar user={user} onLogout={logout} />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <FileText className="w-8 h-8 text-indigo-400" />
            Legal Documents
          </h1>
          <p className="text-white/50 mt-1">Terms of service, privacy policy, and other agreements</p>
        </div>

        {actionError && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
            {actionError}
          </div>
        )}

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="p-6 rounded-xl bg-white/5 border border-white/10">
                <Skeleton className="w-3/4 h-5 rounded" />
              </div>
            ))}
          </div>
        ) : docs.length > 0 ? (
          <motion.div variants={containerVariantsFast} initial="hidden" animate="visible" className="space-y-4">
            {docs.map((doc) => (
              <MotionGlassCard key={doc.id} variants={itemVariants} glow="none" padding="md" hover>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <FileText className="w-5 h-5 text-indigo-400 flex-shrink-0" />
                    <div>
                      <Link href={`/legal/${doc.id}`}>
                        <h3 className="text-white font-medium hover:text-indigo-400 transition-colors">
                          {doc.title}
                        </h3>
                      </Link>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-white/40">v{doc.version}</span>
                        <span className="text-xs text-white/40">
                          Effective {new Date(doc.effective_date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {doc.accepted ? (
                      <Chip size="sm" variant="flat" className="bg-emerald-500/20 text-emerald-400"
                        startContent={<CheckCircle className="w-3 h-3" />}
                      >
                        Accepted
                      </Chip>
                    ) : doc.requires_acceptance ? (
                      <Button
                        size="sm"
                        className="bg-amber-500/20 text-amber-400"
                        startContent={<AlertCircle className="w-3 h-3" />}
                        onPress={() => handleAccept(doc.id)}
                      >
                        Accept
                      </Button>
                    ) : (
                      <Chip size="sm" variant="flat" className="bg-white/10 text-white/50">
                        Info
                      </Chip>
                    )}
                  </div>
                </div>
              </MotionGlassCard>
            ))}
          </motion.div>
        ) : (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-white/20" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No documents</h3>
            <p className="text-white/50">Legal documents will appear here.</p>
          </div>
        )}
      </div>
    </div>
  );
}
