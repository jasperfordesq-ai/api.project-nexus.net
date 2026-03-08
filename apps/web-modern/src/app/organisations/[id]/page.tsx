// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

"use client";

import { useEffect, useState, useCallback, use } from "react";
import { motion } from "framer-motion";
import {
  Button,
  Avatar,
  Chip,
  Skeleton,
} from "@heroui/react";
import {
  Building2,
  Users,
  Globe,
  Mail,
  Phone,
  MapPin,
  LogIn,
  LogOut,
  ArrowLeft,
  Wallet,
  ArrowUpRight,
} from "lucide-react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { ProtectedRoute } from "@/components/protected-route";
import { GlassCard, MotionGlassCard } from "@/components/glass-card";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import { logger } from "@/lib/logger";
import { containerVariantsFast, itemVariants } from "@/lib/animations";

interface OrgDetail {
  id: number;
  name: string;
  description: string;
  logo_url?: string;
  website?: string;
  email?: string;
  phone?: string;
  address?: string;
  member_count: number;
  members: { id: number; first_name: string; last_name: string; role: string }[];
  created_at: string;
}

export default function OrganisationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <ProtectedRoute>
      <OrganisationDetailContent params={params} />
    </ProtectedRoute>
  );
}

function OrganisationDetailContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { user, logout } = useAuth();
  const [org, setOrg] = useState<OrgDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMember, setIsMember] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [orgWallet, setOrgWallet] = useState<any>(null);
  const [orgTransactions, setOrgTransactions] = useState<any[]>([]);

  const fetchOrg = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.getOrganisation(Number(id));
      setOrg(data);
      if (user && data.members) {
        setIsMember(data.members.some((m) => m.id === user.id));
      }
    } catch (error) {
      logger.error("Failed to fetch organisation:", error);
    } finally {
      setIsLoading(false);
    }
  }, [id, user]);

  useEffect(() => {
    fetchOrg();
  }, [fetchOrg]);
  const fetchOrgWallet = useCallback(async (id: number) => {
    try {
      const [wallet, txs] = await Promise.all([
        api.getOrgWallet(id),
        api.getOrgTransactions(id),
      ]);
      setOrgWallet(wallet);
      setOrgTransactions(txs || []);
    } catch (error) {
      logger.error("Failed to fetch org wallet:", error);
    }
  }, []);

    useEffect(() => {
    api.getUnreadMessageCount().then((res) => setUnreadCount(res?.count || 0));
  }, []);

  const handleJoin = async () => {
    try {
      await api.joinOrganisation(Number(id));
      setIsMember(true);
      fetchOrg();
    } catch (error) {
      logger.error("Failed to join organisation:", error);
    }
  };

  const handleLeave = async () => {
    try {
      await api.leaveOrganisation(Number(id));
      setIsMember(false);
      fetchOrg();
    } catch (error) {
      logger.error("Failed to leave organisation:", error);
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar user={user} unreadCount={unreadCount} onLogout={logout} />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link
          href="/organisations"
          className="inline-flex items-center gap-2 text-white/50 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Organisations
        </Link>

        {isLoading ? (
          <div className="space-y-6">
            <div className="p-8 rounded-xl bg-white/5 border border-white/10">
              <Skeleton className="w-64 h-8 rounded mb-4" />
              <Skeleton className="w-full h-20 rounded" />
            </div>
          </div>
        ) : org ? (
          <motion.div
            variants={containerVariantsFast}
            initial="hidden"
            animate="visible"
            className="space-y-6"
          >
            {/* Header */}
            <MotionGlassCard variants={itemVariants} glow="none" padding="lg">
              <div className="flex items-start gap-6">
                <Avatar
                  name={org.name}
                  src={org.logo_url}
                  className="w-20 h-20 ring-2 ring-white/10"
                />
                <div className="flex-1">
                  <h1 className="text-2xl font-bold text-white mb-2">
                    {org.name}
                  </h1>
                  <div className="flex items-center gap-3 text-sm text-white/40 mb-4">
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {org.member_count} members
                    </span>
                    <span>
                      Joined{" "}
                      {new Date(org.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-white/70">{org.description}</p>
                </div>
                <div>
                  {isMember ? (
                    <Button
                      className="bg-red-500/20 text-red-400"
                      startContent={<LogOut className="w-4 h-4" />}
                      onPress={handleLeave}
                    >
                      Leave
                    </Button>
                  ) : (
                    <Button
                      className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white"
                      startContent={<LogIn className="w-4 h-4" />}
                      onPress={handleJoin}
                    >
                      Join
                    </Button>
                  )}
                </div>
              </div>

              {/* Contact Info */}
              <div className="flex flex-wrap gap-4 mt-6 pt-4 border-t border-white/10">
                {org.website && (
                  <a
                    href={org.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm text-indigo-400 hover:text-indigo-300"
                  >
                    <Globe className="w-4 h-4" />
                    Website
                  </a>
                )}
                {org.email && (
                  <a
                    href={`mailto:${org.email}`}
                    className="flex items-center gap-1 text-sm text-white/50 hover:text-white"
                  >
                    <Mail className="w-4 h-4" />
                    {org.email}
                  </a>
                )}
                {org.phone && (
                  <span className="flex items-center gap-1 text-sm text-white/50">
                    <Phone className="w-4 h-4" />
                    {org.phone}
                  </span>
                )}
                {org.address && (
                  <span className="flex items-center gap-1 text-sm text-white/50">
                    <MapPin className="w-4 h-4" />
                    {org.address}
                  </span>
                )}
              </div>
            </MotionGlassCard>

            {/* Members */}
            <MotionGlassCard variants={itemVariants} glow="none" padding="lg">
              <h2 className="text-lg font-semibold text-white mb-4">
                Members
              </h2>
              <div className="space-y-2">
                {(org.members || []).map((member) => (
                  <Link key={member.id} href={`/members/${member.id}`}>
                    <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors">
                      <Avatar
                        name={`${member.first_name} ${member.last_name}`}
                        size="sm"
                        className="ring-2 ring-white/10"
                      />
                      <p className="text-white font-medium flex-1">
                        {member.first_name} {member.last_name}
                      </p>
                      <Chip
                        size="sm"
                        variant="flat"
                        className="bg-white/10 text-white/60"
                      >
                        {member.role}
                      </Chip>
                    </div>
                  </Link>
                ))}
              </div>
            </MotionGlassCard>
          </motion.div>
        ) : (
          <div className="text-center py-16">
            <h3 className="text-xl font-semibold text-white mb-2">
              Organisation not found
            </h3>
          </div>
        )}
      </div>
    </div>
  );
}
