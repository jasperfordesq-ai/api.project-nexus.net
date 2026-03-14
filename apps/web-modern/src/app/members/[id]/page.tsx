// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  Button,
  Avatar,
  Chip,
  Skeleton,
  Tabs,
  Tab,
  Textarea,
  Progress,
} from "@heroui/react";
import {
  ArrowLeft,
  MessageSquare,
  UserPlus,
  Star,
  Calendar,
  Clock,
  Award,
  Zap,
  Wallet,
  Trash2,
  User,
} from "lucide-react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { ProtectedRoute } from "@/components/protected-route";
import { MotionGlassCard } from "@/components/glass-card";
import { useAuth } from "@/contexts/auth-context";
import {
  api,
  type User as UserType,
  type Review,
  type GamificationProfile,
  type Listing,
  type PaginatedResponse,
} from "@/lib/api";
import { logger } from "@/lib/logger";

function StarRating({
  rating,
  onRatingChange,
  interactive = false,
  size = "md",
}: {
  rating: number;
  onRatingChange?: (rating: number) => void;
  interactive?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const [hoverRating, setHoverRating] = useState(0);
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  };

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!interactive}
          onClick={() => onRatingChange?.(star)}
          onMouseEnter={() => interactive && setHoverRating(star)}
          onMouseLeave={() => interactive && setHoverRating(0)}
          className={interactive ? "cursor-pointer" : "cursor-default"}
        >
          <Star
            className={`${sizeClasses[size]} ${
              star <= (hoverRating || rating)
                ? "fill-yellow-400 text-yellow-400"
                : "text-white/30"
            } transition-colors`}
          />
        </button>
      ))}
    </div>
  );
}

export default function MemberDetailPage() {
  return (
    <ProtectedRoute>
      <MemberDetailContent />
    </ProtectedRoute>
  );
}

function MemberDetailContent() {
  const params = useParams();
  const memberId = Number(params.id);
  const { user, logout } = useAuth();

  const [member, setMember] = useState<UserType | null>(null);
  const [gamification, setGamification] = useState<GamificationProfile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewSummary, setReviewSummary] = useState<{
    average_rating: number;
    total_reviews: number;
  } | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("about");
  const [sendingRequest, setSendingRequest] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "sent" | "error">("idle");

  // Review form state
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const fetchMember = useCallback(async () => {
    setIsLoading(true);
    try {
      const [memberData, reviewsData, listingsData] = await Promise.all([
        api.getUser(memberId),
        api.getUserReviews(memberId).catch((err) => {
          logger.error("Failed to fetch reviews:", err);
          return null;
        }),
        api.getListings({ user_id: memberId, status: "active", limit: 6 }).catch((err) => {
          logger.error("Failed to fetch listings:", err);
          return null;
        }),
      ]);
      setMember(memberData);
      setReviews(reviewsData?.data || []);
      setReviewSummary(reviewsData?.summary || null);
      setListings(listingsData?.data || []);

      // Try to fetch gamification profile
      try {
        const gamificationData = await api.getUserGamificationProfile(memberId);
        setGamification(gamificationData?.profile || null);
      } catch {
        // Gamification profile may not exist for all users
      }
    } catch (error) {
      logger.error("Failed to fetch member:", error);
      setReviews([]);
      setListings([]);
    } finally {
      setIsLoading(false);
    }
  }, [memberId]);

  useEffect(() => {
    fetchMember();
  }, [fetchMember]);
  const handleSendConnectionRequest = async () => {
    if (connectionStatus === "sent") return;
    setSendingRequest(true);
    try {
      await api.sendConnectionRequest(memberId);
      setConnectionStatus("sent");
    } catch (error) {
      logger.error("Failed to send connection request:", error);
      setConnectionStatus("error");
      setTimeout(() => setConnectionStatus("idle"), 3000);
    } finally {
      setSendingRequest(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!newRating) return;
    setIsSubmittingReview(true);
    setReviewError(null);
    try {
      const review = await api.createUserReview(memberId, {
        rating: newRating,
        comment: newComment || undefined,
      });
      setReviews((prev) => [review, ...prev]);
      setReviewSummary((prev) =>
        prev
          ? {
              average_rating:
                (prev.average_rating * prev.total_reviews + newRating) /
                (prev.total_reviews + 1),
              total_reviews: prev.total_reviews + 1,
            }
          : { average_rating: newRating, total_reviews: 1 }
      );
      setNewRating(5);
      setNewComment("");
    } catch (error) {
      logger.error("Failed to submit review:", error);
      setReviewError(error instanceof Error ? error.message : "Failed to submit review.");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleDeleteReview = async (reviewId: number) => {
    try {
      await api.deleteReview(reviewId);
      const deletedReview = reviews.find((r) => r.id === reviewId);
      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
      if (reviewSummary && deletedReview) {
        if (reviewSummary.total_reviews > 1) {
          const newTotal = reviewSummary.total_reviews - 1;
          const newAvg =
            (reviewSummary.average_rating * reviewSummary.total_reviews -
              deletedReview.rating) /
            newTotal;
          setReviewSummary({ average_rating: newAvg, total_reviews: newTotal });
        } else {
          setReviewSummary({ average_rating: 0, total_reviews: 0 });
        }
      }
    } catch (error) {
      logger.error("Failed to delete review:", error);
    }
  };

  const isOwnProfile = member?.id === user?.id;
  const hasReviewed = reviews.some((r) => r.reviewer.id === user?.id);

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
      <Navbar user={user} onLogout={logout} />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <Link
          href="/members"
          className="inline-flex items-center gap-2 text-white/60 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Members
        </Link>

        {isLoading ? (
          <div className="space-y-6">
            <div className="p-8 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-6">
                <Skeleton className="w-24 h-24 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="w-48 h-8 rounded mb-2" />
                  <Skeleton className="w-32 h-4 rounded mb-4" />
                  <Skeleton className="w-24 h-6 rounded" />
                </div>
              </div>
            </div>
          </div>
        ) : member ? (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-6"
          >
            {/* Profile Header */}
            <MotionGlassCard variants={itemVariants} glow="none" padding="lg">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                <Avatar
                  name={`${member.first_name} ${member.last_name}`}
                  className="w-24 h-24 text-3xl ring-4 ring-white/10"
                />
                <div className="flex-1 text-center sm:text-left">
                  <h1 className="text-3xl font-bold text-white mb-1">
                    {member.first_name} {member.last_name}
                  </h1>
                  {isOwnProfile && (
                    <p className="text-white/50 mb-4">{member.email}</p>
                  )}

                  {/* Stats Row */}
                  <div className="flex flex-wrap gap-4 justify-center sm:justify-start mb-4">
                    {reviewSummary && reviewSummary.total_reviews > 0 && (
                      <div className="flex items-center gap-2">
                        <StarRating rating={Math.round(reviewSummary.average_rating)} size="sm" />
                        <span className="text-white font-semibold">
                          {reviewSummary.average_rating.toFixed(1)}
                        </span>
                        <span className="text-white/50 text-sm">
                          ({reviewSummary.total_reviews} reviews)
                        </span>
                      </div>
                    )}
                    {gamification && (
                      <Chip className="bg-indigo-500/20 text-indigo-400">
                        <Zap className="w-3 h-3 mr-1" />
                        Level {gamification.level}
                      </Chip>
                    )}
                  </div>

                  <div className="text-sm text-white/40 flex items-center gap-1 justify-center sm:justify-start">
                    <Calendar className="w-4 h-4" />
                    Member since {new Date(member.created_at).toLocaleDateString()}
                  </div>
                </div>

                {/* Actions */}
                {!isOwnProfile && (
                  <div className="flex gap-2">
                    <Button
                      className={connectionStatus === "sent" ? "bg-emerald-500/20 text-emerald-400" : connectionStatus === "error" ? "bg-red-500/20 text-red-400" : "bg-white/10 text-white hover:bg-white/20"}
                      startContent={<UserPlus className="w-4 h-4" />}
                      onPress={handleSendConnectionRequest}
                      isLoading={sendingRequest}
                      isDisabled={connectionStatus === "sent"}
                    >
                      {connectionStatus === "sent" ? "Request Sent" : connectionStatus === "error" ? "Failed - Retry" : "Connect"}
                    </Button>
                    <Link href={`/messages?user=${member.id}`}>
                      <Button
                        className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white"
                        startContent={<MessageSquare className="w-4 h-4" />}
                      >
                        Message
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </MotionGlassCard>

            {/* Tabs */}
            <div className="flex justify-center">
              <Tabs
                selectedKey={activeTab}
                onSelectionChange={(key) => setActiveTab(key as string)}
                classNames={{
                  tabList: "bg-white/5 border border-white/10",
                  cursor: "bg-indigo-500",
                  tab: "text-white/50 data-[selected=true]:text-white",
                }}
              >
                <Tab key="about" title="About" />
                <Tab key="listings" title="Listings" />
                <Tab key="reviews" title="Reviews" />
              </Tabs>
            </div>

            {/* Tab Content */}
            {activeTab === "about" && (
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
              >
                {/* Gamification Stats */}
                {gamification && (
                  <MotionGlassCard variants={itemVariants} glow="none" padding="lg">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                      <Award className="w-5 h-5 text-yellow-400" />
                      Achievements
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-white/60">Level {gamification.level}</span>
                          <span className="text-white/60">
                            {gamification.total_xp} XP
                          </span>
                        </div>
                        <Progress
                          value={
                            gamification.xp_required_for_next_level > gamification.xp_required_for_current_level
                              ? ((gamification.total_xp - gamification.xp_required_for_current_level) /
                                  (gamification.xp_required_for_next_level -
                                    gamification.xp_required_for_current_level)) *
                                100
                              : 100
                          }
                          className="h-2"
                          classNames={{
                            indicator: "bg-gradient-to-r from-indigo-500 to-purple-600",
                            track: "bg-white/10",
                          }}
                        />
                        <p className="text-xs text-white/40 mt-1">
                          {gamification.xp_to_next_level} XP to Level{" "}
                          {gamification.level + 1}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-white/70">
                        <Award className="w-4 h-4 text-amber-400" />
                        <span>{gamification.badges_earned} badges earned</span>
                      </div>
                    </div>
                  </MotionGlassCard>
                )}

                {/* Quick Stats */}
                <MotionGlassCard variants={itemVariants} glow="none" padding="lg">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                    <Clock className="w-5 h-5 text-indigo-400" />
                    Activity
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-white/60">Active Listings</span>
                      <span className="text-white font-semibold">{listings.length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-white/60">Reviews Received</span>
                      <span className="text-white font-semibold">
                        {reviewSummary?.total_reviews || 0}
                      </span>
                    </div>
                  </div>
                </MotionGlassCard>
              </motion.div>
            )}

            {activeTab === "listings" && (
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="space-y-4"
              >
                {listings.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {listings.map((listing) => (
                      <Link key={listing.id} href={`/listings/${listing.id}`}>
                        <MotionGlassCard
                          variants={itemVariants}
                          glow="none"
                          padding="md"
                          hover
                        >
                          <div className="flex items-start justify-between mb-3">
                            <Chip
                              size="sm"
                              variant="flat"
                              className={
                                listing.type === "offer"
                                  ? "bg-emerald-500/20 text-emerald-400"
                                  : "bg-amber-500/20 text-amber-400"
                              }
                            >
                              {listing.type}
                            </Chip>
                            <div className="flex items-center gap-1 text-white/70">
                              <Wallet className="w-4 h-4" />
                              <span className="text-sm font-medium">
                                {listing.time_credits}h
                              </span>
                            </div>
                          </div>
                          <h4 className="font-semibold text-white mb-1 line-clamp-1">
                            {listing.title}
                          </h4>
                          <p className="text-sm text-white/50 line-clamp-2">
                            {listing.description}
                          </p>
                        </MotionGlassCard>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3">
                      <Wallet className="w-6 h-6 text-white/20" />
                    </div>
                    <p className="text-white/50">No active listings</p>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === "reviews" && (
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="space-y-4"
              >
                {/* Review Form */}
                {!isOwnProfile && !hasReviewed && (
                  <MotionGlassCard variants={itemVariants} glow="none" padding="lg">
                    <h3 className="text-white font-medium mb-4">Leave a Review</h3>
                    {reviewError && (
                      <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
                        {reviewError}
                      </div>
                    )}
                    <div className="mb-4">
                      <label className="text-sm text-white/60 mb-2 block">
                        Rating
                      </label>
                      <StarRating
                        rating={newRating}
                        onRatingChange={setNewRating}
                        interactive
                        size="lg"
                      />
                    </div>
                    <div className="mb-4">
                      <Textarea
                        placeholder="Share your experience (optional)"
                        value={newComment}
                        onValueChange={setNewComment}
                        minRows={3}
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
                    </div>
                    <Button
                      className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white"
                      onPress={handleSubmitReview}
                      isLoading={isSubmittingReview}
                    >
                      Submit Review
                    </Button>
                  </MotionGlassCard>
                )}

                {/* Reviews List */}
                {reviews.length > 0 ? (
                  reviews.map((review) => (
                    <MotionGlassCard
                      key={review.id}
                      variants={itemVariants}
                      glow="none"
                      padding="md"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <Link href={`/members/${review.reviewer.id}`}>
                            <Avatar
                              name={`${review.reviewer.first_name} ${review.reviewer.last_name}`}
                              size="sm"
                              className="ring-2 ring-white/10"
                            />
                          </Link>
                          <div>
                            <Link href={`/members/${review.reviewer.id}`}>
                              <p className="font-medium text-white hover:text-indigo-400 transition-colors">
                                {review.reviewer.first_name} {review.reviewer.last_name}
                              </p>
                            </Link>
                            <p className="text-xs text-white/40">
                              {new Date(review.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <StarRating rating={review.rating} size="sm" />
                          {review.reviewer.id === user?.id && (
                            <Button
                              isIconOnly
                              size="sm"
                              variant="light"
                              className="text-red-400 hover:bg-red-500/20"
                              onPress={() => handleDeleteReview(review.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                      {review.comment && (
                        <p className="text-white/70">{review.comment}</p>
                      )}
                    </MotionGlassCard>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3">
                      <Star className="w-6 h-6 text-white/20" />
                    </div>
                    <p className="text-white/50">No reviews yet</p>
                    {!isOwnProfile && !hasReviewed && (
                      <p className="text-white/40 text-sm mt-1">
                        Be the first to leave a review!
                      </p>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </motion.div>
        ) : (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
              <User className="w-8 h-8 text-white/20" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              Member not found
            </h3>
            <p className="text-white/50 mb-6">
              This profile may have been removed or doesn&apos;t exist.
            </p>
            <Link href="/members">
              <Button className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
                Browse Members
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
