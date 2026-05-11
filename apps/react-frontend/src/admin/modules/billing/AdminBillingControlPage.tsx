// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/**
 * Billing Control (Admin) — replaces the BillingControlPage parity stub.
 * Shows tenant-wide billing snapshot + active subscriptions list. Wires to:
 *   GET /api/v2/admin/super/billing/snapshot
 *   GET /api/v2/admin/billing/subscription
 */

import { useCallback, useEffect, useState } from 'react';
import {
  Button, Card, CardBody, CardHeader, Chip, Spinner, Table, TableBody,
  TableCell, TableColumn, TableHeader, TableRow,
} from '@heroui/react';
import { CreditCard, RefreshCw, TrendingUp } from 'lucide-react';
import { usePageTitle } from '@/hooks';
import { useToast } from '@/contexts';
import { api } from '@/lib/api';
import { PageHeader } from '../../components';

interface Snapshot {
  plans: number;
  active_plans: number;
  subscriptions: number;
  active_subscriptions: number;
  past_due_subscriptions: number;
  monthly_recurring_revenue: number;
  currency: string;
  generated_at: string;
}

interface Subscription {
  Id: number;
  UserId: number;
  PlanId: number;
  plan_name: string | null;
  plan_price: number;
  currency: string | null;
  status: string;
  StartedAt: string;
  NextBillingDate: string | null;
  ExpiresAt: string | null;
  has_stripe_subscription: boolean;
}

function statusColor(s: string): 'default' | 'primary' | 'success' | 'danger' | 'warning' {
  const k = (s || '').toLowerCase();
  if (k === 'active') return 'success';
  if (k === 'pastdue' || k === 'past_due') return 'warning';
  if (k === 'cancelled' || k === 'canceled' || k === 'expired') return 'danger';
  return 'default';
}

function fmtDate(s?: string | null): string {
  return s ? new Date(s).toLocaleDateString() : '—';
}

export default function AdminBillingControlPage() {
  usePageTitle('Admin - Billing Control');
  const toast = useToast();
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [snapRes, subRes] = await Promise.all([
        api.get<{ data: Snapshot }>('/v2/admin/super/billing/snapshot'),
        api.get<{ data: Subscription[] }>('/v2/admin/billing/subscription'),
      ]);
      if (snapRes.success && snapRes.data) {
        const p = (snapRes.data as unknown) as { data?: Snapshot };
        setSnapshot(p.data ?? null);
      }
      if (subRes.success && subRes.data) {
        const p = (subRes.data as unknown) as { data?: Subscription[] };
        setSubs(p.data ?? []);
      }
    } catch {
      toast.error('Failed to load billing data');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const stat = (label: string, value: string | number) => (
    <Card shadow="sm" className="flex-1 min-w-[140px]">
      <CardBody className="py-3">
        <div className="text-default-500 text-xs uppercase tracking-wide">{label}</div>
        <div className="text-2xl font-semibold mt-1">{value}</div>
      </CardBody>
    </Card>
  );

  return (
    <div>
      <PageHeader
        title="Billing Control"
        description="Tenant-wide billing snapshot and active subscription list."
        actions={
          <Button variant="flat" size="sm" startContent={<RefreshCw size={16} />} onPress={load} isLoading={loading}>
            Refresh
          </Button>
        }
      />

      {snapshot && (
        <div className="flex flex-wrap gap-3 mb-4">
          {stat('Plans', `${snapshot.active_plans} / ${snapshot.plans}`)}
          {stat('Active subs', snapshot.active_subscriptions)}
          {stat('Past due', snapshot.past_due_subscriptions)}
          {stat('MRR', `${snapshot.monthly_recurring_revenue.toFixed(2)} ${snapshot.currency}`)}
        </div>
      )}

      <Card shadow="sm">
        <CardHeader className="flex items-center gap-2">
          <CreditCard size={18} className="text-primary" />
          <h3 className="text-lg font-semibold">Subscriptions</h3>
          <span className="text-default-500 text-xs ml-auto">
            <TrendingUp size={12} className="inline mr-1" />
            {subs.length} most recent
          </span>
        </CardHeader>
        <CardBody>
          <Table aria-label="Subscriptions" isStriped>
            <TableHeader>
              <TableColumn>ID</TableColumn>
              <TableColumn>User</TableColumn>
              <TableColumn>Plan</TableColumn>
              <TableColumn className="text-right">Price</TableColumn>
              <TableColumn>Status</TableColumn>
              <TableColumn>Started</TableColumn>
              <TableColumn>Next bill</TableColumn>
              <TableColumn>Stripe</TableColumn>
            </TableHeader>
            <TableBody emptyContent="No subscriptions found" isLoading={loading} loadingContent={<Spinner />}>
              {subs.map((s) => (
                <TableRow key={s.Id}>
                  <TableCell>#{s.Id}</TableCell>
                  <TableCell>#{s.UserId}</TableCell>
                  <TableCell>{s.plan_name || '—'}</TableCell>
                  <TableCell className="text-right">{s.plan_price.toFixed(2)} {s.currency || ''}</TableCell>
                  <TableCell>
                    <Chip color={statusColor(s.status)} variant="flat" size="sm">{s.status}</Chip>
                  </TableCell>
                  <TableCell className="text-default-500 text-xs">{fmtDate(s.StartedAt)}</TableCell>
                  <TableCell className="text-default-500 text-xs">{fmtDate(s.NextBillingDate)}</TableCell>
                  <TableCell>
                    {s.has_stripe_subscription
                      ? <Chip color="primary" variant="flat" size="sm">linked</Chip>
                      : <span className="text-default-400 text-xs">—</span>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardBody>
      </Card>
    </div>
  );
}
