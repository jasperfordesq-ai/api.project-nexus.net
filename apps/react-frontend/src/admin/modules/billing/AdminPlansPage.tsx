// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/**
 * Subscription Plans (Admin) — wires the existing /api/admin/plans CRUD
 * (AdminCompatibilityController). Replaces the BillingPage / PlanSelector
 * lazyParityPage stubs with a real plan editor.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  Button, Card, CardBody, CardHeader, Input, Modal, ModalBody, ModalContent,
  ModalFooter, ModalHeader, Spinner, Switch, Table, TableBody, TableCell,
  TableColumn, TableHeader, TableRow, Textarea,
} from '@heroui/react';
import { CreditCard, Plus, RefreshCw, Trash2, Edit3 } from 'lucide-react';
import { usePageTitle } from '@/hooks';
import { useToast } from '@/contexts';
import { api } from '@/lib/api';
import { PageHeader } from '../../components';

interface Plan {
  id: number;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  max_members: number;
  max_listings: number;
  max_exchanges_per_month: number;
  is_active: boolean;
  is_public: boolean;
}

interface PlanForm {
  id?: number;
  name: string;
  description: string;
  price: string;
  currency: string;
  max_members: string;
  max_listings: string;
  max_exchanges_per_month: string;
  is_active: boolean;
  is_public: boolean;
}

const EMPTY_FORM: PlanForm = {
  name: '', description: '', price: '0', currency: 'EUR',
  max_members: '0', max_listings: '0', max_exchanges_per_month: '0',
  is_active: true, is_public: true,
};

export default function AdminPlansPage() {
  usePageTitle('Admin - Subscription Plans');
  const toast = useToast();
  const [rows, setRows] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<PlanForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ data: Plan[] }>('/v2/admin/plans');
      if (res.success && res.data) {
        const payload = (res.data as unknown) as { data?: Plan[] };
        setRows(payload.data ?? []);
      }
    } catch { toast.error('Failed to load plans'); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const openNew = () => { setForm(EMPTY_FORM); setModalOpen(true); };
  const openEdit = (p: Plan) => {
    setForm({
      id: p.id, name: p.name, description: p.description ?? '',
      price: String(p.price), currency: p.currency,
      max_members: String(p.max_members), max_listings: String(p.max_listings),
      max_exchanges_per_month: String(p.max_exchanges_per_month),
      is_active: p.is_active, is_public: p.is_public,
    });
    setModalOpen(true);
  };

  const submit = useCallback(async () => {
    if (!form.name.trim()) { toast.error('Name required'); return; }
    setSubmitting(true);
    const payload = {
      name: form.name,
      description: form.description || null,
      price: parseFloat(form.price) || 0,
      currency: form.currency,
      max_members: parseInt(form.max_members, 10) || 0,
      max_listings: parseInt(form.max_listings, 10) || 0,
      max_exchanges_per_month: parseInt(form.max_exchanges_per_month, 10) || 0,
      is_active: form.is_active,
      is_public: form.is_public,
    };
    try {
      const res = form.id
        ? await api.put(`/v2/admin/plans/${form.id}`, payload)
        : await api.post('/v2/admin/plans', payload);
      if (res.success) {
        toast.success(form.id ? 'Plan updated' : 'Plan created');
        setModalOpen(false);
        await load();
      } else { toast.error('Save failed'); }
    } catch { toast.error('Save failed'); }
    finally { setSubmitting(false); }
  }, [form, toast, load]);

  const remove = useCallback(async (id: number) => {
    try {
      const res = await api.delete(`/v2/admin/plans/${id}`);
      if (res.success) { toast.success('Plan deleted'); await load(); }
      else { toast.error('Delete failed'); }
    } catch { toast.error('Delete failed'); }
  }, [toast, load]);

  return (
    <div>
      <PageHeader title="Subscription Plans"
        description="Tenant subscription plans (UserSubscription target). Use is_public=false for internal-only plans."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="flat" size="sm" startContent={<RefreshCw size={16} />}
              onPress={load} isLoading={loading}>Refresh</Button>
            <Button color="primary" size="sm" startContent={<Plus size={16} />}
              onPress={openNew}>New plan</Button>
          </div>
        } />
      <Card shadow="sm">
        <CardHeader className="flex items-center gap-2">
          <CreditCard size={18} className="text-primary" />
          <h3 className="text-lg font-semibold">Plans ({rows.length})</h3>
        </CardHeader>
        <CardBody>
          <Table aria-label="Subscription plans" isStriped>
            <TableHeader>
              <TableColumn>ID</TableColumn>
              <TableColumn>Name</TableColumn>
              <TableColumn className="text-right">Price</TableColumn>
              <TableColumn>Members</TableColumn>
              <TableColumn>Listings</TableColumn>
              <TableColumn>Active</TableColumn>
              <TableColumn>Public</TableColumn>
              <TableColumn>Actions</TableColumn>
            </TableHeader>
            <TableBody emptyContent="No plans defined" isLoading={loading} loadingContent={<Spinner />}>
              {rows.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>#{p.id}</TableCell>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="text-right">{p.price.toFixed(2)} {p.currency}</TableCell>
                  <TableCell>{p.max_members || '∞'}</TableCell>
                  <TableCell>{p.max_listings || '∞'}</TableCell>
                  <TableCell>{p.is_active ? 'Yes' : 'No'}</TableCell>
                  <TableCell>{p.is_public ? 'Yes' : 'No'}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" variant="flat" startContent={<Edit3 size={14} />}
                        onPress={() => openEdit(p)}>Edit</Button>
                      <Button size="sm" variant="flat" color="danger"
                        startContent={<Trash2 size={14} />}
                        onPress={() => remove(p.id)}>Delete</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardBody>
      </Card>
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} size="2xl">
        <ModalContent>
          <ModalHeader>{form.id ? `Edit plan #${form.id}` : 'New plan'}</ModalHeader>
          <ModalBody className="space-y-3">
            <Input label="Name" value={form.name}
              onValueChange={(v) => setForm({ ...form, name: v })} isRequired />
            <Textarea label="Description" value={form.description}
              onValueChange={(v) => setForm({ ...form, description: v })} minRows={2} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Price" type="number" step="0.01" value={form.price}
                onValueChange={(v) => setForm({ ...form, price: v })} />
              <Input label="Currency" value={form.currency}
                onValueChange={(v) => setForm({ ...form, currency: v.toUpperCase() })} maxLength={3} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Input label="Max members" type="number" value={form.max_members}
                onValueChange={(v) => setForm({ ...form, max_members: v })} />
              <Input label="Max listings" type="number" value={form.max_listings}
                onValueChange={(v) => setForm({ ...form, max_listings: v })} />
              <Input label="Max exchanges/mo" type="number" value={form.max_exchanges_per_month}
                onValueChange={(v) => setForm({ ...form, max_exchanges_per_month: v })} />
            </div>
            <div className="flex items-center justify-between">
              <span>Active</span>
              <Switch isSelected={form.is_active} onValueChange={(v) => setForm({ ...form, is_active: v })} />
            </div>
            <div className="flex items-center justify-between">
              <span>Public (shown on pricing page)</span>
              <Switch isSelected={form.is_public} onValueChange={(v) => setForm({ ...form, is_public: v })} />
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={() => setModalOpen(false)}>Cancel</Button>
            <Button color="primary" onPress={submit} isLoading={submitting}>
              {form.id ? 'Save changes' : 'Create plan'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
