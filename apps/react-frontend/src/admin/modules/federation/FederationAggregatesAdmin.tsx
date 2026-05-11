// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/**
 * Federation Aggregates (Admin) — replaces the parity stub with a real
 * dashboard wired to GET /api/federation/aggregates (FederationParityController)
 * plus partner / hour-transfer counts pulled from the existing
 * /api/admin/federation/protocols/transfers endpoint (Phase 68).
 *
 * The aggregates endpoint already returns tenant-scoped counts of partners,
 * listings, groups, and events, plus a global tenant count. We surface those
 * as cards, then list partner status breakdown so admins can see federation
 * health at a glance without trawling individual sub-pages.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Card, CardBody, CardHeader, Chip, Spinner, Button,
  Table, TableBody, TableCell, TableColumn, TableHeader, TableRow,
} from '@heroui/react';
import { Globe, RefreshCw, Users, Layers, Calendar, BarChart3 } from 'lucide-react';
import { usePageTitle } from '@/hooks';
import { useToast } from '@/contexts';
import { api } from '@/lib/api';
import { PageHeader } from '../../components';

interface AggregatesResponse {
  tenants: number;
  partners: number;
  listings: number;
  groups: number;
  events: number;
}

interface HourTransfer {
  id: number;
  partner_id: number | null;
  direction: string;
  status: string;
  amount: number;
  created_at: string;
}

export default function FederationAggregatesAdmin() {
  usePageTitle('Admin - Federation Aggregates');
  const toast = useToast();

  const [aggregates, setAggregates] = useState<AggregatesResponse | null>(null);
  const [transfers, setTransfers] = useState<HourTransfer[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const aggRes = await api.get<{ data: AggregatesResponse }>('/v2/federation/aggregates');
      if (aggRes.success && aggRes.data) {
        const payload = (aggRes.data as unknown) as { data?: AggregatesResponse } | AggregatesResponse;
        const data = ('data' in payload ? payload.data : payload) as AggregatesResponse | undefined;
        setAggregates(data ?? null);
      }
      const txRes = await api.get<{ data: HourTransfer[] }>('/v2/admin/federation/protocols/transfers');
      if (txRes.success && txRes.data) {
        const payload = (txRes.data as unknown) as { data?: HourTransfer[] } | HourTransfer[];
        const data = Array.isArray(payload) ? payload : payload.data ?? [];
        setTransfers(data);
      }
    } catch {
      toast.error('Failed to load federation aggregates');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const transferStatusBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of transfers) map.set(t.status, (map.get(t.status) ?? 0) + 1);
    return Array.from(map.entries()).map(([status, count]) => ({ status, count }));
  }, [transfers]);

  const cards = aggregates ? [
    { label: 'Federation Partners', value: aggregates.partners, icon: <Globe size={20} className="text-primary" /> },
    { label: 'Listings', value: aggregates.listings, icon: <Layers size={20} className="text-success" /> },
    { label: 'Groups', value: aggregates.groups, icon: <Users size={20} className="text-warning" /> },
    { label: 'Events', value: aggregates.events, icon: <Calendar size={20} className="text-secondary" /> },
    { label: 'Total Tenants (network)', value: aggregates.tenants, icon: <BarChart3 size={20} className="text-default-500" /> },
  ] : [];

  return (
    <div>
      <PageHeader
        title="Federation Aggregates"
        description="Tenant-scoped federation metrics: partner count, content totals, and hour-transfer status breakdown."
        actions={
          <Button variant="flat" size="sm" startContent={<RefreshCw size={16} />}
            onPress={load} isLoading={loading}>Refresh</Button>
        }
      />

      {loading && !aggregates && (
        <div className="flex justify-center py-10"><Spinner /></div>
      )}

      {aggregates && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5 mb-6">
          {cards.map((c) => (
            <Card key={c.label} shadow="sm">
              <CardBody className="flex flex-row items-center gap-3">
                {c.icon}
                <div>
                  <p className="text-xs text-default-500">{c.label}</p>
                  <p className="text-2xl font-semibold">{c.value.toLocaleString()}</p>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <Card shadow="sm">
        <CardHeader className="flex items-center gap-2">
          <BarChart3 size={18} className="text-primary" />
          <h3 className="text-lg font-semibold">Hour transfer status breakdown</h3>
        </CardHeader>
        <CardBody>
          <Table aria-label="Federated hour transfers" isStriped>
            <TableHeader>
              <TableColumn>Status</TableColumn>
              <TableColumn className="text-right">Count</TableColumn>
            </TableHeader>
            <TableBody emptyContent="No federated hour transfers" isLoading={loading}
              loadingContent={<Spinner />}>
              {transferStatusBreakdown.map((row) => (
                <TableRow key={row.status}>
                  <TableCell><Chip variant="flat" size="sm">{row.status}</Chip></TableCell>
                  <TableCell className="text-right font-medium">{row.count}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardBody>
      </Card>
    </div>
  );
}
