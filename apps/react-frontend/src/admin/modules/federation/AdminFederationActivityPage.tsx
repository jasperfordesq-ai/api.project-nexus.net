// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/**
 * Federation Activity (Admin) — recent federation event feed combining
 * the cross-tenant audit log + federation HTTP API call log.
 *
 * Endpoint: GET /api/v2/admin/federation/activity
 *
 * Filtering and pagination are now applied SERVER-SIDE (Fix 2). The page
 * forwards the user's filter state via query params and renders the
 * pre-paginated response. Severity is also classified server-side and
 * returned as a field on each row.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Button, Card, CardBody, CardHeader, Chip, Input, Modal, ModalBody, ModalContent,
  ModalFooter, ModalHeader, Pagination, Select, SelectItem, Spinner, Switch,
  Table, TableBody, TableCell, TableColumn, TableHeader, TableRow,
} from '@heroui/react';
import { Activity, Pause, Play, RefreshCw, Search } from 'lucide-react';
import { usePageTitle } from '@/hooks';
import { useToast } from '@/contexts';
import { api } from '@/lib/api';
import { PageHeader } from '../../components';

interface ActivityItem {
  source: 'audit' | 'api';
  id: number;
  action: string | null;
  entityType: string | null;
  entityId: number | null;
  partnerTenantId: number | null;
  createdAt: string;
  severity: 'info' | 'warning' | 'error';
  statusCode: number | null;
}

interface ActivityResponse {
  items: ActivityItem[];
  data?: ActivityItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

const SOURCE_OPTIONS: Array<'All' | 'audit' | 'api'> = ['All', 'audit', 'api'];
const SEVERITY_OPTIONS: Array<'All' | 'info' | 'warning' | 'error'> = ['All', 'info', 'warning', 'error'];
const PAGE_SIZE = 50;

function severityColor(s: ActivityItem['severity']): 'default' | 'primary' | 'warning' | 'danger' {
  switch (s) {
    case 'info': return 'primary';
    case 'warning': return 'warning';
    case 'error': return 'danger';
  }
}

export default function AdminFederationActivityPage() {
  usePageTitle('Admin - Federation Activity');
  const toast = useToast();
  const [rows, setRows] = useState<ActivityItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [page, setPage] = useState(1);
  const [partnerFilter, setPartnerFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'All' | 'audit' | 'api'>('All');
  const [severityFilter, setSeverityFilter] = useState<'All' | 'info' | 'warning' | 'error'>('All');
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState<ActivityItem | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('page_size', String(PAGE_SIZE));
      if (sourceFilter !== 'All') params.set('source', sourceFilter);
      if (severityFilter !== 'All') params.set('severity', severityFilter);
      if (partnerFilter.trim()) params.set('partner', partnerFilter.trim());
      if (search.trim()) params.set('q', search.trim());

      const res = await api.get<ActivityResponse>(`/v2/admin/federation/activity?${params.toString()}`);
      if (res.success && res.data) {
        const payload = (res.data as unknown) as ActivityResponse;
        const arr = payload.items ?? payload.data ?? [];
        setRows(arr);
        setTotal(payload.total ?? arr.length);
        setTotalPages(payload.total_pages ?? 0);
      }
    } catch {
      if (!silent) toast.error('Failed to load federation activity');
    }
    finally { if (!silent) setLoading(false); }
  }, [page, sourceFilter, severityFilter, partnerFilter, search, toast]);

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

  // Reset to page 1 whenever a filter changes.
  useEffect(() => { setPage(1); }, [sourceFilter, severityFilter, partnerFilter, search]);

  return (
    <div>
      <PageHeader
        title="Federation Activity"
        description="Recent cross-tenant federation events combining audit-log writes and HTTP API calls. Filters and pagination are applied server-side. Severity is classified server-side (HTTP 5xx + fail/error/reject → error; HTTP 4xx + warn/retry/cancel → warning)."
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
          <h3 className="text-lg font-semibold">Events (page {page} of {Math.max(totalPages, 1)} — {total} total)</h3>
        </CardHeader>
        <CardBody>
          <Table aria-label="Federation activity feed" isStriped
            onRowAction={(key) => {
              const found = rows.find((r) => `${r.source}-${r.id}` === String(key));
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
              {rows.map((r) => (
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
          {totalPages > 1 ? (
            <div className="flex justify-center mt-3">
              <Pagination
                total={totalPages}
                page={page}
                onChange={setPage}
                size="sm"
                showControls
              />
            </div>
          ) : null}
        </CardBody>
      </Card>

      <Modal isOpen={detail !== null} onClose={() => setDetail(null)} size="2xl">
        <ModalContent>
          <ModalHeader>
            {detail?.source} #{detail?.id} — {detail?.action}
          </ModalHeader>
          <ModalBody>
            <pre className="text-xs bg-default-100 rounded p-3 overflow-auto max-h-96">
              {detail ? JSON.stringify(detail, null, 2) : ''}
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
