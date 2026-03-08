// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Chip,
  Skeleton,
} from "@heroui/react";
import { Globe2, Users, Link2 } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { ProtectedRoute } from "@/components/protected-route";
import { MotionGlassCard } from "@/components/glass-card";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import { logger } from "@/lib/logger";
import { containerVariantsFast, itemVariants } from "@/lib/animations";

interface FederatedInstance {
  id: number;
  name: string;
  domain: string;
  status: string;
  member_count: number;
  connected_at: string;
}

export default function FederationPage() {
  return <ProtectedRoute><FederationContent /></ProtectedRoute>;
}

function FederationContent() {
  const { user, logout } = useAuth();
  const [instances, setInstances] = useState<FederatedInstance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    setIsLoading(true);
    api.getFederatedInstances()
      .then((data) => setInstances(data || []))
      .catch((error) => logger.error("Failed to fetch instances:", error))
      .finally(() => setIsLoading(false));
  }, []);
  useEffect(() => {
    api.getUnreadMessageCount().then((res) => setUnreadCount(res?.count || 0));
  }, []);

  return (
    <div className="min-h-screen">
      <Navbar user={user} unreadCount={unreadCount} onLogout={logout} />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Globe2 className="w-8 h-8 text-indigo-400" />
            Federation
          </h1>
          <p className="text-white/50 mt-1">Connected timebank instances</p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="p-6 rounded-xl bg-white/5 border border-white/10">
                <Skeleton className="w-3/4 h-5 rounded" />
              </div>
            ))}
          </div>
        ) : instances.length > 0 ? (
          <motion.div variants={containerVariantsFast} initial="hidden" animate="visible" className="space-y-4">
            {instances.map((instance) => (
              <MotionGlassCard key={instance.id} variants={itemVariants} glow="none" padding="md" hover>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-indigo-500/20 flex items-center justify-center">
                    <Globe2 className="w-6 h-6 text-indigo-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-semibold">{instance.name}</h3>
                    <div className="flex items-center gap-3 text-sm text-white/40 mt-1">
                      <span className="flex items-center gap-1">
                        <Link2 className="w-3 h-3" />
                        {instance.domain}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {instance.member_count} members
                      </span>
                    </div>
                  </div>
                  <Chip size="sm" variant="flat" className={
                    instance.status === "active" ? "bg-emerald-500/20 text-emerald-400" :
                    instance.status === "pending" ? "bg-amber-500/20 text-amber-400" :
                    "bg-gray-500/20 text-gray-400"
                  }>
                    {instance.status}
                  </Chip>
                </div>
              </MotionGlassCard>
            ))}
          </motion.div>
        ) : (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
              <Globe2 className="w-8 h-8 text-white/20" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No federated instances</h3>
            <p className="text-white/50">This timebank is not yet connected to other instances.</p>
          </div>
        )}
      </div>
    </div>
  );
}
