// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/**
 * Agent Proposals (Admin) — replaces the parity stub.
 *
 * Wires to /api/v2/admin/agents/proposals (read) plus the existing
 * approve/edit-approve/reject endpoints (writes go through the
 * AdminExplicitParityController compatibility layer until a typed
 * AgentProposal entity is added).
 */

import { useCallback, useEffect, useState } from 'react';
import {
  Card, CardBody, CardHeader, Chip, Spinner, Button,
  Table, TableBody, TableCell, TableColumn, TableHeader, TableRow,
} from '@heroui/react';
import { ListChecks, RefreshCw, Check, X } from 'lucide-react';
import { usePageTitle } from '@/hooks';
import { useToast } from '@/contexts';
import { api } from '@/lib/api';
import { PageHeader } from '../../components';

interface Proposal {
  id?: string | number;
  agent?: string;
  status?: string;
  summary?: string;
  payload?: unknown;
  updated_at?: string;
  created_at?: string;
}

export default function AgentProposalsPage() {
  usePageTitle('Admin - Agent Proposals');
  const toast = useToast();

  const [rows, setRows] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ data: Proposal[] }>('/v2/admin/agents/proposals');
      if (res.success && res.data) {
        const payload = (res.data as unknown) as { data?: Proposal[] } | Proposal[];
        setRows(Array.isArray(payload) ? payload : payload.data ?? []);
      }
    } catch {
      toast.error('Failed to load agent proposals');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const act = useCallback(async (id: string | number, action: 'approve' | 'reject') => {
    const key = `${id}-${action}`;
    setWorking(key);
    try {
      const res = await api.post(`/v2/admin/agents/proposals/${id}/${action}`, {});
      if (res.success) {
        toast.success(`Proposal ${action}d`);
        await load();
      } else {
        toast.error(`Failed to ${action} proposal`);
      }
    } catch {
      toast.error(`Failed to ${action} proposal`);
    } finally {
      setWorking(null);
    }
  }, [toast, load]);

  return (
    <div>
      <PageHeader
        title="Agent Proposals"
        description="Pending AI agent proposals awaiting human review."
        actions={
          <Button variant="flat" size="sm" startContent={<RefreshCw size={16} />}
            onPress={load} isLoading={loading}>Refresh</Button>
        }
      />

      <Card shadow="sm">
        <CardHeader className="flex items-center gap-2">
          <ListChecks size={18} className="text-primary" />
          <h3 className="text-lg font-semibold">Proposals</h3>
          <Chip size="sm" variant="flat">{rows.length}</Chip>
        </CardHeader>
        <CardBody>
          <Table aria-label="Agent proposals" isStriped>
            <TableHeader>
              <TableColumn>ID</TableColumn>
              <TableColumn>Agent</TableColumn>
              <TableColumn>Summary</TableColumn>
              <TableColumn>Status</TableColumn>
              <TableColumn>Updated</TableColumn>
              <TableColumn>Actions</TableColumn>
            </TableHeader>
            <TableBody emptyContent="No agent proposals"
              isLoading={loading} loadingContent={<Spinner />}>
              {rows.map((p, idx) => {
                const id = p.id ?? idx;
                return (
                  <TableRow key={id.toString()}>
                    <TableCell className="font-mono text-xs">{String(id)}</TableCell>
                    <TableCell>{p.agent ?? '—'}</TableCell>
                    <TableCell className="max-w-md truncate text-sm">
                      {p.summary ?? (p.payload ? JSON.stringify(p.payload).slice(0, 100) : '—')}
                    </TableCell>
                    <TableCell>
                      <Chip variant="flat" size="sm">{p.status ?? 'pending'}</Chip>
                    </TableCell>
                    <TableCell className="text-xs text-default-500">
                      {(p.updated_at ?? p.created_at) ? new Date(p.updated_at ?? p.created_at!).toLocaleString() : '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="flat" color="success"
                          isLoading={working === `${id}-approve`}
                          startContent={<Check size={14} />}
                          onPress={() => act(id, 'approve')}>
                          Approve
                        </Button>
                        <Button size="sm" variant="flat" color="danger"
                          isLoading={working === `${id}-reject`}
                          startContent={<X size={14} />}
                          onPress={() => act(id, 'reject')}>
                          Reject
                        </Button>
                      </div>
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
