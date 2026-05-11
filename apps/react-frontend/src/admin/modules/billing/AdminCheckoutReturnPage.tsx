// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/**
 * Checkout Return (Admin) — diagnostic view of recent Stripe checkout
 * sessions.
 *
 * Source: /api/admin/billing/checkout-sessions (AdminBillingController).
 * The endpoint reads from MoneyDonation rows (which are 1:1 with Stripe
 * Checkout Sessions created via /api/donations/checkout) and returns
 * Stripe-shaped metadata including stripe_checkout_session_id,
 * stripe_payment_intent_id, updated_at, and a computed is_stuck flag
 * (Pending + CreatedAt > 30min old) so the UI can highlight stuck rows
 * without recomputing client-side.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button, Card, CardBody, CardHeader, Chip, Select, SelectItem, Spinner,
  Table, TableBody, TableCell, TableColumn, TableHeader, TableRow,
} from '@heroui/react';
import { Receipt, RefreshCw, AlertTriangle } from 'lucide-react';
import { usePageTitle } from '@/hooks';
import { useToast } from '@/contexts';
import { api } from '@/lib/api';
import { PageHeader } from '../../components';

type DonationStatus = 'Pending' | 'Succeeded' | 'Failed' | 'Refunded' | 'Cancelled';
type Filter = DonationStatus | 'All' | 'Stuck';

interface CheckoutSession {
  id: number;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  status: DonationStatus;
  amount_minor_units: number;
  currency: string;
  donor_email: string | null;
  donor_display_name: string | null;
  failure_reason: string | null;
  created_at: string;
  updated_at: string | null;
  completed_at: string | null;
  is_stuck: boolean;
}

const FILTERS: Filter[] = ['All', 'Pending', 'Stuck', 'Succeeded', 'Failed', 'Cancelled', 'Refunded'];

function statusColor(s: DonationStatus): 'default' | 'primary' | 'success' | 'danger' | 'warning' {
  switch (s) {
    case 'Pending': return 'warning';
    case 'Succeeded': return 'success';
    case 'Failed': return 'danger';
    case 'Refunded': return 'default';
    case 'Cancelled': return 'default';
  }
}

function fmtAmount(minor: number, currency: string): string {
  return `${(minor / 100).toFixed(2)} ${currency}`;
}

export default function AdminCheckoutReturnPage() {
  usePageTitle('Admin - Checkout Sessions');
  const toast = useToast();
  const [filter, setFilter] = useState<Filter>('All');
  const [rows, setRows] = useState<CheckoutSession[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const statusParam = filter === 'All' || filter === 'Stuck' ? '' : filter;
      const url = statusParam
        ? `/v2/admin/billing/checkout-sessions?status=${encodeURIComponent(statusParam)}`
        : '/v2/admin/billing/checkout-sessions';
      const res = await api.get<{ data: CheckoutSession[]; total: number }>(url);
      if (res.success && res.data) {
        const payload = (res.data as unknown) as { data?: CheckoutSession[] };
        setRows(payload.data ?? []);
      }
    } catch { toast.error('Failed to load checkout sessions'); }
    finally { setLoading(false); }
  }, [filter, toast]);

  useEffect(() => { load(); }, [load]);

  const filteredRows = useMemo(() => {
    if (filter !== 'Stuck') return rows;
    return rows.filter((d) => d.is_stuck);
  }, [rows, filter]);

  const stuckCount = useMemo(
    () => rows.filter((d) => d.is_stuck).length,
    [rows]
  );

  return (
    <div>
      <PageHeader
        title="Checkout Sessions"
        description="Audit view of recent Stripe Checkout Sessions (via MoneyDonation rows). Pending rows older than 30 minutes are flagged as stuck — typically users who abandoned the Stripe-hosted page, or webhooks that never arrived."
        actions={
          <div className="flex items-center gap-2">
            <Select size="sm" variant="bordered" className="w-44"
              selectedKeys={new Set([filter])}
              onSelectionChange={(keys) => {
                const v = Array.from(keys)[0] as Filter | undefined;
                if (v) setFilter(v);
              }} aria-label="Status filter">
              {FILTERS.map((s) => <SelectItem key={s} textValue={s}>{s}</SelectItem>) as never}
            </Select>
            <Button variant="flat" size="sm" startContent={<RefreshCw size={16} />}
              onPress={load} isLoading={loading}>Refresh</Button>
          </div>
        }
      />
      {stuckCount > 0 && (
        <Card shadow="sm" className="mb-3 border-l-4 border-warning">
          <CardBody className="flex flex-row items-center gap-2 py-2">
            <AlertTriangle size={18} className="text-warning" />
            <span className="text-sm">
              <strong>{stuckCount}</strong> stuck pending session(s) detected (older than 30 min).
              Verify the Stripe webhook is reaching <code>/api/webhooks/stripe/donations</code>.
            </span>
          </CardBody>
        </Card>
      )}
      <Card shadow="sm">
        <CardHeader className="flex items-center gap-2">
          <Receipt size={18} className="text-primary" />
          <h3 className="text-lg font-semibold">
            {filter} sessions ({filteredRows.length})
          </h3>
        </CardHeader>
        <CardBody>
          <Table aria-label="Checkout sessions" isStriped>
            <TableHeader>
              <TableColumn>Donation</TableColumn>
              <TableColumn>Donor</TableColumn>
              <TableColumn className="text-right">Amount</TableColumn>
              <TableColumn>Status</TableColumn>
              <TableColumn>Created</TableColumn>
              <TableColumn>Completed</TableColumn>
              <TableColumn>Age</TableColumn>
            </TableHeader>
            <TableBody emptyContent={`No ${filter} sessions`} isLoading={loading} loadingContent={<Spinner />}>
              {filteredRows.map((d) => {
                const ageMs = Date.now() - new Date(d.created_at).getTime();
                const ageMin = Math.floor(ageMs / 60000);
                const stuck = d.is_stuck;
                return (
                  <TableRow key={d.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>#{d.id}</span>
                        {d.stripe_checkout_session_id && (
                          <code className="text-[10px] text-default-400">{d.stripe_checkout_session_id}</code>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {d.donor_display_name || d.donor_email || '(anonymous)'}
                    </TableCell>
                    <TableCell className="text-right font-medium">{fmtAmount(d.amount_minor_units, d.currency)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Chip color={statusColor(d.status)} variant="flat" size="sm">{d.status}</Chip>
                        {stuck && <Chip color="warning" variant="dot" size="sm">stuck</Chip>}
                      </div>
                      {d.failure_reason && (
                        <p className="text-[10px] text-danger mt-1">{d.failure_reason}</p>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-default-500">{new Date(d.created_at).toLocaleString()}</TableCell>
                    <TableCell className="text-xs text-default-500">
                      {d.completed_at ? new Date(d.completed_at).toLocaleString() : '—'}
                    </TableCell>
                    <TableCell className="text-xs text-default-500">
                      {ageMin < 60 ? `${ageMin}m` : ageMin < 1440 ? `${Math.floor(ageMin / 60)}h` : `${Math.floor(ageMin / 1440)}d`}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardBody>
      </Card>
    </div>
  );
}
