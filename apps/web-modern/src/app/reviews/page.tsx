// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Button,
  Avatar,
  Skeleton,
} from "@heroui/react";
import {
  Star,
  Clock,
} from "lucide-react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { ProtectedRoute } from "@/components/protected-route";
import { GlassCard, MotionGlassCard } from "@/components/glass-card";
import { useAuth } from "@/contexts/auth-context";
import { api, type Review, type Exchange } from "@/lib/api";
import { logger } from "@/lib/logger";
import { containerVariantsFast, itemVariants } from "@/lib/animations";

function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`w-4 h-4 ${
            star <= rating
              ? "fill-yellow-400 text-yellow-400"
              : "text-white/20"
          }`}
        />
      ))}
    </div>
  );
}

export default function ReviewsPage() {
  return (
    <ProtectedRoute>
      <ReviewsContent />
    </ProtectedRoute>
  );
}

function ReviewsContent() {
  const { user, logout } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [pendingExchanges, setPendingExchanges] = useState<Exchange[]>([]);
  const [reviewSummary, setReviewSummary] = useState<{
    average_rating: number;
    total_reviews: number;
  } | null>(null);
  const [trustScore, setTrustScore] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const fetchData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const [reviewsData, pendingData, trustData] = await Promise.allSettled([
        api.getUserReviews(user.id),
        api.getPendingReviews(),
        api.getUserTrustScore(user.id),
      ]);

      if (reviewsData.status === "fulfilled") {
        setReviews(reviewsData.value?.data || []);
        setReviewSummary(reviewsData.value?.summary || null);
      }
      if (pendingData.status === "fulfilled") {
        setPendingExchanges(pendingData.value || []);
      }
      if (trustData.status === "fulfilled") {
        setTrustScore(trustData.value?.trust_score ?? null);
      }
    } catch (error) {
      logger.error("Failed to fetch reviews data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);
  return (
    <div className="min-h-screen">
      <Navbar user={user} onLogout={logout} />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Reviews</h1>
          <p className="text-white/50 mt-1">
            Your reputation and feedback from the community
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="p-6 rounded-xl bg-white/5 border border-white/10">
                  <Skeleton className="w-full h-16 rounded" />
                </div>
              ))}
            </div>
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="p-6 rounded-xl bg-white/5 border border-white/10">
                  <Skeleton className="w-3/4 h-5 rounded mb-2" />
                  <Skeleton className="w-full h-12 rounded" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <motion.div
            variants={containerVariantsFast}
            initial="hidden"
            animate="visible"
            className="space-y-6"
          >
            {/* Stats Cards */}
            <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <GlassCard glow="none" padding="md">
                <div className="text-center">
                  <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Average Rating</p>
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-2xl font-bold text-white">
                      {reviewSummary?.average_rating?.toFixed(1) || "—"}
                    </span>
                    <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  </div>
                </div>
              </GlassCard>

              <GlassCard glow="none" padding="md">
                <div className="text-center">
                  <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Total Reviews</p>
                  <span className="text-2xl font-bold text-white">
                    {reviewSummary?.total_reviews || 0}
                  </span>
                </div>
              </GlassCard>

              <GlassCard glow="none" padding="md">
                <div className="text-center">
                  <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Trust Score</p>
                  <span className="text-2xl font-bold text-white">
                    {trustScore !== null ? trustScore.toFixed(1) : "—"}
                  </span>
                </div>
              </GlassCard>
            </motion.div>

            {/* Pending Reviews Alert */}
            {pendingExchanges.length > 0 && (
              <MotionGlassCard variants={itemVariants} glow="none" padding="md">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5 text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-medium">
                      {pendingExchanges.length} completed exchange{pendingExchanges.length !== 1 ? "s" : ""} awaiting your review
                    </p>
                    <p className="text-sm text-white/50">
                      Leave a review to help build trust in the community
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {pendingExchanges.slice(0, 2).map((ex) => (
                      <Link key={ex.id} href={`/exchanges/${ex.id}`}>
                        <Button size="sm" className="bg-amber-500/20 text-amber-400 hover:bg-amber-500/30">
                          Review
                        </Button>
                      </Link>
                    ))}
                  </div>
                </div>
              </MotionGlassCard>
            )}

            {/* Reviews List */}
            <MotionGlassCard variants={itemVariants} glow="none" padding="lg">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-400" />
                Reviews Received
              </h2>

              {reviews.length > 0 ? (
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <div
                      key={review.id}
                      className="p-4 rounded-lg bg-white/5 border border-white/10"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <Avatar
                            name={`${review.reviewer.first_name} ${review.reviewer.last_name}`}
                            size="sm"
                            className="ring-2 ring-white/10"
                          />
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
                        <StarDisplay rating={review.rating} />
                      </div>
                      {review.comment && (
                        <p className="text-white/70">{review.comment}</p>
                      )}
                      {review.target_listing && (
                        <Link
                          href={`/listings/${review.target_listing.id}`}
                          className="inline-flex items-center gap-1 mt-2 text-xs text-indigo-400 hover:text-indigo-300"
                        >
                          Re: {review.target_listing.title}
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3">
                    <Star className="w-6 h-6 text-white/20" />
                  </div>
                  <p className="text-white/50">No reviews yet</p>
                  <p className="text-white/40 text-sm mt-1">
                    Complete exchanges to start receiving reviews
                  </p>
                </div>
              )}
            </MotionGlassCard>
          </motion.div>
        )}
      </div>
    </div>
  );
}
