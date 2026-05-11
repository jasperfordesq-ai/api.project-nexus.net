// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/**
 * API Partners (Admin) — registry of external consumers of our public API.
 *
 * Backend: AdminExplicitParityController parity routes.
 *   GET   /api/v2/admin/api-partners
 *   GET   /api/v2/admin/api-partners/{id}
 *   GET   /api/v2/admin/api-partners/{id}/call-log
 *   POST  /api/v2/admin/api-partners            (register)
 *   POST  /api/v2/admin/api-partners/{id}/activate
 *   POST  /api/v2/admin/api-partners/{id}/suspend
 *   POST  /api/v2/admin/api-partners/{id}/regenerate-credentials
 *   PUT   /api/v2/admin/api-partners/{id}
 *
 * Distinct from Federation External Partners (Credit Commons / Komunitin
 * peer timebanks). API Partners are third-party apps consuming our
 * /api/partner/v1/* endpoints (see V15MemberParityController) with their
 * own API key + scopes + rate limit.
 *
 * Gap: no first-class ApiPartner entity yet. Records land in
 * CompatibilityAuditEntries via the parity layer; FederationApiKeyService
 * is the closest existing infrastructure but is keyed on federation,
 * not third-party API consumers.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button, Card, CardBody, CardHeader, Chip, Input, Modal, ModalBody, ModalContent,
  ModalFooter, ModalHeader, Spinner,
  Table, TableBody, TableCell, TableColumn, TableHeader, TableRow,
  useDisclosure,
} from '@heroui/react';
import { KeyRound, Plus, RefreshCw, RotateCw, Ban, Play, AlertTriangle } from 'lucide-react';
import { usePageTitle } from '@/hooks';
import { useToast } from '@/contexts';
import { api } from '@/lib/api';
import { PageHeader } from '../../components';

interface AuditEntry {
  id: number;
  name: string;
  path: string;
  action: string;
  status: string;
  payload: Record<string, unknown> | null;
  occurred_at?: string;
}

interface PartnerRow {
  id: number;
  name: string;
  contact_email: string;
  api_key_hint: string;
  scopes: string;
  rate_limit: number;
  status: string;
  occurred_at: string | null;
}

interface FormState {
  name: string;
  contact_email: string;
  scopes: string;
  rate_limit: string;
}

const emptyForm: FormState = {
  name: '', contact_email: '', scopes: 'read', rate_limit: '60',
};

function statusColor(s: string): 'default' | 'primary' | 'success' | 'warning' | 'danger' {
  switch (s) {
    case 'active': return 'success';
    case 'suspended': return 'warning';
    case 'revoked': return 'danger';
    default: return 'default';
  }
}

function project(e: AuditEntry): PartnerRow {
  const p = (e.payload ?? {}) as Record<string, unknown>;
  const str = (k: string, d = ''): string => (typeof p[k] === 'string' ? p[k] as string : d);
  const num = (k: string, d = 0): number => (typeof p[k] === 'number' ? p[k] as number : d);
  const key = str('api_key') || str('api_key_hint');
  return {
    id: e.id,
    name: str('name') || e.name || `Partner #${e.id}`,
    contact_email: str('contact_email') || str('email') || '—',
    api_key_hint: key ? key.slice(0, 8) + '…' : '—',
    scopes: str('scopes', 'read'),
    rate_limit: num('rate_limit', 60),
    status: str('status', e.action === 'suspend' ? 'suspended'
      : e.action === 'activate' ? 'active' : 'pending'),
    occurred_at: e.occurred_at ?? null,
  };
}

export default function ApiPartnersAdminPage() {
  usePageTitle('Admin - API Partners');
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const credModal = useDisclosure();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [newCredential, setNewCredential] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ data: AuditEntry[] }>('/v2/admin/api-partners');
      if (res.success && res.data) {
        const payload = (res.data as unknown) as { data?: AuditEntry[] };
        setEntries(payload.data ?? []);
      }
    } catch { toast.error('Failed to load API partners'); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const rows = useMemo(() => entries.map(project), [entries]);

  const openCreate = useCallback(() => { setForm(emptyForm); setNewCredential(null); onOpen(); }, [onOpen]);

  const register = useCallback(async () => {
    if (!form.name.trim() || !form.contact_email.trim()) {
      toast.error('Name and contact email are required');
      return;
    }
    setSaving(true);
    try {
      const generatedKey = 'pk_' + Math.random().toString(36).slice(2, 14) + Math.random().toString(36).slice(2, 14);
      const res = await api.post('/v2/admin/api-partners', {
        name: form.name.trim(),
        contact_email: form.contact_email.trim(),
        scopes: form.scopes.trim(),
        rate_limit: Number(form.rate_limit) || 60,
        status: 'pending',
        api_key: generatedKey,
        api_key_hint: generatedKey.slice(0, 8) + '…',
      });
      if (res.success) {
        toast.success('Partner registered');
        setNewCredential(generatedKey);
        onClose();
        credModal.onOpen();
        await load();
      } else { toast.error(res.error || 'Save failed'); }
    } catch { toast.error('Save failed'); }
    finally { setSaving(false); }
  }, [form, toast, onClose, credModal, load]);

  const act = useCallback(async (id: number, action: 'activate' | 'suspend') => {
    setWorking(id);
    try {
      const res = await api.post(`/v2/admin/api-partners/${id}/${action}`, {});
      if (res.success) { toast.success(action === 'activate' ? 'Activated' : 'Suspended'); await load(); }
      else toast.error('Action failed');
    } catch { toast.error('Action failed'); }
    finally { setWorking(null); }
  }, [toast, load]);

  const rotate = useCallback(async (id: number) => {
    if (!window.confirm('Regenerate credentials? The current API key will be invalidated immediately.')) return;
    setWorking(id);
    try {
      const newKey = 'pk_' + Math.random().toString(36).slice(2, 14) + Math.random().toString(36).slice(2, 14);
      const res = await api.post(`/v2/admin/api-partners/${id}/regenerate-credentials`, {
        api_key: newKey,
        api_key_hint: newKey.slice(0, 8) + '…',
      });
      if (res.success) {
        setNewCredential(newKey);
        credModal.onOpen();
        toast.success('Credentials rotated');
        await load();
      } else toast.error('Rotate failed');
    } catch { toast.error('Rotate failed'); }
    finally { setWorking(null); }
  }, [toast, credModal, load]);

  return (
    <div>
      <PageHeader
        title="API Partners"
        description="External consumers of the public /api/partner/v1/* endpoints. Register a new partner, rotate credentials, suspend access. Distinct from Federation External Partners (peer timebanks, Credit Commons / Komunitin)."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="flat" size="sm" startContent={<RefreshCw size={16} />}
              onPress={load} isLoading={loading}>Refresh</Button>
            <Button color="primary" size="sm" startContent={<Plus size={16} />}
              onPress={openCreate}>Register partner</Button>
          </div>
        }
      />

      <Card shadow="sm" className="mb-4 border-l-4 border-warning">
        <CardBody className="flex items-start gap-3">
          <AlertTriangle size={20} className="text-warning shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold">Backend gap</p>
            <p className="text-default-600 mt-1">
              No dedicated <code>ApiPartner</code> entity or rate-limit
              enforcement service. Records are stored in <code>CompatibilityAuditEntries</code>
              by the parity layer. <code>FederationApiKeyService</code> exists but is
              scoped to federation, not third-party API consumers. Per-partner
              request counters (last 24h) are not yet wired.
            </p>
          </div>
        </CardBody>
      </Card>

      <Card shadow="sm">
        <CardHeader className="flex items-center gap-2">
          <KeyRound size={18} className="text-primary" />
          <h3 className="text-lg font-semibold">Partners ({rows.length})</h3>
        </CardHeader>
        <CardBody>
          <Table aria-label="API partners" isStriped>
            <TableHeader>
              <TableColumn>ID</TableColumn>
              <TableColumn>Name</TableColumn>
              <TableColumn>Contact</TableColumn>
              <TableColumn>Key hint</TableColumn>
              <TableColumn>Scopes</TableColumn>
              <TableColumn>Rate limit</TableColumn>
              <TableColumn>Status</TableColumn>
              <TableColumn>Registered</TableColumn>
              <TableColumn>Actions</TableColumn>
            </TableHeader>
            <TableBody emptyContent="No API partners registered." isLoading={loading} loadingContent={<Spinner />}>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>#{r.id}</TableCell>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell className="text-xs">{r.contact_email}</TableCell>
                  <TableCell><code className="text-xs">{r.api_key_hint}</code></TableCell>
                  <TableCell><code className="text-xs">{r.scopes}</code></TableCell>
                  <TableCell className="text-xs">{r.rate_limit}/min</TableCell>
                  <TableCell><Chip size="sm" variant="flat" color={statusColor(r.status)}>{r.status}</Chip></TableCell>
                  <TableCell className="text-xs text-default-500">
                    {r.occurred_at ? new Date(r.occurred_at).toLocaleString() : '—'}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {r.status !== 'active' && (
                        <Button size="sm" variant="flat" color="success" isLoading={working === r.id}
                          startContent={<Play size={14} />} onPress={() => act(r.id, 'activate')}>Activate</Button>
                      )}
                      <Button size="sm" variant="flat" isLoading={working === r.id}
                        startContent={<RotateCw size={14} />} onPress={() => rotate(r.id)}>Rotate</Button>
                      <Button size="sm" variant="flat" color="danger" isLoading={working === r.id}
                        startContent={<Ban size={14} />} onPress={() => act(r.id, 'suspend')}>Suspend</Button>
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
          <ModalHeader>Register API partner</ModalHeader>
          <ModalBody className="space-y-3">
            <Input label="Name" value={form.name} onValueChange={(v) => setForm({ ...form, name: v })} isRequired />
            <Input label="Contact email" type="email" value={form.contact_email}
              onValueChange={(v) => setForm({ ...form, contact_email: v })} isRequired />
            <Input label="Scopes" value={form.scopes}
              onValueChange={(v) => setForm({ ...form, scopes: v })}
              description="Space-separated. e.g. read write admin" />
            <Input label="Rate limit (req/min)" type="number" value={form.rate_limit}
              onValueChange={(v) => setForm({ ...form, rate_limit: v })} />
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={onClose}>Cancel</Button>
            <Button color="primary" onPress={register} isLoading={saving}>Register</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={credModal.isOpen} onClose={credModal.onClose} size="2xl" isDismissable={false}>
        <ModalContent>
          <ModalHeader>API key — shown once</ModalHeader>
          <ModalBody>
            <p className="text-sm text-default-600 mb-3">
              Copy this key now. It will not be shown again — only the first
              8 characters are stored for later reference.
            </p>
            <pre className="bg-default-100 p-3 rounded text-xs font-mono break-all">
              {newCredential ?? ''}
            </pre>
          </ModalBody>
          <ModalFooter>
            <Button color="primary" onPress={() => {
              if (newCredential) {
                navigator.clipboard.writeText(newCredential).then(
                  () => toast.success('Copied'),
                  () => toast.error('Copy failed — copy manually'),
                );
              }
            }}>Copy</Button>
            <Button variant="flat" onPress={credModal.onClose}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
