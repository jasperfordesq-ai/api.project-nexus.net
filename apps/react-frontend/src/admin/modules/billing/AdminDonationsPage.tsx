// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/**
 * Donations (Admin) — Phase 72 fiat donations via Stripe.
 *   GET /api/admin/donations?status=Pending|Succeeded|Failed|Refunded|Cancelled
 *
 * Read-only view: refunds happen Stripe-side and are reconciled by the
 * webhook handler. Admins use this page to audit donations + spot stuck
 * Pending rows.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button, Card, CardBody, CardHeader, Chip, Select, SelectItem, Spinner,
  Table, TableBody, TableCell, TableColumn, TableHeader, TableRow,
} from '@heroui/react';
import { CircleDollarSign, RefreshCw } from 'lucide-react';
import { usePageTitle } from '@/hooks';
import { useToast } from '@/contexts';
import { api } from '@/lib/api';
import { PageHeader } from '../../components';

type DonationStatus = 'Pending' | 'Succeeded' | 'Failed' | 'Refunded' | 'Cancelled';

interface Donation {
  id: number;
  donor_user_id: number | null;
  donor_display_name: string | null;
  amount_minor_units: number;
  currency: string;
  message: string | null;
  status: DonationStatus;
  completed_at: string | null;
  failure_reason: string | null;
  created_at: string;
}

const STATUS_OPTIONS: Array<DonationStatus | 'All'> = ['All', 'Pending', 'Succeeded', 'Failed', 'Refunded', 'Cancelled'];

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

export default function AdminDonationsPage() {
  usePageTitle('Admin - Donations');
  const toast = useToast();
  const [filter, setFilter] = useState<DonationStatus | 'All'>('All');
  const [rows, setRows] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const url = filter === 'All'
        ? '/v2/admin/donations'
        : `/v2/admin/donations?status=${encodeURIComponent(filter)}`;
      const res = await api.get<{ data: Donation[]; total: number }>(url);
      if (res.success && res.data) {
        const payload = (res.data as unknown) as { data?: Donation[] };
        setRows(payload.data ?? []);
      }
    } catch { toast.error('Failed to load donations'); }
    finally { setLoading(false); }
  }, [filter, toast]);

  useEffect(() => { load(); }, [load]);

  const total = useMemo(() => {
    return rows
      .filter((d) => d.status === 'Succeeded')
      .reduce((acc, d) => acc + d.amount_minor_units, 0);
  }, [rows]);

  return (
    <div>
      <PageHeader
        title="Donations"
        description="Fiat (Stripe) donation history (Phase 72). Reconciliation runs through the /api/webhooks/stripe/donations endpoint with HMAC-SHA256 signature verification when Stripe:WebhookSecret is configured."
        actions={
          <div className="flex items-center gap-2">
            <Select size="sm" variant="bordered" className="w-44"
              selectedKeys={new Set([filter])}
              onSelectionChange={(keys) => {
                const v = Array.from(keys)[0] as DonationStatus | 'All' | undefined;
                if (v) setFilter(v);
              }} aria-label="Status filter">
              {(STATUS_OPTIONS).map((s) => <SelectItem key={s} textValue={s}>{s}</SelectItem>) as never}
            </Select>
            <Button variant="flat" size="sm" startContent={<RefreshCw size={16} />}
              onPress={load} isLoading={loading}>Refresh</Button>
          </div>
        }
      />
      <Card shadow="sm">
        <CardHeader className="flex items-center gap-2">
          <CircleDollarSign size={18} className="text-success" />
          <h3 className="text-lg font-semibold">
            {filter} ({rows.length}) — Succeeded total: {fmtAmount(total, rows[0]?.currency ?? 'EUR')}
          </h3>
        </CardHeader>
        <CardBody>
          <Table aria-label="Donations" isStriped>
            <TableHeader>
              <TableColumn>ID</TableColumn>
              <TableColumn>Donor</TableColumn>
              <TableColumn className="text-right">Amount</TableColumn>
              <TableColumn>Message</TableColumn>
              <TableColumn>Status</TableColumn>
              <TableColumn>Created</TableColumn>
              <TableColumn>Completed</TableColumn>
            </TableHeader>
            <TableBody emptyContent={`No ${filter} donations`} isLoading={loading} loadingContent={<Spinner />}>
              {rows.map((d) => (
                <TableRow key={d.id}>
                  <TableCell>#{d.id}</TableCell>
                  <TableCell className="text-sm">
                    {d.donor_display_name || (d.donor_user_id ? `User #${d.donor_user_id}` : '(anonymous)')}
                  </TableCell>
                  <TableCell className="text-right font-medium">{fmtAmount(d.amount_minor_units, d.currency)}</TableCell>
                  <TableCell className="max-w-xs truncate text-sm text-default-500">{d.message ?? '—'}</TableCell>
                  <TableCell>
                    <Chip color={statusColor(d.status)} variant="flat" size="sm">{d.status}</Chip>
                    {d.failure_reason && (
                      <p className="text-[10px] text-danger mt-1">{d.failure_reason}</p>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-default-500">{new Date(d.created_at).toLocaleString()}</TableCell>
                  <TableCell className="text-xs text-default-500">
                    {d.completed_at ? new Date(d.completed_at).toLocaleString() : '—'}
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
