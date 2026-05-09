// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/**
 * Scheduled Jobs (Admin) — Phase 63 cron observability.
 *
 * Reads the per-tenant summary rows that the 9 hosted services (plus the
 * SavedSearchAlertService) write to TenantConfig. Endpoint
 * /api/admin/scheduled/jobs (Phase 73.x — added in this session) returns
 * each known job + its latest summary payload + the most recent monthly
 * report snapshot.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  Card, CardBody, CardHeader, Chip, Button, Spinner,
  Table, TableBody, TableCell, TableColumn, TableHeader, TableRow,
} from '@heroui/react';
import { Timer, RefreshCw } from 'lucide-react';
import { usePageTitle } from '@/hooks';
import { useToast } from '@/contexts';
import { api } from '@/lib/api';
import { PageHeader } from '../../components';

interface JobStatus {
  name: string;
  summary_key: string | null;
  latest_summary: { updated_at: string; payload: Record<string, unknown> | string | null } | null;
}

interface JobsResponse {
  data: JobStatus[];
  latest_monthly_report: { key: string; updated_at: string; payload: Record<string, unknown> | string | null } | null;
}

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default function AdminScheduledJobsPage() {
  usePageTitle('Admin - Scheduled Jobs');
  const toast = useToast();
  const [data, setData] = useState<JobsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<JobsResponse>('/v2/admin/scheduled/jobs');
      if (res.success && res.data) setData((res.data as unknown) as JobsResponse);
    } catch { toast.error('Failed to load scheduled jobs'); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <PageHeader
        title="Scheduled Jobs"
        description="Phase 63 cron status. Each row corresponds to a BackgroundService that runs on a configured interval. Per-job kill-switch + interval are configurable via Scheduled:{JobName}:Enabled / IntervalMinutes."
        actions={
          <Button variant="flat" size="sm" startContent={<RefreshCw size={16} />}
            onPress={load} isLoading={loading}>Refresh</Button>
        }
      />
      <Card shadow="sm">
        <CardHeader className="flex items-center gap-2">
          <Timer size={18} className="text-primary" />
          <h3 className="text-lg font-semibold">Job status</h3>
        </CardHeader>
        <CardBody>
          {loading && !data ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : (
            <Table aria-label="Scheduled jobs" isStriped>
              <TableHeader>
                <TableColumn>Job</TableColumn>
                <TableColumn>Last summary</TableColumn>
                <TableColumn>Updated</TableColumn>
                <TableColumn>Latest payload</TableColumn>
              </TableHeader>
              <TableBody emptyContent="No scheduled jobs registered" isLoading={loading} loadingContent={<Spinner />}>
                {(data?.data ?? []).map((j) => (
                  <TableRow key={j.name}>
                    <TableCell className="font-medium">{j.name}</TableCell>
                    <TableCell>
                      {j.latest_summary ? (
                        <Chip size="sm" color="success" variant="flat">Has summary</Chip>
                      ) : j.summary_key ? (
                        <Chip size="sm" color="default" variant="flat">No summary yet</Chip>
                      ) : (
                        <Chip size="sm" color="default" variant="flat">Side-effect only</Chip>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-default-500">
                      {j.latest_summary ? relativeTime(j.latest_summary.updated_at) : '—'}
                    </TableCell>
                    <TableCell className="max-w-md">
                      <pre className="text-[10px] whitespace-pre-wrap text-default-500">
                        {j.latest_summary
                          ? JSON.stringify(j.latest_summary.payload, null, 2)
                          : '—'}
                      </pre>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardBody>
      </Card>

      {data?.latest_monthly_report && (
        <Card shadow="sm" className="mt-4">
          <CardHeader>
            <h3 className="text-lg font-semibold">
              Latest monthly report ({data.latest_monthly_report.key})
            </h3>
          </CardHeader>
          <CardBody>
            <pre className="text-xs whitespace-pre-wrap text-default-600">
              {JSON.stringify(data.latest_monthly_report.payload, null, 2)}
            </pre>
            <p className="text-xs text-default-400 mt-2">
              Updated: {relativeTime(data.latest_monthly_report.updated_at)}
            </p>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
