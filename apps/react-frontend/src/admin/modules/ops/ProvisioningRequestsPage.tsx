// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/**
 * Provisioning Requests (Super Admin) — new-tenant provisioning queue.
 *
 * Wired to the typed ProvisioningRequest backend (audit follow-up).
 *   GET    /api/admin/provisioning/requests
 *   POST   /api/admin/provisioning/requests
 *   POST   /api/admin/provisioning/requests/{id}/approve
 *   POST   /api/admin/provisioning/requests/{id}/reject       { reason }
 *   POST   /api/admin/provisioning/requests/{id}/mark-provisioning
 *   POST   /api/admin/provisioning/requests/{id}/mark-ready   { created_tenant_id }
 *   POST   /api/admin/provisioning/requests/{id}/mark-failed  { reason }
 *   POST   /api/admin/provisioning/requests/{id}/retry
 *
 * NOTE: Approving + mark-ready does NOT itself create the Tenant row —
 * the admin must run the tenant-create flow separately and provide the
 * resulting tenant id to mark-ready.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button, Card, CardBody, CardHeader, Chip, Input, Modal, ModalBody, ModalContent,
  ModalFooter, ModalHeader, Spinner,
  Table, TableBody, TableCell, TableColumn, TableHeader, TableRow,
  useDisclosure,
} from '@heroui/react';
import { Server, Plus, RefreshCw } from 'lucide-react';
import { usePageTitle } from '@/hooks';
import { useToast } from '@/contexts';
import { api } from '@/lib/api';
import { PageHeader } from '../../components';

interface TenantRow {
  id: number;
  slug: string;
  name: string;
  is_active?: boolean;
  status?: string;
  created_at?: string;
}

interface ProvisioningRow {
  id: string;
  org_name: string;
  requested_subdomain: string;
  contact_name: string;
  contact_email: string;
  contact_phone?: string | null;
  plan?: string | null;
  country?: string | null;
  notes?: string | null;
  status: 'pending' | 'approved' | 'provisioning' | 'ready' | 'failed' | 'rejected';
  requested_at: string;
  approved_at?: string | null;
  provisioned_at?: string | null;
  failed_at?: string | null;
  failure_reason?: string | null;
  created_tenant_id?: number | null;
}

interface FormState {
  org_name: string;
  requested_subdomain: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  plan: string;
  country: string;
  notes: string;
}

const emptyForm: FormState = {
  org_name: '', requested_subdomain: '', contact_name: '', contact_email: '',
  contact_phone: '', plan: 'community', country: '', notes: '',
};

function statusColor(s: string): 'default' | 'primary' | 'success' | 'warning' | 'danger' {
  switch (s) {
    case 'pending': return 'warning';
    case 'approved': return 'primary';
    case 'provisioning': return 'primary';
    case 'ready': case 'active': return 'success';
    case 'failed': case 'rejected': return 'danger';
    default: return 'default';
  }
}

export default function ProvisioningRequestsPage() {
  usePageTitle('Admin - Provisioning Requests');
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [rows, setRows] = useState<ProvisioningRow[]>([]);
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [working, setWorking] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ data: ProvisioningRow[] }>('/admin/provisioning/requests');
      if (res.success && res.data) {
        const payload = (res.data as unknown) as { data?: ProvisioningRow[] };
        setRows(payload.data ?? []);
      }
    } catch { toast.error('Failed to load provisioning requests'); }
    try {
      const tRes = await api.get<{ data: TenantRow[] }>('/admin/tenants');
      if (tRes.success && tRes.data) {
        const tPayload = (tRes.data as unknown) as { data?: TenantRow[] } | TenantRow[];
        const list = Array.isArray(tPayload) ? tPayload : (tPayload.data ?? []);
        setTenants(list);
      }
    } catch { /* tenants endpoint optional */ }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const openCreate = useCallback(() => { setForm(emptyForm); onOpen(); }, [onOpen]);

  const submit = useCallback(async () => {
    if (!form.org_name.trim() || !form.requested_subdomain.trim()
        || !form.contact_name.trim() || !form.contact_email.trim()) {
      toast.error('Org, subdomain, contact name and contact email are required');
      return;
    }
    setSaving(true);
    try {
      const res = await api.post('/admin/provisioning/requests', {
        org_name: form.org_name.trim(),
        requested_subdomain: form.requested_subdomain.trim().toLowerCase(),
        contact_name: form.contact_name.trim(),
        contact_email: form.contact_email.trim(),
        contact_phone: form.contact_phone.trim() || null,
        plan: form.plan.trim() || null,
        country: form.country.trim() || null,
        notes: form.notes.trim() || null,
      });
      if (res.success) { toast.success('Request created'); onClose(); await load(); }
      else toast.error(res.error || 'Create failed');
    } catch { toast.error('Create failed'); }
    finally { setSaving(false); }
  }, [form, toast, onClose, load]);

  const act = useCallback(async (id: string, action: string, body?: object) => {
    setWorking(id);
    try {
      const res = await api.post(`/admin/provisioning/requests/${id}/${action}`, body ?? {});
      if (res.success) { toast.success(`Action: ${action}`); await load(); }
      else toast.error(res.error || `${action} failed`);
    } catch { toast.error(`${action} failed`); }
    finally { setWorking(null); }
  }, [toast, load]);

  const markReady = useCallback(async (id: string) => {
    const value = window.prompt(
      'Enter the new tenant ID (admin must create the Tenant row first via the tenant-create flow):');
    const num = Number(value);
    if (!Number.isFinite(num) || num <= 0) { toast.error('Invalid tenant ID'); return; }
    await act(id, 'mark-ready', { created_tenant_id: num });
  }, [act, toast]);

  const reject = useCallback(async (id: string) => {
    const reason = window.prompt('Reject reason:') ?? '';
    if (!reason.trim()) return;
    await act(id, 'reject', { reason });
  }, [act]);

  const summary = useMemo(() => ({
    pending: rows.filter((d) => d.status === 'pending').length,
    provisioning: rows.filter((d) => d.status === 'provisioning' || d.status === 'approved').length,
    ready: rows.filter((d) => d.status === 'ready').length,
    failed: rows.filter((d) => d.status === 'failed' || d.status === 'rejected').length,
  }), [rows]);

  return (
    <div>
      <PageHeader
        title="Provisioning Requests"
        description="New-tenant provisioning queue. Approving + mark-ready does not itself create the Tenant row — admin must run the tenant-create flow separately and supply the resulting tenant ID."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="flat" size="sm" startContent={<RefreshCw size={16} />}
              onPress={load} isLoading={loading}>Refresh</Button>
            <Button color="primary" size="sm" startContent={<Plus size={16} />}
              onPress={openCreate}>New request</Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Card shadow="sm"><CardBody className="py-3"><p className="text-xs text-default-500">Pending</p><p className="text-2xl font-bold text-warning">{summary.pending}</p></CardBody></Card>
        <Card shadow="sm"><CardBody className="py-3"><p className="text-xs text-default-500">In progress</p><p className="text-2xl font-bold text-primary">{summary.provisioning}</p></CardBody></Card>
        <Card shadow="sm"><CardBody className="py-3"><p className="text-xs text-default-500">Ready</p><p className="text-2xl font-bold text-success">{summary.ready}</p></CardBody></Card>
        <Card shadow="sm"><CardBody className="py-3"><p className="text-xs text-default-500">Failed / rejected</p><p className="text-2xl font-bold text-danger">{summary.failed}</p></CardBody></Card>
      </div>

      <Card shadow="sm">
        <CardHeader className="flex items-center gap-2">
          <Server size={18} className="text-primary" />
          <h3 className="text-lg font-semibold">Requests ({rows.length})</h3>
        </CardHeader>
        <CardBody>
          <Table aria-label="Provisioning requests" isStriped>
            <TableHeader>
              <TableColumn>Org</TableColumn>
              <TableColumn>Subdomain</TableColumn>
              <TableColumn>Contact</TableColumn>
              <TableColumn>Plan</TableColumn>
              <TableColumn>Status</TableColumn>
              <TableColumn>Requested</TableColumn>
              <TableColumn>Tenant ID</TableColumn>
              <TableColumn>Actions</TableColumn>
            </TableHeader>
            <TableBody emptyContent="No provisioning requests." isLoading={loading} loadingContent={<Spinner />}>
              {rows.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.org_name}</TableCell>
                  <TableCell><code className="text-xs">{d.requested_subdomain}</code></TableCell>
                  <TableCell className="text-xs">
                    <div>{d.contact_name}</div>
                    <div className="text-default-500">{d.contact_email}</div>
                  </TableCell>
                  <TableCell><code className="text-xs">{d.plan ?? '—'}</code></TableCell>
                  <TableCell><Chip size="sm" variant="flat" color={statusColor(d.status)}>{d.status}</Chip></TableCell>
                  <TableCell className="text-xs text-default-500">{new Date(d.requested_at).toLocaleString()}</TableCell>
                  <TableCell className="text-xs">{d.created_tenant_id ?? '—'}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {d.status === 'pending' && (
                        <>
                          <Button size="sm" variant="flat" color="primary" isLoading={working === d.id}
                            onPress={() => act(d.id, 'approve')}>Approve</Button>
                          <Button size="sm" variant="flat" color="danger" isLoading={working === d.id}
                            onPress={() => reject(d.id)}>Reject</Button>
                        </>
                      )}
                      {d.status === 'approved' && (
                        <Button size="sm" variant="flat" color="primary" isLoading={working === d.id}
                          onPress={() => act(d.id, 'mark-provisioning')}>Start provisioning</Button>
                      )}
                      {d.status === 'provisioning' && (
                        <>
                          <Button size="sm" variant="flat" color="success" isLoading={working === d.id}
                            onPress={() => markReady(d.id)}>Mark ready</Button>
                          <Button size="sm" variant="flat" color="danger" isLoading={working === d.id}
                            onPress={() => act(d.id, 'mark-failed', { reason: window.prompt('Failure reason:') ?? '' })}>Mark failed</Button>
                        </>
                      )}
                      {d.status === 'failed' && (
                        <Button size="sm" variant="flat" isLoading={working === d.id}
                          onPress={() => act(d.id, 'retry')}>Retry</Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardBody>
      </Card>

      <Card shadow="sm" className="mt-4">
        <CardHeader>
          <h3 className="text-sm font-semibold text-default-600">Existing tenants (read-only sanity check — {tenants.length})</h3>
        </CardHeader>
        <CardBody>
          <Table aria-label="Existing tenants" isCompact removeWrapper>
            <TableHeader>
              <TableColumn>ID</TableColumn>
              <TableColumn>Slug</TableColumn>
              <TableColumn>Name</TableColumn>
              <TableColumn>Status</TableColumn>
            </TableHeader>
            <TableBody emptyContent="No tenants loaded (endpoint may be restricted).">
              {tenants.slice(0, 20).map((t) => (
                <TableRow key={t.id}>
                  <TableCell>#{t.id}</TableCell>
                  <TableCell><code className="text-xs">{t.slug}</code></TableCell>
                  <TableCell>{t.name}</TableCell>
                  <TableCell>
                    <Chip size="sm" variant="flat" color={t.is_active === false ? 'default' : 'success'}>
                      {t.status ?? (t.is_active === false ? 'inactive' : 'active')}
                    </Chip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardBody>
      </Card>

      <Modal isOpen={isOpen} onClose={onClose} size="2xl">
        <ModalContent>
          <ModalHeader>New provisioning request</ModalHeader>
          <ModalBody className="space-y-3">
            <Input label="Organisation name" value={form.org_name}
              onValueChange={(v) => setForm({ ...form, org_name: v })} isRequired />
            <Input label="Requested subdomain" placeholder="acme" value={form.requested_subdomain}
              onValueChange={(v) => setForm({ ...form, requested_subdomain: v })} isRequired
              description="Lowercase a-z, 0-9 and hyphens. 3-32 chars." />
            <Input label="Primary contact name" value={form.contact_name}
              onValueChange={(v) => setForm({ ...form, contact_name: v })} isRequired />
            <Input label="Primary contact email" type="email" value={form.contact_email}
              onValueChange={(v) => setForm({ ...form, contact_email: v })} isRequired />
            <Input label="Contact phone" value={form.contact_phone}
              onValueChange={(v) => setForm({ ...form, contact_phone: v })} />
            <Input label="Plan" value={form.plan}
              onValueChange={(v) => setForm({ ...form, plan: v })}
              description="community / pro / enterprise" />
            <Input label="Country (ISO 2-char)" value={form.country}
              onValueChange={(v) => setForm({ ...form, country: v })} maxLength={2} />
            <Input label="Notes" value={form.notes}
              onValueChange={(v) => setForm({ ...form, notes: v })} />
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
