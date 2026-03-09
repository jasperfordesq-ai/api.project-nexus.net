// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.
'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Card, CardBody, CardHeader, CardFooter,
  Avatar, Button, Textarea, Spinner, Divider, Tooltip, Skeleton,
} from '@heroui/react';
import { AnimatePresence, motion } from 'framer-motion';
import { api } from '@/lib/api';
import type { Post, Comment } from '@/lib/api';

// ── Inline icons ─────────────────────────────────────────────────────
const HeartIcon = ({ filled, className }: { filled?: boolean; className?: string }) =>
  filled ? (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
    </svg>
  ) : (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
    </svg>
  );

const ChatIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" />
  </svg>
);

const BookmarkIcon = ({ filled, className }: { filled?: boolean; className?: string }) =>
  filled ? (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path fillRule="evenodd" d="M6.32 2.577a49.255 49.255 0 0111.36 0c1.497.174 2.57 1.46 2.57 2.93V21a.75.75 0 01-1.085.67L12 18.089l-7.165 3.583A.75.75 0 013.75 21V5.507c0-1.47 1.073-2.756 2.57-2.93z" clipRule="evenodd" />
    </svg>
  ) : (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
    </svg>
  );

const ShareIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
  </svg>
);

const CheckIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
);

const FireIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1A3.75 3.75 0 0012 18z" />
  </svg>
);

// ── Helpers ────────────────────────────────────────────────────────────
function relativeTime(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString('en-IE', { day: 'numeric', month: 'short' });
}

function initials(post: Post): string {
  const f = post.author?.first_name?.[0] ?? '';
  const l = post.author?.last_name?.[0] ?? '';
  return (f + l).toUpperCase() || '?';
}

function displayName(post: Post): string {
  const f = post.author?.first_name ?? '';
  const l = post.author?.last_name ?? '';
  return `${f} ${l}`.trim() || 'Community Member';
}

function commentInitials(c: Comment): string {
  const f = c.author?.first_name?.[0] ?? '';
  const l = c.author?.last_name?.[0] ?? '';
  return (f + l).toUpperCase() || '?';
}

function commentName(c: Comment): string {
  const f = c.author?.first_name ?? '';
  const l = c.author?.last_name ?? '';
  return `${f} ${l}`.trim() || 'Community Member';
}

type TabKey = 'feed' | 'trending' | 'bookmarks';

// ── CommentItem ────────────────────────────────────────────────────
function CommentItem({ comment }: { comment: Comment }) {
  return (
    <div className="flex gap-3 py-2.5">
      <Avatar
        name={commentInitials(comment)}
        size="sm"
        className="shrink-0 mt-0.5"
        classNames={{ base: 'bg-secondary-100 text-secondary-700', name: 'font-semibold text-xs' }}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-sm font-semibold text-foreground">{commentName(comment)}</span>
          <span className="text-xs text-default-400">{relativeTime(comment.created_at)}</span>
        </div>
        <p className="text-sm text-default-700 mt-0.5 break-words leading-relaxed">{comment.content}</p>
      </div>
    </div>
  );
}

// ── EmptyState ──────────────────────────────────────────────────────
function EmptyState({ tab }: { tab: TabKey }) {
  const map = {
    feed: { emoji: '📭', title: 'Nothing here yet', sub: 'Be the first to share something with the community.' },
    trending: { emoji: '📈', title: 'No trending posts', sub: 'Check back soon — popular posts will appear here.' },
    bookmarks: { emoji: '🔖', title: 'No bookmarks yet', sub: 'Tap the bookmark icon on any post to save it for later.' },
  };
  const { emoji, title, sub } = map[tab];
  return (
    <div className="flex flex-col items-center py-20 text-center gap-3">
      <span className="text-5xl">{emoji}</span>
      <p className="text-xl font-bold text-foreground">{title}</p>
      <p className="text-sm text-default-400 max-w-xs leading-relaxed">{sub}</p>
    </div>
  );
}

// ── SkeletonCard ──────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <Card className="w-full border border-default-100 shadow-sm">
      <CardHeader className="gap-3 pb-0">
        <Skeleton className="rounded-full w-9 h-9 shrink-0" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-3 rounded-lg w-1/3" />
          <Skeleton className="h-2.5 rounded-lg w-1/5" />
        </div>
      </CardHeader>
      <CardBody className="space-y-2 pt-3">
        <Skeleton className="h-3 rounded-lg w-full" />
        <Skeleton className="h-3 rounded-lg w-4/5" />
        <Skeleton className="h-3 rounded-lg w-2/3" />
      </CardBody>
      <CardFooter>
        <Skeleton className="h-7 rounded-lg w-20" />
      </CardFooter>
    </Card>
  );
}

// ── PostCard ─────────────────────────────────────────────────────────
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
  const [commentText, setCommentText] = useState('');

  const submitComment = async () => {
    const text = commentText.trim();
    if (!text || submittingComment) return;
    setCommentText('');
    await onAddComment(post.id, text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<Element>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void submitComment();
    }
  };

  return (
    <Card className="w-full border border-default-100 shadow-sm hover:shadow-md transition-shadow duration-200">
      <CardHeader className="gap-3 pb-1 pt-4 px-4">
        <Avatar
          name={initials(post)}
          size="sm"
          className="shrink-0"
          classNames={{ base: 'bg-primary-100 text-primary-700', name: 'font-bold text-xs' }}
        />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-foreground leading-tight truncate">{displayName(post)}</p>
          <p className="text-xs text-default-400 mt-0.5">{relativeTime(post.created_at)}</p>
        </div>
        {post.group && (
          <span className="text-xs bg-secondary-100 text-secondary-700 font-medium px-2.5 py-1 rounded-full shrink-0">
            {post.group.name}
          </span>
        )}
      </CardHeader>

      <CardBody className="py-2 px-4">
        <p className="text-sm text-foreground whitespace-pre-wrap break-words leading-relaxed">{post.content}</p>
        {post.image_url && (
          <img
            src={post.image_url}
            alt="Post attachment"
            className="mt-3 rounded-xl w-full object-cover max-h-80 border border-default-100"
          />
        )}
      </CardBody>

      <Divider className="bg-default-100" />

      <CardFooter className="flex gap-0.5 py-1.5 px-2">
        <Tooltip content={post.is_liked ? 'Unlike' : 'Like'} placement="bottom">
          <Button
            size="sm"
            variant="light"
            className={`gap-1.5 text-xs font-medium min-w-0 ${post.is_liked ? 'text-danger' : 'text-default-400 hover:text-danger'}`}
            onPress={() => onLike(post.id)}
            startContent={<HeartIcon filled={post.is_liked} className="w-4 h-4 shrink-0" />}
          >
            {post.like_count > 0 ? post.like_count : ''}
          </Button>
        </Tooltip>

        <Tooltip content={commentExpanded ? 'Hide comments' : 'Comments'} placement="bottom">
          <Button
            size="sm"
            variant="light"
            className={`gap-1.5 text-xs font-medium min-w-0 ${commentExpanded ? 'text-primary' : 'text-default-400 hover:text-primary'}`}
            onPress={() => onToggleComments(post.id)}
            startContent={<ChatIcon className="w-4 h-4 shrink-0" />}
          >
            {post.comment_count > 0 ? post.comment_count : ''}
          </Button>
        </Tooltip>

        <Tooltip content={isBookmarked ? 'Remove bookmark' : 'Bookmark'} placement="bottom">
          <Button
            isIconOnly
            size="sm"
            variant="light"
            className={`min-w-0 ${isBookmarked ? 'text-warning' : 'text-default-400 hover:text-warning'}`}
            onPress={() => onBookmark(post.id)}
          >
            <BookmarkIcon filled={isBookmarked} className="w-4 h-4" />
          </Button>
        </Tooltip>

        <Tooltip content={copiedId === post.id ? 'Copied!' : 'Share link'} placement="bottom">
          <Button
            isIconOnly
            size="sm"
            variant="light"
            className={`min-w-0 ml-auto ${copiedId === post.id ? 'text-success' : 'text-default-400 hover:text-default-700'}`}
            onPress={() => onCopy(post.id)}
          >
            {copiedId === post.id
              ? <CheckIcon className="w-4 h-4" />
              : <ShareIcon className="w-4 h-4" />}
          </Button>
        </Tooltip>
      </CardFooter>

      <AnimatePresence>
        {commentExpanded && (
          <motion.div
            key="comments-panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <Divider className="bg-default-100" />
            <div className="px-4 pt-3 pb-4">
              {loadingComments ? (
                <div className="flex justify-center py-6">
                  <Spinner size="sm" color="primary" />
                </div>
              ) : (
                <>
                  {comments.length === 0 && (
                    <p className="text-xs text-default-400 text-center py-4">
                      No comments yet — be the first!
                    </p>
                  )}
                  <div className="divide-y divide-default-50">
                    {comments.map(c => <CommentItem key={c.id} comment={c} />)}
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
                  onKeyDown={handleKeyDown}
                  classNames={{
                    inputWrapper: 'bg-default-100 border-none shadow-none',
                    input: 'text-sm',
                  }}
                  className="flex-1"
                />
                <Button
                  size="sm"
                  color="primary"
                  isLoading={submittingComment}
                  isDisabled={!commentText.trim()}
                  onPress={() => void submitComment()}
                  className="mb-0.5 shrink-0"
                >
                  Post
                </Button>
              </div>
              <p className="text-xs text-default-300 mt-1.5">Enter to post · Shift+Enter for newline</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

// ── Main page ─────────────────────────────────────────────────────
const MAX_POST_LEN = 500;

export default function FeedPage() {
  const [tab, setTab] = useState<TabKey>('feed');
  const [feedPosts, setFeedPosts] = useState<Post[]>([]);
  const [trendingPosts, setTrendingPosts] = useState<Post[]>([]);
  const [bookmarkedPosts, setBookmarkedPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);

  const [postContent, setPostContent] = useState('');
  const [submittingPost, setSubmittingPost] = useState(false);

  const [expandedComments, setExpandedComments] = useState<Set<number>>(new Set());
  const [postComments, setPostComments] = useState<Record<number, Comment[]>>({});
  const [loadingCommentsSet, setLoadingCommentsSet] = useState<Set<number>>(new Set());
  const [submittingCommentSet, setSubmittingCommentSet] = useState<Set<number>>(new Set());

  const [bookmarkedIds, setBookmarkedIds] = useState<Set<number>>(new Set());
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const loadFeed = useCallback(async () => {
    setLoading(true);
    try { const res = await api.getFeed({ page: 1, limit: 30 }); setFeedPosts(res.data ?? []); }
    catch (e) { console.error('Feed error:', e); }
    finally { setLoading(false); }
  }, []);

  const loadTrending = useCallback(async () => {
    setLoading(true);
    try { const posts = await api.getTrendingPosts(24, 20); setTrendingPosts(posts); }
    catch (e) { console.error('Trending error:', e); }
    finally { setLoading(false); }
  }, []);

  const loadBookmarks = useCallback(async () => {
    setLoading(true);
    try {
      const posts = await api.getBookmarkedPosts(1, 30);
      setBookmarkedPosts(posts);
      setBookmarkedIds(new Set(posts.map((p: Post) => p.id)));
    }
    catch (e) { console.error('Bookmarks error:', e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (tab === 'feed') void loadFeed();
    else if (tab === 'trending') void loadTrending();
    else if (tab === 'bookmarks') void loadBookmarks();
  }, [tab, loadFeed, loadTrending, loadBookmarks]);

  const handleLike = async (postId: number) => {
    const wasLiked = [...feedPosts, ...trendingPosts, ...bookmarkedPosts].find(p => p.id === postId)?.is_liked ?? false;
    const patch = (posts: Post[]) => posts.map(p =>
      p.id === postId ? { ...p, is_liked: !p.is_liked, like_count: p.is_liked ? p.like_count - 1 : p.like_count + 1 } : p
    );
    setFeedPosts(patch); setTrendingPosts(patch); setBookmarkedPosts(patch);
    try { if (wasLiked) await api.unlikePost(postId); else await api.likePost(postId); }
    catch { setFeedPosts(patch); setTrendingPosts(patch); setBookmarkedPosts(patch); }
  };

  const handleBookmark = async (postId: number) => {
    const was = bookmarkedIds.has(postId);
    setBookmarkedIds(prev => { const s = new Set(prev); was ? s.delete(postId) : s.add(postId); return s; });
    try {
      if (was) await api.unbookmarkPost(postId); else await api.bookmarkPost(postId);
      if (tab === 'bookmarks') void loadBookmarks();
    } catch {
      setBookmarkedIds(prev => { const s = new Set(prev); was ? s.add(postId) : s.delete(postId); return s; });
    }
  };

  const handleToggleComments = async (postId: number) => {
    const was = expandedComments.has(postId);
    setExpandedComments(prev => { const s = new Set(prev); was ? s.delete(postId) : s.add(postId); return s; });
    if (!was && postComments[postId] === undefined) {
      setLoadingCommentsSet(prev => new Set(prev).add(postId));
      try {
        const comments = await api.getPostComments(postId);
        setPostComments(prev => ({ ...prev, [postId]: Array.isArray(comments) ? comments : [] }));
      } catch { setPostComments(prev => ({ ...prev, [postId]: [] })); }
      finally { setLoadingCommentsSet(prev => { const s = new Set(prev); s.delete(postId); return s; }); }
    }
  };

  const handleAddComment = async (postId: number, text: string) => {
    setSubmittingCommentSet(prev => new Set(prev).add(postId));
    try {
      const comment = await api.addComment(postId, text);
      if (comment) {
        setPostComments(prev => ({ ...prev, [postId]: [...(prev[postId] ?? []), comment] }));
        const inc = (posts: Post[]) => posts.map(p => p.id === postId ? { ...p, comment_count: p.comment_count + 1 } : p);
        setFeedPosts(inc); setTrendingPosts(inc); setBookmarkedPosts(inc);
      }
    } catch (e) { console.error('Comment error:', e); }
    finally { setSubmittingCommentSet(prev => { const s = new Set(prev); s.delete(postId); return s; }); }
  };

  const handleCopy = (postId: number) => {
    void navigator.clipboard.writeText(`${window.location.origin}/feed/${postId}`);
    setCopiedId(postId);
    setTimeout(() => setCopiedId(c => c === postId ? null : c), 2000);
  };

  const handleCreatePost = async () => {
    const text = postContent.trim();
    if (!text || submittingPost || text.length > MAX_POST_LEN) return;
    setSubmittingPost(true);
    try {
      const post = await api.createPost({ content: text });
      if (post) { setFeedPosts(prev => [post, ...prev]); setPostContent(''); }
    } catch (e) { console.error('Create post error:', e); }
    finally { setSubmittingPost(false); }
  };

  const currentPosts = tab === 'feed' ? feedPosts : tab === 'trending' ? trendingPosts : bookmarkedPosts;

  const tabs: { key: TabKey; label: string; icon?: React.ReactNode }[] = [
    { key: 'feed', label: 'Feed' },
    { key: 'trending', label: 'Trending', icon: <FireIcon className="w-3.5 h-3.5" /> },
    { key: 'bookmarks', label: 'Saved', icon: <BookmarkIcon className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Community Feed</h1>
        <p className="text-sm text-default-400 mt-0.5">Share updates, ideas, and connect with members</p>
      </div>

      <div className="flex gap-1 bg-default-100 p-1 rounded-xl w-fit">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={[
              'flex items-center gap-1.5 text-sm font-medium px-4 py-1.5 rounded-lg transition-all duration-150',
              tab === t.key ? 'bg-white dark:bg-default-50 shadow-sm text-foreground' : 'text-default-500 hover:text-foreground',
            ].join(' ')}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      <AnimatePresence>
        {tab === 'feed' && (
          <motion.div key="create-post" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>
            <Card className="w-full border border-default-100 shadow-sm">
              <CardBody className="gap-3 p-4">
                <Textarea
                  placeholder="What’s on your mind? Share with the community…"
                  minRows={2}
                  maxRows={10}
                  value={postContent}
                  onValueChange={setPostContent}
                  onKeyDown={(e: React.KeyboardEvent) => {
                    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); void handleCreatePost(); }
                  }}
                  classNames={{ inputWrapper: 'bg-default-50', input: 'text-sm' }}
                />
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-medium tabular-nums transition-colors ${
                    postContent.length > MAX_POST_LEN ? 'text-danger' : postContent.length > MAX_POST_LEN - 50 ? 'text-warning' : 'text-default-300'
                  }`}>{postContent.length}/{MAX_POST_LEN}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-default-300 hidden sm:block">⌘↵ to share</span>
                    <Button color="primary" size="sm" isLoading={submittingPost}
                      isDisabled={!postContent.trim() || postContent.length > MAX_POST_LEN}
                      onPress={() => void handleCreatePost()}>
                      Share
                    </Button>
                  </div>
                </div>
              </CardBody>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="space-y-4"><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>
      ) : currentPosts.length === 0 ? (
        <EmptyState tab={tab} />
      ) : (
        <motion.div key={tab} className="space-y-4" initial="hidden" animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}>
          {currentPosts.map(post => (
            <motion.div key={post.id} variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.2 } } }}>
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
  );
}
