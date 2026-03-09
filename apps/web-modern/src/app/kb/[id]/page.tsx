// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

"use client";

import { useEffect, useState, useCallback, use } from "react";
import { Button, Skeleton, Chip } from "@heroui/react";
import { ArrowLeft, ThumbsUp, BookOpen } from "lucide-react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { ProtectedRoute } from "@/components/protected-route";
import { GlassCard } from "@/components/glass-card";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import { logger } from "@/lib/logger";

interface KBArticleDetail {
  id: number;
  title: string;
  content: string;
  category: string;
  helpful_count: number;
  related_articles: { id: number; title: string }[];
  created_at: string;
  updated_at: string;
}

export default function KBArticlePage({ params }: { params: Promise<{ id: string }> }) {
  return <ProtectedRoute><KBArticleContent params={params} /></ProtectedRoute>;
}

function KBArticleContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, logout } = useAuth();
  const [article, setArticle] = useState<KBArticleDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [markedHelpful, setMarkedHelpful] = useState(false);

  const fetchArticle = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.getKBArticle(Number(id));
      setArticle(data);
    } catch (error) {
      logger.error("Failed to fetch article:", error);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchArticle(); }, [fetchArticle]);
  const handleHelpful = async () => {
    try {
      await api.markKBArticleHelpful(Number(id));
      setMarkedHelpful(true);
      setArticle((prev) => prev ? { ...prev, helpful_count: prev.helpful_count + 1 } : prev);
    } catch (error) {
      logger.error("Failed to mark helpful:", error);
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar user={user} onLogout={logout} />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/kb" className="inline-flex items-center gap-2 text-white/50 hover:text-white mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Knowledge Base
        </Link>

        {isLoading ? (
          <div className="p-8 rounded-xl bg-white/5 border border-white/10">
            <Skeleton className="w-64 h-8 rounded mb-4" />
            <Skeleton className="w-full h-64 rounded" />
          </div>
        ) : article ? (
          <>
            <GlassCard glow="none" padding="lg">
              <Chip size="sm" variant="flat" className="bg-indigo-500/20 text-indigo-400 mb-3">
                {article.category}
              </Chip>
              <h1 className="text-2xl font-bold text-white mb-6">{article.title}</h1>
              <div
                className="prose prose-invert max-w-none text-white/80 mb-8"
                dangerouslySetInnerHTML={{ __html: article.content }}
              />

              <div className="flex items-center justify-between pt-4 border-t border-white/10">
                <span className="text-xs text-white/30">
                  Updated {new Date(article.updated_at).toLocaleDateString()}
                </span>
                <Button
                  size="sm"
                  className={markedHelpful ? "bg-emerald-500/20 text-emerald-400" : "bg-white/10 text-white"}
                  startContent={<ThumbsUp className="w-4 h-4" />}
                  onPress={handleHelpful}
                  isDisabled={markedHelpful}
                >
                  Helpful ({article.helpful_count})
                </Button>
              </div>
            </GlassCard>

            {article.related_articles.length > 0 && (
              <GlassCard glow="none" padding="lg" className="mt-6">
                <h2 className="text-lg font-semibold text-white mb-3">Related Articles</h2>
                <div className="space-y-2">
                  {article.related_articles.map((ra) => (
                    <Link key={ra.id} href={`/kb/${ra.id}`}>
                      <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 transition-colors">
                        <BookOpen className="w-4 h-4 text-indigo-400" />
                        <span className="text-white/70 hover:text-white">{ra.title}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </GlassCard>
            )}
          </>
        ) : (
          <div className="text-center py-16">
            <h3 className="text-xl font-semibold text-white">Article not found</h3>
          </div>
        )}
      </div>
    </div>
  );
}
