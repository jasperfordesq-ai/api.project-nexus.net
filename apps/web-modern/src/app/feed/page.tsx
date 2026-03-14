// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.
"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Avatar, Button, Textarea, Spinner, Chip, Skeleton,
} from "@heroui/react";
import {
  Heart, MessageCircle, Bookmark, Share2, Check,
  Flame, Rss, Plus, Send,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { ProtectedRoute } from "@/components/protected-route";
import { GlassCard, MotionGlassCard } from "@/components/glass-card";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import type { Post, Comment } from "@/lib/api";
import { containerVariantsFast, itemVariants } from "@/lib/animations";

// ── Helpers ──────────────────────────────────────────────────────────
function relativeTime(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const s = (Date.now() - d.getTime()) / 1000;
  if (s < 60)  return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 604800) return `${Math.floor(s / 86400)}d`;
  return d.toLocaleDateString("en-IE", { day: "numeric", month: "short" });
}

function postInitials(p: Post) {
  return ((p.author?.first_name?.[0] ?? "") + (p.author?.last_name?.[0] ?? "")).toUpperCase() || "?";
}
function postName(p: Post) {
  return `${p.author?.first_name ?? ""} ${p.author?.last_name ?? ""}`.trim() || "Community Member";
}
function commentInitials(c: Comment) {
  return ((c.author?.first_name?.[0] ?? "") + (c.author?.last_name?.[0] ?? "")).toUpperCase() || "?";
}
function commentName(c: Comment) {
  return `${c.author?.first_name ?? ""} ${c.author?.last_name ?? ""}`.trim() || "Member";
}

// ── SkeletonCard ──────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <GlassCard padding="none">
      <div className="p-5 space-y-4">
        <div className="flex gap-3 items-center">
          <Skeleton className="rounded-full w-10 h-10 shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="rounded-lg h-3 w-1/3" />
            <Skeleton className="rounded-lg h-2.5 w-1/5" />
          </div>
        </div>
        <div className="space-y-2">
          <Skeleton className="rounded-lg h-3 w-full" />
          <Skeleton className="rounded-lg h-3 w-5/6" />
          <Skeleton className="rounded-lg h-3 w-3/4" />
        </div>
      </div>
    </GlassCard>
  );
}

// ── EmptyState ────────────────────────────────────────────────────────
type TabKey = "feed" | "trending" | "bookmarks";
function EmptyState({ tab }: { tab: TabKey }) {
  const cfg: Record<TabKey, { icon: React.ReactNode; title: string; sub: string }> = {
    feed:      { icon: <Rss className="w-10 h-10 text-white/20" />,    title: "Feed is quiet",        sub: "Be the first to share something with the community." },
    trending:  { icon: <Flame className="w-10 h-10 text-white/20" />,  title: "Nothing trending yet", sub: "Posts gain momentum with likes, comments and shares." },
    bookmarks: { icon: <Bookmark className="w-10 h-10 text-white/20" />, title: "No saved posts",     sub: "Bookmark posts to find them quickly later." },
  };
  const { icon, title, sub } = cfg[tab];
  return (
    <GlassCard padding="lg" className="text-center">
      <div className="flex flex-col items-center gap-3">
        {icon}
        <p className="font-semibold text-white">{title}</p>
        <p className="text-sm text-white/50">{sub}</p>
      </div>
    </GlassCard>
  );
}

// ── CommentItem ───────────────────────────────────────────────────────
function CommentItem({ c }: { c: Comment }) {
  return (
    <div className="flex gap-3 py-3 border-b border-white/5 last:border-0">
      <Avatar
        name={commentInitials(c)}
        size="sm"
        className="shrink-0"
        classNames={{ base: "bg-purple-500/20 text-purple-300 w-7 h-7", name: "text-xs font-bold" }}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <p className="text-xs font-semibold text-white/80 truncate">{commentName(c)}</p>
          <span className="text-xs text-white/30 shrink-0">{relativeTime(c.created_at)}</span>
        </div>
        <p className="text-sm text-white/60 mt-0.5 whitespace-pre-wrap break-words leading-relaxed">
          {c.content}
        </p>
      </div>
    </div>
  );
}

// ── PostCard ──────────────────────────────────────────────────────────
interface PostCardProps {
  post: Post;
  onLike(id: number): void;
  onBookmark(id: number): void;
  isBookmarked: boolean;
  commentExpanded: boolean;
  onToggleComments(id: number): void;
  comments: Comment[];
  loadingComments: boolean;
  onAddComment(postId: number, text: string): Promise<void>;
  submittingComment: boolean;
  copiedId: number | null;
  onCopy(id: number): void;
}

function PostCard({
  post, onLike, onBookmark, isBookmarked,
  commentExpanded, onToggleComments, comments,
  loadingComments, onAddComment, submittingComment,
  copiedId, onCopy,
}: PostCardProps) {
  const [commentText, setCommentText] = useState("");

  const submit = async () => {
    const t = commentText.trim();
    if (!t || submittingComment) return;
    setCommentText("");
    await onAddComment(post.id, t);
  };

  return (
    <GlassCard padding="none" className="overflow-hidden group">
      {/* ── Header ── */}
      <div className="flex items-start gap-3 px-5 pt-5 pb-3">
        <Avatar
          name={postInitials(post)}
          size="sm"
          className="shrink-0 mt-0.5"
          classNames={{ base: "bg-gradient-to-br from-indigo-500 to-purple-600 text-white", name: "font-bold text-xs" }}
        />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-white leading-tight">{postName(post)}</p>
          <p className="text-xs text-white/40 mt-0.5">{relativeTime(post.created_at)}</p>
        </div>
        {post.group && (
          <Chip
            size="sm"
            variant="flat"
            className="bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-xs shrink-0"
          >
            {post.group.name}
          </Chip>
        )}
      </div>

      {/* ── Body ── */}
      <div className="px-5 pb-4">
        <p className="text-sm text-white/75 whitespace-pre-wrap break-words leading-relaxed">
          {post.content}
        </p>
        {post.image_url && (
          <img
            src={post.image_url}
            alt="Post image"
            className="mt-3 rounded-xl w-full object-cover max-h-80 border border-white/10"
          />
        )}
      </div>

      {/* ── Action bar ── */}
      <div className="flex items-center gap-1 px-3 py-2 border-t border-white/5">
        {/* Like */}
        <button
          onClick={() => onLike(post.id)}
          className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all hover:bg-white/5 ${
            post.is_liked ? "text-rose-400" : "text-white/40 hover:text-rose-400"
          }`}
        >
          <Heart className="w-4 h-4" fill={post.is_liked ? "currentColor" : "none"} strokeWidth={post.is_liked ? 0 : 1.5} />
          {post.like_count > 0 && <span>{post.like_count}</span>}
        </button>

        {/* Comment */}
        <button
          onClick={() => onToggleComments(post.id)}
          className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all hover:bg-white/5 ${
            commentExpanded ? "text-indigo-400" : "text-white/40 hover:text-indigo-400"
          }`}
        >
          <MessageCircle className="w-4 h-4" strokeWidth={1.5} />
          {post.comment_count > 0 && <span>{post.comment_count}</span>}
        </button>

        {/* Bookmark */}
        <button
          onClick={() => onBookmark(post.id)}
          className={`flex items-center px-2.5 py-1.5 rounded-lg transition-all hover:bg-white/5 ${
            isBookmarked ? "text-amber-400" : "text-white/40 hover:text-amber-400"
          }`}
        >
          <Bookmark className="w-4 h-4" fill={isBookmarked ? "currentColor" : "none"} strokeWidth={isBookmarked ? 0 : 1.5} />
        </button>

        {/* Share */}
        <button
          onClick={() => onCopy(post.id)}
          className={`flex items-center px-2.5 py-1.5 rounded-lg transition-all hover:bg-white/5 ml-auto ${
            copiedId === post.id ? "text-emerald-400" : "text-white/30 hover:text-white/60"
          }`}
        >
          {copiedId === post.id
            ? <Check className="w-4 h-4" strokeWidth={2.5} />
            : <Share2 className="w-4 h-4" strokeWidth={1.5} />}
        </button>
      </div>

      {/* ── Comments panel ── */}
      <AnimatePresence>
        {commentExpanded && (
          <motion.div
            key="cmt"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="border-t border-white/5 px-5 pt-4 pb-5">
              {loadingComments ? (
                <div className="flex justify-center py-6">
                  <Spinner size="sm" />
                </div>
              ) : (
                <div className="mb-4">
                  {comments.length === 0 ? (
                    <p className="text-xs text-white/30 italic text-center py-3">No comments yet — be the first!</p>
                  ) : (
                    comments.map((c) => <CommentItem key={c.id} c={c} />)
                  )}
                </div>
              )}
              <div className="flex gap-2 items-end">
                <Textarea
                  size="sm"
                  minRows={1}
                  maxRows={4}
                  placeholder="Write a comment…"
                  value={commentText}
                  onValueChange={setCommentText}
                  onKeyDown={(e: React.KeyboardEvent) => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void submit(); }
                  }}
                  classNames={{
                    inputWrapper: "bg-white/5 border border-white/10 shadow-none data-[hover=true]:bg-white/8",
                    input: "text-sm text-white placeholder:text-white/30",
                  }}
                  className="flex-1"
                />
                <Button
                  isIconOnly
                  size="sm"
                  color="primary"
                  variant="flat"
                  isLoading={submittingComment}
                  isDisabled={!commentText.trim()}
                  onPress={() => void submit()}
                  className="mb-0.5 shrink-0 bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30"
                >
                  {!submittingComment && <Send className="w-3.5 h-3.5" />}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </GlassCard>
  );
}

// ── Main page ─────────────────────────────────────────────────────────
const MAX_LEN = 500;

export default function FeedPage() {
  return (
    <ProtectedRoute>
      <FeedContent />
    </ProtectedRoute>
  );
}

function FeedContent() {
  const { user, logout } = useAuth();

  const [tab, setTab]                   = useState<TabKey>("feed");
  const [feedPosts, setFeedPosts]       = useState<Post[]>([]);
  const [trending, setTrending]         = useState<Post[]>([]);
  const [bookmarks, setBookmarks]       = useState<Post[]>([]);
  const [loading, setLoading]           = useState(false);

  const [draft, setDraft]               = useState("");
  const [posting, setPosting]           = useState(false);
  const [postError, setPostError]       = useState<string | null>(null);

  const [expanded, setExpanded]         = useState<Set<number>>(new Set());
  const [commentMap, setCommentMap]     = useState<Record<number, Comment[]>>({});
  const [loadingCmt, setLoadingCmt]     = useState<Set<number>>(new Set());
  const [submittingCmt, setSubmitting]  = useState<Set<number>>(new Set());

  const [savedIds, setSavedIds]         = useState<Set<number>>(new Set());
  const [copiedId, setCopiedId]         = useState<number | null>(null);

  // ── Loaders ──────────────────────────────────────────────────────
  const loadFeed = useCallback(async () => {
    setLoading(true);
    try { const r = await api.getFeed({ page: 1, limit: 30 }); setFeedPosts(r.data ?? []); }
    catch { /* silent */ } finally { setLoading(false); }
  }, []);

  const loadTrending = useCallback(async () => {
    setLoading(true);
    try { setTrending(await api.getTrendingPosts(24, 20)); }
    catch { /* silent */ } finally { setLoading(false); }
  }, []);

  const loadBookmarks = useCallback(async () => {
    setLoading(true);
    try {
      const posts = await api.getBookmarkedPosts(1, 30);
      setBookmarks(posts);
      setSavedIds(new Set(posts.map((p: Post) => p.id)));
    } catch { /* silent */ } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (tab === "feed")      void loadFeed();
    else if (tab === "trending")  void loadTrending();
    else                     void loadBookmarks();
  }, [tab, loadFeed, loadTrending, loadBookmarks]);

  // Pre-load saved IDs for bookmark icons while on Feed tab
  useEffect(() => {
    api.getBookmarkedPosts(1, 100)
      .then((ps: Post[]) => setSavedIds(new Set(ps.map((p: Post) => p.id))))
      .catch(() => {});
  }, []);

  // ── Handlers ─────────────────────────────────────────────────────
  const handleLike = useCallback((id: number) => {
    const toggle = (list: Post[]) =>
      list.map((p) => p.id !== id ? p : {
        ...p, is_liked: !p.is_liked,
        like_count: p.is_liked ? p.like_count - 1 : p.like_count + 1,
      });
    const wasLiked = feedPosts.find((p) => p.id === id)?.is_liked ??
                     trending.find((p) => p.id === id)?.is_liked ?? false;
    setFeedPosts(toggle); setTrending(toggle);
    api[wasLiked ? "unlikePost" : "likePost"](id).catch(() => {
      const revert = (list: Post[]) =>
        list.map((p) => p.id !== id ? p : {
          ...p, is_liked: wasLiked,
          like_count: wasLiked ? p.like_count + 1 : p.like_count - 1,
        });
      setFeedPosts(revert); setTrending(revert);
    });
  }, [feedPosts, trending]);

  const handleBookmark = useCallback((id: number) => {
    const had = savedIds.has(id);
    setSavedIds((s) => { const n = new Set(s); had ? n.delete(id) : n.add(id); return n; });
    api[had ? "unbookmarkPost" : "bookmarkPost"](id).catch(() =>
      setSavedIds((s) => { const n = new Set(s); had ? n.add(id) : n.delete(id); return n; })
    );
  }, [savedIds]);

  const handleToggleComments = useCallback(async (id: number) => {
    const wasOpen = expanded.has(id);
    setExpanded((s) => { const n = new Set(s); wasOpen ? n.delete(id) : n.add(id); return n; });
    if (!wasOpen && !commentMap[id]) {
      setLoadingCmt((s) => new Set(s).add(id));
      try {
        const cs = await api.getPostComments(id);
        setCommentMap((m) => ({ ...m, [id]: cs }));
      } catch { /* silent */ } finally {
        setLoadingCmt((s) => { const n = new Set(s); n.delete(id); return n; });
      }
    }
  }, [expanded, commentMap]);

  const handleAddComment = useCallback(async (postId: number, text: string) => {
    setSubmitting((s) => new Set(s).add(postId));
    try {
      const c = await api.addComment(postId, text);
      setCommentMap((m) => ({ ...m, [postId]: [...(m[postId] ?? []), c] }));
      const bump = (list: Post[]) =>
        list.map((p) => p.id === postId ? { ...p, comment_count: p.comment_count + 1 } : p);
      setFeedPosts(bump); setTrending(bump);
    } catch { /* silent */ } finally {
      setSubmitting((s) => { const n = new Set(s); n.delete(postId); return n; });
    }
  }, []);

  const handleCopy = useCallback((id: number) => {
    void navigator.clipboard.writeText(`${window.location.origin}/feed/${id}`);
    setCopiedId(id);
    setTimeout(() => setCopiedId((c) => (c === id ? null : c)), 2000);
  }, []);

  const handlePost = async () => {
    const text = draft.trim();
    if (!text || posting || text.length > MAX_LEN) return;
    setPosting(true);
    setPostError(null);
    try {
      const post = await api.createPost({ content: text });
      if (post?.id) { setFeedPosts((prev) => [post, ...prev]); setDraft(""); }
    } catch (e) {
      setPostError(e instanceof Error ? e.message : "Failed to create post. Please try again.");
    } finally { setPosting(false); }
  };

  const userInitials = `${user?.first_name?.[0] ?? ""}${user?.last_name?.[0] ?? ""}`.toUpperCase() || "?";
  const posts = tab === "feed" ? feedPosts : tab === "trending" ? trending : bookmarks;

  const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: "feed",      label: "Feed",     icon: <Rss className="w-3.5 h-3.5" /> },
    { key: "trending",  label: "Trending", icon: <Flame className="w-3.5 h-3.5" /> },
    { key: "bookmarks", label: "Saved",    icon: <Bookmark className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="min-h-screen">
      <Navbar user={user} onLogout={logout} />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* ── Page header ── */}
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold text-white">Community Feed</h1>
          <p className="text-white/50 mt-1 text-sm">
            Share updates, ideas, and connect with members
          </p>
        </motion.div>

        {/* ── Tab bar ── */}
        <div className="flex gap-1 bg-white/5 border border-white/10 p-1 rounded-xl w-fit backdrop-blur-sm">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={[
                "flex items-center gap-1.5 text-sm font-medium px-4 py-1.5 rounded-lg transition-all duration-150",
                tab === t.key
                  ? "bg-white/10 text-white shadow-sm border border-white/10"
                  : "text-white/40 hover:text-white/70 hover:bg-white/5",
              ].join(" ")}
            >
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {/* ── Create post (feed tab only) ── */}
        <AnimatePresence>
          {tab === "feed" && (
            <motion.div
              key="create"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              <GlassCard padding="none">
                <div className="p-5 space-y-4">
                  <div className="flex gap-3">
                    <Avatar
                      name={userInitials}
                      size="sm"
                      className="shrink-0 mt-1"
                      classNames={{ base: "bg-gradient-to-br from-indigo-500 to-purple-600 text-white", name: "font-bold text-xs" }}
                    />
                    <Textarea
                      placeholder="What's on your mind? Share with the community…"
                      minRows={2}
                      maxRows={10}
                      value={draft}
                      onValueChange={setDraft}
                      onKeyDown={(e: React.KeyboardEvent) => {
                        if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                          e.preventDefault(); void handlePost();
                        }
                      }}
                      classNames={{
                        inputWrapper: "bg-white/5 border border-white/10 shadow-none data-[hover=true]:bg-white/8",
                        input: "text-sm text-white placeholder:text-white/30",
                      }}
                      className="flex-1"
                    />
                  </div>
                  {postError && (
                    <div className="ml-11 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
                      {postError}
                    </div>
                  )}
                  <div className="flex items-center justify-between pl-11">
                    <span className={`text-xs font-mono transition-colors ${
                      draft.length > MAX_LEN ? "text-red-400" :
                      draft.length > MAX_LEN - 50 ? "text-amber-400" : "text-white/20"
                    }`}>
                      {draft.length}/{MAX_LEN}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-white/25 hidden sm:block">⌘↵ to post</span>
                      <Button
                        color="primary"
                        size="sm"
                        isLoading={posting}
                        isDisabled={!draft.trim() || draft.length > MAX_LEN}
                        onPress={() => void handlePost()}
                        className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium"
                        startContent={!posting ? <Plus className="w-3.5 h-3.5" /> : undefined}
                      >
                        Post
                      </Button>
                    </div>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Post list ── */}
        {loading ? (
          <div className="space-y-4">
            <SkeletonCard /><SkeletonCard /><SkeletonCard />
          </div>
        ) : posts.length === 0 ? (
          <EmptyState tab={tab} />
        ) : (
          <motion.div
            key={tab}
            className="space-y-4"
            variants={containerVariantsFast}
            initial="hidden"
            animate="visible"
          >
            {posts.map((post) => (
              <motion.div key={post.id} variants={itemVariants}>
                <PostCard
                  post={post}
                  onLike={handleLike}
                  onBookmark={handleBookmark}
                  isBookmarked={savedIds.has(post.id)}
                  commentExpanded={expanded.has(post.id)}
                  onToggleComments={handleToggleComments}
                  comments={commentMap[post.id] ?? []}
                  loadingComments={loadingCmt.has(post.id)}
                  onAddComment={handleAddComment}
                  submittingComment={submittingCmt.has(post.id)}
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
