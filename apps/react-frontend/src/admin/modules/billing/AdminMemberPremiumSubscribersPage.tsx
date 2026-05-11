// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/**
 * Member Premium Subscribers (Admin) — replaces the
 * MemberPremiumSubscribersPage parity stub.
 *   GET /api/v2/admin/member-premium/subscribers
 *
 * Read-only audit list of premium subscribers (parity records — payload is
 * free-form; we surface common user/email/tier fields).
 */

import { useCallback, useEffect, useState } from 'react';
import {
  Button, Card, CardBody, CardHeader, Chip, Spinner, Table, TableBody,
  TableCell, TableColumn, TableHeader, TableRow,
} from '@heroui/react';
import { Users, RefreshCw } from 'lucide-react';
import { usePageTitle } from '@/hooks';
import { useToast } from '@/contexts';
import { api } from '@/lib/api';
import { PageHeader } from '../../components';

interface ParityRecord {
  id: number;
  name: string | null;
  status: string;
  payload: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export default function AdminMemberPremiumSubscribersPage() {
  usePageTitle('Admin - Premium Subscribers');
  const toast = useToast();
  const [rows, setRows] = useState<ParityRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ data: ParityRecord[] }>('/v2/admin/member-premium/subscribers');
      if (res.success && res.data) {
        const p = (res.data as unknown) as { data?: ParityRecord[] };
        setRows(p.data ?? []);
      }
    } catch {
      toast.error('Failed to load subscribers');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const get = (r: ParityRecord, key: string): string => {
    const v = r.payload?.[key];
    return v == null ? '' : String(v);
  };

  return (
    <div>
      <PageHeader
        title="Premium Subscribers"
        description="Members on premium tiers."
        actions={
          <Button variant="flat" size="sm" startContent={<RefreshCw size={16} />} onPress={load} isLoading={loading}>
            Refresh
          </Button>
        }
      />

      <Card shadow="sm">
        <CardHeader className="flex items-center gap-2">
          <Users size={18} className="text-primary" />
          <h3 className="text-lg font-semibold">Subscribers</h3>
          <span className="text-default-500 text-xs ml-auto">{rows.length} total</span>
        </CardHeader>
        <CardBody>
          <Table aria-label="Premium subscribers" isStriped>
            <TableHeader>
              <TableColumn>ID</TableColumn>
              <TableColumn>User</TableColumn>
              <TableColumn>Email</TableColumn>
              <TableColumn>Tier</TableColumn>
              <TableColumn>Status</TableColumn>
              <TableColumn>Started</TableColumn>
            </TableHeader>
            <TableBody emptyContent="No premium subscribers yet" isLoading={loading} loadingContent={<Spinner />}>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>#{r.id}</TableCell>
                  <TableCell>{get(r, 'user_id') || get(r, 'userId') || '—'}</TableCell>
                  <TableCell>{get(r, 'email') || get(r, 'user_email') || '—'}</TableCell>
                  <TableCell>{get(r, 'tier') || get(r, 'tier_name') || '—'}</TableCell>
                  <TableCell>
                    <Chip color="default" variant="flat" size="sm">{get(r, 'status') || r.status}</Chip>
                  </TableCell>
                  <TableCell className="text-default-500 text-xs">
                    {new Date(r.created_at).toLocaleDateString()}
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
