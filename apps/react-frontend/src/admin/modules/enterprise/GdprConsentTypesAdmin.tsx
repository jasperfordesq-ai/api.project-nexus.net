// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/**
 * GDPR Consent Types (Admin) — wires
 *   GET  /api/admin/gdpr/consent-types
 *   POST /api/admin/gdpr/consent-types
 *   GET  /api/admin/gdpr/consent-stats
 * (GdprBreachController). Replaces the GdprConsentTypesPage parity stub.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  Button, Card, CardBody, CardHeader, Chip, Input, Modal, ModalBody, ModalContent,
  ModalFooter, ModalHeader, Spinner, Switch, Table, TableBody, TableCell,
  TableColumn, TableHeader, TableRow, Textarea,
} from '@heroui/react';
import { ListChecks, Plus, RefreshCw } from 'lucide-react';
import { usePageTitle } from '@/hooks';
import { useToast } from '@/contexts';
import { api } from '@/lib/api';
import { PageHeader } from '../../components';

interface ConsentType {
  id: number;
  key: string;
  name: string;
  description: string | null;
  is_required: boolean;
  version: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ConsentStat {
  consent_type: string;
  name: string;
  is_required: boolean;
  granted_count: number;
  revoked_count: number;
  total_records: number;
}

export default function GdprConsentTypesAdminPage() {
  usePageTitle('Admin - GDPR Consent Types');
  const toast = useToast();
  const [types, setTypes] = useState<ConsentType[]>([]);
  const [stats, setStats] = useState<ConsentStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ key: '', name: '', description: '', is_required: false });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [typesRes, statsRes] = await Promise.all([
        api.get<{ data: ConsentType[] }>('/v2/admin/gdpr/consent-types'),
        api.get<{ data: ConsentStat[] }>('/v2/admin/gdpr/consent-stats'),
      ]);
      if (typesRes.success && typesRes.data) {
        const p = (typesRes.data as unknown) as { data?: ConsentType[] };
        setTypes(p.data ?? []);
      }
      if (statsRes.success && statsRes.data) {
        const p = (statsRes.data as unknown) as { data?: ConsentStat[] };
        setStats(p.data ?? []);
      }
    } catch { toast.error('Failed to load consent types'); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const statsByKey = new Map(stats.map((s) => [s.consent_type, s]));

  const create = async () => {
    if (!form.key.trim() || !form.name.trim()) { toast.error('Key and name are required'); return; }
    setSaving(true);
    try {
      const res = await api.post('/v2/admin/gdpr/consent-types', {
        key: form.key.trim(),
        name: form.name.trim(),
        description: form.description.trim() || null,
        is_required: form.is_required,
      });
      if (res.success) {
        toast.success('Consent type created');
        setShowModal(false);
        setForm({ key: '', name: '', description: '', is_required: false });
        load();
      } else {
        toast.error(res.error?.message || 'Create failed');
      }
    } catch { toast.error('Create failed'); }
    finally { setSaving(false); }
  };

  return (
    <div>
      <PageHeader
        title="GDPR Consent Types"
        description="Define consent categories users can grant or revoke. Required types must be accepted to use the platform; optional types can be toggled in user privacy settings."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="flat" size="sm" startContent={<RefreshCw size={16} />} onPress={load} isLoading={loading}>Refresh</Button>
            <Button color="primary" size="sm" startContent={<Plus size={16} />} onPress={() => setShowModal(true)}>New Type</Button>
          </div>
        }
      />
      <Card shadow="sm">
        <CardHeader className="flex items-center gap-2">
          <ListChecks size={18} className="text-primary" />
          <h3 className="text-lg font-semibold">Consent Types ({types.length})</h3>
        </CardHeader>
        <CardBody>
          <Table aria-label="Consent types" isStriped>
            <TableHeader>
              <TableColumn>Key</TableColumn>
              <TableColumn>Name</TableColumn>
              <TableColumn>Required</TableColumn>
              <TableColumn>Active</TableColumn>
              <TableColumn className="text-right">Granted</TableColumn>
              <TableColumn className="text-right">Revoked</TableColumn>
              <TableColumn className="text-right">Version</TableColumn>
            </TableHeader>
            <TableBody emptyContent="No consent types defined" isLoading={loading} loadingContent={<Spinner />}>
              {types.map((t) => {
                const s = statsByKey.get(t.key);
                return (
                  <TableRow key={t.id}>
                    <TableCell><code className="text-xs">{t.key}</code></TableCell>
                    <TableCell>
                      <div className="font-medium">{t.name}</div>
                      {t.description && <div className="text-xs text-default-500 max-w-md truncate">{t.description}</div>}
                    </TableCell>
                    <TableCell>
                      <Chip size="sm" color={t.is_required ? 'warning' : 'default'} variant="flat">
                        {t.is_required ? 'Required' : 'Optional'}
                      </Chip>
                    </TableCell>
                    <TableCell>
                      <Chip size="sm" color={t.is_active ? 'success' : 'default'} variant="flat">
                        {t.is_active ? 'Active' : 'Inactive'}
                      </Chip>
                    </TableCell>
                    <TableCell className="text-right text-success">{s?.granted_count ?? 0}</TableCell>
                    <TableCell className="text-right text-default-500">{s?.revoked_count ?? 0}</TableCell>
                    <TableCell className="text-right">v{t.version}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardBody>
      </Card>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} size="lg">
        <ModalContent>
          <ModalHeader>New Consent Type</ModalHeader>
          <ModalBody>
            <div className="grid gap-3">
              <Input label="Key" placeholder="e.g. marketing_emails" value={form.key} onValueChange={(v) => setForm({ ...form, key: v })} isRequired />
              <Input label="Name" placeholder="Display name shown to users" value={form.name} onValueChange={(v) => setForm({ ...form, name: v })} isRequired />
              <Textarea label="Description" value={form.description} onValueChange={(v) => setForm({ ...form, description: v })} minRows={2} />
              <div className="flex items-center justify-between">
                <span className="text-sm">Required (users must accept to register)</span>
                <Switch isSelected={form.is_required} onValueChange={(v) => setForm({ ...form, is_required: v })} />
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={() => setShowModal(false)}>Cancel</Button>
            <Button color="primary" onPress={create} isLoading={saving}>Create</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
