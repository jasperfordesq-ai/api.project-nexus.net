// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/**
 * Smart Match Page (Item 13 — path-to-1000)
 *
 * Member-facing wrapper around the native MatchingController endpoints
 * (/api/matching). Distinct from the existing /matches page (which calls
 * the cross-module compatibility alias /v2/matches/all):
 *
 *   - GET  /api/matching            — paginated personal matches
 *   - POST /api/matching/compute    — trigger fresh match computation
 *   - GET  /api/matching/{id}       — match detail with `reasons`
 *   - PUT  /api/matching/{id}/respond — accept / decline a match
 *
 * Renders score, top reasons, expandable "Why matched?" detail, accept/
 * decline actions, and an empty state with a "Compute matches" CTA.
 */

import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Button,
  Card,
  CardBody,
  Chip,
  Progress,
  Spinner,
  Accordion,
  AccordionItem,
} from '@heroui/react';
import {
  Sparkles,
  RefreshCw,
  Check,
  X,
  Info,
  ArrowRight,
  Target,
} from 'lucide-react';
import { useTenant, useToast, useAuth } from '@/contexts';
import { usePageTitle } from '@/hooks';
import { api } from '@/lib/api';
import { logError } from '@/lib/logger';
import { EmptyState } from '@/components/feedback';

// ─── Types ───────────────────────────────────────────────────────────────────

type MatchStatus = 'pending' | 'viewed' | 'accepted' | 'declined' | 'expired';

interface MatchUser {
  id: number;
  first_name: string | null;
  last_name: string | null;
  level?: number | null;
  total_xp?: number | null;
}

interface MatchListing {
  id: number;
  title: string;
  description?: string | null;
  type?: string;
  category_id?: number | null;
  estimated_hours?: number | null;
}

interface SmartMatch {
  id: number;
  matched_user: MatchUser | null;
  matched_listing: MatchListing | null;
  score: number;
  status: MatchStatus;
  viewed_at?: string | null;
  responded_at?: string | null;
  created_at: string;
  // Detail-only — populated lazily when user expands "Why matched?".
  reasons?: string[];
}

interface MatchListResponse {
  data: SmartMatch[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

interface MatchDetailResponse {
  id: number;
  reasons?: string[];
  matched_user: MatchUser | null;
  matched_listing: MatchListing | null;
  score: number;
  status: MatchStatus;
}

// ─── Utilities ───────────────────────────────────────────────────────────────

function fullName(u: MatchUser | null): string {
  if (!u) return 'Someone';
  const first = (u.first_name ?? '').trim();
  const last = (u.last_name ?? '').trim();
  const composed = `${first} ${last}`.trim();
  return composed.length > 0 ? composed : 'Someone';
}

function scoreColor(score: number): 'success' | 'warning' | 'default' {
  if (score >= 80) return 'success';
  if (score >= 60) return 'warning';
  return 'default';
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function SmartMatchPage() {
  usePageTitle('Smart Match');
  useAuth();
  const { tenantPath } = useTenant();
  const toast = useToast();

  const [matches, setMatches] = useState<SmartMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [computing, setComputing] = useState(false);
  const [responding, setResponding] = useState<number | null>(null);
  const [reasonCache, setReasonCache] = useState<Record<number, string[]>>({});
  const [page] = useState(1);

  const loadMatches = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<MatchListResponse>(`/matching?page=${page}&limit=20`);
      if (res.success && res.data) {
        // Backend returns a raw envelope { data, pagination }; the api client
        // sometimes auto-unwraps, sometimes not — be defensive.
        const payload = res.data as unknown as MatchListResponse | { data: MatchListResponse };
        const list = (payload as MatchListResponse).data
          ?? ((payload as { data: MatchListResponse }).data?.data);
        setMatches(Array.isArray(list) ? list : []);
      }
    } catch (err) {
      logError('SmartMatchPage.loadMatches', err);
      toast.error('Failed to load matches');
    } finally {
      setLoading(false);
    }
  }, [page, toast]);

  useEffect(() => {
    loadMatches();
  }, [loadMatches]);

  const computeMatches = useCallback(async () => {
    setComputing(true);
    try {
      const res = await api.post<{ matches_found: number }>('/matching/compute', {});
      if (res.success) {
        const found = (res.data as { matches_found?: number } | undefined)?.matches_found ?? 0;
        toast.success(found > 0 ? `Found ${found} new match${found === 1 ? '' : 'es'}` : 'No new matches yet');
        await loadMatches();
      }
    } catch (err) {
      logError('SmartMatchPage.compute', err);
      toast.error('Could not compute matches');
    } finally {
      setComputing(false);
    }
  }, [loadMatches, toast]);

  const loadReasons = useCallback(async (id: number) => {
    if (reasonCache[id]) return;
    try {
      const res = await api.get<MatchDetailResponse>(`/matching/${id}`);
      if (res.success && res.data) {
        const detail = res.data as MatchDetailResponse;
        const reasons = Array.isArray(detail.reasons) ? detail.reasons : [];
        setReasonCache((prev) => ({ ...prev, [id]: reasons }));
      }
    } catch (err) {
      logError('SmartMatchPage.loadReasons', err);
    }
  }, [reasonCache]);

  const respond = useCallback(async (id: number, status: 'Accepted' | 'Declined') => {
    setResponding(id);
    try {
      const res = await api.put(`/matching/${id}/respond`, { status });
      if (res.success) {
        toast.success(status === 'Accepted' ? 'Match accepted' : 'Match declined');
        setMatches((prev) =>
          prev.map((m) =>
            m.id === id
              ? { ...m, status: status.toLowerCase() as MatchStatus, responded_at: new Date().toISOString() }
              : m
          )
        );
      }
    } catch (err) {
      logError('SmartMatchPage.respond', err);
      toast.error('Could not record response');
    } finally {
      setResponding(null);
    }
  }, [toast]);

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-theme-primary flex items-center gap-3">
            <span className="p-2 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20">
              <Sparkles className="w-6 h-6 text-indigo-400" aria-hidden="true" />
            </span>
            Smart Match
          </h1>
          <p className="text-theme-subtle mt-1">
            Personalised matches based on your skills, availability, and exchange history.
          </p>
        </div>
        <Button
          color="primary"
          variant="flat"
          size="sm"
          startContent={<RefreshCw className={`w-4 h-4 ${computing ? 'animate-spin' : ''}`} aria-hidden="true" />}
          onPress={computeMatches}
          isLoading={computing}
        >
          Compute matches
        </Button>
      </div>

      {/* Body */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : matches.length === 0 ? (
        <EmptyState
          icon={<Target className="w-12 h-12" />}
          title="No matches yet"
          description="Run a fresh match computation, or browse listings to give the matcher more to work with."
          action={
            <div className="flex gap-2 justify-center">
              <Button
                color="primary"
                onPress={computeMatches}
                isLoading={computing}
                startContent={<Sparkles className="w-4 h-4" aria-hidden="true" />}
              >
                Compute matches
              </Button>
              <Link to={tenantPath('/listings')}>
                <Button variant="flat">Browse listings</Button>
              </Link>
            </div>
          }
        />
      ) : (
        <div className="space-y-3">
          {matches.map((m) => {
            const isTerminal = m.status === 'accepted' || m.status === 'declined' || m.status === 'expired';
            const subjectName = fullName(m.matched_user);
            const subjectListing = m.matched_listing?.title;
            const detailHref = m.matched_listing
              ? tenantPath(`/listings/${m.matched_listing.id}`)
              : m.matched_user
                ? tenantPath(`/profile/${m.matched_user.id}`)
                : null;

            return (
              <Card key={m.id} className="bg-theme-elevated">
                <CardBody className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Score */}
                    <div className="flex-shrink-0 w-16 text-center">
                      <div className="text-2xl font-bold text-theme-primary">{m.score}</div>
                      <div className="text-[10px] uppercase tracking-wide text-theme-subtle">score</div>
                    </div>

                    {/* Body */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-theme-primary truncate">
                          {subjectListing ?? subjectName}
                        </h3>
                        <Chip size="sm" variant="flat" color={scoreColor(m.score)}>
                          {m.status}
                        </Chip>
                        {m.matched_listing?.type && (
                          <Chip size="sm" variant="flat">{m.matched_listing.type}</Chip>
                        )}
                      </div>
                      {m.matched_listing && m.matched_user && (
                        <p className="text-sm text-theme-secondary mt-1">
                          Posted by {subjectName}
                        </p>
                      )}
                      {m.matched_listing?.description && (
                        <p className="text-sm text-theme-secondary mt-1 line-clamp-2">
                          {m.matched_listing.description}
                        </p>
                      )}

                      <div className="mt-3 max-w-xs">
                        <Progress
                          aria-label={`Match score ${m.score}`}
                          value={m.score}
                          size="sm"
                          color={scoreColor(m.score)}
                        />
                      </div>

                      {/* Why matched? */}
                      <Accordion
                        variant="light"
                        className="mt-2 px-0"
                        onSelectionChange={(keys) => {
                          const arr = Array.from(keys as Set<string>);
                          if (arr.includes(`reasons-${m.id}`)) loadReasons(m.id);
                        }}
                      >
                        <AccordionItem
                          key={`reasons-${m.id}`}
                          aria-label="Why matched"
                          startContent={<Info className="w-4 h-4 text-indigo-400" aria-hidden="true" />}
                          title={<span className="text-sm">Why matched?</span>}
                          classNames={{ title: 'text-theme-muted' }}
                        >
                          {reasonCache[m.id] === undefined ? (
                            <div className="py-2"><Spinner size="sm" /></div>
                          ) : reasonCache[m.id].length === 0 ? (
                            <p className="text-sm text-theme-subtle">No reason metadata available for this match.</p>
                          ) : (
                            <ul className="list-disc pl-5 space-y-1 text-sm text-theme-secondary">
                              {reasonCache[m.id].map((r, i) => <li key={i}>{r}</li>)}
                            </ul>
                          )}
                        </AccordionItem>
                      </Accordion>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      {!isTerminal && (
                        <>
                          <Button
                            size="sm"
                            color="success"
                            variant="flat"
                            isLoading={responding === m.id}
                            startContent={<Check className="w-4 h-4" aria-hidden="true" />}
                            onPress={() => respond(m.id, 'Accepted')}
                          >
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            color="danger"
                            variant="light"
                            isLoading={responding === m.id}
                            startContent={<X className="w-4 h-4" aria-hidden="true" />}
                            onPress={() => respond(m.id, 'Declined')}
                          >
                            Decline
                          </Button>
                        </>
                      )}
                      {detailHref && (
                        <Link to={detailHref} aria-label="View details">
                          <Button size="sm" variant="light" endContent={<ArrowRight className="w-4 h-4" aria-hidden="true" />}>
                            View
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
