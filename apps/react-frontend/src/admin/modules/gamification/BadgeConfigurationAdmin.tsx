// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/**
 * Badge Configuration (Admin) — wires the existing
 *   GET    /api/admin/gamification/badges
 *   POST   /api/admin/gamification/badges
 *   PUT    /api/admin/gamification/badges/{id}
 *   DELETE /api/admin/gamification/badges/{id}
 * (AdminGamificationController). Replaces the BadgeConfigurationPage parity stub.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  Button, Card, CardBody, CardHeader, Chip, Input, Modal, ModalBody, ModalContent,
  ModalFooter, ModalHeader, Spinner, Switch, Table, TableBody, TableCell,
  TableColumn, TableHeader, TableRow, Textarea,
} from '@heroui/react';
import { Award, Edit3, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { usePageTitle } from '@/hooks';
import { useToast } from '@/contexts';
import { api } from '@/lib/api';
import { PageHeader } from '../../components';

interface Badge {
  id: number;
  slug: string;
  name: string;
  description: string;
  icon: string | null;
  xpReward: number;
  isActive: boolean;
  times_earned: number;
}

interface BadgeForm {
  id?: number;
  slug: string;
  name: string;
  description: string;
  icon: string;
  xp_reward: string;
  is_active: boolean;
}

const EMPTY_FORM: BadgeForm = {
  slug: '', name: '', description: '', icon: '', xp_reward: '0', is_active: true,
};

export default function BadgeConfigurationAdminPage() {
  usePageTitle('Admin - Badge Configuration');
  const toast = useToast();
  const [rows, setRows] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<BadgeForm>(EMPTY_FORM);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ data: Badge[] }>('/v2/admin/gamification/badges');
      if (res.success && res.data) {
        const payload = (res.data as unknown) as { data?: Badge[] };
        setRows(payload.data ?? []);
      }
    } catch { toast.error('Failed to load badges'); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setForm(EMPTY_FORM); setShowModal(true); };
  const openEdit = (b: Badge) => {
    setForm({
      id: b.id, slug: b.slug, name: b.name, description: b.description ?? '',
      icon: b.icon ?? '', xp_reward: String(b.xpReward ?? 0), is_active: b.isActive,
    });
    setShowModal(true);
  };

  const save = async () => {
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    const xp = parseInt(form.xp_reward, 10);
    if (Number.isNaN(xp) || xp < 0) { toast.error('XP reward must be a non-negative number'); return; }
    setSaving(true);
    try {
      const payload = {
        slug: form.slug.trim() || undefined,
        name: form.name.trim(),
        description: form.description.trim(),
        icon: form.icon.trim() || null,
        xp_reward: xp,
        is_active: form.is_active,
      };
      const res = form.id
        ? await api.put(`/v2/admin/gamification/badges/${form.id}`, payload)
        : await api.post('/v2/admin/gamification/badges', payload);
      if (res.success) {
        toast.success(form.id ? 'Badge updated' : 'Badge created');
        setShowModal(false);
        load();
      } else {
        toast.error(res.error?.message || 'Save failed');
      }
    } catch { toast.error('Save failed'); }
    finally { setSaving(false); }
  };

  const remove = async (id: number) => {
    if (!confirm('Delete badge? All earned instances will be removed too.')) return;
    try {
      const res = await api.delete(`/v2/admin/gamification/badges/${id}`);
      if (res.success) { toast.success('Badge deleted'); load(); }
      else toast.error(res.error?.message || 'Delete failed');
    } catch { toast.error('Delete failed'); }
  };

  return (
    <div>
      <PageHeader
        title="Badge Configuration"
        description="Manage gamification badges. Each badge has a slug, icon, and XP reward awarded to users when earned."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="flat" size="sm" startContent={<RefreshCw size={16} />} onPress={load} isLoading={loading}>Refresh</Button>
            <Button color="primary" size="sm" startContent={<Plus size={16} />} onPress={openCreate}>New Badge</Button>
          </div>
        }
      />
      <Card shadow="sm">
        <CardHeader className="flex items-center gap-2">
          <Award size={18} className="text-primary" />
          <h3 className="text-lg font-semibold">Badges ({rows.length})</h3>
        </CardHeader>
        <CardBody>
          <Table aria-label="Badges" isStriped>
            <TableHeader>
              <TableColumn>ID</TableColumn>
              <TableColumn>Name</TableColumn>
              <TableColumn>Slug</TableColumn>
              <TableColumn className="text-right">XP</TableColumn>
              <TableColumn className="text-right">Earned</TableColumn>
              <TableColumn>Active</TableColumn>
              <TableColumn className="text-right">Actions</TableColumn>
            </TableHeader>
            <TableBody emptyContent="No badges configured" isLoading={loading} loadingContent={<Spinner />}>
              {rows.map((b) => (
                <TableRow key={b.id}>
                  <TableCell>#{b.id}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {b.icon && <span className="text-lg">{b.icon}</span>}
                      <div>
                        <div className="font-medium">{b.name}</div>
                        {b.description && <div className="text-xs text-default-500 max-w-md truncate">{b.description}</div>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell><code className="text-xs">{b.slug}</code></TableCell>
                  <TableCell className="text-right font-medium">{b.xpReward}</TableCell>
                  <TableCell className="text-right">{b.times_earned}</TableCell>
                  <TableCell>
                    <Chip size="sm" color={b.isActive ? 'success' : 'default'} variant="flat">
                      {b.isActive ? 'Active' : 'Inactive'}
                    </Chip>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button isIconOnly size="sm" variant="light" onPress={() => openEdit(b)}><Edit3 size={14} /></Button>
                    <Button isIconOnly size="sm" variant="light" color="danger" onPress={() => remove(b.id)}><Trash2 size={14} /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardBody>
      </Card>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} size="lg">
        <ModalContent>
          <ModalHeader>{form.id ? 'Edit Badge' : 'New Badge'}</ModalHeader>
          <ModalBody>
            <div className="grid gap-3">
              <Input label="Name" value={form.name} onValueChange={(v) => setForm({ ...form, name: v })} isRequired />
              <Input label="Slug" placeholder="auto-generated from name if blank" value={form.slug} onValueChange={(v) => setForm({ ...form, slug: v })} />
              <Textarea label="Description" value={form.description} onValueChange={(v) => setForm({ ...form, description: v })} minRows={2} />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Icon (emoji or URL)" value={form.icon} onValueChange={(v) => setForm({ ...form, icon: v })} />
                <Input label="XP Reward" type="number" min={0} value={form.xp_reward} onValueChange={(v) => setForm({ ...form, xp_reward: v })} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Active</span>
                <Switch isSelected={form.is_active} onValueChange={(v) => setForm({ ...form, is_active: v })} />
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={() => setShowModal(false)}>Cancel</Button>
            <Button color="primary" onPress={save} isLoading={saving}>{form.id ? 'Save' : 'Create'}</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
