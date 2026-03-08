"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Button,
  Input,
  Chip,
  Avatar,
  Skeleton,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Pagination,
} from "@heroui/react";
import {
  Search,
  Plus,
  Filter,
  Clock,
  ChevronDown,
  Tag,
  Heart,
  Star,
} from "lucide-react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { ProtectedRoute } from "@/components/protected-route";
import { MotionGlassCard } from "@/components/glass-card";
import { useAuth } from "@/contexts/auth-context";
import { api, type Listing, type PaginatedResponse } from "@/lib/api";
import { logger } from "@/lib/logger";
import { containerVariantsFast, itemVariants } from "@/lib/animations";

type ListingType = "all" | "offer" | "request";
type ListingStatus = "all" | "active" | "draft" | "completed" | "cancelled";

export default function ListingsPage() {
  return (
    <ProtectedRoute>
      <ListingsContent />
    </ProtectedRoute>
  );
}

function ListingsContent() {
  const { user, logout } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<ListingType>("all");
  const [statusFilter, setStatusFilter] = useState<ListingStatus>("active");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [unreadCount, setUnreadCount] = useState(0);
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set());
  const [featuredListings, setFeaturedListings] = useState<Listing[]>([]);
  const [showFavorites, setShowFavorites] = useState(false);

  const fetchListings = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: {
        type?: "offer" | "request";
        status?: "active" | "draft" | "completed" | "cancelled";
        page: number;
        limit: number;
      } = {
        page: currentPage,
        limit: 12,
      };

      if (typeFilter !== "all") {
        params.type = typeFilter;
      }
      if (statusFilter !== "all") {
        params.status = statusFilter;
      }

      const response: PaginatedResponse<Listing> = await api.getListings(params);
      setListings(response?.data || []);
      setTotalPages(response?.pagination?.total_pages || 1);
    } catch (error) {
      logger.error("Failed to fetch listings:", error);
      setListings([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, typeFilter, statusFilter]);

  const fetchFavorites = useCallback(async () => {
    try {
      const favs = await api.getFavoriteListings();
      setFavoriteIds(new Set((favs || []).map((f: Listing) => f.id)));
    } catch (error) {
      logger.error("Failed to fetch favorites:", error);
    }
  }, []);

  const fetchFeatured = useCallback(async () => {
    try {
      const featured = await api.getFeaturedListings();
      setFeaturedListings(featured || []);
    } catch (error) {
      logger.error("Failed to fetch featured listings:", error);
    }
  }, []);

  const toggleFavorite = async (listingId: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await api.toggleListingFavorite(listingId);
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (next.has(listingId)) next.delete(listingId);
        else next.add(listingId);
        return next;
      });
    } catch (error) {
      logger.error("Failed to toggle favorite:", error);
    }
  };


  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  useEffect(() => { fetchFavorites(); fetchFeatured(); }, [fetchFavorites, fetchFeatured]);

  useEffect(() => {
    api.getUnreadMessageCount().then((res) => setUnreadCount(res?.count || 0));
  }, []);

  // Filter listings by search query (client-side)
  const baseListings = showFavorites
    ? (listings || []).filter((l) => favoriteIds.has(l.id))
    : (listings || []);
  const filteredListings = baseListings.filter(
    (listing) =>
      (listing.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (listing.description || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen">
      <Navbar user={user} unreadCount={unreadCount} onLogout={logout} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Listings</h1>
            <p className="text-white/50 mt-1">
              Browse offers and requests from the community
            </p>
          </div>
          <Button
            variant={showFavorites ? "solid" : "flat"}
            color={showFavorites ? "primary" : "default"}
            className={showFavorites ? "" : "bg-white/5 text-white border border-white/10"}
            startContent={<Heart className="w-4 h-4" />}
            onPress={() => setShowFavorites(!showFavorites)}
          >
            Favorites
          </Button>
          <Link href="/listings/new">
            <Button
              className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white"
              startContent={<Plus className="w-4 h-4" />}
            >
              Create Listing
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <Input
            placeholder="Search listings..."
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
            className="sm:max-w-xs"
          />

          <div className="flex gap-2">
            <Dropdown>
              <DropdownTrigger>
                <Button
                  variant="flat"
                  className="bg-white/5 text-white border border-white/10"
                  startContent={<Tag className="w-4 h-4" />}
                  endContent={<ChevronDown className="w-4 h-4" />}
                >
                  {typeFilter === "all" ? "All Types" : typeFilter}
                </Button>
              </DropdownTrigger>
              <DropdownMenu
                aria-label="Type filter"
                selectionMode="single"
                selectedKeys={new Set([typeFilter])}
                onSelectionChange={(keys) => {
                  const selected = Array.from(keys)[0] as ListingType;
                  setTypeFilter(selected);
                  setCurrentPage(1);
                }}
                className="bg-black/80 backdrop-blur-xl border border-white/10"
              >
                <DropdownItem key="all" className="text-white">
                  All Types
                </DropdownItem>
                <DropdownItem key="offer" className="text-white">
                  Offers
                </DropdownItem>
                <DropdownItem key="request" className="text-white">
                  Requests
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>

            <Dropdown>
              <DropdownTrigger>
                <Button
                  variant="flat"
                  className="bg-white/5 text-white border border-white/10"
                  startContent={<Filter className="w-4 h-4" />}
                  endContent={<ChevronDown className="w-4 h-4" />}
                >
                  {statusFilter === "all" ? "All Status" : statusFilter}
                </Button>
              </DropdownTrigger>
              <DropdownMenu
                aria-label="Status filter"
                selectionMode="single"
                selectedKeys={new Set([statusFilter])}
                onSelectionChange={(keys) => {
                  const selected = Array.from(keys)[0] as ListingStatus;
                  setStatusFilter(selected);
                  setCurrentPage(1);
                }}
                className="bg-black/80 backdrop-blur-xl border border-white/10"
              >
                <DropdownItem key="all" className="text-white">
                  All Status
                </DropdownItem>
                <DropdownItem key="active" className="text-white">
                  Active
                </DropdownItem>
                <DropdownItem key="draft" className="text-white">
                  Draft
                </DropdownItem>
                <DropdownItem key="completed" className="text-white">
                  Completed
                </DropdownItem>
                <DropdownItem key="cancelled" className="text-white">
                  Cancelled
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
          </div>
        </div>

        {/* Listings Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="p-6 rounded-xl bg-white/5 border border-white/10"
              >
                <Skeleton className="w-full h-32 rounded-lg mb-4" />
                <Skeleton className="w-3/4 h-6 rounded mb-2" />
                <Skeleton className="w-1/2 h-4 rounded" />
              </div>
            ))}
          </div>
        ) : filteredListings.length > 0 ? (
          <>
            <motion.div
              variants={containerVariantsFast}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {filteredListings.map((listing) => (
                <MotionGlassCard
                  key={listing.id}
                  variants={itemVariants}
                  glow="none"
                  padding="none"
                  hover
                >
                  <Link href={`/listings/${listing.id}`} className="block p-6">
                    <div className="flex items-start justify-between mb-4">
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
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => toggleFavorite(listing.id, e)}
                          className="p-1 rounded-full hover:bg-white/10 transition-colors"
                        >
                          <Heart
                            className={"w-4 h-4 " + (favoriteIds.has(listing.id) ? "fill-rose-500 text-rose-500" : "text-white/40")}
                          />
                        </button>
                        <div className="flex items-center gap-1 text-white/70">
                          <Clock className="w-4 h-4" />
                          <span className="text-sm font-medium">{listing.time_credits}h</span>
                        </div>
                      </div>
                    </div>

                    <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2">
                      {listing.title}
                    </h3>
                    <p className="text-sm text-white/50 mb-4 line-clamp-2">
                      {listing.description}
                    </p>

                    <div className="flex items-center gap-3 pt-4 border-t border-white/10">
                      <Avatar
                        name={`${listing.user?.first_name} ${listing.user?.last_name}`}
                        size="sm"
                        className="ring-2 ring-white/10"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {listing.user?.first_name} {listing.user?.last_name}
                        </p>
                        <p className="text-xs text-white/40">
                          {new Date(listing.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </Link>
                </MotionGlassCard>
              ))}
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
              <Search className="w-8 h-8 text-white/20" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              No listings found
            </h3>
            <p className="text-white/50 mb-6">
              {searchQuery
                ? "Try adjusting your search terms"
                : "Be the first to create a listing!"}
            </p>
            <Link href="/listings/new">
              <Button
                className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white"
                startContent={<Plus className="w-4 h-4" />}
              >
                Create Listing
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
