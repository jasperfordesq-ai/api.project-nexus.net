"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import {
  Button,
  Avatar,
  Skeleton,
  Input,
  Tabs,
  Tab,
  Chip,
  Pagination,
} from "@heroui/react";
import {
  Search,
  ListTodo,
  Users,
  Calendar,
  Clock,
  MapPin,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { ProtectedRoute } from "@/components/protected-route";
import { MotionGlassCard, GlassCard } from "@/components/glass-card";
import { useAuth } from "@/contexts/auth-context";
import { api, type Listing, type Group, type Event, type User } from "@/lib/api";
import { logger } from "@/lib/logger";
import { containerVariantsFast, itemVariants } from "@/lib/animations";

type SearchType = "all" | "listings" | "users" | "groups" | "events";

interface SearchResults {
  listings: Listing[];
  users: User[];
  groups: Group[];
  events: Event[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

interface SearchSuggestion {
  text: string;
  type: string;
  id: number;
}

export default function SearchPage() {
  return (
    <ProtectedRoute>
      <SearchContent />
    </ProtectedRoute>
  );
}

function SearchContent() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";

  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [searchType, setSearchType] = useState<SearchType>("all");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [unreadCount, setUnreadCount] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Debounce query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Fetch suggestions
  useEffect(() => {
    if (debouncedQuery.length >= 2 && showSuggestions) {
      fetchSuggestions();
    } else {
      setSuggestions([]);
    }
  }, [debouncedQuery, showSuggestions]);

  // Fetch search results when query or type changes
  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      performSearch();
    } else {
      setResults(null);
    }
  }, [debouncedQuery, searchType, currentPage]);

  useEffect(() => {
    api.getUnreadMessageCount().then((res) => setUnreadCount(res?.count || 0));
  }, []);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchSuggestions = async () => {
    try {
      const data = await api.searchSuggestions(debouncedQuery, 5);
      setSuggestions(Array.isArray(data) ? data : []);
    } catch (error) {
      logger.error("Failed to fetch suggestions:", error);
      setSuggestions([]);
    }
  };

  const performSearch = async () => {
    setIsLoading(true);
    try {
      const data = await api.search({
        q: debouncedQuery,
        type: searchType,
        page: currentPage,
        limit: 20,
      });
      setResults(data || null);
    } catch (error) {
      logger.error("Failed to search:", error);
      setResults(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    setShowSuggestions(false);
    switch (suggestion.type) {
      case "listings":
        router.push(`/listings/${suggestion.id}`);
        break;
      case "users":
        router.push(`/members/${suggestion.id}`);
        break;
      case "groups":
        router.push(`/groups/${suggestion.id}`);
        break;
      case "events":
        router.push(`/events/${suggestion.id}`);
        break;
    }
  };

  const totalResults =
    (results?.listings?.length || 0) +
    (results?.users?.length || 0) +
    (results?.groups?.length || 0) +
    (results?.events?.length || 0);

  return (
    <div className="min-h-screen">
      <Navbar user={user} unreadCount={unreadCount} onLogout={logout} />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-white mb-6">Search</h1>

          {/* Search Input with Suggestions */}
          <div className="relative">
            <Input
              ref={inputRef}
              type="text"
              placeholder="Search listings, members, groups, events..."
              value={query}
              onValueChange={setQuery}
              onFocus={() => setShowSuggestions(true)}
              startContent={<Search className="w-5 h-5 text-white/40" />}
              classNames={{
                input: "text-white placeholder:text-white/30 text-lg",
                inputWrapper: [
                  "bg-white/5",
                  "border border-white/10",
                  "hover:bg-white/10",
                  "group-data-[focus=true]:bg-white/10",
                  "group-data-[focus=true]:border-indigo-500/50",
                  "h-14",
                ],
              }}
            />

            {/* Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div
                ref={suggestionsRef}
                className="absolute top-full left-0 right-0 mt-2 z-50"
              >
                <GlassCard glow="none" padding="none">
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={`${suggestion.type}-${suggestion.id}`}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/10 transition-colors text-left"
                    >
                      <Chip
                        size="sm"
                        className={
                          suggestion.type === "listings"
                            ? "bg-emerald-500/20 text-emerald-400"
                            : suggestion.type === "users"
                            ? "bg-blue-500/20 text-blue-400"
                            : suggestion.type === "groups"
                            ? "bg-purple-500/20 text-purple-400"
                            : "bg-amber-500/20 text-amber-400"
                        }
                      >
                        {suggestion.type}
                      </Chip>
                      <span className="text-white">{suggestion.text}</span>
                      <ArrowRight className="w-4 h-4 text-white/30 ml-auto" />
                    </button>
                  ))}
                </GlassCard>
              </div>
            )}
          </div>
        </motion.div>

        {/* Type Filter Tabs */}
        {query.length >= 2 && (
          <div className="mb-6">
            <Tabs
              selectedKey={searchType}
              onSelectionChange={(key) => {
                setSearchType(key as SearchType);
                setCurrentPage(1);
              }}
              classNames={{
                tabList: "bg-white/5 border border-white/10",
                cursor: "bg-indigo-500",
                tab: "text-white/50 data-[selected=true]:text-white",
              }}
            >
              <Tab key="all" title="All" />
              <Tab key="listings" title="Listings" />
              <Tab key="users" title="Members" />
              <Tab key="groups" title="Groups" />
              <Tab key="events" title="Events" />
            </Tabs>
          </div>
        )}

        {/* Results */}
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
        ) : results && totalResults > 0 ? (
          <motion.div
            variants={containerVariantsFast}
            initial="hidden"
            animate="visible"
            className="space-y-6"
          >
            {/* Listings */}
            {results.listings?.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <ListTodo className="w-5 h-5 text-emerald-400" />
                  Listings
                </h2>
                <div className="space-y-3">
                  {results.listings.map((listing) => (
                    <MotionGlassCard
                      key={listing.id}
                      variants={itemVariants}
                      glow="none"
                      padding="md"
                      hover
                    >
                      <Link
                        href={`/listings/${listing.id}`}
                        className="flex items-center gap-4"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Chip
                              size="sm"
                              className={
                                listing.type === "offer"
                                  ? "bg-emerald-500/20 text-emerald-400"
                                  : "bg-amber-500/20 text-amber-400"
                              }
                            >
                              {listing.type}
                            </Chip>
                            <span className="text-white/50 text-sm">
                              {listing.time_credits}h
                            </span>
                          </div>
                          <h3 className="font-medium text-white">
                            {listing.title}
                          </h3>
                          <p className="text-sm text-white/50 line-clamp-1">
                            {listing.description}
                          </p>
                        </div>
                        <ArrowRight className="w-5 h-5 text-white/30" />
                      </Link>
                    </MotionGlassCard>
                  ))}
                </div>
              </div>
            )}

            {/* Users */}
            {results.users?.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-400" />
                  Members
                </h2>
                <div className="space-y-3">
                  {results.users.map((member) => (
                    <MotionGlassCard
                      key={member.id}
                      variants={itemVariants}
                      glow="none"
                      padding="md"
                      hover
                    >
                      <Link
                        href={`/members/${member.id}`}
                        className="flex items-center gap-4"
                      >
                        <Avatar
                          name={`${member.first_name} ${member.last_name}`}
                          className="ring-2 ring-white/10"
                        />
                        <div className="flex-1">
                          <h3 className="font-medium text-white">
                            {member.first_name} {member.last_name}
                          </h3>
                          {member.bio && (
                            <p className="text-sm text-white/50 line-clamp-1">
                              {member.bio}
                            </p>
                          )}
                        </div>
                        <ArrowRight className="w-5 h-5 text-white/30" />
                      </Link>
                    </MotionGlassCard>
                  ))}
                </div>
              </div>
            )}

            {/* Groups */}
            {results.groups?.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-400" />
                  Groups
                </h2>
                <div className="space-y-3">
                  {results.groups.map((group) => (
                    <MotionGlassCard
                      key={group.id}
                      variants={itemVariants}
                      glow="none"
                      padding="md"
                      hover
                    >
                      <Link
                        href={`/groups/${group.id}`}
                        className="flex items-center gap-4"
                      >
                        <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                          <Users className="w-6 h-6 text-purple-400" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium text-white">
                            {group.name}
                          </h3>
                          <p className="text-sm text-white/50">
                            {group.member_count} members
                          </p>
                        </div>
                        <ArrowRight className="w-5 h-5 text-white/30" />
                      </Link>
                    </MotionGlassCard>
                  ))}
                </div>
              </div>
            )}

            {/* Events */}
            {results.events?.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-amber-400" />
                  Events
                </h2>
                <div className="space-y-3">
                  {results.events.map((event) => (
                    <MotionGlassCard
                      key={event.id}
                      variants={itemVariants}
                      glow="none"
                      padding="md"
                      hover
                    >
                      <Link
                        href={`/events/${event.id}`}
                        className="flex items-center gap-4"
                      >
                        <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
                          <Calendar className="w-6 h-6 text-amber-400" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium text-white">
                            {event.title}
                          </h3>
                          <div className="flex items-center gap-4 text-sm text-white/50">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(event.start_time).toLocaleDateString()}
                            </span>
                            {event.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {event.location}
                              </span>
                            )}
                          </div>
                        </div>
                        <ArrowRight className="w-5 h-5 text-white/30" />
                      </Link>
                    </MotionGlassCard>
                  ))}
                </div>
              </div>
            )}

            {/* Pagination */}
            {results.pagination && results.pagination.pages > 1 && (
              <div className="flex justify-center mt-8">
                <Pagination
                  total={results.pagination.pages}
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
          </motion.div>
        ) : query.length >= 2 && !isLoading ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-white/20" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              No results found
            </h3>
            <p className="text-white/50">
              Try different keywords or check your spelling
            </p>
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-white/20" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              Start searching
            </h3>
            <p className="text-white/50">
              Enter at least 2 characters to search
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
