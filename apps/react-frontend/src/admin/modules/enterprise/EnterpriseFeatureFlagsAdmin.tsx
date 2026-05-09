// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/**
 * Enterprise Feature Flags (Admin) — wires
 *   GET    /api/admin/enterprise/config?category=features
 *   PUT    /api/admin/enterprise/config
 *   DELETE /api/admin/enterprise/config/{key}
 * (EnterpriseController). Replaces the EnterpriseFeatureFlagsPage parity stub.
 *
 * Feature flags are stored as enterprise config rows under category=features,
 * with a string value (typically "true"/"false" or a JSON snippet).
 */

import { useCallback, useEffect, useState } from 'react';
import {
  Button, Card, CardBody, CardHeader, Chip, Input, Modal, ModalBody, ModalContent,
  ModalFooter, ModalHeader, Spinner, Switch, Table, TableBody, TableCell,
  TableColumn, TableHeader, TableRow, Textarea,
} from '@heroui/react';
import { Flag, Plus, RefreshCw, Trash2, Edit3 } from 'lucide-react';
import { usePageTitle } from '@/hooks';
import { useToast } from '@/contexts';
import { api } from '@/lib/api';
import { PageHeader } from '../../components';

interface EnterpriseConfig {
  id: number;
  key: string;
  value: string;
  category: string | null;
  description: string | null;
  updated_at: string;
}

interface FlagForm {
  key: string;
  value: string;
  description: string;
  isExisting: boolean;
}

const EMPTY_FORM: FlagForm = { key: '', value: 'true', description: '', isExisting: false };

function isBooleanLike(v: string): boolean {
  return v === 'true' || v === 'false';
}

export default function EnterpriseFeatureFlagsAdminPage() {
  usePageTitle('Admin - Feature Flags');
  const toast = useToast();
  const [rows, setRows] = useState<EnterpriseConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<FlagForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<EnterpriseConfig[]>('/v2/admin/enterprise/config?category=features');
      if (res.success && res.data) {
        // Endpoint returns array directly, not wrapped
        const arr = Array.isArray(res.data) ? res.data : (res.data as { data?: EnterpriseConfig[] }).data ?? [];
        setRows(arr);
      }
    } catch { toast.error('Failed to load feature flags'); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setForm(EMPTY_FORM); setShowModal(true); };
  const openEdit = (c: EnterpriseConfig) => {
    setForm({ key: c.key, value: c.value, description: c.description ?? '', isExisting: true });
    setShowModal(true);
  };

  const save = async () => {
    if (!form.key.trim()) { toast.error('Key is required'); return; }
    if (!form.value.trim()) { toast.error('Value is required'); return; }
    setSaving(true);
    try {
      const res = await api.put('/v2/admin/enterprise/config', {
        key: form.key.trim(),
        value: form.value.trim(),
        category: 'features',
        description: form.description.trim() || null,
      });
      if (res.success) {
        toast.success(form.isExisting ? 'Flag updated' : 'Flag created');
        setShowModal(false);
        load();
      } else {
        toast.error(res.error || 'Save failed');
      }
    } catch { toast.error('Save failed'); }
    finally { setSaving(false); }
  };

  const toggle = async (c: EnterpriseConfig) => {
    if (!isBooleanLike(c.value)) {
      toast.error('Cannot toggle non-boolean flag — edit the value manually.');
      return;
    }
    const newValue = c.value === 'true' ? 'false' : 'true';
    try {
      const res = await api.put('/v2/admin/enterprise/config', {
        key: c.key, value: newValue, category: 'features', description: c.description,
      });
      if (res.success) { toast.success(`${c.key} → ${newValue}`); load(); }
      else toast.error(res.error || 'Toggle failed');
    } catch { toast.error('Toggle failed'); }
  };

  const remove = async (key: string) => {
    if (!confirm(`Delete feature flag "${key}"?`)) return;
    try {
      const res = await api.delete(`/v2/admin/enterprise/config/${encodeURIComponent(key)}`);
      if (res.success) { toast.success('Flag deleted'); load(); }
      else toast.error(res.error || 'Delete failed');
    } catch { toast.error('Delete failed'); }
  };

  return (
    <div>
      <PageHeader
        title="Enterprise Feature Flags"
        description="Tenant-scoped feature flags stored under enterprise config (category=features). Boolean flags can be toggled inline; complex values must be edited in the modal."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="flat" size="sm" startContent={<RefreshCw size={16} />} onPress={load} isLoading={loading}>Refresh</Button>
            <Button color="primary" size="sm" startContent={<Plus size={16} />} onPress={openCreate}>New Flag</Button>
          </div>
        }
      />
      <Card shadow="sm">
        <CardHeader className="flex items-center gap-2">
          <Flag size={18} className="text-primary" />
          <h3 className="text-lg font-semibold">Feature Flags ({rows.length})</h3>
        </CardHeader>
        <CardBody>
          <Table aria-label="Feature flags" isStriped>
            <TableHeader>
              <TableColumn>Key</TableColumn>
              <TableColumn>Value</TableColumn>
              <TableColumn>Description</TableColumn>
              <TableColumn>Updated</TableColumn>
              <TableColumn className="text-right">Actions</TableColumn>
            </TableHeader>
            <TableBody emptyContent="No feature flags configured" isLoading={loading} loadingContent={<Spinner />}>
              {rows.map((c) => (
                <TableRow key={c.id}>
                  <TableCell><code className="text-xs">{c.key}</code></TableCell>
                  <TableCell>
                    {isBooleanLike(c.value) ? (
                      <div className="flex items-center gap-2">
                        <Switch size="sm" isSelected={c.value === 'true'} onValueChange={() => toggle(c)} />
                        <Chip size="sm" color={c.value === 'true' ? 'success' : 'default'} variant="flat">{c.value}</Chip>
                      </div>
                    ) : (
                      <code className="text-xs max-w-xs truncate inline-block">{c.value}</code>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-default-500 max-w-md truncate">{c.description ?? '—'}</TableCell>
                  <TableCell className="text-xs text-default-500">{new Date(c.updated_at).toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    <Button isIconOnly size="sm" variant="light" onPress={() => openEdit(c)}><Edit3 size={14} /></Button>
                    <Button isIconOnly size="sm" variant="light" color="danger" onPress={() => remove(c.key)}><Trash2 size={14} /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardBody>
      </Card>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} size="lg">
        <ModalContent>
          <ModalHeader>{form.isExisting ? 'Edit Feature Flag' : 'New Feature Flag'}</ModalHeader>
          <ModalBody>
            <div className="grid gap-3">
              <Input label="Key" placeholder="e.g. ai_chat_enabled" value={form.key} onValueChange={(v) => setForm({ ...form, key: v })} isRequired isDisabled={form.isExisting} />
              <Textarea label="Value" placeholder='"true", "false", or any string/JSON' value={form.value} onValueChange={(v) => setForm({ ...form, value: v })} minRows={2} isRequired />
              <Textarea label="Description" value={form.description} onValueChange={(v) => setForm({ ...form, description: v })} minRows={2} />
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={() => setShowModal(false)}>Cancel</Button>
            <Button color="primary" onPress={save} isLoading={saving}>{form.isExisting ? 'Save' : 'Create'}</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
