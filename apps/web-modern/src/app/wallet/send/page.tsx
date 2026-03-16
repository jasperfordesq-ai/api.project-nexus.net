// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  Button,
  Input,
  Textarea,
  Avatar,
  Skeleton,
} from "@heroui/react";
import {
  ArrowLeft,
  Send,
  Wallet,
  Search,
  CheckCircle,
} from "lucide-react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { ProtectedRoute } from "@/components/protected-route";
import { GlassCard } from "@/components/glass-card";
import { useAuth } from "@/contexts/auth-context";
import { api, type User as UserType, type WalletBalance } from "@/lib/api";
import { logger } from "@/lib/logger";

function WalletSendContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, logout } = useAuth();

  // Pre-fill from URL params (when coming from listing detail)
  const prefilledUserId = searchParams.get("to");
  const prefilledAmount = searchParams.get("amount");
  const prefilledDescription = searchParams.get("description");

  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [recipientId, setRecipientId] = useState(prefilledUserId || "");
  const [recipient, setRecipient] = useState<UserType | null>(null);
  const [amount, setAmount] = useState(prefilledAmount || "");
  const [description, setDescription] = useState(prefilledDescription || "");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserType[]>([]);
  const [showSearch, setShowSearch] = useState(!prefilledUserId);

  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const balanceRes = await api.getBalance();
        setBalance(balanceRes);
      } catch (error) {
        logger.error("Failed to fetch balance:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchBalance();
  }, []);
  // Fetch prefilled recipient
  useEffect(() => {
    if (prefilledUserId) {
      const fetchRecipient = async () => {
        try {
          const userData = await api.getUser(Number(prefilledUserId));
          setRecipient(userData);
        } catch (error) {
          logger.error("Failed to fetch recipient:", error);
        }
      };
      fetchRecipient();
    }
  }, [prefilledUserId]);

  // Search for users
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const searchUsers = async () => {
      setIsSearching(true);
      try {
        const response = await api.getMembers({
          q: searchQuery,
          limit: 5,
        });
        // Filter out current user
        const users = response?.data || [];
        setSearchResults(users.filter((u) => u.id !== user?.id));
      } catch (error) {
        logger.error("Failed to search users:", error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    const debounce = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery, user?.id]);

  const handleSelectRecipient = (selectedUser: UserType) => {
    setRecipient(selectedUser);
    setRecipientId(String(selectedUser.id));
    setSearchQuery("");
    setSearchResults([]);
    setShowSearch(false);
  };

  const handleSend = async () => {
    setError("");

    // Validation
    if (!recipient) {
      setError("Please select a recipient");
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    if (balance && amountNum > balance.balance) {
      setError("Insufficient balance");
      return;
    }

    if (!description.trim()) {
      setError("Please add a description for this transfer");
      return;
    }

    setIsSending(true);
    try {
      await api.transfer({
        receiver_id: recipient.id,
        amount: amountNum,
        description: description.trim(),
      });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transfer failed");
    } finally {
      setIsSending(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen">
        <Navbar user={user} onLogout={logout} />
        <div className="max-w-lg mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center"
          >
            <GlassCard glow="primary" padding="lg">
              <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-emerald-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Transfer Successful!
              </h2>
              <p className="text-white/60 mb-6">
                You sent <span className="text-emerald-400 font-semibold">{amount} hours</span> to{" "}
                <span className="text-white">{recipient?.first_name} {recipient?.last_name}</span>
              </p>
              <div className="flex gap-3 justify-center">
                <Link href="/wallet">
                  <Button className="bg-white/10 text-white hover:bg-white/20">
                    View Wallet
                  </Button>
                </Link>
                <Button
                  className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white"
                  onPress={() => {
                    setSuccess(false);
                    setRecipient(null);
                    setRecipientId("");
                    setAmount("");
                    setDescription("");
                    setShowSearch(true);
                  }}
                >
                  Send More
                </Button>
              </div>
            </GlassCard>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar user={user} onLogout={logout} />

      <div className="max-w-lg mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <Link
          href="/wallet"
          className="inline-flex items-center gap-2 text-white/60 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Wallet
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <GlassCard glow="primary" padding="lg">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <Send className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Send Credits</h1>
                <p className="text-white/50">
                  Transfer time credits to another member
                </p>
              </div>
            </div>

            {/* Balance Display */}
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 mb-6">
              <div className="flex items-center justify-between">
                <span className="text-white/60">Your Balance</span>
                {isLoading ? (
                  <Skeleton className="w-24 h-8 rounded" />
                ) : (
                  <span className="text-2xl font-bold text-white">
                    {balance?.balance ?? 0}
                    <span className="text-sm text-white/50 ml-1">hours</span>
                  </span>
                )}
              </div>
            </div>

            {/* Recipient Selection */}
            <div className="mb-6">
              <label className="text-sm text-white/60 mb-2 block">
                Recipient
              </label>
              {recipient && !showSearch ? (
                <div className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
                  <Avatar
                    name={`${recipient.first_name} ${recipient.last_name}`}
                    size="md"
                    className="ring-2 ring-white/10"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-white">
                      {recipient.first_name} {recipient.last_name}
                    </p>
                    <p className="text-sm text-white/50">{recipient.email}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="light"
                    className="text-white/50"
                    onPress={() => {
                      setShowSearch(true);
                      setRecipient(null);
                      setRecipientId("");
                    }}
                  >
                    Change
                  </Button>
                </div>
              ) : (
                <div className="relative">
                  <Input
                    placeholder="Search for a member..."
                    value={searchQuery}
                    onValueChange={setSearchQuery}
                    startContent={<Search className="w-4 h-4 text-white/40" />}
                    classNames={{
                      input: "text-white placeholder:text-white/30",
                      inputWrapper: [
                        "bg-white/5",
                        "border border-white/10",
                        "hover:bg-white/10",
                        "group-data-[focus=true]:bg-white/10",
                        "group-data-[focus=true]:border-indigo-500/50",
                      ],
                    }}
                  />
                  {(searchResults.length > 0 || isSearching) && (
                    <div className="absolute z-10 w-full mt-2 rounded-xl bg-black/90 border border-white/10 overflow-hidden">
                      {isSearching ? (
                        <div className="p-4 text-center text-white/50">
                          Searching...
                        </div>
                      ) : (
                        searchResults.map((searchUser) => (
                          <button
                            key={searchUser.id}
                            onClick={() => handleSelectRecipient(searchUser)}
                            className="w-full flex items-center gap-3 p-3 hover:bg-white/10 transition-colors"
                          >
                            <Avatar
                              name={`${searchUser.first_name} ${searchUser.last_name}`}
                              size="sm"
                              className="ring-2 ring-white/10"
                            />
                            <div className="text-left">
                              <p className="text-white font-medium">
                                {searchUser.first_name} {searchUser.last_name}
                              </p>
                              <p className="text-xs text-white/50">
                                {searchUser.email}
                              </p>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Amount */}
            <div className="mb-6">
              <label className="text-sm text-white/60 mb-2 block">
                Amount (hours)
              </label>
              <Input
                type="number"
                placeholder="0"
                value={amount}
                onValueChange={setAmount}
                min={1}
                max={balance?.balance}
                startContent={
                  <Wallet className="w-4 h-4 text-white/40" />
                }
                classNames={{
                  input: "text-white placeholder:text-white/30 text-xl font-semibold",
                  inputWrapper: [
                    "bg-white/5",
                    "border border-white/10",
                    "hover:bg-white/10",
                    "group-data-[focus=true]:bg-white/10",
                    "group-data-[focus=true]:border-indigo-500/50",
                  ],
                }}
              />
              {balance && (
                <div className="flex gap-2 mt-2">
                  {[1, 2, 5, 10].map((preset) => (
                    <Button
                      key={preset}
                      size="sm"
                      variant="flat"
                      className="bg-white/5 text-white/70 hover:bg-white/10"
                      onPress={() => setAmount(String(Math.min(preset, balance.balance)))}
                      isDisabled={preset > balance.balance}
                    >
                      {preset}h
                    </Button>
                  ))}
                  <Button
                    size="sm"
                    variant="flat"
                    className="bg-white/5 text-white/70 hover:bg-white/10"
                    onPress={() => setAmount(String(balance.balance))}
                  >
                    Max
                  </Button>
                </div>
              )}
            </div>

            {/* Description */}
            <div className="mb-6">
              <label className="text-sm text-white/60 mb-2 block">
                Description
              </label>
              <Textarea
                placeholder="What's this transfer for?"
                value={description}
                onValueChange={setDescription}
                minRows={2}
                classNames={{
                  input: "text-white placeholder:text-white/30",
                  inputWrapper: [
                    "bg-white/5",
                    "border border-white/10",
                    "hover:bg-white/10",
                    "group-data-[focus=true]:bg-white/10",
                    "group-data-[focus=true]:border-indigo-500/50",
                  ],
                }}
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 mb-6">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Summary */}
            {recipient && amount && (
              <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/30 mb-6">
                <p className="text-white/70 text-sm">
                  You are about to send{" "}
                  <span className="text-white font-semibold">{amount} hours</span> to{" "}
                  <span className="text-white font-semibold">
                    {recipient.first_name} {recipient.last_name}
                  </span>
                </p>
              </div>
            )}

            {/* Submit Button */}
            <Button
              className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white"
              size="lg"
              startContent={<Send className="w-5 h-5" />}
              onPress={handleSend}
              isLoading={isSending}
              isDisabled={!recipient || !amount || !description}
            >
              Send Credits
            </Button>
          </GlassCard>
        </motion.div>
      </div>
    </div>
  );
}

export default function WalletSendPage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-white">Loading...</div>
        </div>
      }>
        <WalletSendContent />
      </Suspense>
    </ProtectedRoute>
  );
}
