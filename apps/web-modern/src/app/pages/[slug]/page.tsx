// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { Skeleton } from "@heroui/react";
import { FileText, ChevronRight, Home } from "lucide-react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { MotionGlassCard } from "@/components/glass-card";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import { logger } from "@/lib/logger";
import { sanitizeHtml } from "@/lib/sanitize-html";
import { containerVariantsFast, itemVariants } from "@/lib/animations";

interface CmsPage {
  title: string;
  content: string;
  slug: string;
  updated_at: string;
}

export default function CmsPageView() {
  const { user, logout } = useAuth();
  const params = useParams();
  const slug = params?.slug as string;
  const [page, setPage] = useState<CmsPage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    setIsLoading(true);
    api
      .getCmsPage(slug)
      .then((res) => {
        setPage(res);
      })
      .catch((err) => {
        logger.error("Failed to fetch CMS page:", err);
        setError("Page not found");
      })
      .finally(() => setIsLoading(false));
  }, [slug]);
  return (
    <div className="min-h-screen">
      <Navbar user={user} onLogout={logout} />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-white/40 mb-6">
          <Link href="/" className="flex items-center gap-1 hover:text-white/60 transition-colors">
            <Home className="w-4 h-4" />
            <span>Home</span>
          </Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-white/60">{page?.title || slug}</span>
        </nav>

        {isLoading ? (
          <div className="space-y-6">
            <Skeleton className="w-2/3 h-10 rounded" />
            <div className="p-6 rounded-xl bg-white/5 border border-white/10">
              <Skeleton className="w-full h-4 rounded mb-3" />
              <Skeleton className="w-full h-4 rounded mb-3" />
              <Skeleton className="w-3/4 h-4 rounded mb-3" />
              <Skeleton className="w-full h-4 rounded" />
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-white/20" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">{error}</h3>
            <p className="text-white/50">The page you&apos;re looking for doesn&apos;t exist.</p>
            <Link href="/" className="text-indigo-400 hover:text-indigo-300 mt-4 inline-block">
              Return home
            </Link>
          </div>
        ) : page ? (
          <motion.div
            variants={containerVariantsFast}
            initial="hidden"
            animate="visible"
            className="space-y-6"
          >
            <motion.div variants={itemVariants}>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <FileText className="w-8 h-8 text-indigo-400" />
                {page.title}
              </h1>
            </motion.div>

            <MotionGlassCard variants={itemVariants} glow="none" padding="lg">
              <div
                className="prose prose-invert max-w-none text-white/80
                  prose-headings:text-white prose-a:text-indigo-400
                  prose-strong:text-white prose-p:leading-relaxed"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(page.content) }}
              />

              {page.updated_at && (
                <div className="mt-8 pt-4 border-t border-white/10 text-sm text-white/30">
                  Last updated: {new Date(page.updated_at).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </div>
              )}
            </MotionGlassCard>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
