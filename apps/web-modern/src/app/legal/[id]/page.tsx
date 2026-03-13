// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

"use client";

import { useEffect, useState, use } from "react";
import { Button, Chip, Skeleton } from "@heroui/react";
import { ArrowLeft, CheckCircle } from "lucide-react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { ProtectedRoute } from "@/components/protected-route";
import { GlassCard } from "@/components/glass-card";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import { logger } from "@/lib/logger";
import { sanitizeHtml } from "@/lib/sanitize-html";

interface LegalDocDetail {
  id: number;
  title: string;
  type: string;
  version: string;
  content: string;
  effective_date: string;
  requires_acceptance: boolean;
  accepted: boolean;
}

export default function LegalDocDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return <ProtectedRoute><LegalDocDetailContent params={params} /></ProtectedRoute>;
}

function LegalDocDetailContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, logout } = useAuth();
  const [doc, setDoc] = useState<LegalDocDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    api.getLegalDocument(Number(id))
      .then((data) => setDoc(data))
      .catch((error) => logger.error("Failed to fetch document:", error))
      .finally(() => setIsLoading(false));
  }, [id]);
  const handleAccept = async () => {
    try {
      await api.acceptLegalDocument(Number(id));
      setDoc((prev) => prev ? { ...prev, accepted: true } : prev);
    } catch (error) {
      logger.error("Failed to accept:", error);
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar user={user} onLogout={logout} />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/legal" className="inline-flex items-center gap-2 text-white/50 hover:text-white mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Legal Documents
        </Link>

        {isLoading ? (
          <div className="p-8 rounded-xl bg-white/5 border border-white/10">
            <Skeleton className="w-64 h-8 rounded mb-4" />
            <Skeleton className="w-full h-64 rounded" />
          </div>
        ) : doc ? (
          <GlassCard glow="none" padding="lg">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-white">{doc.title}</h1>
                <div className="flex items-center gap-2 mt-1 text-sm text-white/40">
                  <span>Version {doc.version}</span>
                  <span>Effective {new Date(doc.effective_date).toLocaleDateString()}</span>
                </div>
              </div>
              {doc.accepted ? (
                <Chip size="md" variant="flat" className="bg-emerald-500/20 text-emerald-400" startContent={<CheckCircle className="w-4 h-4" />}>
                  Accepted
                </Chip>
              ) : doc.requires_acceptance ? (
                <Button className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white" onPress={handleAccept}>
                  Accept
                </Button>
              ) : null}
            </div>
            <div className="prose prose-invert max-w-none text-white/80" dangerouslySetInnerHTML={{ __html: sanitizeHtml(doc.content) }} />
          </GlassCard>
        ) : (
          <div className="text-center py-16">
            <h3 className="text-xl font-semibold text-white">Document not found</h3>
          </div>
        )}
      </div>
    </div>
  );
}
