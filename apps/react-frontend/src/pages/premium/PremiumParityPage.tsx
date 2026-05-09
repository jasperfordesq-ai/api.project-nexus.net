// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button, Chip, Skeleton } from '@heroui/react';
import {
  ArrowRight,
  CheckCircle2,
  CreditCard,
  Crown,
  ExternalLink,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Star,
  XCircle,
} from 'lucide-react';
import { GlassCard } from '@/components/ui';
import { EmptyState } from '@/components/feedback';
import { useAuth, useTenant, useToast } from '@/contexts';
import { usePageTitle } from '@/hooks';
import { api } from '@/lib/api';
import { logError } from '@/lib/logger';

type AnyRecord = Record<string, unknown>;

interface PremiumTier extends AnyRecord {
  id?: string | number;
  name?: string;
  price?: number;
  currency?: string;
  interval?: string;
  description?: string;
  features?: string[];
}

interface PremiumStatus extends AnyRecord {
  user_id?: number;
  userId?: number;
  tier?: string;
  status?: string;
  renews_at?: string | null;
  renewsAt?: string | null;
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

function stringValue(record: AnyRecord | null | undefined, ...keys: string[]): string {
  if (!record) return '';
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return String(value);
  }
  return '';
}

function numberValue(record: AnyRecord | null | undefined, ...keys: string[]): number | null {
  if (!record) return null;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'number') return value;
    if (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))) return Number(value);
  }
  return null;
}

function tierName(tier: PremiumTier) {
  return stringValue(tier, 'name', 'id') || 'Premium tier';
}

function tierId(tier: PremiumTier) {
  return stringValue(tier, 'id') || tierName(tier).toLowerCase().replace(/\s+/g, '-');
}

function formatPrice(tier: PremiumTier) {
  const price = numberValue(tier, 'price') ?? 0;
  if (price === 0) return 'Free';
  const currency = stringValue(tier, 'currency') || 'EUR';
  const interval = stringValue(tier, 'interval') || 'month';
  return `${new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(price)} / ${interval}`;
}

function routeMode(pathname: string) {
  if (pathname.endsWith('/return')) return 'return';
  if (pathname.endsWith('/manage')) return 'manage';
  return 'plans';
}

export function PremiumParityPage() {
  const { pathname } = useLocation();
  const mode = routeMode(pathname);
  const { isAuthenticated } = useAuth();
  const { tenantPath } = useTenant();
  const toast = useToast();
  const [tiers, setTiers] = useState<PremiumTier[]>([]);
  const [status, setStatus] = useState<PremiumStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  usePageTitle(mode === 'manage' ? 'Manage Premium' : mode === 'return' ? 'Premium Return' : 'Premium');

  const loadPremium = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [tiersRes, statusRes] = await Promise.all([
        api.get<PremiumTier[]>('/v2/member-premium/tiers', { skipAuth: !isAuthenticated }),
        isAuthenticated ? api.get<PremiumStatus>('/v2/member-premium/me') : Promise.resolve(null),
      ]);
      setTiers(asArray(tiersRes.data));
      setStatus(statusRes?.data ?? null);
    } catch (err) {
      logError('PremiumParityPage.loadPremium', err);
      setError('Premium details could not be loaded.');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadPremium();
  }, [loadPremium]);

  const currentTier = stringValue(status, 'tier') || 'free';
  const statusLabel = stringValue(status, 'status') || (isAuthenticated ? 'inactive' : 'guest');

  const benefits = useMemo(() => [
    'Priority marketplace promotions',
    'Expanded seller and collection limits',
    'Advanced job and exchange insights',
    'Early access to partner marketplace tools',
  ], []);

  const startCheckout = async (tier: PremiumTier) => {
    const id = tierId(tier);
    setIsSaving(id);
    try {
      const res = await api.post<{ checkout_url?: string; checkoutUrl?: string; tier?: string }>('/v2/member-premium/checkout', { tier: id });
      if (res.success) {
        const checkoutUrl = res.data?.checkout_url ?? res.data?.checkoutUrl;
        toast.success('Checkout session prepared');
        if (checkoutUrl && checkoutUrl.startsWith('http')) {
          window.location.assign(checkoutUrl);
        }
      } else {
        toast.error(res.error ?? 'Could not start checkout');
      }
    } finally {
      setIsSaving(null);
    }
  };

  const openBillingPortal = async () => {
    setIsSaving('portal');
    try {
      const res = await api.post<{ url?: string }>('/v2/member-premium/billing-portal', {});
      if (res.success) {
        toast.success('Billing portal ready');
        if (res.data?.url && res.data.url.startsWith('http')) {
          window.location.assign(res.data.url);
        }
      } else {
        toast.error(res.error ?? 'Could not open billing portal');
      }
    } finally {
      setIsSaving(null);
    }
  };

  const cancelPremium = async () => {
    setIsSaving('cancel');
    try {
      const res = await api.post('/v2/member-premium/cancel', {});
      if (res.success) {
        toast.success('Premium cancellation recorded');
        await loadPremium();
      } else {
        toast.error(res.error ?? 'Could not cancel premium');
      }
    } finally {
      setIsSaving(null);
    }
  };

  if (isLoading) {
    return (
      <section className="space-y-5">
        <PremiumHeader mode={mode} statusLabel={statusLabel} currentTier={currentTier} />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((item) => (
            <GlassCard key={item} className="p-5 space-y-3">
              <Skeleton className="rounded-lg"><div className="h-6 w-2/3 rounded-lg bg-default-300" /></Skeleton>
              <Skeleton className="rounded-lg"><div className="h-4 w-full rounded-lg bg-default-200" /></Skeleton>
              <Skeleton className="rounded-lg"><div className="h-24 w-full rounded-lg bg-default-200" /></Skeleton>
            </GlassCard>
          ))}
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="space-y-5">
        <PremiumHeader mode={mode} statusLabel={statusLabel} currentTier={currentTier} />
        <GlassCard className="p-8 text-center">
          <p className="text-danger mb-4">{error}</p>
          <Button color="primary" variant="flat" onPress={loadPremium}>Try again</Button>
        </GlassCard>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <PremiumHeader mode={mode} statusLabel={statusLabel} currentTier={currentTier} />

      {mode === 'return' && (
        <GlassCard className="p-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-theme-primary">Checkout returned</h2>
              <p className="text-theme-muted mt-1">Your premium status has been refreshed from the member premium API.</p>
            </div>
            <Button color="primary" startContent={<RefreshCw className="w-4 h-4" />} onPress={loadPremium}>
              Refresh status
            </Button>
          </div>
        </GlassCard>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-4">
        <div className="space-y-4">
          {mode !== 'manage' && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {tiers.length === 0 ? (
                <div className="md:col-span-2 xl:col-span-3">
                  <EmptyState icon={<Crown className="w-12 h-12" />} title="No premium tiers" description="Premium tiers will appear here when configured." />
                </div>
              ) : (
                tiers.map((tier) => (
                  <TierCard
                    key={tierId(tier)}
                    tier={tier}
                    currentTier={currentTier}
                    isSaving={isSaving === tierId(tier)}
                    onCheckout={startCheckout}
                  />
                ))
              )}
            </div>
          )}

          {mode === 'manage' && (
            <GlassCard className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-theme-primary">Subscription</h2>
                  <p className="text-theme-muted mt-1">Current tier: <span className="font-semibold text-theme-primary">{currentTier}</span></p>
                  <p className="text-theme-muted">Status: <span className="font-semibold text-theme-primary">{statusLabel}</span></p>
                </div>
                <Chip color={statusLabel === 'active' ? 'success' : 'default'} variant="flat">{statusLabel}</Chip>
              </div>
              <div className="flex flex-wrap gap-2 mt-5">
                <Button
                  color="primary"
                  isLoading={isSaving === 'portal'}
                  startContent={<ExternalLink className="w-4 h-4" />}
                  onPress={openBillingPortal}
                >
                  Billing portal
                </Button>
                <Button
                  color="danger"
                  variant="flat"
                  isLoading={isSaving === 'cancel'}
                  startContent={<XCircle className="w-4 h-4" />}
                  onPress={cancelPremium}
                >
                  Cancel premium
                </Button>
              </div>
            </GlassCard>
          )}
        </div>

        <div className="space-y-4">
          <GlassCard className="p-5">
            <h2 className="text-lg font-semibold text-theme-primary flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-500" aria-hidden="true" />
              Member benefits
            </h2>
            <div className="space-y-3 mt-4">
              {benefits.map((benefit) => (
                <div key={benefit} className="flex gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" aria-hidden="true" />
                  <p className="text-sm text-theme-muted">{benefit}</p>
                </div>
              ))}
            </div>
          </GlassCard>

          <GlassCard className="p-5">
            <h2 className="text-lg font-semibold text-theme-primary">Related paths</h2>
            <div className="space-y-2 mt-4">
              <Link to={tenantPath('/premium')}>
                <Button className="w-full justify-between" variant="flat" endContent={<ArrowRight className="w-4 h-4" />}>Plans</Button>
              </Link>
              <Link to={tenantPath('/premium/manage')}>
                <Button className="w-full justify-between" variant="flat" endContent={<ArrowRight className="w-4 h-4" />}>Manage</Button>
              </Link>
              <Link to={tenantPath('/marketplace/sell')}>
                <Button className="w-full justify-between" variant="flat" endContent={<ArrowRight className="w-4 h-4" />}>Seller tools</Button>
              </Link>
            </div>
          </GlassCard>
        </div>
      </div>
    </section>
  );
}

function PremiumHeader({ mode, statusLabel, currentTier }: { mode: string; statusLabel: string; currentTier: string }) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-fuchsia-500 to-sky-600 flex items-center justify-center">
            <Crown className="w-5 h-5 text-white" aria-hidden="true" />
          </div>
          <Chip variant="flat" color="secondary">Premium</Chip>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-theme-primary tracking-normal">
          {mode === 'manage' ? 'Manage premium' : mode === 'return' ? 'Premium return' : 'Premium membership'}
        </h1>
        <p className="text-theme-muted mt-1 max-w-3xl">
          Plans, checkout return, and billing management now use the member premium API routes.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 min-w-64">
        <GlassCard className="p-4">
          <p className="text-xs uppercase tracking-wide text-theme-subtle">Tier</p>
          <p className="text-xl font-bold text-theme-primary mt-1">{currentTier}</p>
        </GlassCard>
        <GlassCard className="p-4">
          <p className="text-xs uppercase tracking-wide text-theme-subtle">Status</p>
          <p className="text-xl font-bold text-theme-primary mt-1">{statusLabel}</p>
        </GlassCard>
      </div>
    </div>
  );
}

function TierCard({ tier, currentTier, isSaving, onCheckout }: { tier: PremiumTier; currentTier: string; isSaving: boolean; onCheckout: (tier: PremiumTier) => void }) {
  const id = tierId(tier);
  const active = id === currentTier;
  const features = Array.isArray(tier.features) && tier.features.length > 0
    ? tier.features
    : ['Premium marketplace visibility', 'Priority support queue', 'Advanced community insights'];

  return (
    <GlassCard className="p-5 h-full">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-theme-primary">{tierName(tier)}</h2>
          <p className="text-2xl font-bold text-theme-primary mt-2">{formatPrice(tier)}</p>
        </div>
        {active ? <Chip color="success" variant="flat">Current</Chip> : <Sparkles className="w-5 h-5 text-secondary" />}
      </div>
      {tier.description && <p className="text-sm text-theme-muted mt-3">{tier.description}</p>}
      <div className="space-y-2 mt-4">
        {features.map((feature) => (
          <div key={feature} className="flex items-center gap-2 text-sm text-theme-muted">
            <Star className="w-4 h-4 text-warning" aria-hidden="true" />
            {feature}
          </div>
        ))}
      </div>
      <Button
        className="w-full mt-5 bg-gradient-to-r from-fuchsia-500 to-sky-600 text-white"
        isDisabled={active}
        isLoading={isSaving}
        startContent={<CreditCard className="w-4 h-4" />}
        onPress={() => onCheckout(tier)}
      >
        {active ? 'Current plan' : 'Choose plan'}
      </Button>
    </GlassCard>
  );
}

export default PremiumParityPage;
