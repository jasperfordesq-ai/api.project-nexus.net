// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/**
 * Advertising Campaigns (Admin) — ad campaign registry.
 *
 * Backend: AdminExplicitParityController parity routes.
 *   GET   /api/v2/admin/ad-campaigns
 *   GET   /api/v2/admin/ad-campaigns/{id}
 *   GET   /api/v2/admin/ad-campaigns/stats
 *   POST  /api/v2/admin/ad-campaigns/{id}/approve
 *   POST  /api/v2/admin/ad-campaigns/{id}/pause
 *   POST  /api/v2/admin/ad-campaigns/{id}/reject
 *
 * Gap: there is no first-class AdCampaign entity yet — the parity layer
 * stores submissions in CompatibilityAuditEntries and replays them on
 * GET. Members write campaigns through MemberParityController
 * (/api/me/ad-campaigns). This admin page renders the recorded audit
 * trail; "Create" issues a POST through the parity layer (same
 * mechanism the existing member endpoint uses).
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button, Card, CardBody, CardHeader, Chip, Input, Modal, ModalBody, ModalContent,
  ModalFooter, ModalHeader, Select, SelectItem, Spinner,
  Table, TableBody, TableCell, TableColumn, TableHeader, TableRow,
  useDisclosure,
} from '@heroui/react';
import { Megaphone, Plus, RefreshCw, Pause, Play, Trash2 } from 'lucide-react';
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
  updated_at?: string;
}

interface CampaignRow {
  id: number;
  name: string;
  type: string;
  placement: string;
  status: string;
  start_at: string | null;
  end_at: string | null;
  impressions: number;
  clicks: number;
  ctr: number;
  occurred_at: string | null;
}

interface CampaignForm {
  name: string;
  type: 'banner' | 'text' | 'video';
  placement: 'feed' | 'sidebar' | 'email';
  start_at: string;
  end_at: string;
}

const emptyForm: CampaignForm = {
  name: '', type: 'banner', placement: 'feed', start_at: '', end_at: '',
};

function statusColor(s: string): 'default' | 'success' | 'warning' | 'danger' {
  switch (s) {
    case 'active': return 'success';
    case 'paused': return 'warning';
    case 'expired': case 'rejected': return 'danger';
    default: return 'default';
  }
}

function projectCampaign(entry: AuditEntry): CampaignRow {
  const p = entry.payload ?? {};
  const num = (k: string): number => {
    const v = (p as Record<string, unknown>)[k];
    return typeof v === 'number' ? v : 0;
  };
  const str = (k: string, dflt = ''): string => {
    const v = (p as Record<string, unknown>)[k];
    return typeof v === 'string' ? v : dflt;
  };
  const impressions = num('impressions');
  const clicks = num('clicks');
  return {
    id: entry.id,
    name: str('name') || entry.name || `Campaign #${entry.id}`,
    type: str('type', 'banner'),
    placement: str('placement', 'feed'),
    status: str('status', entry.action === 'pause' ? 'paused' : 'draft'),
    start_at: str('start_at') || null,
    end_at: str('end_at') || null,
    impressions,
    clicks,
    ctr: impressions > 0 ? Math.round((clicks / impressions) * 10000) / 100 : 0,
    occurred_at: entry.occurred_at ?? entry.updated_at ?? null,
  };
}

export default function AdvertisingCampaignsPage() {
  usePageTitle('Admin - Advertising Campaigns');
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<number | null>(null);
  const [form, setForm] = useState<CampaignForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ data: AuditEntry[]; meta?: { total: number } }>('/v2/admin/ad-campaigns');
      if (res.success && res.data) {
        const payload = (res.data as unknown) as { data?: AuditEntry[] };
        setEntries(payload.data ?? []);
      }
    } catch { toast.error('Failed to load campaigns'); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const rows = useMemo(() => entries.map(projectCampaign), [entries]);

  const stats = useMemo(() => {
    const totalImpr = rows.reduce((a, r) => a + r.impressions, 0);
    const totalClicks = rows.reduce((a, r) => a + r.clicks, 0);
    const active = rows.filter((r) => r.status === 'active').length;
    return {
      total: rows.length,
      active,
      impressions: totalImpr,
      clicks: totalClicks,
      ctr: totalImpr > 0 ? Math.round((totalClicks / totalImpr) * 10000) / 100 : 0,
    };
  }, [rows]);

  const openCreate = useCallback(() => { setForm(emptyForm); onOpen(); }, [onOpen]);

  const submit = useCallback(async () => {
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    setSaving(true);
    try {
      const body = {
        name: form.name.trim(),
        type: form.type,
        placement: form.placement,
        status: 'draft',
        start_at: form.start_at || null,
        end_at: form.end_at || null,
      };
      // No first-class create endpoint exists in the parity layer; we record
      // the draft as a parity write keyed under the campaign action so it
      // surfaces in the GET list.
      const res = await api.post('/v2/admin/ad-campaigns/0/approve', body);
      if (res.success) {
        toast.success('Campaign draft recorded');
        onClose();
        await load();
      } else { toast.error(res.error || 'Save failed'); }
    } catch { toast.error('Save failed'); }
    finally { setSaving(false); }
  }, [form, toast, onClose, load]);

  const act = useCallback(async (id: number, action: 'approve' | 'pause' | 'reject') => {
    setWorking(id);
    try {
      const res = await api.post(`/v2/admin/ad-campaigns/${id}/${action}`, {});
      if (res.success) {
        toast.success(action === 'approve' ? 'Approved' : action === 'pause' ? 'Paused' : 'Rejected');
        await load();
      } else { toast.error('Action failed'); }
    } catch { toast.error('Action failed'); }
    finally { setWorking(null); }
  }, [toast, load]);

  return (
    <div>
      <PageHeader
        title="Advertising Campaigns"
        description="Registry of ad campaigns recorded through the parity layer. There is no dedicated AdCampaign entity yet — submissions land in CompatibilityAuditEntries and are replayed here. Approve / pause / reject record the corresponding state transition."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="flat" size="sm" startContent={<RefreshCw size={16} />}
              onPress={load} isLoading={loading}>Refresh</Button>
            <Button color="primary" size="sm" startContent={<Plus size={16} />}
              onPress={openCreate}>New campaign</Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        <Card shadow="sm"><CardBody className="py-3"><p className="text-xs text-default-500">Total</p><p className="text-2xl font-bold">{stats.total}</p></CardBody></Card>
        <Card shadow="sm"><CardBody className="py-3"><p className="text-xs text-default-500">Active</p><p className="text-2xl font-bold text-success">{stats.active}</p></CardBody></Card>
        <Card shadow="sm"><CardBody className="py-3"><p className="text-xs text-default-500">Impressions</p><p className="text-2xl font-bold">{stats.impressions.toLocaleString()}</p></CardBody></Card>
        <Card shadow="sm"><CardBody className="py-3"><p className="text-xs text-default-500">Clicks</p><p className="text-2xl font-bold">{stats.clicks.toLocaleString()}</p></CardBody></Card>
        <Card shadow="sm"><CardBody className="py-3"><p className="text-xs text-default-500">Avg CTR</p><p className="text-2xl font-bold">{stats.ctr}%</p></CardBody></Card>
      </div>

      <Card shadow="sm">
        <CardHeader className="flex items-center gap-2">
          <Megaphone size={18} className="text-primary" />
          <h3 className="text-lg font-semibold">Campaigns ({rows.length})</h3>
        </CardHeader>
        <CardBody>
          <Table aria-label="Advertising campaigns" isStriped>
            <TableHeader>
              <TableColumn>Name</TableColumn>
              <TableColumn>Type</TableColumn>
              <TableColumn>Placement</TableColumn>
              <TableColumn>Status</TableColumn>
              <TableColumn>Start</TableColumn>
              <TableColumn>End</TableColumn>
              <TableColumn>Impr.</TableColumn>
              <TableColumn>Clicks</TableColumn>
              <TableColumn>CTR</TableColumn>
              <TableColumn>Actions</TableColumn>
            </TableHeader>
            <TableBody emptyContent="No campaigns recorded yet." isLoading={loading} loadingContent={<Spinner />}>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell><code className="text-xs">{r.type}</code></TableCell>
                  <TableCell><code className="text-xs">{r.placement}</code></TableCell>
                  <TableCell><Chip size="sm" variant="flat" color={statusColor(r.status)}>{r.status}</Chip></TableCell>
                  <TableCell className="text-xs">{r.start_at ?? '—'}</TableCell>
                  <TableCell className="text-xs">{r.end_at ?? '—'}</TableCell>
                  <TableCell>{r.impressions.toLocaleString()}</TableCell>
                  <TableCell>{r.clicks.toLocaleString()}</TableCell>
                  <TableCell>{r.ctr}%</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" variant="flat" color="success" isLoading={working === r.id}
                        startContent={<Play size={14} />} onPress={() => act(r.id, 'approve')}>Approve</Button>
                      <Button size="sm" variant="flat" isLoading={working === r.id}
                        startContent={<Pause size={14} />} onPress={() => act(r.id, 'pause')}>Pause</Button>
                      <Button size="sm" variant="flat" color="danger" isLoading={working === r.id}
                        startContent={<Trash2 size={14} />} onPress={() => act(r.id, 'reject')}>Reject</Button>
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
          <ModalHeader>New campaign</ModalHeader>
          <ModalBody className="space-y-3">
            <Input label="Name" value={form.name} onValueChange={(v) => setForm({ ...form, name: v })} isRequired />
            <div className="grid grid-cols-2 gap-3">
              <Select label="Type" selectedKeys={new Set([form.type])}
                onSelectionChange={(keys) => {
                  const v = Array.from(keys)[0] as CampaignForm['type'] | undefined;
                  if (v) setForm({ ...form, type: v });
                }}>
                {(['banner', 'text', 'video'] as const).map((t) => (
                  <SelectItem key={t} textValue={t}>{t}</SelectItem>
                )) as never}
              </Select>
              <Select label="Placement" selectedKeys={new Set([form.placement])}
                onSelectionChange={(keys) => {
                  const v = Array.from(keys)[0] as CampaignForm['placement'] | undefined;
                  if (v) setForm({ ...form, placement: v });
                }}>
                {(['feed', 'sidebar', 'email'] as const).map((p) => (
                  <SelectItem key={p} textValue={p}>{p}</SelectItem>
                )) as never}
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input type="date" label="Start" value={form.start_at}
                onValueChange={(v) => setForm({ ...form, start_at: v })} />
              <Input type="date" label="End" value={form.end_at}
                onValueChange={(v) => setForm({ ...form, end_at: v })} />
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={onClose}>Cancel</Button>
            <Button color="primary" onPress={submit} isLoading={saving}>Create</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
