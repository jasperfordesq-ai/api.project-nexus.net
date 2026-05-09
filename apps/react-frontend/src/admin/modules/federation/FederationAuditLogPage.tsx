// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/**
 * Federation Audit Log (Admin) — read-only audit trail of cross-tenant
 * federation actions (partnership requests, listings shared, exchanges,
 * config changes).
 *
 * Endpoint: GET /api/admin/system/federation/audit-log?partnerId=&page=&limit=
 */

import { useCallback, useEffect, useState } from 'react';
import {
  Button, Card, CardBody, CardHeader, Input, Spinner,
  Table, TableBody, TableCell, TableColumn, TableHeader, TableRow,
} from '@heroui/react';
import { ScrollText, RefreshCw } from 'lucide-react';
import { usePageTitle } from '@/hooks';
import { useToast } from '@/contexts';
import { api } from '@/lib/api';
import { PageHeader } from '../../components';

interface AuditEntry {
  id: number;
  tenant_id: number;
  partner_tenant_id: number | null;
  action: string;
  entity_type: string | null;
  entity_id: number | null;
  actor_id: number | null;
  metadata: unknown;
  created_at: string;
}

export default function FederationAuditLogPage() {
  usePageTitle('Admin - Federation Audit Log');
  const toast = useToast();
  const [partnerId, setPartnerId] = useState('');
  const [page, setPage] = useState(1);
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (partnerId) params.set('partnerId', partnerId);
      params.set('page', String(page));
      params.set('limit', '50');
      const res = await api.get<AuditEntry[]>(`/v2/admin/system/federation/audit-log?${params}`);
      if (res.success) {
        setEntries(Array.isArray(res.data) ? res.data : []);
        const meta = res.meta;
        setTotal(meta?.total ?? meta?.total_items ?? 0);
        setTotalPages(meta?.total_pages ?? meta?.last_page ?? 1);
      }
    } catch { toast.error('Failed to load audit log'); }
    finally { setLoading(false); }
  }, [partnerId, page, toast]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <PageHeader
        title="Federation Audit Log"
        description="Read-only audit trail of cross-tenant federation actions. Used for compliance reviews + partner-incident triage."
        actions={
          <Button variant="flat" size="sm" startContent={<RefreshCw size={16} />}
            onPress={load} isLoading={loading}>Refresh</Button>
        }
      />
      <Card shadow="sm" className="mb-3">
        <CardBody className="flex items-end gap-3">
          <Input label="Filter by partner tenant ID" type="number" value={partnerId}
            onValueChange={(v) => { setPartnerId(v); setPage(1); }} className="max-w-xs" />
          <p className="text-xs text-default-500">
            {`${total} entries · page ${page}/${totalPages}`}
          </p>
        </CardBody>
      </Card>
      <Card shadow="sm">
        <CardHeader className="flex items-center gap-2">
          <ScrollText size={18} className="text-primary" />
          <h3 className="text-lg font-semibold">Audit entries</h3>
        </CardHeader>
        <CardBody>
          <Table aria-label="Federation audit log" isStriped>
            <TableHeader>
              <TableColumn>ID</TableColumn>
              <TableColumn>Action</TableColumn>
              <TableColumn>Partner</TableColumn>
              <TableColumn>Entity</TableColumn>
              <TableColumn>Actor</TableColumn>
              <TableColumn>When</TableColumn>
            </TableHeader>
            <TableBody emptyContent="No audit entries" isLoading={loading} loadingContent={<Spinner />}>
              {entries.map((e) => (
                <TableRow key={e.id}>
                  <TableCell>#{e.id}</TableCell>
                  <TableCell className="font-medium">{e.action}</TableCell>
                  <TableCell className="text-xs text-default-500">
                    {e.partner_tenant_id ? `Partner #${e.partner_tenant_id}` : '—'}
                  </TableCell>
                  <TableCell className="text-xs">
                    {e.entity_type ? `${e.entity_type}#${e.entity_id ?? '?'}` : '—'}
                  </TableCell>
                  <TableCell className="text-xs text-default-500">
                    {e.actor_id ? `User #${e.actor_id}` : '—'}
                  </TableCell>
                  <TableCell className="text-xs text-default-500">{new Date(e.created_at).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="mt-3 flex justify-end gap-2">
            <Button size="sm" variant="flat" isDisabled={page <= 1}
              onPress={() => setPage((p) => Math.max(1, p - 1))}>Prev</Button>
            <Button size="sm" variant="flat" isDisabled={page >= totalPages}
              onPress={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
