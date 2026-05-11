// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/**
 * Federation Webhooks (Admin) — outbound webhook subscriptions registry.
 *
 * Endpoints (real, AdminExplicitParityController KV-store backed):
 *   GET    /api/v2/admin/federation/webhooks
 *   POST   /api/v2/admin/federation/webhooks
 *   PUT    /api/v2/admin/federation/webhooks/{id}
 *   DELETE /api/v2/admin/federation/webhooks/{id}
 *   POST   /api/v2/admin/federation/webhooks/{id}/test
 *   GET    /api/v2/admin/federation/webhooks/{id}/logs
 *
 * Storage note: persisted via tenant_config KV (not a dedicated table); fine
 * for low-volume admin registry. Each record has { id, name, status, payload,
 * created_at, updated_at } and the user-supplied fields live inside payload.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  Button, Card, CardBody, CardHeader, Chip, Input, Modal, ModalBody, ModalContent,
  ModalFooter, ModalHeader, Select, SelectItem, Spinner,
  Table, TableBody, TableCell, TableColumn, TableHeader, TableRow,
  Tabs, Tab, useDisclosure,
} from '@heroui/react';
import { Plus, RefreshCw, Send, Trash2, Edit3, Webhook, ScrollText } from 'lucide-react';
import { usePageTitle } from '@/hooks';
import { useToast } from '@/contexts';
import { api } from '@/lib/api';
import { PageHeader } from '../../components';

interface StoredRecord {
  id: number;
  kind: string;
  name: string | null;
  status: string | null;
  payload: Record<string, unknown> | unknown;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
}

interface WebhookPayload {
  target_url?: string;
  partner_id?: number | string;
  event_types?: string[] | string;
  secret?: string;
  active?: boolean;
  description?: string;
  last_delivered_at?: string;
  retry_count?: number;
}

interface WebhookFormState {
  id?: number;
  name: string;
  target_url: string;
  partner_id: string;
  event_types: string;
  secret: string;
  description: string;
  active: boolean;
}

const emptyForm: WebhookFormState = {
  name: '', target_url: '', partner_id: '', event_types: '', secret: '',
  description: '', active: true,
};

function readPayload(r: StoredRecord): WebhookPayload {
  if (r.payload && typeof r.payload === 'object') return r.payload as WebhookPayload;
  return {};
}

function eventTypeList(p: WebhookPayload): string[] {
  if (Array.isArray(p.event_types)) return p.event_types;
  if (typeof p.event_types === 'string') return p.event_types.split(',').map((s) => s.trim()).filter(Boolean);
  return [];
}

export default function AdminFederationWebhooksPage() {
  usePageTitle('Admin - Federation Webhooks');
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [tab, setTab] = useState<'outbound' | 'inbound'>('outbound');
  const [rows, setRows] = useState<StoredRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<number | null>(null);
  const [form, setForm] = useState<WebhookFormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [logsFor, setLogsFor] = useState<number | null>(null);
  const [logs, setLogs] = useState<StoredRecord[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ data: StoredRecord[] }>('/v2/admin/federation/webhooks');
      if (res.success && res.data) {
        const payload = (res.data as unknown) as { data?: StoredRecord[] };
        const all = payload.data ?? [];
        setRows(all.filter((r) => !r.deleted_at));
      }
    } catch { toast.error('Failed to load webhooks'); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const openCreate = useCallback(() => { setForm(emptyForm); onOpen(); }, [onOpen]);

  const openEdit = useCallback((r: StoredRecord) => {
    const p = readPayload(r);
    setForm({
      id: r.id,
      name: r.name ?? '',
      target_url: p.target_url ?? '',
      partner_id: p.partner_id ? String(p.partner_id) : '',
      event_types: eventTypeList(p).join(', '),
      secret: '',
      description: p.description ?? '',
      active: p.active !== false,
    });
    onOpen();
  }, [onOpen]);

  const save = useCallback(async () => {
    if (!form.name.trim() || !form.target_url.trim()) {
      toast.error('Name and target URL are required');
      return;
    }
    setSaving(true);
    try {
      const events = form.event_types.split(',').map((s) => s.trim()).filter(Boolean);
      const body: Record<string, unknown> = {
        name: form.name.trim(),
        status: form.active ? 'active' : 'paused',
        target_url: form.target_url.trim(),
        partner_id: form.partner_id ? Number(form.partner_id) : null,
        event_types: events,
        description: form.description.trim(),
        active: form.active,
      };
      if (form.secret) body.secret = form.secret;

      const res = form.id
        ? await api.put(`/v2/admin/federation/webhooks/${form.id}`, body)
        : await api.post('/v2/admin/federation/webhooks', body);
      if (res.success) {
        toast.success(form.id ? 'Webhook updated' : 'Webhook registered');
        onClose();
        await load();
      } else {
        toast.error(res.error || 'Save failed');
      }
    } catch { toast.error('Save failed'); }
    finally { setSaving(false); }
  }, [form, toast, onClose, load]);

  const testFire = useCallback(async (id: number) => {
    setWorking(id);
    try {
      const res = await api.post(`/v2/admin/federation/webhooks/${id}/test`, {
        event_type: 'admin.test',
        timestamp: new Date().toISOString(),
      });
      if (res.success) { toast.success('Test event recorded'); }
      else { toast.error('Test fire failed'); }
    } catch { toast.error('Test fire failed'); }
    finally { setWorking(null); }
  }, [toast]);

  const remove = useCallback(async (id: number) => {
    if (!window.confirm('Delete this webhook subscription?')) return;
    setWorking(id);
    try {
      const res = await api.delete(`/v2/admin/federation/webhooks/${id}`);
      if (res.success) { toast.success('Webhook deleted'); await load(); }
      else { toast.error('Delete failed'); }
    } catch { toast.error('Delete failed'); }
    finally { setWorking(null); }
  }, [toast, load]);

  const showLogs = useCallback(async (id: number) => {
    setLogsFor(id);
    setLogsLoading(true);
    try {
      const res = await api.get<{ data: StoredRecord[] }>(`/v2/admin/federation/webhooks/${id}/logs`);
      if (res.success && res.data) {
        const payload = (res.data as unknown) as { data?: StoredRecord[] };
        setLogs(payload.data ?? []);
      }
    } catch { toast.error('Failed to load logs'); }
    finally { setLogsLoading(false); }
  }, [toast]);

  const outboundRows = rows;

  return (
    <div>
      <PageHeader
        title="Federation Webhooks"
        description="Outbound webhook subscriptions: events the platform POSTs to partner endpoints when federation activity occurs. Each subscription is filtered by event_type and (optionally) partner. Inbound (partner → us) webhooks are exposed via the public /api/federation/* contract; configure expected signature secrets per partner under External Partners."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="flat" size="sm" startContent={<RefreshCw size={16} />}
              onPress={load} isLoading={loading}>Refresh</Button>
            <Button color="primary" size="sm" startContent={<Plus size={16} />}
              onPress={openCreate}>Register webhook</Button>
          </div>
        }
      />
      <Tabs selectedKey={tab} onSelectionChange={(k) => setTab(k as 'outbound' | 'inbound')} className="mb-3">
        <Tab key="outbound" title="Outbound subscriptions" />
        <Tab key="inbound" title="Inbound endpoints" />
      </Tabs>

      {tab === 'outbound' && (
        <Card shadow="sm">
          <CardHeader className="flex items-center gap-2">
            <Webhook size={18} className="text-primary" />
            <h3 className="text-lg font-semibold">Outbound ({outboundRows.length})</h3>
          </CardHeader>
          <CardBody>
            <Table aria-label="Outbound federation webhooks" isStriped>
              <TableHeader>
                <TableColumn>ID</TableColumn>
                <TableColumn>Name</TableColumn>
                <TableColumn>Partner</TableColumn>
                <TableColumn>Target URL</TableColumn>
                <TableColumn>Events</TableColumn>
                <TableColumn>Status</TableColumn>
                <TableColumn>Last delivered</TableColumn>
                <TableColumn>Actions</TableColumn>
              </TableHeader>
              <TableBody emptyContent="No webhook subscriptions registered." isLoading={loading} loadingContent={<Spinner />}>
                {outboundRows.map((r) => {
                  const p = readPayload(r);
                  const events = eventTypeList(p);
                  return (
                    <TableRow key={r.id}>
                      <TableCell>#{r.id}</TableCell>
                      <TableCell className="font-medium">{r.name ?? '(unnamed)'}</TableCell>
                      <TableCell className="text-xs">{p.partner_id ? `#${p.partner_id}` : '—'}</TableCell>
                      <TableCell className="text-xs">{p.target_url ?? '—'}</TableCell>
                      <TableCell className="text-xs">
                        {events.length > 0 ? events.map((e) => (
                          <Chip key={e} size="sm" variant="flat" className="mr-1 mb-1">{e}</Chip>
                        )) : <span className="text-default-400">all</span>}
                      </TableCell>
                      <TableCell>
                        <Chip size="sm" variant="flat"
                          color={r.status === 'active' ? 'success' : 'default'}>
                          {r.status ?? 'unknown'}
                        </Chip>
                      </TableCell>
                      <TableCell className="text-xs text-default-500">
                        {p.last_delivered_at ? new Date(p.last_delivered_at).toLocaleString() : '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="flat" isLoading={working === r.id}
                            startContent={<Send size={14} />} onPress={() => testFire(r.id)}>
                            Test
                          </Button>
                          <Button size="sm" variant="flat"
                            startContent={<ScrollText size={14} />} onPress={() => showLogs(r.id)}>
                            Logs
                          </Button>
                          <Button size="sm" variant="flat"
                            startContent={<Edit3 size={14} />} onPress={() => openEdit(r)}>
                            Edit
                          </Button>
                          <Button size="sm" variant="flat" color="danger" isLoading={working === r.id}
                            startContent={<Trash2 size={14} />} onPress={() => remove(r.id)}>
                            Delete
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
      )}

      {tab === 'inbound' && (
        <Card shadow="sm">
          <CardHeader className="flex items-center gap-2">
            <Webhook size={18} className="text-primary" />
            <h3 className="text-lg font-semibold">Inbound endpoints (read-only)</h3>
          </CardHeader>
          <CardBody className="space-y-3 text-sm">
            <p className="text-default-700">
              These endpoints accept POST requests from federated partners. Configure the per-partner
              shared secret on the External Partners page. Signature verification uses HMAC-SHA256
              with the partner's secret over the raw request body.
            </p>
            <div className="space-y-2">
              <div className="rounded border border-default-200 p-3">
                <p className="font-medium text-xs">POST /api/federation/ingest/listings</p>
                <p className="text-xs text-default-500">Listings shared by partner. Idempotent on (source_tenant_id, source_listing_id).</p>
              </div>
              <div className="rounded border border-default-200 p-3">
                <p className="font-medium text-xs">POST /api/federation/ingest/exchanges</p>
                <p className="text-xs text-default-500">Cross-tenant exchanges. Writes FederatedExchange + per-user notification.</p>
              </div>
              <div className="rounded border border-default-200 p-3">
                <p className="font-medium text-xs">POST /api/federation/transfers/propose</p>
                <p className="text-xs text-default-500">Credit-protocol transfer proposal (Credit Commons / Komunitin).</p>
              </div>
              <div className="rounded border border-default-200 p-3">
                <p className="font-medium text-xs">POST /api/v1/federation/webhooks/test</p>
                <p className="text-xs text-default-500">Connectivity probe — echoes back signed timestamp.</p>
              </div>
            </div>
            <p className="text-xs text-default-500">
              Want to register a new inbound endpoint? Those are wired in code, not config. File a controller change request.
            </p>
          </CardBody>
        </Card>
      )}

      <Modal isOpen={isOpen} onClose={onClose} size="2xl">
        <ModalContent>
          <ModalHeader>{form.id ? `Edit webhook #${form.id}` : 'Register webhook subscription'}</ModalHeader>
          <ModalBody className="space-y-3">
            <Input label="Name" value={form.name} onValueChange={(v) => setForm({ ...form, name: v })} isRequired />
            <Input label="Target URL" placeholder="https://partner.example.com/webhooks/nexus"
              value={form.target_url} onValueChange={(v) => setForm({ ...form, target_url: v })} isRequired />
            <Input label="Partner ID (optional)" type="number" value={form.partner_id}
              onValueChange={(v) => setForm({ ...form, partner_id: v })} />
            <Input label="Event types (comma-separated, blank = all)"
              placeholder="transfer.proposed, listing.ingested, exchange.completed"
              value={form.event_types} onValueChange={(v) => setForm({ ...form, event_types: v })} />
            <Input label="Shared secret" type="password"
              placeholder={form.id ? 'Leave blank to keep existing' : 'HMAC signing key'}
              value={form.secret} onValueChange={(v) => setForm({ ...form, secret: v })} />
            <Input label="Description" value={form.description}
              onValueChange={(v) => setForm({ ...form, description: v })} />
            <Select label="Status" selectedKeys={new Set([form.active ? 'active' : 'paused'])}
              onSelectionChange={(keys) => {
                const v = Array.from(keys)[0] as string | undefined;
                setForm({ ...form, active: v === 'active' });
              }}>
              <SelectItem key="active" textValue="active">active</SelectItem>
              <SelectItem key="paused" textValue="paused">paused</SelectItem>
            </Select>
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={onClose}>Cancel</Button>
            <Button color="primary" onPress={save} isLoading={saving}>
              {form.id ? 'Save changes' : 'Register'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={logsFor !== null} onClose={() => setLogsFor(null)} size="3xl">
        <ModalContent>
          <ModalHeader>Webhook #{logsFor} delivery logs</ModalHeader>
          <ModalBody>
            {logsLoading ? <Spinner /> : (
              <Table aria-label="Webhook delivery logs" isStriped>
                <TableHeader>
                  <TableColumn>ID</TableColumn>
                  <TableColumn>Action</TableColumn>
                  <TableColumn>Status</TableColumn>
                  <TableColumn>When</TableColumn>
                </TableHeader>
                <TableBody emptyContent="No delivery logs yet.">
                  {logs.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell>#{l.id}</TableCell>
                      <TableCell className="text-xs">{l.kind}</TableCell>
                      <TableCell className="text-xs">{l.status ?? '—'}</TableCell>
                      <TableCell className="text-xs text-default-500">
                        {new Date(l.created_at).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={() => setLogsFor(null)}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
