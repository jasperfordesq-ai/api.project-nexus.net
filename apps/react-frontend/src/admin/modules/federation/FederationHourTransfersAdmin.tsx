// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/**
 * Federation Hour Transfers (Admin) — Phase 68 protocol-layer transfer
 * monitoring + manual reconcile trigger.
 *
 * Endpoints (real, in AdminFederationProtocolsController):
 *   GET  /api/admin/federation/protocols/transfers
 *   GET  /api/admin/federation/protocols/transfers/{id}
 *   POST /api/admin/federation/protocols/transfers/{id}/cancel
 *   POST /api/admin/federation/protocols/transfers/reconcile
 */

import { useCallback, useEffect, useState } from 'react';
import {
  Button, Card, CardBody, CardHeader, Chip, Select, SelectItem, Spinner,
  Table, TableBody, TableCell, TableColumn, TableHeader, TableRow,
} from '@heroui/react';
import { Handshake, RefreshCw, Play, Ban } from 'lucide-react';
import { usePageTitle } from '@/hooks';
import { useToast } from '@/contexts';
import { api } from '@/lib/api';
import { PageHeader } from '../../components';

type TransferStatus = 'Pending' | 'Sent' | 'Acknowledged' | 'Reconciled' | 'Rejected' | 'Failed' | 'Cancelled';

interface FederatedTransfer {
  id: number;
  partner_id: number;
  direction: 'Outbound' | 'Inbound';
  local_user_id: number;
  remote_user_external_id: string | null;
  remote_user_display_name: string | null;
  amount: number;
  external_reference: string | null;
  protocol: string;
  status: TransferStatus;
  local_transaction_id: number | null;
  description: string | null;
  last_reconcile_attempt_at: string | null;
  reconciled_at: string | null;
  failure_reason: string | null;
  retry_count: number;
  created_at: string;
}

const STATUS_OPTIONS: TransferStatus[] = ['Pending', 'Sent', 'Acknowledged', 'Reconciled', 'Rejected', 'Failed', 'Cancelled'];

function statusColor(s: TransferStatus): 'default' | 'primary' | 'warning' | 'success' | 'danger' {
  switch (s) {
    case 'Pending': return 'default';
    case 'Sent': return 'primary';
    case 'Acknowledged': return 'warning';
    case 'Reconciled': return 'success';
    case 'Rejected': return 'danger';
    case 'Failed': return 'danger';
    case 'Cancelled': return 'default';
  }
}

export default function FederationHourTransfersAdmin() {
  usePageTitle('Admin - Federation Hour Transfers');
  const toast = useToast();
  const [filter, setFilter] = useState<TransferStatus | 'All'>('All');
  const [rows, setRows] = useState<FederatedTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [reconciling, setReconciling] = useState(false);
  const [working, setWorking] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const url = filter === 'All'
        ? '/v2/admin/federation/protocols/transfers'
        : `/v2/admin/federation/protocols/transfers?status=${encodeURIComponent(filter)}`;
      const res = await api.get<{ data: FederatedTransfer[] }>(url);
      if (res.success && res.data) {
        const payload = (res.data as unknown) as { data?: FederatedTransfer[] };
        setRows(payload.data ?? []);
      }
    } catch { toast.error('Failed to load transfers'); }
    finally { setLoading(false); }
  }, [filter, toast]);

  useEffect(() => { load(); }, [load]);

  const reconcile = useCallback(async () => {
    setReconciling(true);
    try {
      const res = await api.post<{ data: { advanced: number; failed: number; givenUp: number } }>(
        '/v2/admin/federation/protocols/transfers/reconcile?batchSize=50', {});
      if (res.success && res.data) {
        const payload = (res.data as unknown) as { data?: { advanced: number; failed: number; givenUp: number } };
        const r = payload.data;
        if (r) toast.success(`Reconcile tick: ${r.advanced} advanced, ${r.failed} failed, ${r.givenUp} given up`);
        await load();
      } else { toast.error('Reconcile failed'); }
    } catch { toast.error('Reconcile failed'); }
    finally { setReconciling(false); }
  }, [toast, load]);

  const cancel = useCallback(async (id: number) => {
    setWorking(id);
    try {
      const res = await api.post(`/v2/admin/federation/protocols/transfers/${id}/cancel`, {});
      if (res.success) { toast.success('Transfer cancelled'); await load(); }
      else { toast.error('Cancel rejected (already terminal?)'); }
    } catch { toast.error('Cancel failed'); }
    finally { setWorking(null); }
  }, [toast, load]);

  return (
    <div>
      <PageHeader
        title="Federation Hour Transfers"
        description="Cross-tenant credit-protocol transfer monitor. Manual reconcile triggers a tick of HourTransferReconciliationService for the current tenant (Phase 68)."
        actions={
          <div className="flex items-center gap-2">
            <Select size="sm" variant="bordered" className="w-44"
              selectedKeys={new Set([filter])}
              onSelectionChange={(keys) => {
                const v = Array.from(keys)[0] as TransferStatus | 'All' | undefined;
                if (v) setFilter(v);
              }}
              aria-label="Filter by status">
              <SelectItem key="All" textValue="All statuses">All statuses</SelectItem>
              {(STATUS_OPTIONS).map((s) => <SelectItem key={s} textValue={s}>{s}</SelectItem>) as never}
            </Select>
            <Button variant="flat" size="sm" startContent={<RefreshCw size={16} />}
              onPress={load} isLoading={loading}>Refresh</Button>
            <Button color="primary" size="sm" startContent={<Play size={16} />}
              onPress={reconcile} isLoading={reconciling}>Reconcile now</Button>
          </div>
        }
      />
      <Card shadow="sm">
        <CardHeader className="flex items-center gap-2">
          <Handshake size={18} className="text-primary" />
          <h3 className="text-lg font-semibold">Transfers ({rows.length})</h3>
        </CardHeader>
        <CardBody>
          <Table aria-label="Federated hour transfers" isStriped>
            <TableHeader>
              <TableColumn>ID</TableColumn>
              <TableColumn>Direction</TableColumn>
              <TableColumn>Partner</TableColumn>
              <TableColumn>Local user</TableColumn>
              <TableColumn className="text-right">Hours</TableColumn>
              <TableColumn>Protocol</TableColumn>
              <TableColumn>Status</TableColumn>
              <TableColumn>Retries</TableColumn>
              <TableColumn>Last attempt</TableColumn>
              <TableColumn>Action</TableColumn>
            </TableHeader>
            <TableBody emptyContent="No transfers" isLoading={loading} loadingContent={<Spinner />}>
              {rows.map((t) => {
                const isTerminal = t.status === 'Reconciled' || t.status === 'Cancelled' || t.status === 'Rejected';
                return (
                  <TableRow key={t.id}>
                    <TableCell>#{t.id}</TableCell>
                    <TableCell>{t.direction}</TableCell>
                    <TableCell>#{t.partner_id}</TableCell>
                    <TableCell>#{t.local_user_id}</TableCell>
                    <TableCell className="text-right font-medium">{t.amount.toFixed(2)}</TableCell>
                    <TableCell><code className="text-xs">{t.protocol}</code></TableCell>
                    <TableCell>
                      <Chip color={statusColor(t.status)} variant="flat" size="sm">{t.status}</Chip>
                      {t.failure_reason && (
                        <p className="text-[10px] text-danger mt-1">{t.failure_reason}</p>
                      )}
                    </TableCell>
                    <TableCell>{t.retry_count}</TableCell>
                    <TableCell className="text-xs text-default-500">
                      {t.last_reconcile_attempt_at ? new Date(t.last_reconcile_attempt_at).toLocaleString() : '—'}
                    </TableCell>
                    <TableCell>
                      {!isTerminal && (
                        <Button size="sm" variant="flat" color="danger" isLoading={working === t.id}
                          startContent={<Ban size={14} />} onPress={() => cancel(t.id)}>
                          Cancel
                        </Button>
                      )}
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
