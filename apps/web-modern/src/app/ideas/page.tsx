// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Button,
  Input,
  Chip,
  Skeleton,
  Pagination,
  Textarea,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from "@heroui/react";
import {
  Lightbulb,
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
  Plus,
  Search,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { ProtectedRoute } from "@/components/protected-route";
import { MotionGlassCard } from "@/components/glass-card";
import { useAuth } from "@/contexts/auth-context";
import { api, type PaginatedResponse } from "@/lib/api";
import { logger } from "@/lib/logger";
import { containerVariantsFast, itemVariants } from "@/lib/animations";

interface Idea {
  id: number;
  title: string;
  description: string;
  category?: string;
  status: string;
  upvotes: number;
  downvotes: number;
  comment_count: number;
  user_vote?: string;
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

export default function IdeasPage() {
  return <ProtectedRoute><IdeasContent /></ProtectedRoute>;
}

function IdeasContent() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [unreadCount, setUnreadCount] = useState(0);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchIdeas = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: { page: number; limit: number; sort?: string } = {
        page: currentPage,
        limit: 12,
      };
      const response = await api.getIdeas(params);
      setIdeas(response?.data || []);
      setTotalPages(response?.pagination?.total_pages || 1);
    } catch (error) {
      logger.error("Failed to fetch ideas:", error);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage]);

  useEffect(() => { fetchIdeas(); }, [fetchIdeas]);
  useEffect(() => {
    api.getUnreadMessageCount().then((res) => setUnreadCount(res?.count || 0));
  }, []);

  const handleVote = async (id: number, vote: "up" | "down") => {
    try {
      await api.voteIdea(id, vote);
      setIdeas((prev) =>
        prev.map((idea) => {
          if (idea.id !== id) return idea;
          const wasUp = idea.user_vote === "up";
          const wasDown = idea.user_vote === "down";
          return {
            ...idea,
            user_vote: vote,
            upvotes: idea.upvotes + (vote === "up" ? 1 : 0) - (wasUp ? 1 : 0),
            downvotes: idea.downvotes + (vote === "down" ? 1 : 0) - (wasDown ? 1 : 0),
          };
        })
      );
    } catch (error) {
      logger.error("Failed to vote:", error);
    }
  };

  const handleSubmit = async () => {
    if (!newTitle.trim()) return;
    setIsSubmitting(true);
    try {
      const result = await api.submitIdea({
        title: newTitle.trim(),
        description: newDesc.trim(),
        category: newCategory.trim() || undefined,
      });
      onClose();
      setNewTitle("");
      setNewDesc("");
      setNewCategory("");
      router.push(`/ideas/${result.id}`);
    } catch (error) {
      logger.error("Failed to submit idea:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredIdeas = ideas.filter(
    (idea) =>
      idea.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      idea.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen">
      <Navbar user={user} unreadCount={unreadCount} onLogout={logout} />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Lightbulb className="w-8 h-8 text-amber-400" />
              Ideas & Challenges
            </h1>
            <p className="text-white/50 mt-1">Share ideas and vote on community proposals</p>
          </div>
          <Button
            className="bg-gradient-to-r from-amber-500 to-orange-600 text-white"
            startContent={<Plus className="w-4 h-4" />}
            onPress={onOpen}
          >
            Submit Idea
          </Button>
        </div>

        <div className="mb-8">
          <Input
            placeholder="Search ideas..."
            value={searchQuery}
            onValueChange={setSearchQuery}
            startContent={<Search className="w-4 h-4 text-white/40" />}
            classNames={{
              input: "text-white placeholder:text-white/30",
              inputWrapper: ["bg-white/5", "border border-white/10", "hover:bg-white/10", "group-data-[focus=true]:bg-white/10"],
            }}
            className="sm:max-w-xs"
          />
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="p-6 rounded-xl bg-white/5 border border-white/10">
                <Skeleton className="w-3/4 h-6 rounded mb-2" />
                <Skeleton className="w-full h-12 rounded" />
              </div>
            ))}
          </div>
        ) : filteredIdeas.length > 0 ? (
          <>
            <motion.div variants={containerVariantsFast} initial="hidden" animate="visible" className="space-y-4">
              {filteredIdeas.map((idea) => (
                <MotionGlassCard key={idea.id} variants={itemVariants} glow="none" padding="md" hover>
                  <div className="flex gap-4">
                    {/* Vote buttons */}
                    <div className="flex flex-col items-center gap-1">
                      <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        className={idea.user_vote === "up" ? "text-emerald-400" : "text-white/30 hover:text-white"}
                        onPress={() => handleVote(idea.id, "up")}
                      >
                        <ThumbsUp className="w-4 h-4" />
                      </Button>
                      <span className="text-sm font-bold text-white">{idea.upvotes - idea.downvotes}</span>
                      <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        className={idea.user_vote === "down" ? "text-red-400" : "text-white/30 hover:text-white"}
                        onPress={() => handleVote(idea.id, "down")}
                      >
                        <ThumbsDown className="w-4 h-4" />
                      </Button>
                    </div>
                    {/* Content */}
                    <Link href={`/ideas/${idea.id}`} className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-semibold text-white">{idea.title}</h3>
                        <Chip size="sm" variant="flat" className={statusColors[idea.status] || ""}>
                          {idea.status.replace("_", " ")}
                        </Chip>
                      </div>
                      <p className="text-sm text-white/50 line-clamp-2 mb-2">{idea.description}</p>
                      <div className="flex items-center gap-4 text-sm text-white/40">
                        <span>{idea.submitted_by.first_name} {idea.submitted_by.last_name}</span>
                        <span className="flex items-center gap-1">
                          <MessageCircle className="w-3 h-3" /> {idea.comment_count}
                        </span>
                        <span>{new Date(idea.created_at).toLocaleDateString()}</span>
                      </div>
                    </Link>
                  </div>
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
              <Lightbulb className="w-8 h-8 text-white/20" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No ideas yet</h3>
            <p className="text-white/50 mb-6">Be the first to share an idea!</p>
            <Button
              className="bg-gradient-to-r from-amber-500 to-orange-600 text-white"
              startContent={<Plus className="w-4 h-4" />}
              onPress={onOpen}
            >
              Submit Idea
            </Button>
          </div>
        )}
      </div>

      {/* Submit Modal */}
      <Modal isOpen={isOpen} onClose={onClose} classNames={{ base: "bg-black/90 border border-white/10", header: "border-b border-white/10", footer: "border-t border-white/10" }}>
        <ModalContent>
          <ModalHeader className="text-white">Submit an Idea</ModalHeader>
          <ModalBody>
            <Input
              label="Title"
              value={newTitle}
              onValueChange={setNewTitle}
              classNames={{ input: "text-white", inputWrapper: "bg-white/5 border border-white/10", label: "text-white/60" }}
            />
            <Textarea
              label="Description"
              value={newDesc}
              onValueChange={setNewDesc}
              classNames={{ input: "text-white", inputWrapper: "bg-white/5 border border-white/10", label: "text-white/60" }}
              minRows={3}
            />
            <Input
              label="Category (optional)"
              value={newCategory}
              onValueChange={setNewCategory}
              classNames={{ input: "text-white", inputWrapper: "bg-white/5 border border-white/10", label: "text-white/60" }}
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="light" className="text-white/50" onPress={onClose}>Cancel</Button>
            <Button
              className="bg-gradient-to-r from-amber-500 to-orange-600 text-white"
              onPress={handleSubmit}
              isLoading={isSubmitting}
              isDisabled={!newTitle.trim()}
            >
              Submit
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
