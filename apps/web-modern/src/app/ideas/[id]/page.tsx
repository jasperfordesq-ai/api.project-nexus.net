// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

"use client";

import { useEffect, useState, useCallback, use } from "react";
import { motion } from "framer-motion";
import {
  Button,
  Avatar,
  Chip,
  Skeleton,
  Textarea,
} from "@heroui/react";
import {
  Lightbulb,
  ThumbsUp,
  ThumbsDown,
  ArrowLeft,
  Send,
} from "lucide-react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { ProtectedRoute } from "@/components/protected-route";
import { GlassCard, MotionGlassCard } from "@/components/glass-card";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import { logger } from "@/lib/logger";
import { containerVariantsFast, itemVariants } from "@/lib/animations";

interface IdeaDetail {
  id: number;
  title: string;
  description: string;
  category?: string;
  status: string;
  upvotes: number;
  downvotes: number;
  user_vote?: string;
  comments: {
    id: number;
    content: string;
    user: { id: number; first_name: string; last_name: string };
    created_at: string;
  }[];
  submitted_by: { id: number; first_name: string; last_name: string };
  created_at: string;
}

const statusColors: Record<string, string> = {
  submitted: "bg-blue-500/20 text-blue-400",
  under_review: "bg-amber-500/20 text-amber-400",
  approved: "bg-emerald-500/20 text-emerald-400",
  implemented: "bg-purple-500/20 text-purple-400",
  declined: "bg-red-500/20 text-red-400",
};

export default function IdeaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return <ProtectedRoute><IdeaDetailContent params={params} /></ProtectedRoute>;
}

function IdeaDetailContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, logout } = useAuth();
  const [idea, setIdea] = useState<IdeaDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [comment, setComment] = useState("");
  const [isCommenting, setIsCommenting] = useState(false);

  const fetchIdea = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.getIdea(Number(id));
      setIdea(data);
    } catch (error) {
      logger.error("Failed to fetch idea:", error);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchIdea(); }, [fetchIdea]);
  const handleVote = async (vote: "up" | "down") => {
    if (!idea) return;
    try {
      await api.voteIdea(idea.id, vote);
      setIdea((prev) => {
        if (!prev) return prev;
        const wasUp = prev.user_vote === "up";
        const wasDown = prev.user_vote === "down";
        return {
          ...prev,
          user_vote: vote,
          upvotes: prev.upvotes + (vote === "up" ? 1 : 0) - (wasUp ? 1 : 0),
          downvotes: prev.downvotes + (vote === "down" ? 1 : 0) - (wasDown ? 1 : 0),
        };
      });
    } catch (error) {
      logger.error("Failed to vote:", error);
    }
  };

  const handleComment = async () => {
    if (!comment.trim()) return;
    setIsCommenting(true);
    try {
      await api.commentOnIdea(Number(id), comment.trim());
      setComment("");
      fetchIdea();
    } catch (error) {
      logger.error("Failed to comment:", error);
    } finally {
      setIsCommenting(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar user={user} onLogout={logout} />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/ideas" className="inline-flex items-center gap-2 text-white/50 hover:text-white mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Ideas
        </Link>

        {isLoading ? (
          <div className="p-8 rounded-xl bg-white/5 border border-white/10">
            <Skeleton className="w-64 h-8 rounded mb-4" />
            <Skeleton className="w-full h-32 rounded" />
          </div>
        ) : idea ? (
          <motion.div variants={containerVariantsFast} initial="hidden" animate="visible" className="space-y-6">
            <MotionGlassCard variants={itemVariants} glow="none" padding="lg">
              <div className="flex gap-6">
                {/* Vote */}
                <div className="flex flex-col items-center gap-1">
                  <Button isIconOnly size="sm" variant="light"
                    className={idea.user_vote === "up" ? "text-emerald-400" : "text-white/30 hover:text-white"}
                    onPress={() => handleVote("up")}
                  >
                    <ThumbsUp className="w-5 h-5" />
                  </Button>
                  <span className="text-xl font-bold text-white">{idea.upvotes - idea.downvotes}</span>
                  <Button isIconOnly size="sm" variant="light"
                    className={idea.user_vote === "down" ? "text-red-400" : "text-white/30 hover:text-white"}
                    onPress={() => handleVote("down")}
                  >
                    <ThumbsDown className="w-5 h-5" />
                  </Button>
                </div>
                {/* Content */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <h1 className="text-2xl font-bold text-white">{idea.title}</h1>
                    <Chip size="sm" variant="flat" className={statusColors[idea.status] || ""}>
                      {idea.status.replace("_", " ")}
                    </Chip>
                  </div>
                  <p className="text-white/70 whitespace-pre-wrap mb-4">{idea.description}</p>
                  <div className="flex items-center gap-3 text-sm text-white/40">
                    <Link href={`/members/${idea.submitted_by.id}`}>
                      <span className="hover:text-white transition-colors">
                        {idea.submitted_by.first_name} {idea.submitted_by.last_name}
                      </span>
                    </Link>
                    <span>{new Date(idea.created_at).toLocaleDateString()}</span>
                    {idea.category && <Chip size="sm" variant="flat" className="bg-white/10 text-white/50">{idea.category}</Chip>}
                  </div>
                </div>
              </div>
            </MotionGlassCard>

            {/* Comments */}
            <MotionGlassCard variants={itemVariants} glow="none" padding="lg">
              <h2 className="text-lg font-semibold text-white mb-4">
                Comments ({idea.comments?.length || 0})
              </h2>

              <div className="flex gap-3 mb-6">
                <Textarea
                  placeholder="Add a comment..."
                  value={comment}
                  onValueChange={setComment}
                  classNames={{ input: "text-white placeholder:text-white/30", inputWrapper: "bg-white/5 border border-white/10" }}
                  minRows={2}
                  className="flex-1"
                />
                <Button
                  isIconOnly
                  className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white self-end"
                  onPress={handleComment}
                  isLoading={isCommenting}
                  isDisabled={!comment.trim()}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-4">
                {(idea.comments || []).map((c) => (
                  <div key={c.id} className="flex gap-3 p-3 rounded-lg bg-white/5">
                    <Link href={`/members/${c.user.id}`}>
                      <Avatar name={`${c.user.first_name} ${c.user.last_name}`} size="sm" className="ring-2 ring-white/10" />
                    </Link>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Link href={`/members/${c.user.id}`}>
                          <span className="text-sm font-medium text-white hover:text-indigo-400 transition-colors">
                            {c.user.first_name} {c.user.last_name}
                          </span>
                        </Link>
                        <span className="text-xs text-white/30">{new Date(c.created_at).toLocaleDateString()}</span>
                      </div>
                      <p className="text-sm text-white/70">{c.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            </MotionGlassCard>
          </motion.div>
        ) : (
          <div className="text-center py-16">
            <h3 className="text-xl font-semibold text-white">Idea not found</h3>
          </div>
        )}
      </div>
    </div>
  );
}
