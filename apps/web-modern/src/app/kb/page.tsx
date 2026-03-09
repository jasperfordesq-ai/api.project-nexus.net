// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Input,
  Skeleton,
  Pagination,
  Chip,
} from "@heroui/react";
import { HelpCircle, Search, BookOpen, FolderOpen } from "lucide-react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { ProtectedRoute } from "@/components/protected-route";
import { GlassCard, MotionGlassCard } from "@/components/glass-card";
import { useAuth } from "@/contexts/auth-context";
import { api, type PaginatedResponse } from "@/lib/api";
import { logger } from "@/lib/logger";
import { containerVariantsFast, itemVariants } from "@/lib/animations";

interface KBCategory {
  id: number;
  name: string;
  description?: string;
  article_count: number;
}

interface KBArticle {
  id: number;
  title: string;
  excerpt?: string;
  category: string;
  helpful_count: number;
  created_at: string;
}

export default function KnowledgeBasePage() {
  return <ProtectedRoute><KBContent /></ProtectedRoute>;
}

function KBContent() {
  const { user, logout } = useAuth();
  const [categories, setCategories] = useState<KBCategory[]>([]);
  const [articles, setArticles] = useState<KBArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [cats, arts] = await Promise.allSettled([
        api.getKBCategories(),
        api.getKBArticles({
          category_id: selectedCategory || undefined,
          search: searchQuery || undefined,
          page: currentPage,
          limit: 12,
        }),
      ]);
      if (cats.status === "fulfilled") setCategories(cats.value || []);
      if (arts.status === "fulfilled") {
        setArticles(arts.value?.data || []);
        setTotalPages(arts.value?.pagination?.total_pages || 1);
      }
    } catch (error) {
      logger.error("Failed to fetch KB:", error);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, selectedCategory, searchQuery]);

  useEffect(() => { fetchData(); }, [fetchData]);
  return (
    <div className="min-h-screen">
      <Navbar user={user} onLogout={logout} />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <HelpCircle className="w-8 h-8 text-indigo-400" />
            Knowledge Base
          </h1>
          <p className="text-white/50 mt-1">Find answers to common questions</p>
        </div>

        <div className="mb-8">
          <Input
            placeholder="Search articles..."
            value={searchQuery}
            onValueChange={(v) => { setSearchQuery(v); setCurrentPage(1); }}
            startContent={<Search className="w-4 h-4 text-white/40" />}
            classNames={{
              input: "text-white placeholder:text-white/30",
              inputWrapper: ["bg-white/5", "border border-white/10", "hover:bg-white/10", "group-data-[focus=true]:bg-white/10"],
            }}
            className="sm:max-w-md"
          />
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="p-6 rounded-xl bg-white/5 border border-white/10">
                <Skeleton className="w-3/4 h-5 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Categories sidebar */}
            <div className="lg:col-span-1">
              <GlassCard glow="none" padding="md">
                <h3 className="text-sm font-semibold text-white/60 uppercase mb-3">Categories</h3>
                <div className="space-y-1">
                  <button
                    onClick={() => { setSelectedCategory(null); setCurrentPage(1); }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      selectedCategory === null ? "bg-indigo-500/20 text-indigo-400" : "text-white/60 hover:bg-white/5"
                    }`}
                  >
                    All Articles
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => { setSelectedCategory(cat.id); setCurrentPage(1); }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between ${
                        selectedCategory === cat.id ? "bg-indigo-500/20 text-indigo-400" : "text-white/60 hover:bg-white/5"
                      }`}
                    >
                      <span>{cat.name}</span>
                      <span className="text-xs text-white/30">{cat.article_count}</span>
                    </button>
                  ))}
                </div>
              </GlassCard>
            </div>

            {/* Articles */}
            <div className="lg:col-span-3">
              {articles.length > 0 ? (
                <>
                  <motion.div variants={containerVariantsFast} initial="hidden" animate="visible" className="space-y-3">
                    {articles.map((article) => (
                      <MotionGlassCard key={article.id} variants={itemVariants} glow="none" padding="md" hover>
                        <Link href={`/kb/${article.id}`} className="block">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="text-white font-medium mb-1 flex items-center gap-2">
                                <BookOpen className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                                {article.title}
                              </h3>
                              {article.excerpt && (
                                <p className="text-sm text-white/50 line-clamp-2 ml-6">{article.excerpt}</p>
                              )}
                            </div>
                            <Chip size="sm" variant="flat" className="bg-white/10 text-white/50 ml-4">
                              {article.category}
                            </Chip>
                          </div>
                        </Link>
                      </MotionGlassCard>
                    ))}
                  </motion.div>
                  {totalPages > 1 && (
                    <div className="flex justify-center mt-6">
                      <Pagination total={totalPages} page={currentPage} onChange={setCurrentPage}
                        classNames={{ wrapper: "gap-2", item: "bg-white/5 text-white border-white/10 hover:bg-white/10", cursor: "bg-indigo-500 text-white" }}
                      />
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-16">
                  <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                    <HelpCircle className="w-8 h-8 text-white/20" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">No articles found</h3>
                  <p className="text-white/50">
                    {searchQuery ? "Try adjusting your search" : "No knowledge base articles yet."}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
