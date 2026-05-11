// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/**
 * Volunteer Giving Days (Admin) — replaces the parity stub. Reads published
 * volunteer opportunities (treated as giving days) plus aggregate stats from
 * VolunteerOpportunities + VolunteerCheckIns.
 *
 * GET /api/volunteering/giving-days
 * GET /api/volunteering/giving-days/stats
 */

import { useCallback, useEffect, useState } from 'react';
import {
  Button, Card, CardBody, CardHeader, Spinner, Table, TableBody, TableCell,
  TableColumn, TableHeader, TableRow,
} from '@heroui/react';
import { CalendarHeart, RefreshCw } from 'lucide-react';
import { usePageTitle } from '@/hooks';
import { useToast } from '@/contexts';
import { api } from '@/lib/api';
import { PageHeader } from '../../components';

interface GivingDay {
  id: number;
  title: string;
  starts_at: string | null;
  ends_at: string | null;
  location: string | null;
  credit_reward: number | null;
}

interface GivingDayStats {
  active_days: number;
  shifts: number;
  volunteers: number;
}

export default function VolunteerGivingDaysAdmin() {
  usePageTitle('Admin - Giving Days');
  const toast = useToast();

  const [rows, setRows] = useState<GivingDay[]>([]);
  const [stats, setStats] = useState<GivingDayStats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const listRes = await api.get<unknown>('/volunteering/giving-days');
      if (listRes.success && listRes.data) {
        const payload = listRes.data as { data?: GivingDay[]; giving_days?: GivingDay[] };
        setRows(payload.data ?? payload.giving_days ?? []);
      }
      const statsRes = await api.get<unknown>('/volunteering/giving-days/stats');
      if (statsRes.success && statsRes.data) {
        const payload = statsRes.data as { data?: GivingDayStats };
        setStats(payload.data ?? null);
      }
    } catch {
      toast.error('Failed to load giving days');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString() : '—');

  return (
    <div>
      <PageHeader
        title="Giving Days"
        description="Themed volunteer giving days — published opportunities and aggregate engagement."
        actions={
          <Button variant="flat" size="sm" startContent={<RefreshCw size={16} />}
            onPress={load} isLoading={loading}>Refresh</Button>
        }
      />

      {stats && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          <Card><CardBody>
            <div className="text-xs text-default-500">Active days</div>
            <div className="text-2xl font-semibold">{stats.active_days}</div>
          </CardBody></Card>
          <Card><CardBody>
            <div className="text-xs text-default-500">Total shifts</div>
            <div className="text-2xl font-semibold">{stats.shifts}</div>
          </CardBody></Card>
          <Card><CardBody>
            <div className="text-xs text-default-500">Unique volunteers</div>
            <div className="text-2xl font-semibold">{stats.volunteers}</div>
          </CardBody></Card>
        </div>
      )}

      <Card shadow="sm">
        <CardHeader className="flex items-center gap-2">
          <CalendarHeart size={18} className="text-primary" />
          <h3 className="text-lg font-semibold">Upcoming giving days ({rows.length})</h3>
        </CardHeader>
        <CardBody>
          <Table aria-label="Giving days" isStriped>
            <TableHeader>
              <TableColumn>ID</TableColumn>
              <TableColumn>Title</TableColumn>
              <TableColumn>Starts</TableColumn>
              <TableColumn>Ends</TableColumn>
              <TableColumn>Location</TableColumn>
              <TableColumn className="text-right">Credit reward</TableColumn>
            </TableHeader>
            <TableBody emptyContent="No giving days scheduled" isLoading={loading} loadingContent={<Spinner />}>
              {rows.map((d) => (
                <TableRow key={d.id}>
                  <TableCell>#{d.id}</TableCell>
                  <TableCell>{d.title}</TableCell>
                  <TableCell className="text-xs">{fmt(d.starts_at)}</TableCell>
                  <TableCell className="text-xs">{fmt(d.ends_at)}</TableCell>
                  <TableCell>{d.location ?? '—'}</TableCell>
                  <TableCell className="text-right font-medium">{d.credit_reward ?? 0}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardBody>
      </Card>
    </div>
  );
}
