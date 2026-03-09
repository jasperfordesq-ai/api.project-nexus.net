// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.
"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Avatar, Button, Textarea, Spinner, Divider, Tooltip, Skeleton,
} from "@heroui/react";
import {
  Heart, MessageCircle, Bookmark, Share2, Check, Flame, Plus,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { ProtectedRoute } from "@/components/protected-route";
import { GlassCard } from "@/components/glass-card";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import type { Post, Comment } from "@/lib/api";
import { containerVariantsFast, itemVariants } from "@/lib/animations";

// ── Helpers ─────────────────────────────────────────────
function relativeTime(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString("en-IE", { day: "numeric", month: "short" });
}

function postInitials(post: Post): string {
  const f = post.author?.first_name?.[0] ?? "";
  const l = post.author?.last_name?.[0] ?? "";
  return (f + l).toUpperCase() || "?";
}

function postDisplayName(post: Post): string {
  const f = post.author?.first_name ?? "";
  const l = post.author?.last_name ?? "";
  return `${f} ${l}`.trim() || "Community Member";
}

function commentInitials(c: Comment): string {
  const f = c.author?.first_name?.[0] ?? "";
  const l = c.author?.last_name?.[0] ?? "";
  return (f + l).toUpperCase() || "?";
}

function commentDisplayName(c: Comment): string {
  const f = c.author?.first_name ?? "";
  const l = c.author?.last_name ?? "";
  return `${f} ${l}`.trim() || "Member";
}

// ── Sub-components ─────────────────────────────────────
function CommentItem({ comment }: { comment: Comment }) {
  return (
    <div className="flex gap-3 py-2.5">
      <Avatar
        name={commentInitials(comment)}
        size="sm"
        className="shrink-0 mt-0.5"
        classNames={{ base: "bg-secondary/20 text-secondary w-7 h-7", name: "text-xs font-bold" }}
      />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-foreground/80">{commentDisplayName(comment)}</p>
        <p className="text-sm text-foreground/70 mt-0.5 whitespace-pre-wrap break-words leading-relaxed">
          {comment.content}
        </p>
        <p className="text-xs text-default-400 mt-1">{relativeTime(comment.created_at)}</p>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <GlassCard padding="none">
      <div className="p-4 space-y-3">
        <div className="flex gap-3 items-center">
          <Skeleton className="rounded-full w-9 h-9 shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="rounded-lg h-3 w-1/3" />
            <Skeleton className="rounded-lg h-2.5 w-1/4" />
          </div>
        </div>
        <Skeleton className="rounded-lg h-3 w-full" />
        <Skeleton className="rounded-lg h-3 w-4/5" />
        <Skeleton className="rounded-lg h-3 w-2/3" />
      </div>
    </GlassCard>
  );
}

type TabKey = "feed" | "trending" | "bookmarks";

function EmptyState({ tab }: { tab: TabKey }) {
  const cfg = {
    feed: { icon: "\uD83D\uDCED", title: "Feed is quiet", sub: "Be the first to share something with the community." },
    trending: { icon: "\uD83D\uDCC8", title: "Nothing trending yet", sub: "Posts gain momentum with likes, comments and shares." },
    bookmarks: { icon: "\uD83D\uDD16", title: "No saved posts", sub: "Bookmark posts to find them quickly later." },
  }[tab];
  return (
    <GlassCard padding="lg" className="text-center">
      <p className="text-4xl mb-3">{cfg.icon}</p>
      <p className="font-semibold text-foreground/80">{cfg.title}</p>
      <p className="text-sm text-default-400 mt-1">{cfg.sub}</p>
    </GlassCard>
  );
}

// ── PostCard ─────────────────────────────────────────
interface PostCardProps {
  post: Post;
  onLike: (id: number) => void;
  onBookmark: (id: number) => void;
  isBookmarked: boolean;
  commentExpanded: boolean;
  onToggleComments: (id: number) => void;
  comments: Comment[];
  loadingComments: boolean;
  onAddComment: (postId: number, text: string) => Promise<void>;
  submittingComment: boolean;
  copiedId: number | null;
  onCopy: (id: number) => void;
}

function PostCard({
  post, onLike, onBookmark, isBookmarked,
  commentExpanded, onToggleComments, comments,
  loadingComments, onAddComment, submittingComment,
  copiedId, onCopy,
}: PostCardProps) {
  const [commentText, setCommentText] = useState("");

  const submitComment = async () => {
    const text = commentText.trim();
    if (!text || submittingComment) return;
    setCommentText("");
    await onAddComment(post.id, text);
  };

  return (
    <GlassCard padding="none" className="overflow-hidden">
      {/* Header */}
      <div className="flex items-start gap-3 p-4 pb-2">
        <Avatar
          name={postInitials(post)}
          size="sm"
          className="shrink-0 mt-0.5"
          classNames={{
            base: "bg-primary/20 text-primary",
            name: "font-bold text-xs",
          }}
        />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-foreground leading-tight truncate">
            {postDisplayName(post)}
          </p>
          <p className="text-xs text-default-400 mt-0.5">{relativeTime(post.created_at)}</p>
        </div>
        {post.group && (
          <span className="text-xs bg-secondary/10 text-secondary font-medium px-2.5 py-1 rounded-full shrink-0 border border-secondary/20">
            {post.group.name}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="px-4 pb-3">
        <p className="text-sm text-foreground/80 whitespace-pre-wrap break-words leading-relaxed">
          {post.content}
        </p>
        {post.image_url && (
          <img
            src={post.image_url}
            alt="Post attachment"
            className="mt-3 rounded-xl w-full object-cover max-h-80 border border-white/10"
          />
        )}
      </div>

      {/* Action bar */}
      <div className="flex items-center gap-0.5 px-2 pb-2 border-t border-white/5 pt-1.5">
        <Tooltip content={post.is_liked ? "Unlike" : "Like"} placement="bottom">
          <Button
            size="sm"
            variant="light"
            className={`gap-1.5 text-xs font-medium min-w-0 transition-colors ${
              post.is_liked ? "text-danger" : "text-default-400 hover:text-danger"
            }`}
            onPress={() => onLike(post.id)}
            startContent={
              <Heart
                className="w-4 h-4 shrink-0"
                fill={post.is_liked ? "currentColor" : "none"}
                strokeWidth={post.is_liked ? 0 : 1.5}
              />
            }
          >
            {post.like_count > 0 ? post.like_count : ""}
          </Button>
        </Tooltip>

        <Tooltip content={commentExpanded ? "Hide comments" : "Comment"} placement="bottom">
          <Button
            size="sm"
            variant="light"
            className={`gap-1.5 text-xs font-medium min-w-0 transition-colors ${
              commentExpanded ? "text-primary" : "text-default-400 hover:text-primary"
            }`}
            onPress={() => onToggleComments(post.id)}
            startContent={<MessageCircle className="w-4 h-4 shrink-0" strokeWidth={1.5} />}
          >
            {post.comment_count > 0 ? post.comment_count : ""}
          </Button>
        </Tooltip>

        <Tooltip content={isBookmarked ? "Remove bookmark" : "Bookmark"} placement="bottom">
          <Button
            isIconOnly
            size="sm"
            variant="light"
            className={`min-w-0 transition-colors ${
              isBookmarked ? "text-warning" : "text-default-400 hover:text-warning"
            }`}
            onPress={() => onBookmark(post.id)}
          >
            <Bookmark
              className="w-4 h-4"
              fill={isBookmarked ? "currentColor" : "none"}
              strokeWidth={isBookmarked ? 0 : 1.5}
            />
          </Button>
        </Tooltip>

        <Tooltip content={copiedId === post.id ? "Copied!" : "Share link"} placement="bottom">
          <Button
            isIconOnly
            size="sm"
            variant="light"
            className={`min-w-0 ml-auto transition-colors ${
              copiedId === post.id ? "text-success" : "text-default-400 hover:text-default-600"
            }`}
            onPress={() => onCopy(post.id)}
          >
            {copiedId === post.id
              ? <Check className="w-4 h-4" strokeWidth={2.5} />
              : <Share2 className="w-4 h-4" strokeWidth={1.5} />}
          </Button>
        </Tooltip>
      </div>

      {/* Comment panel */}
      <AnimatePresence>
        {commentExpanded && (
          <motion.div
            key="comments"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="border-t border-white/10 px-4 pt-3 pb-4">
              {loadingComments ? (
                <div className="flex justify-center py-5">
                  <Spinner size="sm" color="primary" />
                </div>
              ) : (
                <>
                  {comments.length === 0 && (
                    <p className="text-xs text-default-400 text-center py-3 italic">
                      No comments yet — be the first!
                    </p>
                  )}
                  <div className="divide-y divide-white/5">
                    {comments.map((c) => (
                      <CommentItem key={c.id} comment={c} />
                    ))}
                  </div>
                </>
              )}
              <div className="flex gap-2 mt-3 items-end">
                <Textarea
                  size="sm"
                  minRows={1}
                  maxRows={5}
                  placeholder="Write a comment…"
                  value={commentText}
                  onValueChange={setCommentText}
                  onKeyDown={(e: React.KeyboardEvent) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void submitComment();
                    }
                  }}
                  classNames={{
                    inputWrapper: "bg-white/5 border border-white/10 shadow-none",
                    input: "text-sm",
                  }}
                  className="flex-1"
                />
                <Button
                  size="sm"
                  color="primary"
                  variant="flat"
                  isLoading={submittingComment}
                  isDisabled={!commentText.trim()}
                  onPress={() => void submitComment()}
                  className="mb-0.5 shrink-0"
                >
                  Post
                </Button>
              </div>
              <p className="text-xs text-default-400/60 mt-1.5">Enter to post · Shift+Enter for new line</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </GlassCard>
  );
}

// ── Tab button ─────────────────────────────────────────
const MAX_POST_LEN = 500;

export default function FeedPage() {
  return (
    <ProtectedRoute>
      <FeedContent />
    </ProtectedRoute>
  );
}

function FeedContent() {
  const { user, logout } = useAuth();

  const [tab, setTab] = useState<TabKey>("feed");
  const [feedPosts, setFeedPosts] = useState<Post[]>([]);
  const [trendingPosts, setTrendingPosts] = useState<Post[]>([]);
  const [bookmarkedPosts, setBookmarkedPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);

  const [postContent, setPostContent] = useState("");
  const [submittingPost, setSubmittingPost] = useState(false);

  const [expandedComments, setExpandedComments] = useState<Set<number>>(new Set());
  const [postComments, setPostComments] = useState<Record<number, Comment[]>>({});
  const [loadingCommentsSet, setLoadingCommentsSet] = useState<Set<number>>(new Set());
  const [submittingCommentSet, setSubmittingCommentSet] = useState<Set<number>>(new Set());

  const [bookmarkedIds, setBookmarkedIds] = useState<Set<number>>(new Set());
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // ── Loaders ───────────────────────────────────────────
  const loadFeed = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getFeed({ page: 1, limit: 30 });
      setFeedPosts(res.data ?? []);
    } catch (e) {
      console.error("Feed error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTrending = useCallback(async () => {
    setLoading(true);
    try {
      const posts = await api.getTrendingPosts(24, 20);
      setTrendingPosts(posts);
    } catch (e) {
      console.error("Trending error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadBookmarks = useCallback(async () => {
    setLoading(true);
    try {
      const posts = await api.getBookmarkedPosts(1, 30);
      setBookmarkedPosts(posts);
      setBookmarkedIds(new Set(posts.map((p: Post) => p.id)));
    } catch (e) {
      console.error("Bookmarks error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "feed") void loadFeed();
    else if (tab === "trending") void loadTrending();
    else if (tab === "bookmarks") void loadBookmarks();
  }, [tab, loadFeed, loadTrending, loadBookmarks]);

  // Also pre-load bookmarked IDs for the feed tab
  useEffect(() => {
    api.getBookmarkedPosts(1, 100)
      .then((posts: Post[]) => setBookmarkedIds(new Set(posts.map((p: Post) => p.id))))
      .catch(() => {});
  }, []);

  // ── Handlers ─────────────────────────────────────────
  const handleLike = useCallback((postId: number) => {
    const update = (list: Post[]) =>
      list.map((p) =>
        p.id !== postId ? p : { ...p, is_liked: !p.is_liked, like_count: p.is_liked ? p.like_count - 1 : p.like_count + 1 }
      );
    const wasLiked = feedPosts.find((p) => p.id === postId)?.is_liked ??
      trendingPosts.find((p) => p.id === postId)?.is_liked ?? false;
    setFeedPosts(update);
    setTrendingPosts(update);
    const revert = (list: Post[]) =>
      list.map((p) =>
        p.id !== postId ? p : { ...p, is_liked: wasLiked, like_count: wasLiked ? p.like_count + 1 : p.like_count - 1 }
      );
    api[wasLiked ? "unlikePost" : "likePost"](postId).catch(() => {
      setFeedPosts(revert);
      setTrendingPosts(revert);
    });
  }, [feedPosts, trendingPosts]);

  const handleBookmark = useCallback((postId: number) => {
    const was = bookmarkedIds.has(postId);
    setBookmarkedIds((prev) => {
      const next = new Set(prev);
      was ? next.delete(postId) : next.add(postId);
      return next;
    });
    api[was ? "unbookmarkPost" : "bookmarkPost"](postId).catch(() => {
      setBookmarkedIds((prev) => {
        const next = new Set(prev);
        was ? next.add(postId) : next.delete(postId);
        return next;
      });
    });
  }, [bookmarkedIds]);

  const handleToggleComments = useCallback(async (postId: number) => {
    const wasOpen = expandedComments.has(postId);
    setExpandedComments((prev) => {
      const next = new Set(prev);
      wasOpen ? next.delete(postId) : next.add(postId);
      return next;
    });
    if (!wasOpen && !postComments[postId]) {
      setLoadingCommentsSet((prev) => new Set(prev).add(postId));
      try {
        const comments = await api.getPostComments(postId);
        setPostComments((prev) => ({ ...prev, [postId]: comments }));
      } catch (e) {
        console.error("Comments error:", e);
      } finally {
        setLoadingCommentsSet((prev) => { const s = new Set(prev); s.delete(postId); return s; });
      }
    }
  }, [expandedComments, postComments]);

  const handleAddComment = useCallback(async (postId: number, text: string) => {
    setSubmittingCommentSet((prev) => new Set(prev).add(postId));
    try {
      const comment = await api.addComment(postId, text);
      setPostComments((prev) => ({ ...prev, [postId]: [...(prev[postId] ?? []), comment] }));
      const updateCount = (list: Post[]) =>
        list.map((p) => p.id === postId ? { ...p, comment_count: p.comment_count + 1 } : p);
      setFeedPosts(updateCount);
      setTrendingPosts(updateCount);
    } catch (e) {
      console.error("Add comment error:", e);
    } finally {
      setSubmittingCommentSet((prev) => { const s = new Set(prev); s.delete(postId); return s; });
    }
  }, []);

  const handleCopy = useCallback((postId: number) => {
    void navigator.clipboard.writeText(`${window.location.origin}/feed/${postId}`);
    setCopiedId(postId);
    setTimeout(() => setCopiedId((c) => (c === postId ? null : c)), 2000);
  }, []);

  const handleCreatePost = async () => {
    const text = postContent.trim();
    if (!text || submittingPost || text.length > MAX_POST_LEN) return;
    setSubmittingPost(true);
    try {
      const post = await api.createPost({ content: text });
      if (post) {
        setFeedPosts((prev) => [post, ...prev]);
        setPostContent("");
      }
    } catch (e) {
      console.error("Create post error:", e);
    } finally {
      setSubmittingPost(false);
    }
  };

  const currentPosts = tab === "feed" ? feedPosts : tab === "trending" ? trendingPosts : bookmarkedPosts;

  const tabs: { key: TabKey; label: string; icon?: React.ReactNode }[] = [
    { key: "feed", label: "Feed" },
    { key: "trending", label: "Trending", icon: <Flame className="w-3.5 h-3.5" /> },
    { key: "bookmarks", label: "Saved", icon: <Bookmark className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="min-h-screen">
      <Navbar user={user} onLogout={logout} />

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">
        {/* Page header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Community Feed</h1>
          <p className="text-sm text-default-400 mt-0.5">
            Share updates, ideas, and connect with members
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white/5 backdrop-blur-sm border border-white/10 p-1 rounded-xl w-fit">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={[
                "flex items-center gap-1.5 text-sm font-medium px-4 py-1.5 rounded-lg transition-all duration-150",
                tab === t.key
                  ? "bg-white/10 shadow-sm text-foreground border border-white/20"
                  : "text-default-500 hover:text-foreground hover:bg-white/5",
              ].join(" ")}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* Create post (feed tab only) */}
        <AnimatePresence>
          {tab === "feed" && (
            <motion.div
              key="create-post"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              <GlassCard padding="none">
                <div className="p-4 space-y-3">
                  <div className="flex gap-3">
                    <Avatar
                      name={user ? `${user.first_name?.[0] ?? ""}${user.last_name?.[0] ?? ""}`.toUpperCase() : "?"}
                      size="sm"
                      className="shrink-0 mt-1"
                      classNames={{ base: "bg-primary/20 text-primary", name: "font-bold text-xs" }}
                    />
                    <Textarea
                      placeholder="What’s on your mind? Share with the community…"
                      minRows={2}
                      maxRows={10}
                      value={postContent}
                      onValueChange={setPostContent}
                      onKeyDown={(e: React.KeyboardEvent) => {
                        if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                          e.preventDefault();
                          void handleCreatePost();
                        }
                      }}
                      classNames={{
                        inputWrapper: "bg-white/5 border border-white/10 shadow-none",
                        input: "text-sm",
                      }}
                      className="flex-1"
                    />
                  </div>
                  <div className="flex items-center justify-between pl-11">
                    <span
                      className={`text-xs font-medium tabular-nums transition-colors ${
                        postContent.length > MAX_POST_LEN
                          ? "text-danger"
                          : postContent.length > MAX_POST_LEN - 50
                          ? "text-warning"
                          : "text-default-400"
                      }`}
                    >
                      {postContent.length}/{MAX_POST_LEN}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-default-400 hidden sm:block">⌘↵ to share</span>
                      <Button
                        color="primary"
                        size="sm"
                        isLoading={submittingPost}
                        isDisabled={!postContent.trim() || postContent.length > MAX_POST_LEN}
                        onPress={() => void handleCreatePost()}
                        startContent={!submittingPost ? <Plus className="w-3.5 h-3.5" /> : undefined}
                      >
                        Share
                      </Button>
                    </div>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Post list */}
        {loading ? (
          <div className="space-y-4">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : currentPosts.length === 0 ? (
          <EmptyState tab={tab} />
        ) : (
          <motion.div
            key={tab}
            className="space-y-4"
            variants={containerVariantsFast}
            initial="hidden"
            animate="visible"
          >
            {currentPosts.map((post) => (
              <motion.div key={post.id} variants={itemVariants}>
                <PostCard
                  post={post}
                  onLike={handleLike}
                  onBookmark={handleBookmark}
                  isBookmarked={bookmarkedIds.has(post.id)}
                  commentExpanded={expandedComments.has(post.id)}
                  onToggleComments={handleToggleComments}
                  comments={postComments[post.id] ?? []}
                  loadingComments={loadingCommentsSet.has(post.id)}
                  onAddComment={handleAddComment}
                  submittingComment={submittingCommentSet.has(post.id)}
                  copiedId={copiedId}
                  onCopy={handleCopy}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
