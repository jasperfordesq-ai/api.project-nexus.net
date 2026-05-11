// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/**
 * Revenue Dashboard (Admin) — replaces the RevenueDashboardPage parity stub.
 * Aggregates monthly recurring revenue by plan from active subscriptions.
 *   GET /api/v2/admin/super/billing/revenue
 *   GET /api/v2/admin/super/billing/snapshot
 */

import { useCallback, useEffect, useState } from 'react';
import {
  Button, Card, CardBody, CardHeader, Spinner, Table, TableBody,
  TableCell, TableColumn, TableHeader, TableRow,
} from '@heroui/react';
import { TrendingUp, RefreshCw, DollarSign } from 'lucide-react';
import { usePageTitle } from '@/hooks';
import { useToast } from '@/contexts';
import { api } from '@/lib/api';
import { PageHeader } from '../../components';

interface PlanRevenue {
  plan_id: number;
  plan_name: string;
  currency: string;
  active_subscriptions: number;
  monthly_revenue: number;
}

interface Revenue {
  monthly_recurring_revenue: number;
  currency: string;
  by_plan: PlanRevenue[];
  generated_at: string;
}

interface Snapshot {
  active_subscriptions: number;
  past_due_subscriptions: number;
  monthly_recurring_revenue: number;
  currency: string;
}

export default function AdminRevenueDashboardPage() {
  usePageTitle('Admin - Revenue Dashboard');
  const toast = useToast();
  const [revenue, setRevenue] = useState<Revenue | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [revRes, snapRes] = await Promise.all([
        api.get<{ data: Revenue }>('/v2/admin/super/billing/revenue'),
        api.get<{ data: Snapshot }>('/v2/admin/super/billing/snapshot'),
      ]);
      if (revRes.success && revRes.data) {
        const p = (revRes.data as unknown) as { data?: Revenue };
        setRevenue(p.data ?? null);
      }
      if (snapRes.success && snapRes.data) {
        const p = (snapRes.data as unknown) as { data?: Snapshot };
        setSnapshot(p.data ?? null);
      }
    } catch {
      toast.error('Failed to load revenue data');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const stat = (label: string, value: string | number) => (
    <Card shadow="sm" className="flex-1 min-w-[160px]">
      <CardBody className="py-3">
        <div className="text-default-500 text-xs uppercase tracking-wide">{label}</div>
        <div className="text-2xl font-semibold mt-1">{value}</div>
      </CardBody>
    </Card>
  );

  return (
    <div>
      <PageHeader
        title="Revenue Dashboard"
        description="Monthly recurring revenue aggregated from active subscriptions."
        actions={
          <Button variant="flat" size="sm" startContent={<RefreshCw size={16} />} onPress={load} isLoading={loading}>
            Refresh
          </Button>
        }
      />

      <div className="flex flex-wrap gap-3 mb-4">
        {revenue && stat('MRR', `${revenue.monthly_recurring_revenue.toFixed(2)} ${revenue.currency}`)}
        {revenue && stat('ARR (est.)', `${(revenue.monthly_recurring_revenue * 12).toFixed(2)} ${revenue.currency}`)}
        {snapshot && stat('Active subs', snapshot.active_subscriptions)}
        {snapshot && stat('Past due', snapshot.past_due_subscriptions)}
      </div>

      <Card shadow="sm">
        <CardHeader className="flex items-center gap-2">
          <DollarSign size={18} className="text-primary" />
          <h3 className="text-lg font-semibold">Revenue by plan</h3>
          {revenue && (
            <span className="text-default-500 text-xs ml-auto">
              <TrendingUp size={12} className="inline mr-1" />
              Generated {new Date(revenue.generated_at).toLocaleString()}
            </span>
          )}
        </CardHeader>
        <CardBody>
          <Table aria-label="Revenue by plan" isStriped>
            <TableHeader>
              <TableColumn>Plan</TableColumn>
              <TableColumn className="text-right">Active subs</TableColumn>
              <TableColumn className="text-right">Monthly revenue</TableColumn>
              <TableColumn>Currency</TableColumn>
            </TableHeader>
            <TableBody emptyContent="No active subscriptions" isLoading={loading} loadingContent={<Spinner />}>
              {(revenue?.by_plan ?? []).map((p) => (
                <TableRow key={p.plan_id}>
                  <TableCell className="font-medium">{p.plan_name}</TableCell>
                  <TableCell className="text-right">{p.active_subscriptions}</TableCell>
                  <TableCell className="text-right font-medium">{p.monthly_revenue.toFixed(2)}</TableCell>
                  <TableCell className="text-default-500 text-xs">{p.currency}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardBody>
      </Card>
    </div>
  );
}
