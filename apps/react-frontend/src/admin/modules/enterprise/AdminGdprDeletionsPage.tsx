// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/**
 * GDPR Deletion Requests (Admin) — Right-to-be-forgotten queue.
 *
 *   GET /api/admin/privacy/deletions?status=pending|approved|rejected|completed
 *
 * Read-only review queue; approve/reject endpoints exist on
 * /api/admin/privacy/deletions/{id}/{approve|reject} when wired
 * (defer to a follow-up if endpoints not present).
 */

import { useCallback, useEffect, useState } from 'react';
import {
  Button, Card, CardBody, CardHeader, Chip, Select, SelectItem, Spinner,
  Table, TableBody, TableCell, TableColumn, TableHeader, TableRow,
} from '@heroui/react';
import { ShieldOff, RefreshCw } from 'lucide-react';
import { usePageTitle } from '@/hooks';
import { useToast } from '@/contexts';
import { api } from '@/lib/api';
import { PageHeader } from '../../components';

type DeletionStatus = 'pending' | 'approved' | 'rejected' | 'completed';

interface DeletionRequest {
  id: number;
  user: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
  };
  status: DeletionStatus;
  reason: string | null;
  reviewed_by_id: number | null;
  reviewed_at: string | null;
  completed_at: string | null;
  data_retained_reason: string | null;
  created_at: string;
}

interface DeletionResponse {
  data: DeletionRequest[];
  pagination: { page: number; limit: number; total: number; pages: number };
}

const STATUS_OPTIONS: DeletionStatus[] = ['pending', 'approved', 'rejected', 'completed'];

function statusColor(s: DeletionStatus): 'default' | 'warning' | 'success' | 'danger' {
  switch (s) {
    case 'pending': return 'warning';
    case 'approved': return 'success';
    case 'rejected': return 'danger';
    case 'completed': return 'default';
  }
}

export default function AdminGdprDeletionsPage() {
  usePageTitle('Admin - GDPR Deletion Requests');
  const toast = useToast();
  const [filter, setFilter] = useState<DeletionStatus>('pending');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<DeletionResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const url = `/v2/admin/privacy/deletions?status=${encodeURIComponent(filter)}&page=${page}&limit=50`;
      const res = await api.get<DeletionResponse>(url);
      if (res.success && res.data) setData((res.data as unknown) as DeletionResponse);
    } catch { toast.error('Failed to load deletion requests'); }
    finally { setLoading(false); }
  }, [filter, page, toast]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <PageHeader
        title="GDPR Deletion Requests"
        description="Right-to-be-forgotten queue. Members request deletion via the privacy page; admins review and approve/reject. Approved requests are anonymised + scheduled for execution."
        actions={
          <div className="flex items-center gap-2">
            <Select size="sm" variant="bordered" className="w-44"
              selectedKeys={new Set([filter])}
              onSelectionChange={(keys) => {
                const v = Array.from(keys)[0] as DeletionStatus | undefined;
                if (v) { setFilter(v); setPage(1); }
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
          <ShieldOff size={18} className="text-warning" />
          <h3 className="text-lg font-semibold">
            {filter} ({data?.pagination?.total ?? 0})
          </h3>
        </CardHeader>
        <CardBody>
          <Table aria-label="GDPR deletion requests" isStriped>
            <TableHeader>
              <TableColumn>ID</TableColumn>
              <TableColumn>User</TableColumn>
              <TableColumn>Status</TableColumn>
              <TableColumn>Reason</TableColumn>
              <TableColumn>Submitted</TableColumn>
              <TableColumn>Reviewed</TableColumn>
              <TableColumn>Completed</TableColumn>
            </TableHeader>
            <TableBody emptyContent={`No ${filter} requests`} isLoading={loading} loadingContent={<Spinner />}>
              {(data?.data ?? []).map((r) => (
                <TableRow key={r.id}>
                  <TableCell>#{r.id}</TableCell>
                  <TableCell>
                    <p className="font-medium text-sm">
                      {r.user.first_name} {r.user.last_name}
                    </p>
                    <p className="text-xs text-default-500">{r.user.email}</p>
                  </TableCell>
                  <TableCell>
                    <Chip color={statusColor(r.status)} variant="flat" size="sm">{r.status}</Chip>
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-sm">{r.reason ?? '—'}</TableCell>
                  <TableCell className="text-xs text-default-500">{new Date(r.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-xs text-default-500">
                    {r.reviewed_at ? new Date(r.reviewed_at).toLocaleDateString() : '—'}
                  </TableCell>
                  <TableCell className="text-xs text-default-500">
                    {r.completed_at ? new Date(r.completed_at).toLocaleDateString() : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {data && data.pagination.pages > 1 && (
            <div className="mt-3 flex justify-end gap-2">
              <Button size="sm" variant="flat" isDisabled={page <= 1}
                onPress={() => setPage((p) => Math.max(1, p - 1))}>Prev</Button>
              <p className="self-center text-xs text-default-500">
                Page {page} of {data.pagination.pages}
              </p>
              <Button size="sm" variant="flat" isDisabled={page >= data.pagination.pages}
                onPress={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
