// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/**
 * API Partners (Admin) — registry of external consumers of the public API.
 *
 * Wired to the typed ApiPartner backend (audit follow-up).
 *   GET    /api/admin/api-partners
 *   GET    /api/admin/api-partners/{id}
 *   POST   /api/admin/api-partners               (register — returns api_key once)
 *   PUT    /api/admin/api-partners/{id}          (update editable fields)
 *   POST   /api/admin/api-partners/{id}/rotate-key
 *   POST   /api/admin/api-partners/{id}/suspend
 *   POST   /api/admin/api-partners/{id}/reactivate
 *   POST   /api/admin/api-partners/{id}/revoke   { reason }
 *
 * Distinct from Federation External Partners (Credit Commons / Komunitin
 * peer timebanks). API Partners are third-party apps consuming our public
 * /api/partner/v1/* endpoints with their own SHA-256-hashed API key.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  Button, Card, CardBody, CardHeader, Chip, Input, Modal, ModalBody, ModalContent,
  ModalFooter, ModalHeader, Spinner,
  Table, TableBody, TableCell, TableColumn, TableHeader, TableRow,
  useDisclosure,
} from '@heroui/react';
import { KeyRound, Plus, RefreshCw, RotateCw, Ban, Play } from 'lucide-react';
import { usePageTitle } from '@/hooks';
import { useToast } from '@/contexts';
import { api } from '@/lib/api';
import { PageHeader } from '../../components';

interface PartnerRow {
  id: string;
  name: string;
  contact_email: string;
  description?: string | null;
  api_key_prefix: string;
  scopes: string;
  rate_limit_per_minute: number;
  status: 'active' | 'suspended' | 'revoked';
  last_used_at?: string | null;
  requests_last_24h?: number;
  created_at?: string;
  revoked_at?: string | null;
  revoked_reason?: string | null;
}

interface FormState {
  name: string;
  contact_email: string;
  description: string;
  scopes: string;
  rate_limit_per_minute: string;
}

const emptyForm: FormState = {
  name: '', contact_email: '', description: '', scopes: 'read', rate_limit_per_minute: '60',
};

function statusColor(s: string): 'default' | 'primary' | 'success' | 'warning' | 'danger' {
  switch (s) {
    case 'active': return 'success';
    case 'suspended': return 'warning';
    case 'revoked': return 'danger';
    default: return 'default';
  }
}

export default function ApiPartnersAdminPage() {
  usePageTitle('Admin - API Partners');
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const credModal = useDisclosure();
  const [rows, setRows] = useState<PartnerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [newCredential, setNewCredential] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ data: PartnerRow[] }>('/admin/api-partners');
      if (res.success && res.data) {
        const payload = (res.data as unknown) as { data?: PartnerRow[] };
        setRows(payload.data ?? []);
      }
    } catch { toast.error('Failed to load API partners'); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const openCreate = useCallback(() => { setForm(emptyForm); setNewCredential(null); onOpen(); }, [onOpen]);

  const register = useCallback(async () => {
    if (!form.name.trim() || !form.contact_email.trim()) {
      toast.error('Name and contact email are required');
      return;
    }
    setSaving(true);
    try {
      const res = await api.post<{ api_key: string }>('/admin/api-partners', {
        name: form.name.trim(),
        contact_email: form.contact_email.trim(),
        description: form.description.trim() || null,
        scopes: form.scopes.trim() || 'read',
        rate_limit_per_minute: Number(form.rate_limit_per_minute) || 60,
      });
      if (res.success && res.data) {
        const payload = (res.data as unknown) as { api_key?: string };
        toast.success('Partner registered');
        setNewCredential(payload.api_key ?? null);
        onClose();
        credModal.onOpen();
        await load();
      } else { toast.error(res.error || 'Register failed'); }
    } catch { toast.error('Register failed'); }
    finally { setSaving(false); }
  }, [form, toast, onClose, credModal, load]);

  const rotate = useCallback(async (id: string) => {
    if (!window.confirm('Rotate this partner\'s API key? The current key will be invalidated immediately.')) return;
    setWorking(id);
    try {
      const res = await api.post<{ api_key: string }>(`/admin/api-partners/${id}/rotate-key`, {});
      if (res.success && res.data) {
        const payload = (res.data as unknown) as { api_key?: string };
        setNewCredential(payload.api_key ?? null);
        credModal.onOpen();
        toast.success('Key rotated');
        await load();
      } else toast.error(res.error || 'Rotate failed');
    } catch { toast.error('Rotate failed'); }
    finally { setWorking(null); }
  }, [toast, credModal, load]);

  const act = useCallback(async (id: string, action: string, body?: object) => {
    setWorking(id);
    try {
      const res = await api.post(`/admin/api-partners/${id}/${action}`, body ?? {});
      if (res.success) { toast.success(`Action: ${action}`); await load(); }
      else toast.error(res.error || `${action} failed`);
    } catch { toast.error(`${action} failed`); }
    finally { setWorking(null); }
  }, [toast, load]);

  const revoke = useCallback(async (id: string) => {
    const reason = window.prompt('Revoke reason (the key will be permanently invalidated):') ?? '';
    if (!reason.trim()) return;
    await act(id, 'revoke', { reason });
  }, [act]);

  return (
    <div>
      <PageHeader
        title="API Partners"
        description="External consumers of the public /api/partner/v1/* endpoints. Register a partner, rotate its API key, suspend or revoke. Distinct from Federation External Partners (peer timebanks)."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="flat" size="sm" startContent={<RefreshCw size={16} />}
              onPress={load} isLoading={loading}>Refresh</Button>
            <Button color="primary" size="sm" startContent={<Plus size={16} />}
              onPress={openCreate}>Register partner</Button>
          </div>
        }
      />

      <Card shadow="sm">
        <CardHeader className="flex items-center gap-2">
          <KeyRound size={18} className="text-primary" />
          <h3 className="text-lg font-semibold">Partners ({rows.length})</h3>
        </CardHeader>
        <CardBody>
          <Table aria-label="API partners" isStriped>
            <TableHeader>
              <TableColumn>Name</TableColumn>
              <TableColumn>Contact</TableColumn>
              <TableColumn>Key prefix</TableColumn>
              <TableColumn>Scopes</TableColumn>
              <TableColumn>Rate limit</TableColumn>
              <TableColumn>Status</TableColumn>
              <TableColumn>Last used</TableColumn>
              <TableColumn>Actions</TableColumn>
            </TableHeader>
            <TableBody emptyContent="No API partners registered." isLoading={loading} loadingContent={<Spinner />}>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell className="text-xs">{r.contact_email}</TableCell>
                  <TableCell><code className="text-xs">{r.api_key_prefix}…</code></TableCell>
                  <TableCell><code className="text-xs">{r.scopes}</code></TableCell>
                  <TableCell className="text-xs">{r.rate_limit_per_minute}/min</TableCell>
                  <TableCell><Chip size="sm" variant="flat" color={statusColor(r.status)}>{r.status}</Chip></TableCell>
                  <TableCell className="text-xs text-default-500">
                    {r.last_used_at ? new Date(r.last_used_at).toLocaleString() : '—'}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {r.status !== 'revoked' && (
                        <Button size="sm" variant="flat" isLoading={working === r.id}
                          startContent={<RotateCw size={14} />} onPress={() => rotate(r.id)}>Rotate</Button>
                      )}
                      {r.status === 'suspended' && (
                        <Button size="sm" variant="flat" color="success" isLoading={working === r.id}
                          startContent={<Play size={14} />} onPress={() => act(r.id, 'reactivate')}>Reactivate</Button>
                      )}
                      {r.status === 'active' && (
                        <Button size="sm" variant="flat" color="warning" isLoading={working === r.id}
                          startContent={<Ban size={14} />} onPress={() => act(r.id, 'suspend')}>Suspend</Button>
                      )}
                      {r.status !== 'revoked' && (
                        <Button size="sm" variant="flat" color="danger" isLoading={working === r.id}
                          onPress={() => revoke(r.id)}>Revoke</Button>
                      )}
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
            <Input label="Description" value={form.description}
              onValueChange={(v) => setForm({ ...form, description: v })} />
            <Input label="Scopes" value={form.scopes}
              onValueChange={(v) => setForm({ ...form, scopes: v })}
              description="Comma-separated. e.g. read,write,admin" />
            <Input label="Rate limit (req/min)" type="number" value={form.rate_limit_per_minute}
              onValueChange={(v) => setForm({ ...form, rate_limit_per_minute: v })} />
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
              8 characters (key prefix) are stored for display.
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
