// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Button, Skeleton } from "@heroui/react";
import {
  Search,
  Trash2,
  ExternalLink,
  Bookmark,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { ProtectedRoute } from "@/components/protected-route";
import { MotionGlassCard } from "@/components/glass-card";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import { logger } from "@/lib/logger";
import { containerVariantsFast, itemVariants } from "@/lib/animations";

interface SavedSearch {
  id: number;
  name: string;
  query: string;
  filters: Record<string, string>;
  created_at: string;
}

export default function SavedSearchesPage() {
  return (
    <ProtectedRoute>
      <SavedSearchesContent />
    </ProtectedRoute>
  );
}

function SavedSearchesContent() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchSearches = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getSavedSearches();
      setSearches(data || []);
    } catch (err) {
      logger.error("Failed to fetch saved searches:", err);
      setError(err instanceof Error ? err.message : "Failed to load saved searches");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSearches();
  }, [fetchSearches]);

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await api.deleteSavedSearch(id);
      setSearches((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      logger.error("Failed to delete saved search:", err);
      setError(err instanceof Error ? err.message : "Failed to delete saved search");
    } finally {
      setDeletingId(null);
    }
  };

  const handleRunSearch = (search: SavedSearch) => {
    const params = new URLSearchParams();
    if (search.query) params.set("q", search.query);
    if (search.filters) {
      Object.entries(search.filters).forEach(([key, value]) => {
        params.set(key, value);
      });
    }
    router.push(`/search?${params.toString()}`);
  };

  return (
    <div className="min-h-screen">
      <Navbar user={user} onLogout={logout} />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Bookmark className="w-8 h-8 text-indigo-400" />
            Saved Searches
          </h1>
          <p className="text-white/50 mt-1">
            Your saved search queries and filters
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 mb-6">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="p-6 rounded-xl bg-white/5 border border-white/10"
              >
                <Skeleton className="w-3/4 h-6 rounded mb-3" />
                <Skeleton className="w-1/2 h-4 rounded" />
              </div>
            ))}
          </div>
        ) : searches.length > 0 ? (
          <motion.div
            variants={containerVariantsFast}
            initial="hidden"
            animate="visible"
            className="space-y-4"
          >
            {searches.map((search) => (
              <MotionGlassCard
                key={search.id}
                variants={itemVariants}
                glow="none"
                padding="lg"
                hover
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-white mb-1 truncate">
                      {search.name || search.query || "Untitled Search"}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-white/50 mb-2">
                      <Search className="w-3 h-3" />
                      <span className="truncate">
                        {search.query || "No query"}
                      </span>
                    </div>
                    {search.filters &&
                      Object.keys(search.filters).length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(search.filters).map(
                            ([key, value]) => (
                              <span
                                key={key}
                                className="text-xs px-2 py-1 rounded-full bg-white/10 text-white/60"
                              >
                                {key}: {value}
                              </span>
                            )
                          )}
                        </div>
                      )}
                    <p className="text-xs text-white/30 mt-2">
                      Saved{" "}
                      {new Date(search.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="sm"
                      className="bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30"
                      startContent={<ExternalLink className="w-3 h-3" />}
                      onPress={() => handleRunSearch(search)}
                    >
                      Run
                    </Button>
                    <Button
                      size="sm"
                      isIconOnly
                      isLoading={deletingId === search.id}
                      className="bg-red-500/20 text-red-400 hover:bg-red-500/30"
                      onPress={() => handleDelete(search.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </MotionGlassCard>
            ))}
          </motion.div>
        ) : (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
              <Bookmark className="w-8 h-8 text-white/20" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              No saved searches
            </h3>
            <p className="text-white/50 mb-6">
              Save a search from the search page to find it here later.
            </p>
            <Button
              className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white"
              startContent={<Search className="w-4 h-4" />}
              onPress={() => router.push("/search")}
            >
              Go to Search
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
