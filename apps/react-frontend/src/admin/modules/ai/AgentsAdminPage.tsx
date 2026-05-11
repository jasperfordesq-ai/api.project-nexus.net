// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/**
 * Agents (Admin) — replaces the parity stub.
 *
 * Backend split:
 *  - Real Phase 69 named agents (ActivitySummariser, NudgeDrafter) are
 *    runnable from /admin/ai/agents (AdminAiAgentsPage). This page lists
 *    them as a directory + provides a quick-link, since V1 had a generic
 *    "agents registry" surface and we want the same affordance.
 *  - Persisted compatibility records from /api/v2/admin/agents are also
 *    surfaced (in case any V1-shape POSTs landed via the parity router).
 */

import { useCallback, useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Card, CardBody, CardHeader, Chip, Spinner, Button,
  Table, TableBody, TableCell, TableColumn, TableHeader, TableRow,
} from '@heroui/react';
import { Bot, RefreshCw, ExternalLink } from 'lucide-react';
import { usePageTitle } from '@/hooks';
import { useToast } from '@/contexts';
import { api } from '@/lib/api';
import { PageHeader } from '../../components';

interface CompatRecord {
  id?: string | number;
  path?: string;
  payload?: unknown;
  updated_at?: string;
}

const REAL_AGENTS = [
  {
    name: 'Activity Summariser',
    description: 'Generates a 2–3 sentence prose summary of a member\'s recent activity (Phase 69, real).',
    runRoute: '/admin/ai/agents',
    status: 'active' as const,
  },
  {
    name: 'Nudge Drafter',
    description: 'Drafts a re-engagement nudge for a stale member (Phase 69, real).',
    runRoute: '/admin/ai/agents',
    status: 'active' as const,
  },
];

export default function AgentsAdminPage() {
  usePageTitle('Admin - Agents');
  const toast = useToast();

  const [records, setRecords] = useState<CompatRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ data: CompatRecord[] }>('/v2/admin/agents');
      if (res.success && res.data) {
        const payload = (res.data as unknown) as { data?: CompatRecord[] } | CompatRecord[];
        setRecords(Array.isArray(payload) ? payload : payload.data ?? []);
      }
    } catch {
      toast.error('Failed to load persisted agent records');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <PageHeader
        title="Agents"
        description="AI agent directory. Phase 69 named agents are runnable; V1-compatibility records are listed for audit."
        actions={
          <Button variant="flat" size="sm" startContent={<RefreshCw size={16} />}
            onPress={load} isLoading={loading}>Refresh</Button>
        }
      />

      <Card shadow="sm" className="mb-6">
        <CardHeader className="flex items-center gap-2">
          <Bot size={18} className="text-primary" />
          <h3 className="text-lg font-semibold">Real agents (Phase 69)</h3>
        </CardHeader>
        <CardBody>
          <Table aria-label="Real agents" isStriped>
            <TableHeader>
              <TableColumn>Name</TableColumn>
              <TableColumn>Description</TableColumn>
              <TableColumn>Status</TableColumn>
              <TableColumn>Action</TableColumn>
            </TableHeader>
            <TableBody>
              {REAL_AGENTS.map((a) => (
                <TableRow key={a.name}>
                  <TableCell className="font-medium">{a.name}</TableCell>
                  <TableCell className="text-default-600 text-sm">{a.description}</TableCell>
                  <TableCell><Chip color="success" variant="flat" size="sm">{a.status}</Chip></TableCell>
                  <TableCell>
                    <Button as={RouterLink} to={a.runRoute} size="sm" variant="flat" color="primary"
                      startContent={<ExternalLink size={14} />}>
                      Run
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardBody>
      </Card>

      <Card shadow="sm">
        <CardHeader className="flex items-center gap-2">
          <Bot size={18} className="text-default-500" />
          <h3 className="text-lg font-semibold">Compatibility records</h3>
          <Chip size="sm" variant="flat">{records.length}</Chip>
        </CardHeader>
        <CardBody>
          <Table aria-label="Compatibility records" isStriped>
            <TableHeader>
              <TableColumn>ID</TableColumn>
              <TableColumn>Updated</TableColumn>
              <TableColumn>Payload</TableColumn>
            </TableHeader>
            <TableBody emptyContent="No persisted compatibility records"
              isLoading={loading} loadingContent={<Spinner />}>
              {records.map((r, idx) => (
                <TableRow key={(r.id ?? idx).toString()}>
                  <TableCell className="font-mono text-xs">{String(r.id ?? idx)}</TableCell>
                  <TableCell className="text-xs text-default-500">
                    {r.updated_at ? new Date(r.updated_at).toLocaleString() : '—'}
                  </TableCell>
                  <TableCell className="font-mono text-xs max-w-md truncate">
                    {r.payload ? JSON.stringify(r.payload).slice(0, 120) : '—'}
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
