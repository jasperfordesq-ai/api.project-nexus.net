// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/**
 * KI-Agent (Admin) — replaces the parity stub.
 *
 * The "KI-Agent" surface (German "Künstliche Intelligenz") is a V1 concept
 * for tenant-configurable proactive AI suggestions. V2 keeps it as a
 * V1-compatibility surface backed by the AdminExplicitParityController; we
 * display the four sub-resources (config, stats, proposals, runs) plus
 * approve/reject actions for queued proposals.
 *
 * Endpoints (compatibility):
 *   GET  /api/v2/admin/ki-agents/config
 *   GET  /api/v2/admin/ki-agents/stats
 *   GET  /api/v2/admin/ki-agents/proposals
 *   GET  /api/v2/admin/ki-agents/runs
 *   POST /api/v2/admin/ki-agents/trigger
 *   POST /api/v2/admin/ki-agents/proposals/{id}/approve
 *   POST /api/v2/admin/ki-agents/proposals/{id}/reject
 *   POST /api/v2/admin/ki-agents/proposals/approve-eligible
 */

import { useCallback, useEffect, useState } from 'react';
import {
  Card, CardBody, CardHeader, Chip, Spinner, Button,
  Table, TableBody, TableCell, TableColumn, TableHeader, TableRow,
} from '@heroui/react';
import { Brain, RefreshCw, Play, Check, X, CheckCheck } from 'lucide-react';
import { usePageTitle } from '@/hooks';
import { useToast } from '@/contexts';
import { api } from '@/lib/api';
import { PageHeader } from '../../components';

interface CompatRecord {
  id?: string | number;
  status?: string;
  summary?: string;
  payload?: unknown;
  updated_at?: string;
  created_at?: string;
}

export default function KiAgentAdminPage() {
  usePageTitle('Admin - KI-Agent');
  const toast = useToast();

  const [config, setConfig] = useState<unknown>(null);
  const [stats, setStats] = useState<unknown>(null);
  const [proposals, setProposals] = useState<CompatRecord[]>([]);
  const [runs, setRuns] = useState<CompatRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);

  const unwrapList = (raw: unknown): CompatRecord[] => {
    const payload = raw as { data?: CompatRecord[] } | CompatRecord[];
    return Array.isArray(payload) ? payload : payload?.data ?? [];
  };
  const unwrapOne = (raw: unknown): unknown => {
    const payload = raw as { data?: unknown };
    return payload && typeof payload === 'object' && 'data' in payload ? payload.data : payload;
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cfgRes, statsRes, propsRes, runsRes] = await Promise.all([
        api.get('/v2/admin/ki-agents/config'),
        api.get('/v2/admin/ki-agents/stats'),
        api.get('/v2/admin/ki-agents/proposals'),
        api.get('/v2/admin/ki-agents/runs'),
      ]);
      if (cfgRes.success) setConfig(unwrapOne(cfgRes.data));
      if (statsRes.success) setStats(unwrapOne(statsRes.data));
      if (propsRes.success) setProposals(unwrapList(propsRes.data));
      if (runsRes.success) setRuns(unwrapList(runsRes.data));
    } catch {
      toast.error('Failed to load KI-Agent data');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const trigger = useCallback(async () => {
    setWorking('trigger');
    try {
      const res = await api.post('/v2/admin/ki-agents/trigger', {});
      if (res.success) {
        toast.success('KI-Agent triggered');
        await load();
      } else toast.error('Trigger failed');
    } catch { toast.error('Trigger failed'); }
    finally { setWorking(null); }
  }, [toast, load]);

  const approveEligible = useCallback(async () => {
    setWorking('approve-eligible');
    try {
      const res = await api.post('/v2/admin/ki-agents/proposals/approve-eligible', {});
      if (res.success) {
        toast.success('Eligible proposals approved');
        await load();
      } else toast.error('Bulk approve failed');
    } catch { toast.error('Bulk approve failed'); }
    finally { setWorking(null); }
  }, [toast, load]);

  const act = useCallback(async (id: string | number, action: 'approve' | 'reject') => {
    const key = `${id}-${action}`;
    setWorking(key);
    try {
      const res = await api.post(`/v2/admin/ki-agents/proposals/${id}/${action}`, {});
      if (res.success) {
        toast.success(`Proposal ${action}d`);
        await load();
      } else toast.error(`Failed to ${action}`);
    } catch { toast.error(`Failed to ${action}`); }
    finally { setWorking(null); }
  }, [toast, load]);

  return (
    <div>
      <PageHeader
        title="KI-Agent"
        description="Tenant-configurable proactive AI agent. Review the queue, trigger runs, and bulk-approve eligible proposals."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="flat" size="sm" startContent={<RefreshCw size={16} />}
              onPress={load} isLoading={loading}>Refresh</Button>
            <Button color="primary" size="sm" startContent={<Play size={16} />}
              isLoading={working === 'trigger'} onPress={trigger}>
              Trigger run
            </Button>
            <Button color="success" size="sm" variant="flat"
              startContent={<CheckCheck size={16} />}
              isLoading={working === 'approve-eligible'} onPress={approveEligible}>
              Approve eligible
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 mb-6">
        <Card shadow="sm">
          <CardHeader className="flex items-center gap-2">
            <Brain size={18} className="text-primary" />
            <h3 className="text-lg font-semibold">Config</h3>
          </CardHeader>
          <CardBody>
            <pre className="text-xs bg-default-50 p-3 rounded-lg overflow-x-auto max-h-64">
              {config ? JSON.stringify(config, null, 2) : 'No config recorded.'}
            </pre>
          </CardBody>
        </Card>

        <Card shadow="sm">
          <CardHeader className="flex items-center gap-2">
            <Brain size={18} className="text-success" />
            <h3 className="text-lg font-semibold">Stats</h3>
          </CardHeader>
          <CardBody>
            <pre className="text-xs bg-default-50 p-3 rounded-lg overflow-x-auto max-h-64">
              {stats ? JSON.stringify(stats, null, 2) : 'No stats recorded.'}
            </pre>
          </CardBody>
        </Card>
      </div>

      <Card shadow="sm" className="mb-6">
        <CardHeader className="flex items-center gap-2">
          <Brain size={18} className="text-warning" />
          <h3 className="text-lg font-semibold">Proposals</h3>
          <Chip size="sm" variant="flat">{proposals.length}</Chip>
        </CardHeader>
        <CardBody>
          <Table aria-label="KI-Agent proposals" isStriped>
            <TableHeader>
              <TableColumn>ID</TableColumn>
              <TableColumn>Summary</TableColumn>
              <TableColumn>Status</TableColumn>
              <TableColumn>Actions</TableColumn>
            </TableHeader>
            <TableBody emptyContent="No proposals" isLoading={loading} loadingContent={<Spinner />}>
              {proposals.map((p, idx) => {
                const id = p.id ?? idx;
                return (
                  <TableRow key={id.toString()}>
                    <TableCell className="font-mono text-xs">{String(id)}</TableCell>
                    <TableCell className="max-w-md truncate text-sm">
                      {p.summary ?? (p.payload ? JSON.stringify(p.payload).slice(0, 100) : '—')}
                    </TableCell>
                    <TableCell><Chip variant="flat" size="sm">{p.status ?? 'pending'}</Chip></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="flat" color="success"
                          isLoading={working === `${id}-approve`}
                          startContent={<Check size={14} />}
                          onPress={() => act(id, 'approve')}>Approve</Button>
                        <Button size="sm" variant="flat" color="danger"
                          isLoading={working === `${id}-reject`}
                          startContent={<X size={14} />}
                          onPress={() => act(id, 'reject')}>Reject</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardBody>
      </Card>

      <Card shadow="sm">
        <CardHeader className="flex items-center gap-2">
          <Brain size={18} className="text-default-500" />
          <h3 className="text-lg font-semibold">Recent runs</h3>
          <Chip size="sm" variant="flat">{runs.length}</Chip>
        </CardHeader>
        <CardBody>
          <Table aria-label="KI-Agent runs" isStriped>
            <TableHeader>
              <TableColumn>ID</TableColumn>
              <TableColumn>Status</TableColumn>
              <TableColumn>When</TableColumn>
            </TableHeader>
            <TableBody emptyContent="No runs" isLoading={loading} loadingContent={<Spinner />}>
              {runs.map((r, idx) => {
                const id = r.id ?? idx;
                return (
                  <TableRow key={id.toString()}>
                    <TableCell className="font-mono text-xs">{String(id)}</TableCell>
                    <TableCell><Chip variant="flat" size="sm">{r.status ?? 'unknown'}</Chip></TableCell>
                    <TableCell className="text-xs text-default-500">
                      {(r.updated_at ?? r.created_at) ? new Date(r.updated_at ?? r.created_at!).toLocaleString() : '—'}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardBody>
      </Card>
    </div>
  );
}
