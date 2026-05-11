// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/**
 * System Requirements (Admin) — operational health & dependency checks.
 *
 * Source: GET /api/v2/admin/enterprise/monitoring/requirements
 *   (returns counts for ScheduledTasks, failed_scheduled_tasks,
 *    email_pending, open_gdpr_breaches, active_announcements, etc.)
 *
 * Augmented with GET /health (anonymous-reachable healthcheck endpoint
 * which reports the registered HealthCheck results for Postgres, etc.).
 *
 * Groups results into Runtime / Database / MessageBus / Search / System
 * cards with pass/warn/fail status.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  Button, Card, CardBody, CardHeader, Chip, Spinner,
} from '@heroui/react';
import { Activity, AlertTriangle, CheckCircle2, RefreshCw, XCircle } from 'lucide-react';
import { usePageTitle } from '@/hooks';
import { useToast } from '@/contexts';
import { api } from '@/lib/api';
import { PageHeader } from '../../components';

interface RequirementsResponse {
  database?: string;
  scheduled_tasks?: number;
  failed_scheduled_tasks?: number;
  email_pending?: number;
  open_gdpr_breaches?: number;
  active_announcements?: number;
  checked_at?: string;
}

interface HealthEntry {
  status?: string;
  duration?: string;
  description?: string | null;
}

interface HealthResponse {
  status?: string;
  totalDuration?: string;
  entries?: Record<string, HealthEntry>;
}

type StatusKind = 'ok' | 'warn' | 'fail' | 'info';

interface Row {
  name: string;
  current: string;
  expected: string;
  status: StatusKind;
}

function StatusBadge({ status }: { status: StatusKind }) {
  if (status === 'ok')
    return <Chip color="success" size="sm" variant="flat" startContent={<CheckCircle2 size={12} />}>OK</Chip>;
  if (status === 'warn')
    return <Chip color="warning" size="sm" variant="flat" startContent={<AlertTriangle size={12} />}>WARN</Chip>;
  if (status === 'fail')
    return <Chip color="danger" size="sm" variant="flat" startContent={<XCircle size={12} />}>FAIL</Chip>;
  return <Chip size="sm" variant="flat">INFO</Chip>;
}

function Group({ title, rows }: { title: string; rows: Row[] }) {
  return (
    <Card shadow="sm" className="mb-3">
      <CardHeader className="flex items-center gap-2">
        <Activity size={16} className="text-primary" />
        <h3 className="text-md font-semibold">{title}</h3>
      </CardHeader>
      <CardBody>
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.name} className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{r.name}</p>
                <p className="text-xs text-default-500">
                  <span className="mr-2">Current: <code>{r.current}</code></span>
                  <span>Expected: <code>{r.expected}</code></span>
                </p>
              </div>
              <StatusBadge status={r.status} />
            </li>
          ))}
        </ul>
      </CardBody>
    </Card>
  );
}

export default function SystemRequirementsPage() {
  usePageTitle('Admin - System Requirements');
  const toast = useToast();
  const [reqs, setReqs] = useState<RequirementsResponse | null>(null);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const reqsRes = await api.get<RequirementsResponse>('/v2/admin/enterprise/monitoring/requirements');
      if (reqsRes.success) {
        const payload = (reqsRes.data as unknown) as RequirementsResponse | { data?: RequirementsResponse };
        const node = (payload as { data?: RequirementsResponse })?.data ?? (payload as RequirementsResponse);
        setReqs(node ?? null);
      }
    } catch {
      toast.error('Failed to load monitoring requirements');
    }
    // /health is anonymously reachable; fetch directly so it never 401s
    try {
      const r = await fetch('/health', { credentials: 'include' });
      if (r.ok) {
        const ct = r.headers.get('content-type') ?? '';
        if (ct.includes('application/json')) {
          const json = (await r.json()) as HealthResponse;
          setHealth(json);
        } else {
          const text = await r.text();
          setHealth({ status: text.trim() });
        }
      }
    } catch {
      // health endpoint genuinely unavailable
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  // Build grouped rows
  const runtime: Row[] = [];
  const database: Row[] = [];
  const messagebus: Row[] = [];
  const search: Row[] = [];
  const system: Row[] = [];

  if (health) {
    runtime.push({
      name: 'Overall health',
      current: String(health.status ?? 'unknown'),
      expected: 'Healthy',
      status: (health.status === 'Healthy' ? 'ok' : health.status === 'Degraded' ? 'warn' : 'fail'),
    });
    if (health.totalDuration) {
      runtime.push({
        name: 'Healthcheck duration',
        current: String(health.totalDuration),
        expected: '<1s',
        status: 'info',
      });
    }
    const entries = health.entries ?? {};
    for (const [name, entry] of Object.entries(entries)) {
      const targetGroup = /postgres|sql|db/i.test(name) ? database
        : /rabbit|amqp|bus/i.test(name) ? messagebus
        : /meili|search|elastic/i.test(name) ? search
        : runtime;
      targetGroup.push({
        name,
        current: String(entry.status ?? 'unknown'),
        expected: 'Healthy',
        status: (entry.status === 'Healthy' ? 'ok' : entry.status === 'Degraded' ? 'warn' : 'fail'),
      });
    }
  }

  if (reqs) {
    if (reqs.database) {
      database.push({ name: 'Database engine', current: reqs.database, expected: 'postgresql', status: reqs.database === 'postgresql' ? 'ok' : 'fail' });
    }
    if (reqs.scheduled_tasks != null) {
      const failed = reqs.failed_scheduled_tasks ?? 0;
      system.push({
        name: 'Scheduled tasks',
        current: `${reqs.scheduled_tasks} total, ${failed} failed`,
        expected: 'failed=0',
        status: failed === 0 ? 'ok' : failed < 5 ? 'warn' : 'fail',
      });
    }
    if (reqs.email_pending != null) {
      system.push({
        name: 'Email queue pending',
        current: String(reqs.email_pending),
        expected: '<50',
        status: reqs.email_pending < 50 ? 'ok' : reqs.email_pending < 500 ? 'warn' : 'fail',
      });
    }
    if (reqs.open_gdpr_breaches != null) {
      system.push({
        name: 'Open GDPR breaches',
        current: String(reqs.open_gdpr_breaches),
        expected: '0',
        status: reqs.open_gdpr_breaches === 0 ? 'ok' : 'warn',
      });
    }
    if (reqs.active_announcements != null) {
      system.push({
        name: 'Active platform announcements',
        current: String(reqs.active_announcements),
        expected: '0–3',
        status: reqs.active_announcements <= 3 ? 'ok' : 'warn',
      });
    }
  }

  if (runtime.length === 0) runtime.push({ name: 'Runtime status', current: 'unknown', expected: 'Healthy', status: 'info' });
  if (database.length === 0) database.push({ name: 'Database', current: 'unknown', expected: 'postgresql Healthy', status: 'info' });

  return (
    <div>
      <PageHeader
        title="System Requirements"
        description="Runtime, database, and dependency health checks. Pulls from /api/v2/admin/enterprise/monitoring/requirements and /health (anonymous)."
        actions={
          <div className="flex items-center gap-2">
            {reqs?.checked_at && (
              <Chip size="sm" variant="flat">Checked: {new Date(reqs.checked_at).toLocaleString()}</Chip>
            )}
            <Button variant="flat" size="sm" startContent={<RefreshCw size={16} />}
              onPress={load} isLoading={loading}>Refresh</Button>
          </div>
        }
      />
      {loading ? (
        <div className="flex h-64 items-center justify-center"><Spinner /></div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <Group title="Runtime" rows={runtime} />
            <Group title="Database" rows={database} />
          </div>
          <div>
            {messagebus.length > 0 && <Group title="Message Bus" rows={messagebus} />}
            {search.length > 0 && <Group title="Search" rows={search} />}
            <Group title="System" rows={system.length > 0 ? system : [{ name: 'Tenant metrics', current: 'unknown', expected: 'present', status: 'info' }]} />
          </div>
        </div>
      )}
    </div>
  );
}
