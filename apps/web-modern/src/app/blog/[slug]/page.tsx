// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

"use client";

import { useEffect, useState, useCallback, use } from "react";
import { Avatar, Skeleton } from "@heroui/react";
import { ArrowLeft, Calendar } from "lucide-react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { ProtectedRoute } from "@/components/protected-route";
import { GlassCard } from "@/components/glass-card";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import { logger } from "@/lib/logger";

interface BlogPostDetail {
  id: number;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  cover_image_url?: string;
  category?: string;
  author: { id: number; first_name: string; last_name: string };
  published_at: string;
}

export default function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  return <ProtectedRoute><BlogPostContent params={params} /></ProtectedRoute>;
}

function BlogPostContent({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { user, logout } = useAuth();
  const [post, setPost] = useState<BlogPostDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPost = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.getBlogPost(slug);
      setPost(data);
    } catch (error) {
      logger.error("Failed to fetch blog post:", error);
    } finally {
      setIsLoading(false);
    }
  }, [slug]);

  useEffect(() => { fetchPost(); }, [fetchPost]);
  return (
    <div className="min-h-screen">
      <Navbar user={user} onLogout={logout} />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/blog" className="inline-flex items-center gap-2 text-white/50 hover:text-white mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Blog
        </Link>

        {isLoading ? (
          <div className="p-8 rounded-xl bg-white/5 border border-white/10">
            <Skeleton className="w-64 h-8 rounded mb-4" />
            <Skeleton className="w-full h-64 rounded" />
          </div>
        ) : post ? (
          <article>
            {post.cover_image_url && (
              <div className="w-full h-64 overflow-hidden rounded-xl mb-8">
                <img src={post.cover_image_url} alt={post.title} className="w-full h-full object-cover" />
              </div>
            )}
            <GlassCard glow="none" padding="lg">
              {post.category && (
                <span className="text-xs text-indigo-400 uppercase tracking-wider font-semibold">
                  {post.category}
                </span>
              )}
              <h1 className="text-3xl font-bold text-white mt-2 mb-4">{post.title}</h1>
              <div className="flex items-center gap-3 mb-8 pb-4 border-b border-white/10">
                <Link href={`/members/${post.author.id}`}>
                  <Avatar name={`${post.author.first_name} ${post.author.last_name}`} size="sm" className="ring-2 ring-white/10" />
                </Link>
                <div>
                  <Link href={`/members/${post.author.id}`}>
                    <p className="text-sm text-white hover:text-indigo-400 transition-colors">
                      {post.author.first_name} {post.author.last_name}
                    </p>
                  </Link>
                  <p className="text-xs text-white/40 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(post.published_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div
                className="prose prose-invert max-w-none text-white/80"
                dangerouslySetInnerHTML={{ __html: post.content }}
              />
            </GlassCard>
          </article>
        ) : (
          <div className="text-center py-16">
            <h3 className="text-xl font-semibold text-white">Post not found</h3>
          </div>
        )}
      </div>
    </div>
  );
}
