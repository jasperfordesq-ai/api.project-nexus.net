// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/**
 * Federation Activity (Admin) — recent federation event feed combining
 * the cross-tenant audit log + federation HTTP API call log.
 *
 * Endpoint (real, AdminExplicitParityController.GetFederationActivity):
 *   GET /api/v2/admin/federation/activity
 *
 * Returns up to 100 most-recent events from FederationAuditLogs +
 * FederationApiLogs. Server-side filtering is not currently exposed by
 * this endpoint, so partner / severity / search filters are applied
 * client-side over the returned page.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Button, Card, CardBody, CardHeader, Chip, Input, Modal, ModalBody, ModalContent,
  ModalFooter, ModalHeader, Select, SelectItem, Spinner, Switch,
  Table, TableBody, TableCell, TableColumn, TableHeader, TableRow,
} from '@heroui/react';
import { Activity, Pause, Play, RefreshCw, Search } from 'lucide-react';
import { usePageTitle } from '@/hooks';
import { useToast } from '@/contexts';
import { api } from '@/lib/api';
import { PageHeader } from '../../components';

interface ActivityEvent {
  source: 'audit' | 'api';
  id: number;
  action?: string | null;
  Action?: string | null;
  entityType?: string | null;
  EntityType?: string | null;
  entityId?: number | null;
  EntityId?: number | null;
  partnerTenantId?: number | null;
  PartnerTenantId?: number | null;
  createdAt?: string;
  CreatedAt?: string;
  [k: string]: unknown;
}

interface NormalizedEvent {
  source: 'audit' | 'api';
  id: number;
  action: string;
  entityType: string | null;
  entityId: number | null;
  partnerTenantId: number | null;
  createdAt: string;
  raw: ActivityEvent;
  severity: 'info' | 'warning' | 'error';
}

const SOURCE_OPTIONS: Array<'All' | 'audit' | 'api'> = ['All', 'audit', 'api'];
const SEVERITY_OPTIONS: Array<'All' | 'info' | 'warning' | 'error'> = ['All', 'info', 'warning', 'error'];

function normalize(e: ActivityEvent): NormalizedEvent {
  const action = (e.action ?? e.Action ?? '') as string;
  const lower = action.toLowerCase();
  let severity: 'info' | 'warning' | 'error' = 'info';
  if (lower.includes('fail') || lower.includes('error') || lower.includes('reject') || lower.includes(' 5')) severity = 'error';
  else if (lower.includes('warn') || lower.includes('retry') || lower.includes('cancel') || lower.includes(' 4')) severity = 'warning';

  return {
    source: e.source,
    id: e.id,
    action,
    entityType: (e.entityType ?? e.EntityType ?? null) as string | null,
    entityId: (e.entityId ?? e.EntityId ?? null) as number | null,
    partnerTenantId: (e.partnerTenantId ?? e.PartnerTenantId ?? null) as number | null,
    createdAt: (e.createdAt ?? e.CreatedAt ?? '') as string,
    raw: e,
    severity,
  };
}

function severityColor(s: NormalizedEvent['severity']): 'default' | 'primary' | 'warning' | 'danger' {
  switch (s) {
    case 'info': return 'primary';
    case 'warning': return 'warning';
    case 'error': return 'danger';
  }
}

export default function AdminFederationActivityPage() {
  usePageTitle('Admin - Federation Activity');
  const toast = useToast();
  const [rows, setRows] = useState<NormalizedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [partnerFilter, setPartnerFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'All' | 'audit' | 'api'>('All');
  const [severityFilter, setSeverityFilter] = useState<'All' | 'info' | 'warning' | 'error'>('All');
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState<NormalizedEvent | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await api.get<{ data: ActivityEvent[] }>('/v2/admin/federation/activity');
      if (res.success && res.data) {
        const payload = (res.data as unknown) as { data?: ActivityEvent[] };
        const arr = payload.data ?? [];
        setRows(arr.map(normalize));
      }
    } catch {
      if (!silent) toast.error('Failed to load federation activity');
    }
    finally { if (!silent) setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (autoRefresh) {
      timerRef.current = setInterval(() => { load(true); }, 30000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [autoRefresh, load]);

  const filtered = rows.filter((r) => {
    if (sourceFilter !== 'All' && r.source !== sourceFilter) return false;
    if (severityFilter !== 'All' && r.severity !== severityFilter) return false;
    if (partnerFilter.trim()) {
      const want = Number(partnerFilter.trim());
      if (Number.isFinite(want) && r.partnerTenantId !== want) return false;
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const haystack = `${r.action} ${r.entityType ?? ''} ${r.entityId ?? ''} ${r.partnerTenantId ?? ''}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  return (
    <div>
      <PageHeader
        title="Federation Activity"
        description="Recent cross-tenant federation events combining audit-log writes and HTTP API calls. Up to 100 most-recent events; use auto-refresh for live debugging. Severity is inferred from action text (fail/error/reject → error; warn/retry/cancel → warning)."
        actions={
          <div className="flex items-center gap-2">
            <Switch size="sm" isSelected={autoRefresh} onValueChange={setAutoRefresh}>
              <span className="text-xs flex items-center gap-1">
                {autoRefresh ? <Pause size={12} /> : <Play size={12} />}
                Auto-refresh 30s
              </span>
            </Switch>
            <Button variant="flat" size="sm" startContent={<RefreshCw size={16} />}
              onPress={() => load(false)} isLoading={loading}>Refresh</Button>
          </div>
        }
      />
      <Card shadow="sm" className="mb-3">
        <CardBody className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <Input size="sm" placeholder="Search action / entity" value={search}
            onValueChange={setSearch} startContent={<Search size={14} />} />
          <Input size="sm" type="number" placeholder="Partner tenant ID" value={partnerFilter}
            onValueChange={setPartnerFilter} />
          <Select size="sm" label="Source" selectedKeys={new Set([sourceFilter])}
            onSelectionChange={(keys) => {
              const v = Array.from(keys)[0] as 'All' | 'audit' | 'api' | undefined;
              if (v) setSourceFilter(v);
            }}>
            {SOURCE_OPTIONS.map((s) => <SelectItem key={s} textValue={s}>{s}</SelectItem>) as never}
          </Select>
          <Select size="sm" label="Severity" selectedKeys={new Set([severityFilter])}
            onSelectionChange={(keys) => {
              const v = Array.from(keys)[0] as 'All' | 'info' | 'warning' | 'error' | undefined;
              if (v) setSeverityFilter(v);
            }}>
            {SEVERITY_OPTIONS.map((s) => <SelectItem key={s} textValue={s}>{s}</SelectItem>) as never}
          </Select>
        </CardBody>
      </Card>
      <Card shadow="sm">
        <CardHeader className="flex items-center gap-2">
          <Activity size={18} className="text-primary" />
          <h3 className="text-lg font-semibold">Events ({filtered.length}{filtered.length !== rows.length ? ` of ${rows.length}` : ''})</h3>
        </CardHeader>
        <CardBody>
          <Table aria-label="Federation activity feed" isStriped
            onRowAction={(key) => {
              const found = filtered.find((r) => `${r.source}-${r.id}` === String(key));
              if (found) setDetail(found);
            }}>
            <TableHeader>
              <TableColumn>When</TableColumn>
              <TableColumn>Source</TableColumn>
              <TableColumn>Severity</TableColumn>
              <TableColumn>Action</TableColumn>
              <TableColumn>Partner</TableColumn>
              <TableColumn>Entity</TableColumn>
              <TableColumn>ID</TableColumn>
            </TableHeader>
            <TableBody emptyContent="No federation events recorded yet." isLoading={loading} loadingContent={<Spinner />}>
              {filtered.map((r) => (
                <TableRow key={`${r.source}-${r.id}`} className="cursor-pointer">
                  <TableCell className="text-xs text-default-500">
                    {r.createdAt ? new Date(r.createdAt).toLocaleString() : '—'}
                  </TableCell>
                  <TableCell>
                    <Chip size="sm" variant="flat"
                      color={r.source === 'audit' ? 'default' : 'primary'}>{r.source}</Chip>
                  </TableCell>
                  <TableCell>
                    <Chip size="sm" variant="flat" color={severityColor(r.severity)}>{r.severity}</Chip>
                  </TableCell>
                  <TableCell className="font-medium text-xs">{r.action || '(no action)'}</TableCell>
                  <TableCell className="text-xs text-default-500">
                    {r.partnerTenantId ? `#${r.partnerTenantId}` : '—'}
                  </TableCell>
                  <TableCell className="text-xs">
                    {r.entityType ? `${r.entityType}${r.entityId ? `#${r.entityId}` : ''}` : '—'}
                  </TableCell>
                  <TableCell className="text-xs text-default-500">#{r.id}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardBody>
      </Card>

      <Modal isOpen={detail !== null} onClose={() => setDetail(null)} size="2xl">
        <ModalContent>
          <ModalHeader>
            {detail?.source} #{detail?.id} — {detail?.action}
          </ModalHeader>
          <ModalBody>
            <pre className="text-xs bg-default-100 rounded p-3 overflow-auto max-h-96">
              {detail ? JSON.stringify(detail.raw, null, 2) : ''}
            </pre>
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={() => setDetail(null)}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
