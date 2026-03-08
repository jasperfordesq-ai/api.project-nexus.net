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
  Chip,
  Slider,
} from "@heroui/react";
import {
  MapPin,
  Navigation,
  Users,
  Tag,
} from "lucide-react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { ProtectedRoute } from "@/components/protected-route";
import { GlassCard, MotionGlassCard } from "@/components/glass-card";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import { logger } from "@/lib/logger";
import { containerVariantsFast, itemVariants } from "@/lib/animations";

interface NearbyUser {
  id: number;
  first_name: string;
  last_name: string;
  distance_km: number;
}

interface NearbyListing {
  id: number;
  title: string;
  type: string;
  distance_km: number;
}

export default function LocationPage() {
  return (
    <ProtectedRoute>
      <LocationContent />
    </ProtectedRoute>
  );
}

function LocationContent() {
  const { user, logout } = useAuth();
  const [nearbyUsers, setNearbyUsers] = useState<NearbyUser[]>([]);
  const [nearbyListings, setNearbyListings] = useState<NearbyListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [radius, setRadius] = useState(25);
  const [hasLocation, setHasLocation] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNearby = useCallback(async () => {
    setIsLoading(true);
    try {
      const [users, listings] = await Promise.allSettled([
        api.getNearbyUsers({ radius, limit: 20 }),
        api.getNearbyListings({ radius, limit: 20 }),
      ]);
      if (users.status === "fulfilled") setNearbyUsers(users.value || []);
      if (listings.status === "fulfilled")
        setNearbyListings(listings.value || []);
    } catch (error) {
      logger.error("Failed to fetch nearby:", error);
    } finally {
      setIsLoading(false);
    }
  }, [radius]);

  useEffect(() => {
    api
      .getMyLocation()
      .then(() => {
        setHasLocation(true);
        fetchNearby();
      })
      .catch(() => setIsLoading(false));
  }, [fetchNearby]);

  useEffect(() => {
    api.getUnreadMessageCount().then((res) => setUnreadCount(res?.count || 0));
  }, []);

  const handleUpdateLocation = async () => {
    if (!navigator.geolocation) return;
    setIsUpdating(true);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject)
      );
      await api.updateMyLocation({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      });
      setHasLocation(true);
      fetchNearby();
    } catch (error) {
      logger.error("Failed to update location:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar user={user} unreadCount={unreadCount} onLogout={logout} />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <MapPin className="w-8 h-8 text-indigo-400" />
              Nearby
            </h1>
            <p className="text-white/50 mt-1">
              Discover members and listings near you
            </p>
          </div>
          <Button
            className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white"
            startContent={<Navigation className="w-4 h-4" />}
            onPress={handleUpdateLocation}
            isLoading={isUpdating}
          >
            Update Location
          </Button>
        </div>

        {!hasLocation && !isLoading ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-8 h-8 text-white/20" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              Location not set
            </h3>
            <p className="text-white/50 mb-6">
              Share your location to discover nearby members and listings.
            </p>
            <Button
              className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white"
              startContent={<Navigation className="w-4 h-4" />}
              onPress={handleUpdateLocation}
              isLoading={isUpdating}
            >
              Share My Location
            </Button>
          </div>
        ) : isLoading ? (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="p-6 rounded-xl bg-white/5 border border-white/10"
              >
                <Skeleton className="w-3/4 h-5 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <motion.div
            variants={containerVariantsFast}
            initial="hidden"
            animate="visible"
            className="space-y-6"
          >
            {/* Radius Control */}
            <MotionGlassCard variants={itemVariants} glow="none" padding="lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-white/60">Search radius</span>
                <span className="text-sm font-semibold text-indigo-400">
                  {radius} km
                </span>
              </div>
              <Slider
                aria-label="Radius"
                step={5}
                minValue={5}
                maxValue={100}
                value={radius}
                onChange={(v) => setRadius(v as number)}
                classNames={{
                  track: "bg-white/10",
                  filler: "bg-indigo-500",
                  thumb: "bg-indigo-500 border-2 border-white",
                }}
              />
              <Button
                size="sm"
                className="bg-white/10 text-white mt-3"
                onPress={fetchNearby}
              >
                Search
              </Button>
            </MotionGlassCard>

            {/* Nearby Members */}
            <MotionGlassCard variants={itemVariants} glow="none" padding="lg">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-400" />
                Nearby Members
              </h2>
              {nearbyUsers.length > 0 ? (
                <div className="space-y-2">
                  {nearbyUsers.map((u) => (
                    <Link key={u.id} href={`/members/${u.id}`}>
                      <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors">
                        <Avatar
                          name={`${u.first_name} ${u.last_name}`}
                          size="sm"
                          className="ring-2 ring-white/10"
                        />
                        <p className="text-white font-medium flex-1">
                          {u.first_name} {u.last_name}
                        </p>
                        <Chip
                          size="sm"
                          variant="flat"
                          className="bg-emerald-500/20 text-emerald-400"
                        >
                          {u.distance_km.toFixed(1)} km
                        </Chip>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-white/50 text-center py-4">
                  No members found within {radius} km
                </p>
              )}
            </MotionGlassCard>

            {/* Nearby Listings */}
            <MotionGlassCard variants={itemVariants} glow="none" padding="lg">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Tag className="w-5 h-5 text-amber-400" />
                Nearby Listings
              </h2>
              {nearbyListings.length > 0 ? (
                <div className="space-y-2">
                  {nearbyListings.map((l) => (
                    <Link key={l.id} href={`/listings/${l.id}`}>
                      <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors">
                        <Chip
                          size="sm"
                          variant="flat"
                          className={
                            l.type === "offer"
                              ? "bg-emerald-500/20 text-emerald-400"
                              : "bg-amber-500/20 text-amber-400"
                          }
                        >
                          {l.type}
                        </Chip>
                        <p className="text-white font-medium flex-1">
                          {l.title}
                        </p>
                        <span className="text-sm text-white/40">
                          {l.distance_km.toFixed(1)} km
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-white/50 text-center py-4">
                  No listings found within {radius} km
                </p>
              )}
            </MotionGlassCard>
          </motion.div>
        )}
      </div>
    </div>
  );
}
