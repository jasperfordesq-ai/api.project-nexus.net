// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Avatar,
  Skeleton,
  Pagination,
} from "@heroui/react";
import { BookOpen, Calendar } from "lucide-react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { ProtectedRoute } from "@/components/protected-route";
import { MotionGlassCard } from "@/components/glass-card";
import { useAuth } from "@/contexts/auth-context";
import { api, type PaginatedResponse } from "@/lib/api";
import { logger } from "@/lib/logger";
import { containerVariantsFast, itemVariants } from "@/lib/animations";

interface BlogPost {
  id: number;
  title: string;
  slug: string;
  excerpt?: string;
  cover_image_url?: string;
  category?: string;
  author: { id: number; first_name: string; last_name: string };
  published_at: string;
}

export default function BlogPage() {
  return <ProtectedRoute><BlogContent /></ProtectedRoute>;
}

function BlogContent() {
  const { user, logout } = useAuth();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchPosts = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await api.getBlogPosts({ page: currentPage, limit: 12 });
      setPosts(response?.data || []);
      setTotalPages(response?.pagination?.total_pages || 1);
    } catch (error) {
      logger.error("Failed to fetch blog posts:", error);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);
  useEffect(() => {
    api.getUnreadMessageCount().then((res) => setUnreadCount(res?.count || 0));
  }, []);

  return (
    <div className="min-h-screen">
      <Navbar user={user} unreadCount={unreadCount} onLogout={logout} />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-indigo-400" />
            Blog
          </h1>
          <p className="text-white/50 mt-1">News and updates from the community</p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="p-6 rounded-xl bg-white/5 border border-white/10">
                <Skeleton className="w-full h-40 rounded-lg mb-4" />
                <Skeleton className="w-3/4 h-6 rounded mb-2" />
                <Skeleton className="w-full h-12 rounded" />
              </div>
            ))}
          </div>
        ) : posts.length > 0 ? (
          <>
            <motion.div variants={containerVariantsFast} initial="hidden" animate="visible" className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {posts.map((post) => (
                <MotionGlassCard key={post.id} variants={itemVariants} glow="none" padding="none" hover>
                  <Link href={`/blog/${post.slug}`} className="block">
                    {post.cover_image_url && (
                      <div className="w-full h-48 overflow-hidden rounded-t-xl">
                        <img src={post.cover_image_url} alt={post.title} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="p-6">
                      {post.category && (
                        <span className="text-xs text-indigo-400 uppercase tracking-wider font-semibold">
                          {post.category}
                        </span>
                      )}
                      <h3 className="text-lg font-semibold text-white mt-1 mb-2 line-clamp-2">{post.title}</h3>
                      {post.excerpt && <p className="text-sm text-white/50 line-clamp-3 mb-4">{post.excerpt}</p>}
                      <div className="flex items-center gap-3 pt-3 border-t border-white/10">
                        <Avatar name={`${post.author.first_name} ${post.author.last_name}`} size="sm" className="ring-2 ring-white/10" />
                        <div className="flex-1">
                          <p className="text-sm text-white">{post.author.first_name} {post.author.last_name}</p>
                          <p className="text-xs text-white/40 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(post.published_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </Link>
                </MotionGlassCard>
              ))}
            </motion.div>
            {totalPages > 1 && (
              <div className="flex justify-center mt-8">
                <Pagination total={totalPages} page={currentPage} onChange={setCurrentPage}
                  classNames={{ wrapper: "gap-2", item: "bg-white/5 text-white border-white/10 hover:bg-white/10", cursor: "bg-indigo-500 text-white" }}
                />
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-8 h-8 text-white/20" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No blog posts yet</h3>
            <p className="text-white/50">Blog posts will appear here.</p>
          </div>
        )}
      </div>
    </div>
  );
}
