// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/**
 * Federation Partners (Admin) — partner-tenant relationship management.
 *
 *   GET /api/admin/system/federation/partners?status=...
 *   PUT /api/admin/system/federation/partners/{id}/suspend
 *   PUT /api/admin/system/federation/partners/{id}/resume    (if exposed)
 */

import { useCallback, useEffect, useState } from 'react';
import {
  Button, Card, CardBody, CardHeader, Chip, Select, SelectItem, Spinner,
  Table, TableBody, TableCell, TableColumn, TableHeader, TableRow,
} from '@heroui/react';
import { Globe, RefreshCw, Pause, Play } from 'lucide-react';
import { usePageTitle } from '@/hooks';
import { useToast } from '@/contexts';
import { api } from '@/lib/api';
import { PageHeader } from '../../components';

type PartnerStatus = 'pending' | 'active' | 'suspended' | 'revoked';

interface Partner {
  id: number;
  tenant_id: number;
  partner_tenant_id: number;
  status: PartnerStatus;
  shared_listings: boolean;
  shared_events: boolean;
  shared_members: boolean;
  credit_exchange_rate: number;
  created_at: string;
}

const STATUS_OPTIONS: Array<PartnerStatus | 'All'> = ['All', 'pending', 'active', 'suspended', 'revoked'];

function statusColor(s: PartnerStatus): 'default' | 'primary' | 'success' | 'warning' | 'danger' {
  switch (s) {
    case 'pending': return 'warning';
    case 'active': return 'success';
    case 'suspended': return 'warning';
    case 'revoked': return 'danger';
  }
}

export default function AdminFederationPartnersPage() {
  usePageTitle('Admin - Federation Partners');
  const toast = useToast();
  const [filter, setFilter] = useState<PartnerStatus | 'All'>('All');
  const [rows, setRows] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const url = filter === 'All'
        ? '/v2/admin/system/federation/partners'
        : `/v2/admin/system/federation/partners?status=${encodeURIComponent(filter)}`;
      const res = await api.get<{ data: Partner[]; total: number }>(url);
      if (res.success && res.data) {
        const payload = (res.data as unknown) as { data?: Partner[] };
        setRows(payload.data ?? []);
      }
    } catch { toast.error('Failed to load partners'); }
    finally { setLoading(false); }
  }, [filter, toast]);

  useEffect(() => { load(); }, [load]);

  const suspend = useCallback(async (id: number) => {
    setWorking(id);
    try {
      const res = await api.put(`/v2/admin/system/federation/partners/${id}/suspend`, {});
      if (res.success) {
        toast.success('Partner suspended');
        await load();
      } else { toast.error('Suspend failed'); }
    } catch { toast.error('Suspend failed'); }
    finally { setWorking(null); }
  }, [toast, load]);

  return (
    <div>
      <PageHeader
        title="Federation Partners"
        description="Manage cross-tenant partnerships. Suspending a partner immediately stops all federated content + cross-tenant exchanges with that tenant."
        actions={
          <div className="flex items-center gap-2">
            <Select size="sm" variant="bordered" className="w-44"
              selectedKeys={new Set([filter])}
              onSelectionChange={(keys) => {
                const v = Array.from(keys)[0] as PartnerStatus | 'All' | undefined;
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
          <Globe size={18} className="text-primary" />
          <h3 className="text-lg font-semibold">Partners ({rows.length})</h3>
        </CardHeader>
        <CardBody>
          <Table aria-label="Federation partners" isStriped>
            <TableHeader>
              <TableColumn>ID</TableColumn>
              <TableColumn>Partner tenant</TableColumn>
              <TableColumn>Status</TableColumn>
              <TableColumn>Shares</TableColumn>
              <TableColumn>Exchange rate</TableColumn>
              <TableColumn>Created</TableColumn>
              <TableColumn>Action</TableColumn>
            </TableHeader>
            <TableBody emptyContent="No partners" isLoading={loading} loadingContent={<Spinner />}>
              {rows.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>#{p.id}</TableCell>
                  <TableCell>Tenant #{p.partner_tenant_id}</TableCell>
                  <TableCell>
                    <Chip color={statusColor(p.status)} variant="flat" size="sm">{p.status}</Chip>
                  </TableCell>
                  <TableCell className="text-xs">
                    {p.shared_listings && 'Listings '}{p.shared_events && 'Events '}{p.shared_members && 'Members '}
                    {!p.shared_listings && !p.shared_events && !p.shared_members && '—'}
                  </TableCell>
                  <TableCell className="text-xs">{p.credit_exchange_rate.toFixed(2)}×</TableCell>
                  <TableCell className="text-xs text-default-500">{new Date(p.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    {p.status === 'active' && (
                      <Button size="sm" variant="flat" color="warning" isLoading={working === p.id}
                        startContent={<Pause size={14} />} onPress={() => suspend(p.id)}>
                        Suspend
                      </Button>
                    )}
                    {p.status === 'suspended' && (
                      <Chip size="sm" variant="flat" color="default">Suspended</Chip>
                    )}
                    {(p.status === 'pending' || p.status === 'revoked') && (
                      <Chip size="sm" variant="flat" color="default">{p.status}</Chip>
                    )}
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
