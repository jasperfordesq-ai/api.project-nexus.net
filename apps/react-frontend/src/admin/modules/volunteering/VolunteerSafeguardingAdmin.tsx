// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/**
 * Volunteer Safeguarding (Admin) — replaces the parity stub with a real
 * dashboard + flagged-messages review queue wired to the existing
 * AdminSafeguardingController endpoints.
 *
 * GET /api/admin/safeguarding/dashboard
 * GET /api/admin/safeguarding/flagged-messages
 * POST /api/admin/safeguarding/flagged-messages/{id}/review
 */

import { useCallback, useEffect, useState } from 'react';
import {
  Button, Card, CardBody, CardHeader, Chip, Modal, ModalBody, ModalContent,
  ModalFooter, ModalHeader, Select, SelectItem, Spinner, Table, TableBody,
  TableCell, TableColumn, TableHeader, TableRow, Textarea,
} from '@heroui/react';
import { Shield, RefreshCw, Check, AlertTriangle } from 'lucide-react';
import { usePageTitle } from '@/hooks';
import { useToast } from '@/contexts';
import { api } from '@/lib/api';
import { PageHeader } from '../../components';

interface SafeguardingDashboard {
  active_assignments: number;
  unreviewed_flags: number;
  consented_wards: number;
  total_flags_this_month: number;
  critical_flags: number;
}

interface FlaggedMessage {
  id: number;
  message_id?: number | null;
  severity: string;
  reason?: string | null;
  is_flagged: boolean;
  reviewed_at: string | null;
  created_at: string;
  sender?: { id: number; email: string; first_name?: string; last_name?: string } | null;
  recipient?: { id: number; email: string; first_name?: string; last_name?: string } | null;
  message?: { id: number; content: string } | null;
}

const STATUS_OPTIONS = [
  { value: 'unreviewed', label: 'Unreviewed' },
  { value: 'reviewed', label: 'Reviewed' },
  { value: 'all', label: 'All' },
] as const;

type StatusFilter = (typeof STATUS_OPTIONS)[number]['value'];

function severityColor(s: string): 'default' | 'warning' | 'danger' {
  if (s === 'critical' || s === 'high') return 'danger';
  if (s === 'medium') return 'warning';
  return 'default';
}

export default function VolunteerSafeguardingAdmin() {
  usePageTitle('Admin - Volunteer Safeguarding');
  const toast = useToast();

  const [dashboard, setDashboard] = useState<SafeguardingDashboard | null>(null);
  const [filter, setFilter] = useState<StatusFilter>('unreviewed');
  const [rows, setRows] = useState<FlaggedMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<number | null>(null);
  const [reviewTarget, setReviewTarget] = useState<FlaggedMessage | null>(null);
  const [reviewNote, setReviewNote] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const dashRes = await api.get<unknown>('/admin/safeguarding/dashboard');
      if (dashRes.success && dashRes.data) {
        const dashPayload = (dashRes.data as { data?: SafeguardingDashboard }).data ?? (dashRes.data as SafeguardingDashboard);
        setDashboard(dashPayload);
      }

      const statusParam = filter === 'all' ? '' : `?status=${filter}`;
      const listRes = await api.get<unknown>(`/admin/safeguarding/flagged-messages${statusParam}`);
      if (listRes.success && listRes.data) {
        const payload = (listRes.data as { data?: FlaggedMessage[] }).data ?? [];
        setRows(payload);
      }
    } catch {
      toast.error('Failed to load safeguarding data');
    } finally {
      setLoading(false);
    }
  }, [filter, toast]);

  useEffect(() => { load(); }, [load]);

  const submitReview = useCallback(async () => {
    if (!reviewTarget) return;
    setWorking(reviewTarget.id);
    try {
      const res = await api.post(`/admin/safeguarding/flagged-messages/${reviewTarget.id}/review`, {
        notes: reviewNote || null,
      });
      if (res.success) {
        toast.success('Marked as reviewed');
        setReviewTarget(null);
        setReviewNote('');
        await load();
      } else {
        toast.error('Review failed');
      }
    } catch {
      toast.error('Review failed');
    } finally {
      setWorking(null);
    }
  }, [reviewTarget, reviewNote, toast, load]);

  const fmtDate = (s: string | null) => (s ? new Date(s).toLocaleString() : '—');
  const userLabel = (u: FlaggedMessage['sender']) =>
    u ? `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() || u.email : '—';

  return (
    <div>
      <PageHeader
        title="Volunteer Safeguarding"
        description="Active assignments, flagged-message review queue, and severity overview."
        actions={
          <div className="flex items-center gap-2">
            <Select
              size="sm"
              variant="bordered"
              className="w-44"
              selectedKeys={new Set([filter])}
              onSelectionChange={(keys) => {
                const v = Array.from(keys)[0] as StatusFilter | undefined;
                if (v) setFilter(v);
              }}
              aria-label="Filter by status"
            >
              {STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} textValue={o.label}>{o.label}</SelectItem>
              ))}
            </Select>
            <Button variant="flat" size="sm" startContent={<RefreshCw size={16} />}
              onPress={load} isLoading={loading}>Refresh</Button>
          </div>
        }
      />

      {dashboard && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
          <Card><CardBody>
            <div className="text-xs text-default-500">Active assignments</div>
            <div className="text-2xl font-semibold">{dashboard.active_assignments}</div>
          </CardBody></Card>
          <Card><CardBody>
            <div className="text-xs text-default-500">Consented wards</div>
            <div className="text-2xl font-semibold">{dashboard.consented_wards}</div>
          </CardBody></Card>
          <Card><CardBody>
            <div className="text-xs text-default-500">Unreviewed flags</div>
            <div className="text-2xl font-semibold">{dashboard.unreviewed_flags}</div>
          </CardBody></Card>
          <Card><CardBody>
            <div className="text-xs text-default-500">Critical flags</div>
            <div className="text-2xl font-semibold text-danger">{dashboard.critical_flags}</div>
          </CardBody></Card>
          <Card><CardBody>
            <div className="text-xs text-default-500">Flags this month</div>
            <div className="text-2xl font-semibold">{dashboard.total_flags_this_month}</div>
          </CardBody></Card>
        </div>
      )}

      <Card shadow="sm">
        <CardHeader className="flex items-center gap-2">
          <Shield size={18} className="text-primary" />
          <h3 className="text-lg font-semibold">Flagged messages</h3>
        </CardHeader>
        <CardBody>
          <Table aria-label="Flagged messages" isStriped>
            <TableHeader>
              <TableColumn>ID</TableColumn>
              <TableColumn>Severity</TableColumn>
              <TableColumn>Sender</TableColumn>
              <TableColumn>Recipient</TableColumn>
              <TableColumn>Message</TableColumn>
              <TableColumn>Created</TableColumn>
              <TableColumn>Reviewed</TableColumn>
              <TableColumn>Action</TableColumn>
            </TableHeader>
            <TableBody emptyContent="No flagged messages" isLoading={loading} loadingContent={<Spinner />}>
              {rows.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>#{m.id}</TableCell>
                  <TableCell>
                    <Chip color={severityColor(m.severity)} variant="flat" size="sm" startContent={<AlertTriangle size={12} />}>
                      {m.severity}
                    </Chip>
                  </TableCell>
                  <TableCell>{userLabel(m.sender)}</TableCell>
                  <TableCell>{userLabel(m.recipient)}</TableCell>
                  <TableCell className="max-w-md truncate">{m.message?.content ?? '—'}</TableCell>
                  <TableCell className="text-xs text-default-500">{fmtDate(m.created_at)}</TableCell>
                  <TableCell className="text-xs text-default-500">{fmtDate(m.reviewed_at)}</TableCell>
                  <TableCell>
                    {m.reviewed_at == null && (
                      <Button size="sm" variant="flat" color="success" isLoading={working === m.id}
                        startContent={<Check size={14} />}
                        onPress={() => { setReviewTarget(m); setReviewNote(''); }}>
                        Review
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardBody>
      </Card>

      <Modal isOpen={reviewTarget !== null} onClose={() => setReviewTarget(null)}>
        <ModalContent>
          <ModalHeader>Review flagged message #{reviewTarget?.id}</ModalHeader>
          <ModalBody>
            <Textarea label="Review notes (optional)"
              placeholder="Decision rationale and follow-up actions taken."
              value={reviewNote} onValueChange={setReviewNote} minRows={3} />
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={() => setReviewTarget(null)}>Cancel</Button>
            <Button color="success" isLoading={working !== null} onPress={submitReview}>Mark reviewed</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
