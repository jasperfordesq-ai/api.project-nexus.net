// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/**
 * Agent Runs (Admin) — replaces the parity stub.
 *
 * Wires to /api/v2/admin/agents/runs (read). The endpoint is currently a
 * compatibility-storage shape (records are written by the parity router)
 * — we surface them as a chronological run log with status chips.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  Card, CardBody, CardHeader, Chip, Spinner, Button,
  Table, TableBody, TableCell, TableColumn, TableHeader, TableRow,
} from '@heroui/react';
import { History, RefreshCw } from 'lucide-react';
import { usePageTitle } from '@/hooks';
import { useToast } from '@/contexts';
import { api } from '@/lib/api';
import { PageHeader } from '../../components';

interface AgentRun {
  id?: string | number;
  agent?: string;
  status?: string;
  duration_ms?: number;
  output?: string;
  payload?: unknown;
  updated_at?: string;
  created_at?: string;
}

function statusColor(s?: string): 'default' | 'primary' | 'success' | 'danger' | 'warning' {
  switch ((s ?? '').toLowerCase()) {
    case 'success': case 'completed': return 'success';
    case 'failed': case 'error': return 'danger';
    case 'running': case 'in_progress': return 'warning';
    case 'queued': case 'pending': return 'primary';
    default: return 'default';
  }
}

export default function AgentRunsPage() {
  usePageTitle('Admin - Agent Runs');
  const toast = useToast();

  const [rows, setRows] = useState<AgentRun[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ data: AgentRun[] }>('/v2/admin/agents/runs');
      if (res.success && res.data) {
        const payload = (res.data as unknown) as { data?: AgentRun[] } | AgentRun[];
        setRows(Array.isArray(payload) ? payload : payload.data ?? []);
      }
    } catch {
      toast.error('Failed to load agent runs');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <PageHeader
        title="Agent Runs"
        description="Historical AI agent execution log with status and duration."
        actions={
          <Button variant="flat" size="sm" startContent={<RefreshCw size={16} />}
            onPress={load} isLoading={loading}>Refresh</Button>
        }
      />

      <Card shadow="sm">
        <CardHeader className="flex items-center gap-2">
          <History size={18} className="text-primary" />
          <h3 className="text-lg font-semibold">Runs</h3>
          <Chip size="sm" variant="flat">{rows.length}</Chip>
        </CardHeader>
        <CardBody>
          <Table aria-label="Agent runs" isStriped>
            <TableHeader>
              <TableColumn>ID</TableColumn>
              <TableColumn>Agent</TableColumn>
              <TableColumn>Status</TableColumn>
              <TableColumn className="text-right">Duration</TableColumn>
              <TableColumn>Output</TableColumn>
              <TableColumn>When</TableColumn>
            </TableHeader>
            <TableBody emptyContent="No agent runs recorded"
              isLoading={loading} loadingContent={<Spinner />}>
              {rows.map((r, idx) => {
                const id = r.id ?? idx;
                return (
                  <TableRow key={id.toString()}>
                    <TableCell className="font-mono text-xs">{String(id)}</TableCell>
                    <TableCell>{r.agent ?? '—'}</TableCell>
                    <TableCell>
                      <Chip color={statusColor(r.status)} variant="flat" size="sm">
                        {r.status ?? 'unknown'}
                      </Chip>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {r.duration_ms != null ? `${r.duration_ms}ms` : '—'}
                    </TableCell>
                    <TableCell className="max-w-md truncate text-sm">
                      {r.output ?? (r.payload ? JSON.stringify(r.payload).slice(0, 100) : '—')}
                    </TableCell>
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
