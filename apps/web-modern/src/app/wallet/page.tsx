// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Button,
  Chip,
  Skeleton,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Pagination,
  Tabs,
  Tab,
} from "@heroui/react";
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronDown,
  Send,
  History,
  Clock,
  Download,
} from "lucide-react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { ProtectedRoute } from "@/components/protected-route";
import { MotionGlassCard, GlassCard } from "@/components/glass-card";
import { useAuth } from "@/contexts/auth-context";
import {
  api,
  type WalletBalance,
  type Transaction,
  type PaginatedResponse,
} from "@/lib/api";
import { logger } from "@/lib/logger";

type TransactionFilter = "all" | "sent" | "received";

export default function WalletPage() {
  return (
    <ProtectedRoute>
      <WalletContent />
    </ProtectedRoute>
  );
}

function WalletContent() {
  const { user, logout } = useAuth();
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [txFilter, setTxFilter] = useState<TransactionFilter>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [walletAlerts, setWalletAlerts] = useState<any[]>([]);

  const fetchWalletData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [balanceRes, txRes] = await Promise.all([
        api.getBalance(),
        api.getTransactions({
          type: txFilter,
          page: currentPage,
          limit: 10,
        }),
      ]);

      setBalance(balanceRes);
      setTransactions(txRes?.data || []);
      setTotalPages(txRes?.pagination?.total_pages || 1);
    } catch (error) {
      logger.error("Failed to fetch wallet data:", error);
      setTransactions([]);
    } finally {
      setIsLoading(false);
    }
  }, [txFilter, currentPage]);

  const fetchAlerts = useCallback(async () => {
    try {
      const alerts = await api.getWalletAlerts();
      setWalletAlerts(alerts || []);
    } catch (error) {
      logger.error("Failed to fetch wallet alerts:", error);
    }
  }, []);

  const handleExport = async (format: string) => {
    try {
      const blob = await api.exportWalletHistory(format);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "wallet-history." + format;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      logger.error("Failed to export wallet history:", error);
    }
  };


  useEffect(() => {
    fetchWalletData();
  }, [fetchWalletData]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.05 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 },
  };

  return (
    <div className="min-h-screen">
      <Navbar user={user} onLogout={logout} />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-white">Wallet</h1>
          <p className="text-white/50 mt-1">
            Manage your time credits and transactions
          </p>
        </motion.div>

        {/* Balance Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <GlassCard glow="primary" padding="lg">
            {isLoading ? (
              <div className="flex items-center justify-between">
                <div>
                  <Skeleton className="w-24 h-4 rounded mb-2" />
                  <Skeleton className="w-32 h-12 rounded" />
                </div>
                <Skeleton className="w-32 h-10 rounded-lg" />
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                    <Wallet className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-white/50 mb-1">
                      Available Balance
                    </p>
                    <p className="text-4xl font-bold text-white">
                      {balance?.balance ?? 0}
                      <span className="text-lg text-white/50 ml-1">hours</span>
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 w-full sm:w-auto">
                  <Link href="/wallet/send" className="flex-1 sm:flex-none">
                    <Button
                      className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white"
                      startContent={<Send className="w-4 h-4" />}
                    >
                      Send Credits
                    </Button>
                  </Link>
                  <Dropdown>
                    <DropdownTrigger>
                      <Button
                        className="bg-white/10 text-white hover:bg-white/20"
                        startContent={<Download className="w-4 h-4" />}
                      >
                        Export
                      </Button>
                    </DropdownTrigger>
                    <DropdownMenu
                      aria-label="Export options"
                      onAction={(key) => handleExport(key as string)}
                      classNames={{ base: "bg-black/90 border border-white/10" }}
                    >
                      <DropdownItem key="csv" className="text-white">Export as CSV</DropdownItem>
                      <DropdownItem key="pdf" className="text-white">Export as PDF</DropdownItem>
                    </DropdownMenu>
                  </Dropdown>
                </div>
              </div>
            )}
          </GlassCard>
        </motion.div>

        {/* Wallet Alerts */}
        {walletAlerts.length > 0 && (
          <div className="mb-6 space-y-3">
            {walletAlerts.map((alert, i) => (
              <div
                key={i}
                className={`p-4 rounded-xl border ${
                  alert.severity === "warning"
                    ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                    : alert.severity === "error"
                    ? "bg-red-500/10 border-red-500/20 text-red-400"
                    : "bg-indigo-500/10 border-indigo-500/20 text-indigo-400"
                }`}
              >
                <p className="text-sm font-medium">{alert.message}</p>
              </div>
            ))}
          </div>
        )}

        {/* Transactions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <History className="w-5 h-5 text-indigo-400" />
              Transaction History
            </h2>

            <Tabs
              selectedKey={txFilter}
              onSelectionChange={(key) => {
                setTxFilter(key as TransactionFilter);
                setCurrentPage(1);
              }}
              classNames={{
                tabList: "bg-white/5 border border-white/10",
                cursor: "bg-indigo-500",
                tab: "text-white/50 data-[selected=true]:text-white",
              }}
              size="sm"
            >
              <Tab key="all" title="All" />
              <Tab key="received" title="Received" />
              <Tab key="sent" title="Sent" />
            </Tabs>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="p-4 rounded-xl bg-white/5 border border-white/10"
                >
                  <Skeleton className="w-full h-16 rounded-lg" />
                </div>
              ))}
            </div>
          ) : transactions.length > 0 ? (
            <>
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="space-y-3"
              >
                {transactions.map((tx) => {
                  const isSent = tx.sender_id === user?.id;
                  const otherUser = isSent ? tx.receiver : tx.sender;

                  return (
                    <MotionGlassCard
                      key={tx.id}
                      variants={itemVariants}
                      glow="none"
                      padding="md"
                      hover
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div
                            className={`w-12 h-12 rounded-full flex items-center justify-center ${
                              isSent
                                ? "bg-orange-500/20"
                                : "bg-emerald-500/20"
                            }`}
                          >
                            {isSent ? (
                              <ArrowUpRight className="w-6 h-6 text-orange-400" />
                            ) : (
                              <ArrowDownLeft className="w-6 h-6 text-emerald-400" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-white">
                              {tx.description || "Transfer"}
                            </p>
                            <p className="text-sm text-white/50">
                              {isSent ? "To" : "From"}{" "}
                              <span className="text-white/70">
                                {otherUser?.first_name} {otherUser?.last_name}
                              </span>
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <p
                            className={`text-xl font-semibold ${
                              isSent ? "text-orange-400" : "text-emerald-400"
                            }`}
                          >
                            {isSent ? "-" : "+"}
                            {tx.amount}h
                          </p>
                          <p className="text-xs text-white/40 flex items-center gap-1 justify-end">
                            <Clock className="w-3 h-3" />
                            {new Date(tx.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </MotionGlassCard>
                  );
                })}
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
                <History className="w-8 h-8 text-white/20" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                No transactions yet
              </h3>
              <p className="text-white/50 mb-6">
                Start exchanging time credits with the community
              </p>
              <Link href="/listings">
                <Button
                  className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white"
                >
                  Browse Listings
                </Button>
              </Link>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
