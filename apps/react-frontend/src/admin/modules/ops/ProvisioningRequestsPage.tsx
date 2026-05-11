// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/**
 * Provisioning Requests (Super Admin) — new-tenant provisioning queue.
 *
 * Gap (verified 2026-05-11): there is no /api/admin/provisioning-requests
 * endpoint, no ProvisioningRequest entity, no ProvisioningRequestService.
 * Tenants are created today by directly inserting Tenant rows (or
 * through the seed-data path). The natural upstream is the pilot-inquiry
 * queue: a "qualified" pilot inquiry should convert into a provisioning
 * request, then into a Tenant.
 *
 * This page is wired to use the parity-layer audit trail as a placeholder
 * so the queue is at least observable when an operator records a draft
 * here. Once a real backend lands (Tenants endpoint + ProvisioningRequest
 * entity + workflow), swap the GET / POST / PUT paths below.
 *
 * Falls back to:
 *   GET   /api/admin/tenants (real TenantsController) for the existing
 *         tenant registry (read-only sanity check).
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button, Card, CardBody, CardHeader, Chip, Input, Modal, ModalBody, ModalContent,
  ModalFooter, ModalHeader, Spinner,
  Table, TableBody, TableCell, TableColumn, TableHeader, TableRow,
  useDisclosure,
} from '@heroui/react';
import { Server, Plus, RefreshCw, AlertTriangle } from 'lucide-react';
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

interface DraftRequest {
  id: string;
  org_name: string;
  requested_subdomain: string;
  contact: string;
  plan: string;
  status: 'pending' | 'provisioning' | 'ready' | 'failed';
  notes: string;
  requested_at: string;
  provisioned_at: string | null;
}

interface FormState {
  org_name: string;
  requested_subdomain: string;
  contact: string;
  plan: 'free' | 'pro' | 'enterprise';
  notes: string;
}

const emptyForm: FormState = {
  org_name: '', requested_subdomain: '', contact: '', plan: 'free', notes: '',
};

const LOCAL_KEY = 'admin.provisioning_requests.drafts.v1';

function loadDrafts(): DraftRequest[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as DraftRequest[];
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function saveDrafts(d: DraftRequest[]): void {
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(d)); } catch { /* ignore */ }
}

function statusColor(s: string): 'default' | 'primary' | 'success' | 'warning' | 'danger' {
  switch (s) {
    case 'pending': return 'warning';
    case 'provisioning': return 'primary';
    case 'ready': case 'active': return 'success';
    case 'failed': return 'danger';
    default: return 'default';
  }
}

export default function ProvisioningRequestsPage() {
  usePageTitle('Admin - Provisioning Requests');
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [drafts, setDrafts] = useState<DraftRequest[]>([]);
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setDrafts(loadDrafts());
    try {
      // Sanity-check the existing tenant registry — confirms what we'd be
      // provisioning into.
      const res = await api.get<{ data: TenantRow[] }>('/admin/tenants');
      if (res.success && res.data) {
        const payload = (res.data as unknown) as { data?: TenantRow[] } | TenantRow[];
        const list = Array.isArray(payload) ? payload : (payload.data ?? []);
        setTenants(list);
      }
    } catch {
      // Tenants endpoint may not be exposed in every build — keep silent.
    }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = useCallback(() => { setForm(emptyForm); onOpen(); }, [onOpen]);

  const submit = useCallback(async () => {
    if (!form.org_name.trim() || !form.requested_subdomain.trim() || !form.contact.trim()) {
      toast.error('Org, subdomain and contact are required');
      return;
    }
    setSaving(true);
    try {
      const draft: DraftRequest = {
        id: `prov_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        org_name: form.org_name.trim(),
        requested_subdomain: form.requested_subdomain.trim().toLowerCase(),
        contact: form.contact.trim(),
        plan: form.plan,
        status: 'pending',
        notes: form.notes.trim(),
        requested_at: new Date().toISOString(),
        provisioned_at: null,
      };
      const next = [draft, ...drafts];
      saveDrafts(next);
      setDrafts(next);
      toast.success('Draft saved locally (no backend endpoint yet)');
      onClose();
    } catch { toast.error('Save failed'); }
    finally { setSaving(false); }
  }, [form, drafts, toast, onClose]);

  const updateStatus = useCallback((id: string, status: DraftRequest['status']) => {
    const next = drafts.map((d) => d.id === id
      ? { ...d, status, provisioned_at: status === 'ready' ? new Date().toISOString() : d.provisioned_at }
      : d);
    saveDrafts(next);
    setDrafts(next);
    toast.success(`Status → ${status}`);
  }, [drafts, toast]);

  const remove = useCallback((id: string) => {
    if (!window.confirm('Delete this draft request? This cannot be undone.')) return;
    const next = drafts.filter((d) => d.id !== id);
    saveDrafts(next);
    setDrafts(next);
  }, [drafts]);

  const summary = useMemo(() => ({
    pending: drafts.filter((d) => d.status === 'pending').length,
    provisioning: drafts.filter((d) => d.status === 'provisioning').length,
    ready: drafts.filter((d) => d.status === 'ready').length,
    failed: drafts.filter((d) => d.status === 'failed').length,
  }), [drafts]);

  return (
    <div>
      <PageHeader
        title="Provisioning Requests"
        description="New-tenant provisioning queue. There is no /api/admin/provisioning-requests endpoint yet — drafts are stored locally so the workflow is observable. The natural upstream is the pilot-inquiry queue ('qualified' → convert to provisioning request → Tenant row)."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="flat" size="sm" startContent={<RefreshCw size={16} />}
              onPress={load} isLoading={loading}>Refresh</Button>
            <Button color="primary" size="sm" startContent={<Plus size={16} />}
              onPress={openCreate}>New request</Button>
          </div>
        }
      />

      <Card shadow="sm" className="mb-4 border-l-4 border-warning">
        <CardBody className="flex items-start gap-3">
          <AlertTriangle size={20} className="text-warning shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold">Backend gap</p>
            <p className="text-default-600 mt-1">
              No <code>ProvisioningRequest</code> entity, no <code>/api/admin/provisioning-requests</code>
              endpoint, no provisioning workflow service. Drafts are stored in browser
              localStorage. Approving a request here does <strong>not</strong> create
              a Tenant — that still requires direct DB seed. Tracked under
              CLAUDE.md path-to-1000.
            </p>
          </div>
        </CardBody>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Card shadow="sm"><CardBody className="py-3"><p className="text-xs text-default-500">Pending</p><p className="text-2xl font-bold text-warning">{summary.pending}</p></CardBody></Card>
        <Card shadow="sm"><CardBody className="py-3"><p className="text-xs text-default-500">Provisioning</p><p className="text-2xl font-bold text-primary">{summary.provisioning}</p></CardBody></Card>
        <Card shadow="sm"><CardBody className="py-3"><p className="text-xs text-default-500">Ready</p><p className="text-2xl font-bold text-success">{summary.ready}</p></CardBody></Card>
        <Card shadow="sm"><CardBody className="py-3"><p className="text-xs text-default-500">Failed</p><p className="text-2xl font-bold text-danger">{summary.failed}</p></CardBody></Card>
      </div>

      <Card shadow="sm">
        <CardHeader className="flex items-center gap-2">
          <Server size={18} className="text-primary" />
          <h3 className="text-lg font-semibold">Requests ({drafts.length})</h3>
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
              <TableColumn>Provisioned</TableColumn>
              <TableColumn>Actions</TableColumn>
            </TableHeader>
            <TableBody emptyContent="No provisioning requests drafted." isLoading={loading} loadingContent={<Spinner />}>
              {drafts.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.org_name}</TableCell>
                  <TableCell><code className="text-xs">{d.requested_subdomain}</code></TableCell>
                  <TableCell className="text-xs">{d.contact}</TableCell>
                  <TableCell><code className="text-xs">{d.plan}</code></TableCell>
                  <TableCell><Chip size="sm" variant="flat" color={statusColor(d.status)}>{d.status}</Chip></TableCell>
                  <TableCell className="text-xs text-default-500">{new Date(d.requested_at).toLocaleString()}</TableCell>
                  <TableCell className="text-xs text-default-500">{d.provisioned_at ? new Date(d.provisioned_at).toLocaleString() : '—'}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {d.status === 'pending' && (
                        <Button size="sm" variant="flat" color="primary"
                          onPress={() => updateStatus(d.id, 'provisioning')}>Approve</Button>
                      )}
                      {d.status === 'provisioning' && (
                        <Button size="sm" variant="flat" color="success"
                          onPress={() => updateStatus(d.id, 'ready')}>Mark ready</Button>
                      )}
                      {d.status === 'failed' && (
                        <Button size="sm" variant="flat"
                          onPress={() => updateStatus(d.id, 'provisioning')}>Retry</Button>
                      )}
                      <Button size="sm" variant="flat" color="danger"
                        onPress={() => remove(d.id)}>Delete</Button>
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
              description="Lowercase, no spaces. Will become {subdomain}.project-nexus.net" />
            <Input label="Primary contact email" type="email" value={form.contact}
              onValueChange={(v) => setForm({ ...form, contact: v })} isRequired />
            <Input label="Plan" value={form.plan}
              onValueChange={(v) => setForm({ ...form, plan: v as FormState['plan'] })}
              description="free / pro / enterprise" />
            <Input label="Notes" value={form.notes}
              onValueChange={(v) => setForm({ ...form, notes: v })} />
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={onClose}>Cancel</Button>
            <Button color="primary" onPress={submit} isLoading={saving}>Save draft</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
