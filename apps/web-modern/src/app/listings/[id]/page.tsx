// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Button,
  Avatar,
  Chip,
  Skeleton,
  Textarea,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from "@heroui/react";
import {
  Clock,
  ArrowLeft,
  MessageSquare,
  Wallet,
  Star,
  Edit,
  Trash2,
  Calendar,
  User,
  ArrowLeftRight,
} from "lucide-react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { ProtectedRoute } from "@/components/protected-route";
import { MotionGlassCard } from "@/components/glass-card";
import { useAuth } from "@/contexts/auth-context";
import { api, type Listing, type Review } from "@/lib/api";
import { logger } from "@/lib/logger";

export default function ListingDetailPage() {
  return (
    <ProtectedRoute>
      <ListingDetailContent />
    </ProtectedRoute>
  );
}

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

function ListingDetailContent() {
  const params = useParams();
  const router = useRouter();
  const listingId = Number(params.id);
  const { user, logout } = useAuth();

  const [listing, setListing] = useState<Listing | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewSummary, setReviewSummary] = useState<{
    average_rating: number;
    total_reviews: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  // Review form state
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();

  const fetchListing = useCallback(async () => {
    setIsLoading(true);
    try {
      const [listingData, reviewsData] = await Promise.all([
        api.getListing(listingId),
        api.getListingReviews(listingId),
      ]);
      setListing(listingData);
      setReviews(reviewsData?.data || []);
      setReviewSummary(reviewsData?.summary || null);
    } catch (error) {
      logger.error("Failed to fetch listing:", error);
      setReviews([]);
    } finally {
      setIsLoading(false);
    }
  }, [listingId]);

  useEffect(() => {
    fetchListing();
  }, [fetchListing]);
  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await api.deleteListing(listingId);
      router.push("/listings");
    } catch (error) {
      logger.error("Failed to delete listing:", error);
      setIsDeleting(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!newRating) return;
    setIsSubmittingReview(true);
    try {
      const review = await api.createListingReview(listingId, {
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
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleDeleteReview = async (reviewId: number) => {
    try {
      await api.deleteReview(reviewId);
      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
      if (reviewSummary) {
        const deletedReview = reviews.find((r) => r.id === reviewId);
        if (deletedReview && reviewSummary.total_reviews > 1) {
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

  const isOwner = listing?.user_id === user?.id;
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
          href="/listings"
          className="inline-flex items-center gap-2 text-white/60 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Listings
        </Link>

        {isLoading ? (
          <div className="space-y-6">
            <div className="p-8 rounded-xl bg-white/5 border border-white/10">
              <Skeleton className="w-24 h-6 rounded mb-4" />
              <Skeleton className="w-3/4 h-8 rounded mb-4" />
              <Skeleton className="w-full h-24 rounded mb-6" />
              <div className="flex gap-4">
                <Skeleton className="w-12 h-12 rounded-full" />
                <div>
                  <Skeleton className="w-32 h-5 rounded mb-2" />
                  <Skeleton className="w-24 h-4 rounded" />
                </div>
              </div>
            </div>
          </div>
        ) : listing ? (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-6"
          >
            {/* Main Content */}
            <MotionGlassCard variants={itemVariants} glow="none" padding="lg">
              <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <Chip
                    size="lg"
                    variant="flat"
                    className={
                      listing.type === "offer"
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-amber-500/20 text-amber-400"
                    }
                  >
                    {listing.type}
                  </Chip>
                  <Chip
                    size="sm"
                    variant="flat"
                    className={
                      listing.status === "active"
                        ? "bg-green-500/20 text-green-400"
                        : listing.status === "completed"
                        ? "bg-blue-500/20 text-blue-400"
                        : listing.status === "cancelled"
                        ? "bg-red-500/20 text-red-400"
                        : "bg-gray-500/20 text-gray-400"
                    }
                  >
                    {listing.status}
                  </Chip>
                </div>

                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-500/20">
                  <Clock className="w-5 h-5 text-indigo-400" />
                  <span className="text-xl font-bold text-indigo-400">
                    {listing.time_credits}
                  </span>
                  <span className="text-indigo-400/70">hours</span>
                </div>
              </div>

              <h1 className="text-3xl font-bold text-white mb-4">
                {listing.title}
              </h1>

              <p className="text-white/70 text-lg whitespace-pre-wrap mb-8">
                {listing.description}
              </p>

              {/* Author Info */}
              <div className="flex items-center justify-between pt-6 border-t border-white/10">
                <Link href={`/members/${listing.user?.id}`}>
                  <div className="flex items-center gap-4 hover:opacity-80 transition-opacity">
                    <Avatar
                      name={`${listing.user?.first_name} ${listing.user?.last_name}`}
                      size="lg"
                      className="ring-2 ring-white/10"
                    />
                    <div>
                      <p className="font-semibold text-white">
                        {listing.user?.first_name} {listing.user?.last_name}
                      </p>
                      <p className="text-sm text-white/50 flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        Posted {new Date(listing.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </Link>

                {/* Actions */}
                <div className="flex gap-2">
                  {isOwner ? (
                    <>
                      <Link href={`/listings/${listing.id}/edit`}>
                        <Button
                          className="bg-white/10 text-white hover:bg-white/20"
                          startContent={<Edit className="w-4 h-4" />}
                        >
                          Edit
                        </Button>
                      </Link>
                      <Button
                        className="bg-red-500/20 text-red-400 hover:bg-red-500/30"
                        startContent={<Trash2 className="w-4 h-4" />}
                        onPress={onDeleteOpen}
                      >
                        Delete
                      </Button>
                    </>
                  ) : (
                    <>
                      <Link href={`/messages?user=${listing.user?.id}`}>
                        <Button
                          className="bg-white/10 text-white hover:bg-white/20"
                          startContent={<MessageSquare className="w-4 h-4" />}
                        >
                          Message
                        </Button>
                      </Link>
                      <Link
                        href={`/wallet/send?to=${listing.user?.id}&amount=${listing.time_credits}&description=${encodeURIComponent(listing.title)}`}
                      >
                        <Button
                          className="bg-white/10 text-white hover:bg-white/20"
                          startContent={<Wallet className="w-4 h-4" />}
                        >
                          Pay {listing.time_credits}h
                        </Button>
                      </Link>
                      <Button
                        className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white"
                        startContent={<ArrowLeftRight className="w-4 h-4" />}
                        onPress={async () => {
                          try {
                            const exchange = await api.createExchange({
                              listing_id: listing.id,
                              hours: listing.time_credits,
                              description: listing.title,
                            });
                            router.push("/exchanges/" + exchange.id);
                          } catch (error) {
                            logger.error("Failed to request exchange:", error);
                          }
                        }}
                      >
                        Request Exchange
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </MotionGlassCard>

            {/* Reviews Section */}
            <MotionGlassCard variants={itemVariants} glow="none" padding="lg">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-400" />
                  Reviews
                  {reviewSummary && reviewSummary.total_reviews > 0 && (
                    <span className="text-white/50 font-normal text-base">
                      ({reviewSummary.total_reviews})
                    </span>
                  )}
                </h2>
                {reviewSummary && reviewSummary.total_reviews > 0 && (
                  <div className="flex items-center gap-2">
                    <StarRating rating={Math.round(reviewSummary.average_rating)} />
                    <span className="text-white font-semibold">
                      {reviewSummary.average_rating.toFixed(1)}
                    </span>
                  </div>
                )}
              </div>

              {/* Review Form - only show if not owner and not already reviewed */}
              {!isOwner && !hasReviewed && (
                <div className="mb-8 p-4 rounded-lg bg-white/5 border border-white/10">
                  <h3 className="text-white font-medium mb-4">Leave a Review</h3>
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
                </div>
              )}

              {/* Reviews List */}
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
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3">
                    <Star className="w-6 h-6 text-white/20" />
                  </div>
                  <p className="text-white/50">No reviews yet</p>
                  {!isOwner && !hasReviewed && (
                    <p className="text-white/40 text-sm mt-1">
                      Be the first to leave a review!
                    </p>
                  )}
                </div>
              )}
            </MotionGlassCard>
          </motion.div>
        ) : (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
              <User className="w-8 h-8 text-white/20" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              Listing not found
            </h3>
            <p className="text-white/50 mb-6">
              This listing may have been removed or doesn&apos;t exist.
            </p>
            <Link href="/listings">
              <Button className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
                Browse Listings
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteOpen}
        onClose={onDeleteClose}
        classNames={{
          base: "bg-black/90 border border-white/10",
          header: "border-b border-white/10",
          body: "py-6",
          footer: "border-t border-white/10",
        }}
      >
        <ModalContent>
          <ModalHeader className="text-white">Delete Listing</ModalHeader>
          <ModalBody>
            <p className="text-white/70">
              Are you sure you want to delete this listing? This action cannot be
              undone.
            </p>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="light"
              className="text-white/70"
              onPress={onDeleteClose}
            >
              Cancel
            </Button>
            <Button
              className="bg-red-500 text-white"
              onPress={handleDelete}
              isLoading={isDeleting}
            >
              Delete
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
