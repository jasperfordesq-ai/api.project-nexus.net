// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/**
 * Volunteer Community Projects (Admin) — replaces the parity stub.
 * Reads VolunteerOpportunities (which back "community projects" per V1 parity).
 *
 * GET /api/volunteering/community-projects
 * GET /api/volunteering/community-projects/{id}
 */

import { useCallback, useEffect, useState } from 'react';
import {
  Button, Card, CardBody, CardHeader, Chip, Spinner, Table, TableBody,
  TableCell, TableColumn, TableHeader, TableRow,
} from '@heroui/react';
import { ClipboardList, RefreshCw } from 'lucide-react';
import { usePageTitle } from '@/hooks';
import { useToast } from '@/contexts';
import { api } from '@/lib/api';
import { PageHeader } from '../../components';

interface CommunityProject {
  id: number;
  title: string;
  description?: string | null;
  status?: string | number | null;
  startsAt?: string | null;
  endsAt?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  location?: string | null;
  creditReward?: number | null;
  credit_reward?: number | null;
  createdAt?: string | null;
  created_at?: string | null;
}

function statusLabel(s: CommunityProject['status']): string {
  if (s == null) return 'Unknown';
  if (typeof s === 'number') {
    return ['Draft', 'Published', 'Closed', 'Cancelled', 'Archived'][s] ?? `Status ${s}`;
  }
  return String(s);
}

function statusColor(label: string): 'default' | 'primary' | 'success' | 'danger' | 'warning' {
  switch (label.toLowerCase()) {
    case 'published': return 'success';
    case 'draft': return 'warning';
    case 'closed':
    case 'archived': return 'default';
    case 'cancelled': return 'danger';
    default: return 'primary';
  }
}

export default function VolunteerProjectsAdmin() {
  usePageTitle('Admin - Community Projects');
  const toast = useToast();

  const [rows, setRows] = useState<CommunityProject[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<unknown>('/volunteering/community-projects');
      if (res.success && res.data) {
        const payload = res.data as { data?: CommunityProject[] };
        setRows(payload.data ?? []);
      }
    } catch {
      toast.error('Failed to load community projects');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const fmt = (d?: string | null) => (d ? new Date(d).toLocaleDateString() : '—');

  return (
    <div>
      <PageHeader
        title="Community Projects"
        description="All volunteer opportunities serving as community projects — read-only audit view."
        actions={
          <Button variant="flat" size="sm" startContent={<RefreshCw size={16} />}
            onPress={load} isLoading={loading}>Refresh</Button>
        }
      />

      <Card shadow="sm">
        <CardHeader className="flex items-center gap-2">
          <ClipboardList size={18} className="text-primary" />
          <h3 className="text-lg font-semibold">Community projects ({rows.length})</h3>
        </CardHeader>
        <CardBody>
          <Table aria-label="Community projects" isStriped>
            <TableHeader>
              <TableColumn>ID</TableColumn>
              <TableColumn>Title</TableColumn>
              <TableColumn>Status</TableColumn>
              <TableColumn>Starts</TableColumn>
              <TableColumn>Ends</TableColumn>
              <TableColumn>Location</TableColumn>
              <TableColumn className="text-right">Credit reward</TableColumn>
              <TableColumn>Created</TableColumn>
            </TableHeader>
            <TableBody emptyContent="No community projects found" isLoading={loading} loadingContent={<Spinner />}>
              {rows.map((p) => {
                const label = statusLabel(p.status);
                return (
                  <TableRow key={p.id}>
                    <TableCell>#{p.id}</TableCell>
                    <TableCell className="max-w-md truncate">{p.title}</TableCell>
                    <TableCell><Chip color={statusColor(label)} variant="flat" size="sm">{label}</Chip></TableCell>
                    <TableCell className="text-xs">{fmt(p.startsAt ?? p.starts_at)}</TableCell>
                    <TableCell className="text-xs">{fmt(p.endsAt ?? p.ends_at)}</TableCell>
                    <TableCell>{p.location ?? '—'}</TableCell>
                    <TableCell className="text-right font-medium">{p.creditReward ?? p.credit_reward ?? 0}</TableCell>
                    <TableCell className="text-xs text-default-500">{fmt(p.createdAt ?? p.created_at)}</TableCell>
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
