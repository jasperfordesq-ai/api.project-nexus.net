"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Button,
  Avatar,
  Skeleton,
  Textarea,
  Pagination,
  Chip,
} from "@heroui/react";
import {
  Heart,
  MessageCircle,
  Share2,
  MoreHorizontal,
  Send,
  Image as ImageIcon,
  Smile,
  Bookmark,
  TrendingUp,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { ProtectedRoute } from "@/components/protected-route";
import { GlassCard, MotionGlassCard } from "@/components/glass-card";
import { useAuth } from "@/contexts/auth-context";
import { api, type Post, type Comment, type PaginatedResponse } from "@/lib/api";
import { logger } from "@/lib/logger";

export default function FeedPage() {
  return (
    <ProtectedRoute>
      <FeedContent />
    </ProtectedRoute>
  );
}

function FeedContent() {
  const { user, logout } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newPostContent, setNewPostContent] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [unreadCount, setUnreadCount] = useState(0);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<number>>(new Set());
  const [activeTab, setActiveTab] = useState<"feed" | "trending" | "bookmarks">("feed");
  const [trendingPosts, setTrendingPosts] = useState<Post[]>([]);
  const [bookmarkedPosts, setBookmarkedPosts] = useState<Post[]>([]);
  const [expandedComments, setExpandedComments] = useState<Set<number>>(
    new Set()
  );
  const [postComments, setPostComments] = useState<Record<number, Comment[]>>(
    {}
  );
  const [commentInputs, setCommentInputs] = useState<Record<number, string>>(
    {}
  );

  const fetchPosts = useCallback(async () => {
    setIsLoading(true);
    try {
      const response: PaginatedResponse<Post> = await api.getFeed({
        page: currentPage,
        limit: 10,
      });
      setPosts(response?.data || []);
      setTotalPages(response?.pagination?.total_pages || 1);
    } catch (error) {
      logger.error("Failed to fetch feed:", error);
      setPosts([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage]);

  const fetchTrending = useCallback(async () => {
    try {
      const posts = await api.getTrendingPosts();
      setTrendingPosts(posts || []);
    } catch (error) {
      logger.error("Failed to fetch trending:", error);
    }
  }, []);

  const fetchBookmarks = useCallback(async () => {
    try {
      const posts = await api.getBookmarkedPosts();
      setBookmarkedPosts(posts || []);
      setBookmarkedIds(new Set((posts || []).map((p: Post) => p.id)));
    } catch (error) {
      logger.error("Failed to fetch bookmarks:", error);
    }
  }, []);

  const toggleBookmark = async (postId: number) => {
    try {
      await api.bookmarkPost(postId);
      setBookmarkedIds((prev) => {
        const next = new Set(prev);
        if (next.has(postId)) next.delete(postId);
        else next.add(postId);
        return next;
      });
    } catch (error) {
      logger.error("Failed to toggle bookmark:", error);
    }
  };


  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  useEffect(() => { fetchTrending(); fetchBookmarks(); }, [fetchTrending, fetchBookmarks]);

  useEffect(() => {
    api.getUnreadMessageCount().then((res) => setUnreadCount(res?.count || 0));
  }, []);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostContent.trim()) return;

    setIsPosting(true);
    try {
      const newPost = await api.createPost({ content: newPostContent.trim() });
      setPosts((prev) => [newPost, ...prev]);
      setNewPostContent("");
    } catch (error) {
      logger.error("Failed to create post:", error);
    } finally {
      setIsPosting(false);
    }
  };

  const handleLike = async (postId: number, isLiked: boolean) => {
    try {
      if (isLiked) {
        await api.unlikePost(postId);
      } else {
        await api.likePost(postId);
      }

      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId
            ? {
                ...post,
                is_liked: !isLiked,
                like_count: isLiked
                  ? post.like_count - 1
                  : post.like_count + 1,
              }
            : post
        )
      );
    } catch (error) {
      logger.error("Failed to like/unlike post:", error);
    }
  };

  const toggleComments = async (postId: number) => {
    if (expandedComments.has(postId)) {
      setExpandedComments((prev) => {
        const next = new Set(prev);
        next.delete(postId);
        return next;
      });
    } else {
      setExpandedComments((prev) => new Set(prev).add(postId));

      if (!postComments[postId]) {
        try {
          const comments = await api.getPostComments(postId);
          setPostComments((prev) => ({ ...prev, [postId]: comments }));
        } catch (error) {
          logger.error("Failed to fetch comments:", error);
        }
      }
    }
  };

  const handleAddComment = async (postId: number) => {
    const content = commentInputs[postId]?.trim();
    if (!content) return;

    try {
      const comment = await api.addComment(postId, content);
      setPostComments((prev) => ({
        ...prev,
        [postId]: [...(prev[postId] || []), comment],
      }));
      setCommentInputs((prev) => ({ ...prev, [postId]: "" }));
      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId
            ? { ...post, comment_count: post.comment_count + 1 }
            : post
        )
      );
    } catch (error) {
      logger.error("Failed to add comment:", error);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="min-h-screen">
      <Navbar user={user} unreadCount={unreadCount} onLogout={logout} />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Feed Tabs */}
        <div className="flex gap-2 mb-6">
          {(["feed", "trending", "bookmarks"] as const).map((tab) => (
            <Chip
              key={tab}
              variant={activeTab === tab ? "solid" : "flat"}
              color={activeTab === tab ? "primary" : "default"}
              className="cursor-pointer capitalize"
              onClick={() => setActiveTab(tab)}
              startContent={tab === "trending" ? <TrendingUp className="w-3 h-3" /> : tab === "bookmarks" ? <Bookmark className="w-3 h-3" /> : undefined}
            >
              {tab === "bookmarks" ? "Saved" : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Chip>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-white">Feed</h1>
          <p className="text-white/50 mt-1">
            See what&apos;s happening in your community
          </p>
        </motion.div>

        {/* Create Post */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <GlassCard glow="none" padding="md">
            <form onSubmit={handleCreatePost}>
              <div className="flex gap-4">
                <Avatar
                  name={`${user?.first_name} ${user?.last_name}`}
                  className="ring-2 ring-white/10 flex-shrink-0"
                />
                <div className="flex-1">
                  <Textarea
                    placeholder="What's on your mind?"
                    value={newPostContent}
                    onValueChange={setNewPostContent}
                    minRows={2}
                    maxRows={6}
                    classNames={{
                      input: "text-white placeholder:text-white/30",
                      inputWrapper: [
                        "bg-white/5",
                        "border border-white/10",
                        "hover:bg-white/10",
                        "group-data-[focus=true]:bg-white/10",
                      ],
                    }}
                  />
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex gap-2">
                      <Button
                        isIconOnly
                        variant="light"
                        size="sm"
                        className="text-white/50 hover:text-white"
                      >
                        <ImageIcon className="w-5 h-5" />
                      </Button>
                      <Button
                        isIconOnly
                        variant="light"
                        size="sm"
                        className="text-white/50 hover:text-white"
                      >
                        <Smile className="w-5 h-5" />
                      </Button>
                    </div>
                    <Button
                      type="submit"
                      isLoading={isPosting}
                      isDisabled={!newPostContent.trim()}
                      className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white"
                      size="sm"
                    >
                      Post
                    </Button>
                  </div>
                </div>
              </div>
            </form>
          </GlassCard>
        </motion.div>

        {/* Posts */}
        {isLoading ? (
          <div className="space-y-6">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="p-6 rounded-xl bg-white/5 border border-white/10"
              >
                <div className="flex gap-4 mb-4">
                  <Skeleton className="w-12 h-12 rounded-full" />
                  <div>
                    <Skeleton className="w-32 h-4 rounded mb-2" />
                    <Skeleton className="w-24 h-3 rounded" />
                  </div>
                </div>
                <Skeleton className="w-full h-20 rounded" />
              </div>
            ))}
          </div>
        ) : posts.length > 0 ? (
          <>
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-6"
            >
              {posts.map((post) => (
                <MotionGlassCard
                  key={post.id}
                  variants={itemVariants}
                  glow="none"
                  padding="md"
                >
                  {/* Post Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex gap-3">
                      <Avatar
                        name={`${post.author?.first_name} ${post.author?.last_name}`}
                        className="ring-2 ring-white/10"
                      />
                      <div>
                        <p className="font-medium text-white">
                          {post.author?.first_name} {post.author?.last_name}
                        </p>
                        <p className="text-xs text-white/40">
                          {new Date(post.created_at).toLocaleDateString()} at{" "}
                          {new Date(post.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                    <Button
                      isIconOnly
                      variant="light"
                      size="sm"
                      className="text-white/50"
                    >
                      <MoreHorizontal className="w-5 h-5" />
                    </Button>
                  </div>

                  {/* Post Content */}
                  <p className="text-white whitespace-pre-wrap mb-4">
                    {post.content}
                  </p>

                  {post.image_url && (
                    <img
                      src={post.image_url}
                      alt="Post image"
                      className="rounded-xl mb-4 max-h-96 w-full object-cover"
                    />
                  )}

                  {/* Post Actions */}
                  <div className="flex items-center gap-6 pt-4 border-t border-white/10">
                    <button
                      onClick={() => handleLike(post.id, post.is_liked)}
                      className={`flex items-center gap-2 transition-colors ${
                        post.is_liked
                          ? "text-red-400"
                          : "text-white/50 hover:text-red-400"
                      }`}
                    >
                      <Heart
                        className={`w-5 h-5 ${
                          post.is_liked ? "fill-current" : ""
                        }`}
                      />
                      <span className="text-sm">{post.like_count}</span>
                    </button>

                    <button
                      onClick={() => toggleComments(post.id)}
                      className="flex items-center gap-2 text-white/50 hover:text-indigo-400 transition-colors"
                    >
                      <MessageCircle className="w-5 h-5" />
                      <span className="text-sm">{post.comment_count}</span>
                    </button>

                    <button className="flex items-center gap-2 text-white/50 hover:text-white transition-colors">
                      <Share2 className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Comments Section */}
                  {expandedComments.has(post.id) && (
                    <div className="mt-4 pt-4 border-t border-white/10">
                      {/* Comment Input */}
                      <div className="flex gap-3 mb-4">
                        <Avatar
                          name={`${user?.first_name} ${user?.last_name}`}
                          size="sm"
                          className="ring-2 ring-white/10"
                        />
                        <div className="flex-1 flex gap-2">
                          <input
                            type="text"
                            placeholder="Write a comment..."
                            value={commentInputs[post.id] || ""}
                            onChange={(e) =>
                              setCommentInputs((prev) => ({
                                ...prev,
                                [post.id]: e.target.value,
                              }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleAddComment(post.id);
                              }
                            }}
                            className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-indigo-500/50"
                          />
                          <Button
                            isIconOnly
                            size="sm"
                            className="bg-indigo-500 text-white rounded-full"
                            isDisabled={!commentInputs[post.id]?.trim()}
                            onPress={() => handleAddComment(post.id)}
                          >
                            <Send className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Comments List */}
                      <div className="space-y-3">
                        {postComments[post.id]?.map((comment) => (
                          <div key={comment.id} className="flex gap-3">
                            <Avatar
                              name={`${comment.author?.first_name} ${comment.author?.last_name}`}
                              size="sm"
                              className="ring-2 ring-white/10"
                            />
                            <div className="flex-1 bg-white/5 rounded-xl px-4 py-2">
                              <p className="text-sm font-medium text-white">
                                {comment.author?.first_name}{" "}
                                {comment.author?.last_name}
                              </p>
                              <p className="text-sm text-white/80">
                                {comment.content}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </MotionGlassCard>
              ))}
            </motion.div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center mt-8">
                <Pagination
                  total={totalPages}
                  page={currentPage}
                  onChange={setCurrentPage}
                  classNames={{
                    wrapper: "gap-2",
                    item: "bg-white/5 text-white border-white/10 hover:bg-white/10",
                    cursor: "bg-indigo-500 text-white",
                  }}
                />
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="w-8 h-8 text-white/20" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              No posts yet
            </h3>
            <p className="text-white/50">
              Be the first to share something with the community!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
