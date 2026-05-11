// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/**
 * Invoice History (Admin) — replaces the InvoiceHistoryPage parity stub.
 * Wires to GET /api/v2/admin/billing/invoices (subscription-backed +
 * persisted compatibility records). Read-only audit view.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  Button, Card, CardBody, CardHeader, Chip, Spinner, Table, TableBody,
  TableCell, TableColumn, TableHeader, TableRow,
} from '@heroui/react';
import { Receipt, RefreshCw } from 'lucide-react';
import { usePageTitle } from '@/hooks';
import { useToast } from '@/contexts';
import { api } from '@/lib/api';
import { PageHeader } from '../../components';

interface Invoice {
  id: string;
  invoice_number: string;
  source: string;
  subscription_id?: number;
  user_id?: number;
  user_email?: string | null;
  plan_name?: string | null;
  amount: number;
  currency: string;
  status: string;
  issued_at?: string | null;
  due_at?: string | null;
  paid_at?: string | null;
  expires_at?: string | null;
  has_stripe_subscription?: boolean;
}

interface InvoiceMeta {
  total: number;
  subscription_backed: number;
  persisted: number;
}

function statusColor(s: string): 'default' | 'primary' | 'success' | 'danger' | 'warning' {
  const k = (s || '').toLowerCase();
  if (k === 'paid' || k === 'active') return 'success';
  if (k === 'pastdue' || k === 'past_due' || k === 'overdue') return 'warning';
  if (k === 'cancelled' || k === 'canceled' || k === 'failed') return 'danger';
  return 'default';
}

function fmtDate(s?: string | null): string {
  return s ? new Date(s).toLocaleDateString() : '—';
}

export default function AdminInvoiceHistoryPage() {
  usePageTitle('Admin - Invoice History');
  const toast = useToast();
  const [rows, setRows] = useState<Invoice[]>([]);
  const [meta, setMeta] = useState<InvoiceMeta | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ data: Invoice[]; meta: InvoiceMeta }>('/v2/admin/billing/invoices');
      if (res.success && res.data) {
        const payload = (res.data as unknown) as { data?: Invoice[]; meta?: InvoiceMeta };
        setRows(payload.data ?? []);
        setMeta(payload.meta ?? null);
      }
    } catch {
      toast.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <PageHeader
        title="Invoice History"
        description="Subscription invoices and persisted billing records."
        actions={
          <Button variant="flat" size="sm" startContent={<RefreshCw size={16} />} onPress={load} isLoading={loading}>
            Refresh
          </Button>
        }
      />

      <Card shadow="sm">
        <CardHeader className="flex items-center gap-2">
          <Receipt size={18} className="text-primary" />
          <h3 className="text-lg font-semibold">All invoices</h3>
          {meta && (
            <span className="text-default-500 text-xs ml-auto">
              {meta.total} total · {meta.subscription_backed} subscription · {meta.persisted} persisted
            </span>
          )}
        </CardHeader>
        <CardBody>
          <Table aria-label="Invoices" isStriped>
            <TableHeader>
              <TableColumn>Invoice #</TableColumn>
              <TableColumn>User</TableColumn>
              <TableColumn>Plan</TableColumn>
              <TableColumn className="text-right">Amount</TableColumn>
              <TableColumn>Status</TableColumn>
              <TableColumn>Issued</TableColumn>
              <TableColumn>Due</TableColumn>
              <TableColumn>Source</TableColumn>
            </TableHeader>
            <TableBody emptyContent="No invoices found" isLoading={loading} loadingContent={<Spinner />}>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.invoice_number}</TableCell>
                  <TableCell>{r.user_email || (r.user_id ? `#${r.user_id}` : '—')}</TableCell>
                  <TableCell>{r.plan_name || '—'}</TableCell>
                  <TableCell className="text-right font-medium">
                    {r.amount.toFixed(2)} {r.currency}
                  </TableCell>
                  <TableCell>
                    <Chip color={statusColor(r.status)} variant="flat" size="sm">{r.status}</Chip>
                  </TableCell>
                  <TableCell className="text-default-500 text-xs">{fmtDate(r.issued_at)}</TableCell>
                  <TableCell className="text-default-500 text-xs">{fmtDate(r.due_at)}</TableCell>
                  <TableCell className="text-default-500 text-xs">{r.source}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardBody>
      </Card>
    </div>
  );
}
