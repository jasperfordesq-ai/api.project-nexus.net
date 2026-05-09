// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/**
 * System Diagnostics (Admin) — comprehensive operational status.
 *
 * Endpoint: GET /api/admin/system/diagnostics
 *
 * Distinct from /admin/scheduled-jobs (which only reads TenantConfig
 * summary rows). This page shows live runtime state: hosted-service
 * health from the singleton registry, DB migration version, external
 * service config presence, and a verdict (ok / degraded / critical).
 */

import { useCallback, useEffect, useState } from 'react';
import {
  Card, CardBody, CardHeader, Chip, Button, Spinner,
  Table, TableBody, TableCell, TableColumn, TableHeader, TableRow,
} from '@heroui/react';
import { Activity, RefreshCw, CheckCircle2, AlertTriangle, XCircle, Zap, Bug } from 'lucide-react';
import { usePageTitle } from '@/hooks';
import { useToast } from '@/contexts';
import { api } from '@/lib/api';
import { PageHeader } from '../../components';

type Verdict = 'ok' | 'degraded' | 'critical';

interface JobHealth {
  job_name: string;
  status: 'idle' | 'running' | 'failing' | 'disabled' | 'unknown';
  last_started_at: string | null;
  last_succeeded_at: string | null;
  last_failed_at: string | null;
  last_duration_ms: number | null;
  last_failure_type: string | null;
  last_failure_message: string | null;
  consecutive_failures: number;
}

interface Diagnostics {
  verdict: Verdict;
  generated_at: string;
  database: {
    connected: boolean;
    applied_migration: string | null;
    pending_migrations: string[];
    pending_count: number;
  };
  hosted_services: JobHealth[];
  external_services: Record<string, Record<string, unknown>>;
  process: {
    uptime_seconds: number;
    working_set_mb: number;
    thread_count: number;
    machine_name: string;
    os: string;
    framework: string;
    assembly_version: string | null;
  };
}

function jobStatusColor(s: JobHealth['status']): 'default' | 'success' | 'primary' | 'danger' | 'warning' {
  switch (s) {
    case 'idle': return 'success';
    case 'running': return 'primary';
    case 'failing': return 'danger';
    case 'disabled': return 'default';
    default: return 'default';
  }
}

function relativeTime(iso: string | null): string {
  if (!iso) return 'never';
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function VerdictBanner({ verdict }: { verdict: Verdict }) {
  const config = {
    ok: { color: 'bg-success-50 text-success-900 border-success-200', icon: CheckCircle2, text: 'All systems operational' },
    degraded: { color: 'bg-warning-50 text-warning-900 border-warning-200', icon: AlertTriangle, text: 'Degraded — investigate' },
    critical: { color: 'bg-danger-50 text-danger-900 border-danger-200', icon: XCircle, text: 'Critical — immediate attention required' },
  }[verdict];
  const Icon = config.icon;
  return (
    <div className={`mb-4 flex items-center gap-3 rounded-lg border px-4 py-3 ${config.color}`}>
      <Icon size={24} />
      <span className="font-semibold uppercase tracking-wider text-sm">{verdict}</span>
      <span>{config.text}</span>
    </div>
  );
}

interface ProbeResult {
  name: string;
  ok: boolean;
  latency_ms: number;
  error: string | null;
}

interface ProbeResponse {
  generated_at: string;
  probes: ProbeResult[];
}

interface SentryTestResponse {
  ok: boolean;
  event_id?: string;
  message?: string;
  error?: string;
  hint?: string;
}

export default function AdminDiagnosticsPage() {
  usePageTitle('Admin - System Diagnostics');
  const toast = useToast();
  const [data, setData] = useState<Diagnostics | null>(null);
  const [loading, setLoading] = useState(true);
  const [probing, setProbing] = useState(false);
  const [probeResults, setProbeResults] = useState<ProbeResult[] | null>(null);
  const [sentryTesting, setSentryTesting] = useState(false);
  const [sentryResult, setSentryResult] = useState<SentryTestResponse | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<Diagnostics>('/v2/admin/system/diagnostics');
      if (res.success && res.data) setData((res.data as unknown) as Diagnostics);
    } catch { toast.error('Failed to load diagnostics'); }
    finally { setLoading(false); }
  }, [toast]);

  const runProbes = useCallback(async () => {
    setProbing(true);
    setProbeResults(null);
    try {
      const res = await api.get<ProbeResponse>('/v2/admin/system/diagnostics/probe');
      if (res.success && res.data) {
        const payload = (res.data as unknown) as ProbeResponse;
        setProbeResults(payload.probes);
        const failed = payload.probes.filter((p) => !p.ok).length;
        if (failed === 0) toast.success(`All ${payload.probes.length} probes passed`);
        else toast.error(`${failed} of ${payload.probes.length} probes failed`);
      }
    } catch { toast.error('Probe run failed'); }
    finally { setProbing(false); }
  }, [toast]);

  const testSentry = useCallback(async () => {
    setSentryTesting(true);
    setSentryResult(null);
    try {
      const res = await api.post<SentryTestResponse>(
        `/v2/admin/system/diagnostics/sentry-test?message=${encodeURIComponent('manual deploy verification ' + new Date().toISOString())}`,
        {});
      if (res.success && res.data) {
        const payload = (res.data as unknown) as SentryTestResponse;
        setSentryResult(payload);
        if (payload.ok) toast.success('Sentry event sent — check your project dashboard');
        else toast.error(payload.error ?? 'Sentry test failed');
      }
    } catch { toast.error('Sentry test failed'); }
    finally { setSentryTesting(false); }
  }, [toast]);

  useEffect(() => {
    load();
    // Auto-refresh every 30s for live ops view.
    const i = setInterval(load, 30000);
    return () => clearInterval(i);
  }, [load]);

  if (loading && !data) {
    return (
      <div>
        <PageHeader title="System Diagnostics" description="Live runtime operational status." />
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div>
        <PageHeader title="System Diagnostics" description="Live runtime operational status." />
        <p className="text-danger">Diagnostics endpoint not reachable.</p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="System Diagnostics"
        description="Comprehensive operational status. Auto-refreshes every 30 seconds."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="flat" size="sm" startContent={<Zap size={16} />}
              onPress={runProbes} isLoading={probing}
              title="Live round-trip probes against Stripe / AI / SendGrid / DB">
              Run live probes
            </Button>
            <Button variant="flat" size="sm" startContent={<Bug size={16} />}
              onPress={testSentry} isLoading={sentryTesting}
              title="Fire a controlled test exception to verify Sentry integration">
              Test Sentry
            </Button>
            <Button variant="flat" size="sm" startContent={<RefreshCw size={16} />}
              onPress={load} isLoading={loading}>Refresh</Button>
          </div>
        }
      />

      {/* Live probe results */}
      {probeResults && (
        <Card shadow="sm" className="mb-4">
          <CardHeader className="flex items-center gap-2">
            <Zap size={18} className="text-warning" />
            <h3 className="text-lg font-semibold">Live probe results</h3>
          </CardHeader>
          <CardBody>
            <Table aria-label="Probe results" isStriped>
              <TableHeader>
                <TableColumn>Probe</TableColumn>
                <TableColumn>Status</TableColumn>
                <TableColumn>Latency</TableColumn>
                <TableColumn>Error</TableColumn>
              </TableHeader>
              <TableBody emptyContent="No probes run">
                {probeResults.map((p) => (
                  <TableRow key={p.name}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>
                      <Chip color={p.ok ? 'success' : 'danger'} variant="flat" size="sm">
                        {p.ok ? 'OK' : 'FAIL'}
                      </Chip>
                    </TableCell>
                    <TableCell className="text-xs">{p.latency_ms}ms</TableCell>
                    <TableCell className="text-xs text-danger max-w-md truncate">{p.error ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardBody>
        </Card>
      )}

      {/* Sentry test result */}
      {sentryResult && (
        <Card shadow="sm" className={`mb-4 ${sentryResult.ok ? 'border-success' : 'border-danger'} border`}>
          <CardHeader className="flex items-center gap-2">
            <Bug size={18} className={sentryResult.ok ? 'text-success' : 'text-danger'} />
            <h3 className="text-lg font-semibold">Sentry test {sentryResult.ok ? 'sent' : 'failed'}</h3>
          </CardHeader>
          <CardBody className="text-sm space-y-2">
            {sentryResult.ok ? (
              <>
                <p>Event id: <code className="text-xs">{sentryResult.event_id}</code></p>
                <p>{sentryResult.message}</p>
                <p className="text-default-500 text-xs">{sentryResult.hint}</p>
              </>
            ) : (
              <>
                <p className="text-danger">{sentryResult.error}</p>
                {sentryResult.hint && <p className="text-default-500 text-xs">{sentryResult.hint}</p>}
              </>
            )}
          </CardBody>
        </Card>
      )}

      <VerdictBanner verdict={data.verdict} />

      {/* Database */}
      <Card shadow="sm" className="mb-4">
        <CardHeader>
          <h3 className="text-lg font-semibold">Database</h3>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            <div>
              <span className="text-default-500">Connected:</span>{' '}
              <Chip color={data.database.connected ? 'success' : 'danger'} size="sm" variant="flat">
                {data.database.connected ? 'Yes' : 'No'}
              </Chip>
            </div>
            <div>
              <span className="text-default-500">Applied migration:</span>{' '}
              <code className="text-xs">{data.database.applied_migration ?? '—'}</code>
            </div>
            {data.database.pending_count > 0 && (
              <div className="sm:col-span-2 rounded-lg bg-warning-50 p-3 text-warning-900 text-xs">
                <p className="font-semibold mb-1">{data.database.pending_count} pending migration(s):</p>
                <ul className="list-disc pl-5">
                  {data.database.pending_migrations.map((m) => <li key={m}>{m}</li>)}
                </ul>
                <p className="mt-2">These will be applied on next API container restart.</p>
              </div>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Hosted services */}
      <Card shadow="sm" className="mb-4">
        <CardHeader className="flex items-center gap-2">
          <Activity size={18} className="text-primary" />
          <h3 className="text-lg font-semibold">Hosted services ({data.hosted_services.length})</h3>
        </CardHeader>
        <CardBody>
          <Table aria-label="Hosted service runtime health" isStriped>
            <TableHeader>
              <TableColumn>Job</TableColumn>
              <TableColumn>Status</TableColumn>
              <TableColumn>Last started</TableColumn>
              <TableColumn>Last success</TableColumn>
              <TableColumn>Last failure</TableColumn>
              <TableColumn>Failures</TableColumn>
              <TableColumn>Duration</TableColumn>
            </TableHeader>
            <TableBody emptyContent="No hosted services have run yet (registry not populated)">
              {data.hosted_services.map((j) => (
                <TableRow key={j.job_name}>
                  <TableCell className="font-medium">{j.job_name}</TableCell>
                  <TableCell>
                    <Chip color={jobStatusColor(j.status)} variant="flat" size="sm">{j.status}</Chip>
                  </TableCell>
                  <TableCell className="text-xs text-default-500">{relativeTime(j.last_started_at)}</TableCell>
                  <TableCell className="text-xs text-default-500">{relativeTime(j.last_succeeded_at)}</TableCell>
                  <TableCell className="text-xs">
                    {j.last_failed_at ? (
                      <>
                        <p className="text-danger">{relativeTime(j.last_failed_at)}</p>
                        {j.last_failure_message && (
                          <p className="text-[10px] text-default-500 truncate max-w-xs">{j.last_failure_message}</p>
                        )}
                      </>
                    ) : '—'}
                  </TableCell>
                  <TableCell>
                    <Chip
                      color={j.consecutive_failures === 0 ? 'success' : j.consecutive_failures < 3 ? 'warning' : 'danger'}
                      variant="flat" size="sm">
                      {j.consecutive_failures}
                    </Chip>
                  </TableCell>
                  <TableCell className="text-xs text-default-500">
                    {j.last_duration_ms != null ? `${Math.round(j.last_duration_ms)}ms` : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardBody>
      </Card>

      {/* External services config */}
      <Card shadow="sm" className="mb-4">
        <CardHeader>
          <h3 className="text-lg font-semibold">External services (config presence)</h3>
        </CardHeader>
        <CardBody>
          <p className="mb-3 text-xs text-default-500">
            Presence check only — does the config key exist? Live connectivity probes
            live on per-service pages (e.g. AI Providers test, Federation protocol ping).
          </p>
          <pre className="rounded-lg bg-default-50 p-3 text-xs overflow-x-auto">
            {JSON.stringify(data.external_services, null, 2)}
          </pre>
        </CardBody>
      </Card>

      {/* Process info */}
      <Card shadow="sm">
        <CardHeader><h3 className="text-lg font-semibold">Process</h3></CardHeader>
        <CardBody>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
            <div><span className="text-default-500">Uptime:</span> {formatUptime(data.process.uptime_seconds)}</div>
            <div><span className="text-default-500">Memory:</span> {data.process.working_set_mb} MB</div>
            <div><span className="text-default-500">Threads:</span> {data.process.thread_count}</div>
            <div><span className="text-default-500">Machine:</span> <code className="text-xs">{data.process.machine_name}</code></div>
            <div><span className="text-default-500">.NET:</span> <code className="text-xs">{data.process.framework}</code></div>
            <div><span className="text-default-500">Assembly:</span> <code className="text-xs">{data.process.assembly_version}</code></div>
            <div className="sm:col-span-3"><span className="text-default-500">OS:</span> <code className="text-xs">{data.process.os}</code></div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
