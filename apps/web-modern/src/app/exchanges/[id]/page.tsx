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
  ArrowRight,
  CheckCircle,
  XCircle,
  Play,
  Flag,
  Star,
  Calendar,
  MessageSquare,
  ArrowLeftRight,
} from "lucide-react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { ProtectedRoute } from "@/components/protected-route";
import { GlassCard, MotionGlassCard } from "@/components/glass-card";
import { useAuth } from "@/contexts/auth-context";
import { api, type Exchange } from "@/lib/api";
import { logger } from "@/lib/logger";

const statusColors: Record<string, string> = {
  requested: "bg-amber-500/20 text-amber-400",
  accepted: "bg-blue-500/20 text-blue-400",
  declined: "bg-red-500/20 text-red-400",
  in_progress: "bg-purple-500/20 text-purple-400",
  completed: "bg-emerald-500/20 text-emerald-400",
  cancelled: "bg-gray-500/20 text-gray-400",
  disputed: "bg-orange-500/20 text-orange-400",
};

const statusLabels: Record<string, string> = {
  requested: "Requested",
  accepted: "Accepted",
  declined: "Declined",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
  disputed: "Disputed",
};

function StarRating({
  rating,
  onRatingChange,
  interactive = false,
}: {
  rating: number;
  onRatingChange?: (rating: number) => void;
  interactive?: boolean;
}) {
  const [hoverRating, setHoverRating] = useState(0);

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
            className={`w-6 h-6 ${
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

export default function ExchangeDetailPage() {
  return (
    <ProtectedRoute>
      <ExchangeDetailContent />
    </ProtectedRoute>
  );
}

function ExchangeDetailContent() {
  const params = useParams();
  const exchangeId = Number(params.id);
  const isValidId = !isNaN(exchangeId) && exchangeId > 0;
  const { user, logout } = useAuth();

  const [exchange, setExchange] = useState<Exchange | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Rating state
  const [ratingValue, setRatingValue] = useState(5);
  const [ratingComment, setRatingComment] = useState("");
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [hasRated, setHasRated] = useState(false);

  const {
    isOpen: isCancelOpen,
    onOpen: onCancelOpen,
    onClose: onCancelClose,
  } = useDisclosure();
  const {
    isOpen: isDisputeOpen,
    onOpen: onDisputeOpen,
    onClose: onDisputeClose,
  } = useDisclosure();

  const fetchExchange = useCallback(async () => {
    if (!isValidId) { setIsLoading(false); return; }
    setIsLoading(true);
    try {
      const data = await api.getExchange(exchangeId);
      setExchange(data);
      // Initialize hasRated from server response to avoid showing the rating
      // form if the user has already submitted a rating for this exchange.
      if (data.has_rated || data.my_rating != null) {
        setHasRated(true);
      }
    } catch (error) {
      logger.error("Failed to fetch exchange:", error);
    } finally {
      setIsLoading(false);
    }
  }, [exchangeId]);

  useEffect(() => {
    fetchExchange();
  }, [fetchExchange]);
  const handleAction = async (action: string) => {
    setActionLoading(action);
    try {
      let updated: Exchange | undefined;
      switch (action) {
        case "accept":
          updated = await api.acceptExchange(exchangeId);
          break;
        case "decline":
          updated = await api.declineExchange(exchangeId);
          break;
        case "start":
          updated = await api.startExchange(exchangeId);
          break;
        case "complete":
          updated = await api.completeExchange(exchangeId);
          break;
        case "cancel":
          updated = await api.cancelExchange(exchangeId);
          onCancelClose();
          break;
        case "dispute":
          updated = await api.disputeExchange(exchangeId);
          onDisputeClose();
          break;
      }
      if (updated) setExchange(updated);
    } catch (error) {
      logger.error("Exchange action failed:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRate = async () => {
    setIsSubmittingRating(true);
    try {
      await api.rateExchange(exchangeId, {
        rating: ratingValue,
        comment: ratingComment || undefined,
      });
      setHasRated(true);
    } catch (error) {
      logger.error("Failed to rate exchange:", error);
    } finally {
      setIsSubmittingRating(false);
    }
  };

  const isRequester = exchange?.requester_id === user?.id;
  const isProvider = exchange?.provider_id === user?.id;
  const otherUser = isRequester ? exchange?.provider : exchange?.requester;

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

  const getActions = () => {
    if (!exchange) return [];
    const actions: {
      label: string;
      action: string;
      color: string;
      icon: React.ReactNode;
    }[] = [];

    if (exchange.status === "requested" && isProvider) {
      actions.push(
        {
          label: "Accept",
          action: "accept",
          color: "bg-emerald-500 text-white",
          icon: <CheckCircle className="w-4 h-4" />,
        },
        {
          label: "Decline",
          action: "decline",
          color: "bg-red-500/20 text-red-400",
          icon: <XCircle className="w-4 h-4" />,
        }
      );
    }
    if (exchange.status === "accepted" && isRequester) {
      actions.push({
        label: "Start",
        action: "start",
        color:
          "bg-gradient-to-r from-indigo-500 to-purple-600 text-white",
        icon: <Play className="w-4 h-4" />,
      });
    }
    if (exchange.status === "in_progress") {
      actions.push(
        {
          label: "Complete",
          action: "complete",
          color: "bg-emerald-500 text-white",
          icon: <CheckCircle className="w-4 h-4" />,
        },
        {
          label: "Dispute",
          action: "dispute_open",
          color: "bg-orange-500/20 text-orange-400",
          icon: <Flag className="w-4 h-4" />,
        }
      );
    }
    if (
      exchange.status === "requested" ||
      exchange.status === "accepted"
    ) {
      actions.push({
        label: "Cancel",
        action: "cancel_open",
        color: "bg-red-500/20 text-red-400",
        icon: <XCircle className="w-4 h-4" />,
      });
    }

    return actions;
  };

  return (
    <div className="min-h-screen">
      <Navbar user={user} onLogout={logout} />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <Link
          href="/exchanges"
          className="inline-flex items-center gap-2 text-white/60 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Exchanges
        </Link>

        {isLoading ? (
          <div className="space-y-6">
            <div className="p-8 rounded-xl bg-white/5 border border-white/10">
              <Skeleton className="w-24 h-6 rounded mb-4" />
              <Skeleton className="w-3/4 h-8 rounded mb-4" />
              <Skeleton className="w-full h-24 rounded" />
            </div>
          </div>
        ) : exchange ? (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-6"
          >
            {/* Main Info */}
            <MotionGlassCard variants={itemVariants} glow="none" padding="lg">
              <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                <Chip
                  size="lg"
                  variant="flat"
                  className={
                    statusColors[exchange.status] ||
                    "bg-gray-500/20 text-gray-400"
                  }
                >
                  {statusLabels[exchange.status] || exchange.status}
                </Chip>

                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-500/20">
                  <Clock className="w-5 h-5 text-indigo-400" />
                  <span className="text-xl font-bold text-indigo-400">
                    {exchange.hours}
                  </span>
                  <span className="text-indigo-400/70">hours</span>
                </div>
              </div>

              <h1 className="text-3xl font-bold text-white mb-4">
                {exchange.listing?.title ||
                  exchange.description ||
                  `Exchange #${exchange.id}`}
              </h1>

              {exchange.description && (
                <p className="text-white/70 text-lg whitespace-pre-wrap mb-8">
                  {exchange.description}
                </p>
              )}

              {/* Participants */}
              <div className="flex items-center gap-6 pt-6 border-t border-white/10">
                <Link href={`/members/${exchange.requester?.id || ""}`}>
                  <div className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                    <Avatar
                      name={
                        exchange.requester
                          ? `${exchange.requester.first_name} ${exchange.requester.last_name}`
                          : ""
                      }
                      size="lg"
                      className="ring-2 ring-white/10"
                    />
                    <div>
                      <p className="text-xs text-white/40 uppercase tracking-wider">
                        Requester
                      </p>
                      <p className="font-semibold text-white">
                        {exchange.requester?.first_name}{" "}
                        {exchange.requester?.last_name}
                      </p>
                    </div>
                  </div>
                </Link>

                <ArrowRight className="w-5 h-5 text-white/30" />

                <Link href={`/members/${exchange.provider?.id || ""}`}>
                  <div className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                    <Avatar
                      name={
                        exchange.provider
                          ? `${exchange.provider.first_name} ${exchange.provider.last_name}`
                          : ""
                      }
                      size="lg"
                      className="ring-2 ring-white/10"
                    />
                    <div>
                      <p className="text-xs text-white/40 uppercase tracking-wider">
                        Provider
                      </p>
                      <p className="font-semibold text-white">
                        {exchange.provider?.first_name}{" "}
                        {exchange.provider?.last_name}
                      </p>
                    </div>
                  </div>
                </Link>
              </div>

              {/* Timeline */}
              <div className="mt-6 pt-6 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-white/40">Created</p>
                  <p className="text-sm text-white/70 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(exchange.created_at).toLocaleDateString()}
                  </p>
                </div>
                {exchange.started_at && (
                  <div>
                    <p className="text-xs text-white/40">Started</p>
                    <p className="text-sm text-white/70 flex items-center gap-1">
                      <Play className="w-3 h-3" />
                      {new Date(exchange.started_at).toLocaleDateString()}
                    </p>
                  </div>
                )}
                {exchange.completed_at && (
                  <div>
                    <p className="text-xs text-white/40">Completed</p>
                    <p className="text-sm text-white/70 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      {new Date(
                        exchange.completed_at
                      ).toLocaleDateString()}
                    </p>
                  </div>
                )}
                {exchange.listing && (
                  <div>
                    <p className="text-xs text-white/40">Listing</p>
                    <Link
                      href={`/listings/${exchange.listing.id}`}
                      className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
                    >
                      View Listing
                    </Link>
                  </div>
                )}
              </div>
            </MotionGlassCard>

            {/* Actions */}
            {getActions().length > 0 && (
              <MotionGlassCard
                variants={itemVariants}
                glow="none"
                padding="lg"
              >
                <h2 className="text-lg font-semibold text-white mb-4">
                  Actions
                </h2>
                <div className="flex flex-wrap gap-3">
                  {getActions().map((act) => (
                    <Button
                      key={act.action}
                      className={act.color}
                      startContent={act.icon}
                      isLoading={actionLoading === act.action}
                      onPress={() => {
                        if (act.action === "cancel_open") onCancelOpen();
                        else if (act.action === "dispute_open")
                          onDisputeOpen();
                        else handleAction(act.action);
                      }}
                    >
                      {act.label}
                    </Button>
                  ))}
                  {otherUser && (
                    <Link href={`/messages?user=${otherUser.id}`}>
                      <Button
                        className="bg-white/10 text-white hover:bg-white/20"
                        startContent={
                          <MessageSquare className="w-4 h-4" />
                        }
                      >
                        Message
                      </Button>
                    </Link>
                  )}
                </div>
              </MotionGlassCard>
            )}

            {/* Rating (only for completed exchanges) */}
            {exchange.status === "completed" && !hasRated && (
              <MotionGlassCard
                variants={itemVariants}
                glow="none"
                padding="lg"
              >
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-400" />
                  Rate this Exchange
                </h2>
                <div className="mb-4">
                  <label className="text-sm text-white/60 mb-2 block">
                    Rating
                  </label>
                  <StarRating
                    rating={ratingValue}
                    onRatingChange={setRatingValue}
                    interactive
                  />
                </div>
                <div className="mb-4">
                  <Textarea
                    placeholder="Share your experience (optional)"
                    value={ratingComment}
                    onValueChange={setRatingComment}
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
                  onPress={handleRate}
                  isLoading={isSubmittingRating}
                >
                  Submit Rating
                </Button>
              </MotionGlassCard>
            )}

            {hasRated && (
              <GlassCard glow="none" padding="lg">
                <div className="text-center py-4">
                  <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                  <p className="text-white font-medium">
                    Thank you for your rating!
                  </p>
                </div>
              </GlassCard>
            )}
          </motion.div>
        ) : (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
              <ArrowLeftRight className="w-8 h-8 text-white/20" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              Exchange not found
            </h3>
            <p className="text-white/50 mb-6">
              This exchange may have been removed or doesn&apos;t exist.
            </p>
            <Link href="/exchanges">
              <Button className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
                View All Exchanges
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Cancel Confirmation Modal */}
      <Modal
        isOpen={isCancelOpen}
        onClose={onCancelClose}
        classNames={{
          base: "bg-black/90 border border-white/10",
          header: "border-b border-white/10",
          body: "py-6",
          footer: "border-t border-white/10",
        }}
      >
        <ModalContent>
          <ModalHeader className="text-white">Cancel Exchange</ModalHeader>
          <ModalBody>
            <p className="text-white/70">
              Are you sure you want to cancel this exchange? This action
              cannot be undone.
            </p>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="light"
              className="text-white/70"
              onPress={onCancelClose}
            >
              Keep Exchange
            </Button>
            <Button
              className="bg-red-500 text-white"
              onPress={() => handleAction("cancel")}
              isLoading={actionLoading === "cancel"}
            >
              Cancel Exchange
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Dispute Modal */}
      <Modal
        isOpen={isDisputeOpen}
        onClose={onDisputeClose}
        classNames={{
          base: "bg-black/90 border border-white/10",
          header: "border-b border-white/10",
          body: "py-6",
          footer: "border-t border-white/10",
        }}
      >
        <ModalContent>
          <ModalHeader className="text-white">
            Dispute Exchange
          </ModalHeader>
          <ModalBody>
            <p className="text-white/70">
              Are you sure you want to dispute this exchange? An admin will
              review the situation.
            </p>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="light"
              className="text-white/70"
              onPress={onDisputeClose}
            >
              Go Back
            </Button>
            <Button
              className="bg-orange-500 text-white"
              onPress={() => handleAction("dispute")}
              isLoading={actionLoading === "dispute"}
            >
              File Dispute
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
