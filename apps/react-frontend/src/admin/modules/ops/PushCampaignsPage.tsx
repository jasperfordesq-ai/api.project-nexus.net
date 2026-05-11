// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/**
 * Push Campaigns (Admin) — bulk push-notification campaigns.
 *
 * Backend: AdminExplicitParityController parity routes.
 *   GET   /api/v2/admin/push-campaigns
 *   GET   /api/v2/admin/push-campaigns/{id}
 *   GET   /api/v2/admin/push-campaigns/stats
 *   POST  /api/v2/admin/push-campaigns/{id}/approve
 *   POST  /api/v2/admin/push-campaigns/{id}/dispatch
 *   POST  /api/v2/admin/push-campaigns/{id}/reject
 *
 * Member-side write endpoints (used by tenant admins to draft):
 *   POST  /api/me/push-campaigns
 *   POST  /api/me/push-campaigns/{id}/submit
 *
 * Gap: no first-class PushCampaign entity. Submissions are stored as
 * CompatibilityAuditEntries and replayed; the per-recipient delivery
 * fanout is not wired (PushNotificationService handles per-user pushes
 * but has no bulk campaign concept).
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button, Card, CardBody, CardHeader, Chip, Input, Modal, ModalBody, ModalContent,
  ModalFooter, ModalHeader, Select, SelectItem, Spinner, Textarea,
  Table, TableBody, TableCell, TableColumn, TableHeader, TableRow,
  useDisclosure,
} from '@heroui/react';
import { Send, Plus, RefreshCw, Ban, CheckCircle2 } from 'lucide-react';
import { usePageTitle } from '@/hooks';
import { useToast } from '@/contexts';
import { api } from '@/lib/api';
import { PageHeader } from '../../components';

interface AuditEntry {
  id: number;
  name: string;
  path: string;
  method: string;
  action: string;
  status: string;
  payload: Record<string, unknown> | null;
  admin_user_id?: number | null;
  occurred_at?: string;
}

interface PushCampaignRow {
  id: number;
  title: string;
  body: string;
  target_audience: string;
  segment: string;
  scheduled_at: string | null;
  status: string;
  recipients_count: number;
  delivered_count: number;
  occurred_at: string | null;
}

interface PushForm {
  title: string;
  body: string;
  target_audience: 'all' | 'segment';
  segment: string;
  scheduled_at: string;
}

const emptyForm: PushForm = {
  title: '', body: '', target_audience: 'all', segment: '', scheduled_at: '',
};

function statusColor(s: string): 'default' | 'success' | 'warning' | 'danger' | 'primary' {
  switch (s) {
    case 'sent': return 'success';
    case 'scheduled': return 'primary';
    case 'failed': case 'rejected': return 'danger';
    case 'cancelled': return 'warning';
    default: return 'default';
  }
}

function project(entry: AuditEntry): PushCampaignRow {
  const p = (entry.payload ?? {}) as Record<string, unknown>;
  const str = (k: string, d = ''): string => (typeof p[k] === 'string' ? p[k] as string : d);
  const num = (k: string): number => (typeof p[k] === 'number' ? p[k] as number : 0);
  return {
    id: entry.id,
    title: str('title') || entry.name || `Campaign #${entry.id}`,
    body: str('body'),
    target_audience: str('target_audience', 'all'),
    segment: str('segment'),
    scheduled_at: str('scheduled_at') || null,
    status: str('status', entry.action === 'dispatch' ? 'sent'
      : entry.action === 'reject' ? 'rejected'
      : entry.action === 'approve' ? 'scheduled' : 'draft'),
    recipients_count: num('recipients_count'),
    delivered_count: num('delivered_count'),
    occurred_at: entry.occurred_at ?? null,
  };
}

export default function PushCampaignsPage() {
  usePageTitle('Admin - Push Campaigns');
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<number | null>(null);
  const [form, setForm] = useState<PushForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ data: AuditEntry[] }>('/v2/admin/push-campaigns');
      if (res.success && res.data) {
        const payload = (res.data as unknown) as { data?: AuditEntry[] };
        setEntries(payload.data ?? []);
      }
    } catch { toast.error('Failed to load push campaigns'); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const rows = useMemo(() => entries.map(project), [entries]);

  const openCreate = useCallback(() => { setForm(emptyForm); onOpen(); }, [onOpen]);

  const submit = useCallback(async () => {
    if (!form.title.trim() || !form.body.trim()) {
      toast.error('Title and body are required');
      return;
    }
    setSaving(true);
    try {
      // Member-side draft endpoint; the parity layer records it and it
      // shows up in the admin GET list.
      const res = await api.post('/me/push-campaigns', {
        title: form.title.trim(),
        body: form.body.trim(),
        target_audience: form.target_audience,
        segment: form.target_audience === 'segment' ? form.segment.trim() : null,
        scheduled_at: form.scheduled_at || null,
        status: 'draft',
      });
      if (res.success) {
        toast.success('Push campaign drafted');
        onClose();
        await load();
      } else { toast.error(res.error || 'Save failed'); }
    } catch { toast.error('Save failed'); }
    finally { setSaving(false); }
  }, [form, toast, onClose, load]);

  const act = useCallback(async (id: number, action: 'approve' | 'dispatch' | 'reject') => {
    if (action === 'dispatch' && !window.confirm('Send this push campaign now? Recipients will receive an immediate notification.')) return;
    setWorking(id);
    try {
      const res = await api.post(`/v2/admin/push-campaigns/${id}/${action}`, {});
      if (res.success) {
        toast.success(action === 'dispatch' ? 'Dispatched' : action === 'approve' ? 'Approved' : 'Rejected');
        await load();
      } else { toast.error('Action failed'); }
    } catch { toast.error('Action failed'); }
    finally { setWorking(null); }
  }, [toast, load]);

  return (
    <div>
      <PageHeader
        title="Push Campaigns"
        description="Bulk push-notification campaigns. Drafts land via the member draft endpoint; admins approve, dispatch (send-now), or reject. Per-recipient delivery fanout is not yet wired — PushNotificationService handles individual sends only."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="flat" size="sm" startContent={<RefreshCw size={16} />}
              onPress={load} isLoading={loading}>Refresh</Button>
            <Button color="primary" size="sm" startContent={<Plus size={16} />}
              onPress={openCreate}>New campaign</Button>
          </div>
        }
      />
      <Card shadow="sm">
        <CardHeader className="flex items-center gap-2">
          <Send size={18} className="text-primary" />
          <h3 className="text-lg font-semibold">Campaigns ({rows.length})</h3>
        </CardHeader>
        <CardBody>
          <Table aria-label="Push campaigns" isStriped>
            <TableHeader>
              <TableColumn>Title</TableColumn>
              <TableColumn>Body</TableColumn>
              <TableColumn>Audience</TableColumn>
              <TableColumn>Segment</TableColumn>
              <TableColumn>Scheduled</TableColumn>
              <TableColumn>Status</TableColumn>
              <TableColumn>Recipients</TableColumn>
              <TableColumn>Delivered</TableColumn>
              <TableColumn>Actions</TableColumn>
            </TableHeader>
            <TableBody emptyContent="No push campaigns recorded." isLoading={loading} loadingContent={<Spinner />}>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.title}</TableCell>
                  <TableCell className="text-xs max-w-[280px] truncate text-default-600">{r.body}</TableCell>
                  <TableCell><code className="text-xs">{r.target_audience}</code></TableCell>
                  <TableCell className="text-xs">{r.segment || '—'}</TableCell>
                  <TableCell className="text-xs">{r.scheduled_at ?? '—'}</TableCell>
                  <TableCell><Chip size="sm" variant="flat" color={statusColor(r.status)}>{r.status}</Chip></TableCell>
                  <TableCell>{r.recipients_count.toLocaleString()}</TableCell>
                  <TableCell>{r.delivered_count.toLocaleString()}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" variant="flat" color="success" isLoading={working === r.id}
                        startContent={<CheckCircle2 size={14} />} onPress={() => act(r.id, 'approve')}>Approve</Button>
                      <Button size="sm" variant="flat" color="primary" isLoading={working === r.id}
                        startContent={<Send size={14} />} onPress={() => act(r.id, 'dispatch')}>Send</Button>
                      <Button size="sm" variant="flat" color="danger" isLoading={working === r.id}
                        startContent={<Ban size={14} />} onPress={() => act(r.id, 'reject')}>Reject</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardBody>
      </Card>

      <Modal isOpen={isOpen} onClose={onClose} size="2xl">
        <ModalContent>
          <ModalHeader>New push campaign</ModalHeader>
          <ModalBody className="space-y-3">
            <Input label="Title" value={form.title} onValueChange={(v) => setForm({ ...form, title: v })} isRequired />
            <Textarea label="Body" value={form.body} onValueChange={(v) => setForm({ ...form, body: v })} isRequired />
            <div className="grid grid-cols-2 gap-3">
              <Select label="Audience" selectedKeys={new Set([form.target_audience])}
                onSelectionChange={(keys) => {
                  const v = Array.from(keys)[0] as PushForm['target_audience'] | undefined;
                  if (v) setForm({ ...form, target_audience: v });
                }}>
                {(['all', 'segment'] as const).map((a) => (
                  <SelectItem key={a} textValue={a}>{a}</SelectItem>
                )) as never}
              </Select>
              <Input label="Schedule at" type="datetime-local" value={form.scheduled_at}
                onValueChange={(v) => setForm({ ...form, scheduled_at: v })} />
            </div>
            {form.target_audience === 'segment' && (
              <Input label="Segment description" placeholder="e.g. active_last_30d"
                value={form.segment} onValueChange={(v) => setForm({ ...form, segment: v })} />
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={onClose}>Cancel</Button>
            <Button color="primary" onPress={submit} isLoading={saving}>Create draft</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
