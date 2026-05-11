// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/**
 * Volunteer Hours Audit (Admin) — replaces the parity stub with a real
 * pending-hours review table backed by VolunteerCheckIn rows.
 *
 * GET  /api/volunteering/hours/pending-review  (real data: VolunteerCheckIns with HoursLogged)
 * GET  /api/volunteering/hours/summary         (totals)
 * POST /api/v2/admin/volunteering/hours/{id}/verify (compat verify)
 */

import { useCallback, useEffect, useState } from 'react';
import {
  Button, Card, CardBody, CardHeader, Chip, Spinner, Table, TableBody,
  TableCell, TableColumn, TableHeader, TableRow,
} from '@heroui/react';
import { Clock, RefreshCw, Check } from 'lucide-react';
import { usePageTitle } from '@/hooks';
import { useToast } from '@/contexts';
import { api } from '@/lib/api';
import { PageHeader } from '../../components';

interface PendingHourRow {
  id: number;
  user_id: number;
  user_name: string | null;
  shift_id: number | null;
  shift_title: string | null;
  hours_logged?: number | null;
  hoursLogged?: number | null;
  verified_at?: string | null;
  created_at?: string;
}

interface HoursSummary {
  user_hours: number;
  total_hours: number;
  pending_count: number;
  completed_hours: number;
}

export default function VolunteerHoursAuditAdmin() {
  usePageTitle('Admin - Volunteer Hours Audit');
  const toast = useToast();

  const [rows, setRows] = useState<PendingHourRow[]>([]);
  const [summary, setSummary] = useState<HoursSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const listRes = await api.get<unknown>('/volunteering/hours/pending-review');
      if (listRes.success && listRes.data) {
        const payload = listRes.data as { data?: PendingHourRow[] };
        setRows(payload.data ?? []);
      }
      const sumRes = await api.get<unknown>('/volunteering/hours/summary');
      if (sumRes.success && sumRes.data) {
        const payload = sumRes.data as { data?: HoursSummary };
        setSummary(payload.data ?? null);
      }
    } catch {
      toast.error('Failed to load hours audit');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const verify = useCallback(async (id: number) => {
    setWorking(id);
    try {
      const res = await api.post(`/v2/admin/volunteering/hours/${id}/verify`, {});
      if (res.success) {
        toast.success('Hours verified');
        await load();
      } else {
        toast.error('Verify failed');
      }
    } catch {
      toast.error('Verify failed');
    } finally {
      setWorking(null);
    }
  }, [toast, load]);

  const hours = (r: PendingHourRow) => r.hours_logged ?? r.hoursLogged ?? 0;

  return (
    <div>
      <PageHeader
        title="Volunteer Hours Audit"
        description="Review and verify volunteer hours logged via shift check-outs."
        actions={
          <Button variant="flat" size="sm" startContent={<RefreshCw size={16} />}
            onPress={load} isLoading={loading}>Refresh</Button>
        }
      />

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
          <Card><CardBody>
            <div className="text-xs text-default-500">Total hours logged</div>
            <div className="text-2xl font-semibold">{Number(summary.total_hours).toFixed(1)}</div>
          </CardBody></Card>
          <Card><CardBody>
            <div className="text-xs text-default-500">Completed hours</div>
            <div className="text-2xl font-semibold">{Number(summary.completed_hours ?? 0).toFixed(1)}</div>
          </CardBody></Card>
          <Card><CardBody>
            <div className="text-xs text-default-500">Pending review</div>
            <div className="text-2xl font-semibold">{rows.length}</div>
          </CardBody></Card>
        </div>
      )}

      <Card shadow="sm">
        <CardHeader className="flex items-center gap-2">
          <Clock size={18} className="text-primary" />
          <h3 className="text-lg font-semibold">Pending hour entries ({rows.length})</h3>
        </CardHeader>
        <CardBody>
          <Table aria-label="Pending hours" isStriped>
            <TableHeader>
              <TableColumn>ID</TableColumn>
              <TableColumn>User</TableColumn>
              <TableColumn>Shift</TableColumn>
              <TableColumn className="text-right">Hours</TableColumn>
              <TableColumn>Verified</TableColumn>
              <TableColumn>Action</TableColumn>
            </TableHeader>
            <TableBody emptyContent="No hours pending review" isLoading={loading} loadingContent={<Spinner />}>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>#{r.id}</TableCell>
                  <TableCell>{r.user_name ?? `#${r.user_id}`}</TableCell>
                  <TableCell>{r.shift_title ?? (r.shift_id ? `Shift #${r.shift_id}` : '—')}</TableCell>
                  <TableCell className="text-right font-medium">{hours(r).toFixed(1)}</TableCell>
                  <TableCell>
                    {r.verified_at
                      ? <Chip color="success" variant="flat" size="sm">Verified</Chip>
                      : <Chip color="warning" variant="flat" size="sm">Pending</Chip>}
                  </TableCell>
                  <TableCell>
                    {!r.verified_at && (
                      <Button size="sm" variant="flat" color="success" isLoading={working === r.id}
                        startContent={<Check size={14} />}
                        onPress={() => verify(r.id)}>
                        Verify
                      </Button>
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
