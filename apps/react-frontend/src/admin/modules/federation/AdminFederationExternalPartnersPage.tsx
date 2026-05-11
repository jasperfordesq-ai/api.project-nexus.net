// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/**
 * Federation External Partners (Admin) — partner registry for external
 * federated systems (Credit Commons / Komunitin / Native ingest).
 *
 * Endpoints (real, AdminFederationExternalPartnersController):
 *   GET    /api/admin/federation/external-partners
 *   POST   /api/admin/federation/external-partners
 *   PUT    /api/admin/federation/external-partners/{id}
 *   DELETE /api/admin/federation/external-partners/{id}
 *   POST   /api/admin/federation/external-partners/{id}/health-check
 */

import { useCallback, useEffect, useState } from 'react';
import {
  Button, Card, CardBody, CardHeader, Chip, Input, Modal, ModalBody, ModalContent,
  ModalFooter, ModalHeader, Select, SelectItem, Spinner,
  Table, TableBody, TableCell, TableColumn, TableHeader, TableRow, Textarea,
  useDisclosure,
} from '@heroui/react';
import { Activity, Globe2, Plus, RefreshCw, Trash2, Edit3 } from 'lucide-react';
import { usePageTitle } from '@/hooks';
import { useToast } from '@/contexts';
import { api } from '@/lib/api';
import { PageHeader } from '../../components';

type PartnerStatus = 'pending' | 'active' | 'suspended' | 'failed' | string;
type ProtocolType = 'CreditCommons' | 'Komunitin' | 'Native' | string;
type AuthMethod = 'api_key' | 'oauth2' | 'jwt' | 'none' | string;

interface ExternalPartner {
  id: number;
  tenant_id: number;
  name: string;
  description: string | null;
  base_url: string;
  api_path: string | null;
  auth_method: AuthMethod;
  protocol_type: ProtocolType;
  status: PartnerStatus;
  verified_at: string | null;
  last_sync_at: string | null;
  last_error: string | null;
  error_count: number;
  partner_name: string | null;
  partner_member_count: number | null;
  created_at: string;
  updated_at: string | null;
}

interface PartnerFormState {
  id?: number;
  name: string;
  description: string;
  base_url: string;
  api_path: string;
  auth_method: AuthMethod;
  protocol_type: ProtocolType;
  api_key: string;
}

const PROTOCOL_OPTIONS: ProtocolType[] = ['CreditCommons', 'Komunitin', 'Native'];
const AUTH_OPTIONS: AuthMethod[] = ['api_key', 'oauth2', 'jwt', 'none'];

function statusColor(s: PartnerStatus): 'default' | 'primary' | 'success' | 'warning' | 'danger' {
  switch (s) {
    case 'active': return 'success';
    case 'pending': return 'warning';
    case 'suspended': return 'warning';
    case 'failed': return 'danger';
    default: return 'default';
  }
}

const emptyForm: PartnerFormState = {
  name: '', description: '', base_url: '', api_path: '',
  auth_method: 'api_key', protocol_type: 'CreditCommons', api_key: '',
};

export default function AdminFederationExternalPartnersPage() {
  usePageTitle('Admin - Federation External Partners');
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [rows, setRows] = useState<ExternalPartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<number | null>(null);
  const [form, setForm] = useState<PartnerFormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ data: ExternalPartner[] }>('/v2/admin/federation/external-partners');
      if (res.success && res.data) {
        const payload = (res.data as unknown) as { data?: ExternalPartner[] };
        setRows(payload.data ?? []);
      }
    } catch { toast.error('Failed to load external partners'); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const openCreate = useCallback(() => { setForm(emptyForm); onOpen(); }, [onOpen]);

  const openEdit = useCallback((p: ExternalPartner) => {
    setForm({
      id: p.id,
      name: p.name ?? '',
      description: p.description ?? '',
      base_url: p.base_url ?? '',
      api_path: p.api_path ?? '',
      auth_method: p.auth_method ?? 'api_key',
      protocol_type: p.protocol_type ?? 'CreditCommons',
      api_key: '',
    });
    onOpen();
  }, [onOpen]);

  const save = useCallback(async () => {
    if (!form.name.trim() || !form.base_url.trim()) {
      toast.error('Name and base URL are required');
      return;
    }
    setSaving(true);
    try {
      const body = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        base_url: form.base_url.trim(),
        api_path: form.api_path.trim() || null,
        auth_method: form.auth_method,
        protocol_type: form.protocol_type,
        api_key: form.api_key || undefined,
      };
      const res = form.id
        ? await api.put(`/v2/admin/federation/external-partners/${form.id}`, body)
        : await api.post('/v2/admin/federation/external-partners', body);
      if (res.success) {
        toast.success(form.id ? 'Partner updated' : 'Partner registered');
        onClose();
        await load();
      } else {
        toast.error(res.error || 'Save failed');
      }
    } catch { toast.error('Save failed'); }
    finally { setSaving(false); }
  }, [form, toast, onClose, load]);

  const healthCheck = useCallback(async (id: number) => {
    setWorking(id);
    try {
      const res = await api.post<{ data: { healthy: boolean; response_time_ms: number; status_code: number; error: string | null } }>(
        `/v2/admin/federation/external-partners/${id}/health-check`, {});
      if (res.success && res.data) {
        const payload = (res.data as unknown) as { data?: { healthy: boolean; response_time_ms: number; error: string | null } };
        const r = payload.data;
        if (r?.healthy) toast.success(`Healthy (${r.response_time_ms}ms)`);
        else toast.error(`Unhealthy: ${r?.error ?? 'no response'}`);
        await load();
      } else { toast.error('Health check failed'); }
    } catch { toast.error('Health check failed'); }
    finally { setWorking(null); }
  }, [toast, load]);

  const remove = useCallback(async (id: number) => {
    if (!window.confirm('Revoke this partner? Federated traffic to this URL will stop.')) return;
    setWorking(id);
    try {
      const res = await api.delete(`/v2/admin/federation/external-partners/${id}`);
      if (res.success) { toast.success('Partner revoked'); await load(); }
      else { toast.error('Revoke failed'); }
    } catch { toast.error('Revoke failed'); }
    finally { setWorking(null); }
  }, [toast, load]);

  return (
    <div>
      <PageHeader
        title="Federation External Partners"
        description="Register external federated systems (Credit Commons, Komunitin, Native ingest). Health-check verifies the partner endpoint responds. Revoking a partner stops all outbound federation traffic to that URL."
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
          <Globe2 size={18} className="text-primary" />
          <h3 className="text-lg font-semibold">External partners ({rows.length})</h3>
        </CardHeader>
        <CardBody>
          <Table aria-label="External federation partners" isStriped>
            <TableHeader>
              <TableColumn>ID</TableColumn>
              <TableColumn>Name</TableColumn>
              <TableColumn>Protocol</TableColumn>
              <TableColumn>Endpoint</TableColumn>
              <TableColumn>Auth</TableColumn>
              <TableColumn>Status</TableColumn>
              <TableColumn>Last sync</TableColumn>
              <TableColumn>Errors</TableColumn>
              <TableColumn>Actions</TableColumn>
            </TableHeader>
            <TableBody emptyContent="No external partners registered." isLoading={loading} loadingContent={<Spinner />}>
              {rows.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>#{p.id}</TableCell>
                  <TableCell>
                    <p className="font-medium">{p.name}</p>
                    {p.partner_name && <p className="text-[10px] text-default-500">remote: {p.partner_name}</p>}
                  </TableCell>
                  <TableCell><code className="text-xs">{p.protocol_type}</code></TableCell>
                  <TableCell className="text-xs">
                    <span className="text-default-700">{p.base_url}</span>
                    {p.api_path && <span className="text-default-400">{p.api_path}</span>}
                  </TableCell>
                  <TableCell className="text-xs">{p.auth_method}</TableCell>
                  <TableCell>
                    <Chip color={statusColor(p.status)} variant="flat" size="sm">{p.status}</Chip>
                  </TableCell>
                  <TableCell className="text-xs text-default-500">
                    {p.last_sync_at ? new Date(p.last_sync_at).toLocaleString() : '—'}
                  </TableCell>
                  <TableCell className="text-xs">
                    {p.error_count > 0 ? (
                      <span className="text-danger">{p.error_count}</span>
                    ) : <span className="text-default-400">0</span>}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" variant="flat" isLoading={working === p.id}
                        startContent={<Activity size={14} />} onPress={() => healthCheck(p.id)}>
                        Ping
                      </Button>
                      <Button size="sm" variant="flat"
                        startContent={<Edit3 size={14} />} onPress={() => openEdit(p)}>
                        Edit
                      </Button>
                      <Button size="sm" variant="flat" color="danger" isLoading={working === p.id}
                        startContent={<Trash2 size={14} />} onPress={() => remove(p.id)}>
                        Revoke
                      </Button>
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
          <ModalHeader>{form.id ? `Edit partner #${form.id}` : 'Register external partner'}</ModalHeader>
          <ModalBody className="space-y-3">
            <Input label="Name" value={form.name} onValueChange={(v) => setForm({ ...form, name: v })} isRequired />
            <Textarea label="Description" value={form.description} onValueChange={(v) => setForm({ ...form, description: v })} />
            <Input label="Base URL" placeholder="https://partner.example.com" value={form.base_url}
              onValueChange={(v) => setForm({ ...form, base_url: v })} isRequired />
            <Input label="API path" placeholder="/api/federation" value={form.api_path}
              onValueChange={(v) => setForm({ ...form, api_path: v })} />
            <div className="grid grid-cols-2 gap-3">
              <Select label="Protocol" selectedKeys={new Set([form.protocol_type])}
                onSelectionChange={(keys) => {
                  const v = Array.from(keys)[0] as ProtocolType | undefined;
                  if (v) setForm({ ...form, protocol_type: v });
                }}>
                {PROTOCOL_OPTIONS.map((p) => <SelectItem key={p} textValue={p}>{p}</SelectItem>) as never}
              </Select>
              <Select label="Auth method" selectedKeys={new Set([form.auth_method])}
                onSelectionChange={(keys) => {
                  const v = Array.from(keys)[0] as AuthMethod | undefined;
                  if (v) setForm({ ...form, auth_method: v });
                }}>
                {AUTH_OPTIONS.map((a) => <SelectItem key={a} textValue={a}>{a}</SelectItem>) as never}
              </Select>
            </div>
            <Input label="API key" type="password" placeholder={form.id ? 'Leave blank to keep existing' : 'Required for api_key auth'}
              value={form.api_key} onValueChange={(v) => setForm({ ...form, api_key: v })} />
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={onClose}>Cancel</Button>
            <Button color="primary" onPress={save} isLoading={saving}>
              {form.id ? 'Save changes' : 'Register'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
