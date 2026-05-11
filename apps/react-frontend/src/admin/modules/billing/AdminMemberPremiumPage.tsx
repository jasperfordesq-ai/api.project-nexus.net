// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/**
 * Member Premium Tiers (Admin) — replaces the MemberPremiumAdminPage parity
 * stub. Wires to the persisted compatibility endpoint:
 *   GET /api/v2/admin/member-premium/tiers
 *   POST /api/v2/admin/member-premium/tiers (creates persisted record)
 *   DELETE /api/v2/admin/member-premium/tiers/{id}
 *   POST /api/v2/admin/member-premium/tiers/{id}/sync-stripe
 *
 * Records are stored as TenantConfig parity records — payload is free-form,
 * we surface the common fields (name, price, currency).
 */

import { useCallback, useEffect, useState } from 'react';
import {
  Button, Card, CardBody, CardHeader, Chip, Input, Modal, ModalBody,
  ModalContent, ModalFooter, ModalHeader, Spinner, Table, TableBody,
  TableCell, TableColumn, TableHeader, TableRow, Textarea,
} from '@heroui/react';
import { Crown, Plus, RefreshCw, Trash2, RefreshCcw } from 'lucide-react';
import { usePageTitle } from '@/hooks';
import { useToast } from '@/contexts';
import { api } from '@/lib/api';
import { PageHeader } from '../../components';

interface ParityRecord {
  id: number;
  name: string | null;
  status: string;
  payload: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

interface TierForm {
  name: string;
  price: string;
  currency: string;
  description: string;
}

const EMPTY_FORM: TierForm = { name: '', price: '0', currency: 'EUR', description: '' };

export default function AdminMemberPremiumPage() {
  usePageTitle('Admin - Member Premium Tiers');
  const toast = useToast();
  const [rows, setRows] = useState<ParityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<TierForm>(EMPTY_FORM);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ data: ParityRecord[] }>('/v2/admin/member-premium/tiers');
      if (res.success && res.data) {
        const p = (res.data as unknown) as { data?: ParityRecord[] };
        setRows(p.data ?? []);
      }
    } catch {
      toast.error('Failed to load tiers');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const create = useCallback(async () => {
    try {
      const price = parseFloat(form.price) || 0;
      const res = await api.post('/v2/admin/member-premium/tiers', {
        name: form.name,
        price,
        currency: form.currency,
        description: form.description,
      });
      if (res.success) {
        toast.success('Tier created');
        setCreateOpen(false);
        setForm(EMPTY_FORM);
        await load();
      } else {
        toast.error('Create failed');
      }
    } catch {
      toast.error('Create failed');
    }
  }, [form, toast, load]);

  const remove = useCallback(async (id: number) => {
    if (!confirm('Delete this tier?')) return;
    setWorking(id);
    try {
      const res = await api.delete(`/v2/admin/member-premium/tiers/${id}`);
      if (res.success) {
        toast.success('Tier deleted');
        await load();
      } else {
        toast.error('Delete failed');
      }
    } catch {
      toast.error('Delete failed');
    } finally {
      setWorking(null);
    }
  }, [toast, load]);

  const syncStripe = useCallback(async (id: number) => {
    setWorking(id);
    try {
      const res = await api.post(`/v2/admin/member-premium/tiers/${id}/sync-stripe`, {});
      if (res.success) {
        toast.success('Sync queued');
        await load();
      } else {
        toast.error('Sync failed');
      }
    } catch {
      toast.error('Sync failed');
    } finally {
      setWorking(null);
    }
  }, [toast, load]);

  const get = (r: ParityRecord, key: string): string => {
    const v = r.payload?.[key];
    return v == null ? '' : String(v);
  };

  return (
    <div>
      <PageHeader
        title="Member Premium Tiers"
        description="Premium membership tiers (persisted as parity records)."
        actions={
          <div className="flex gap-2">
            <Button variant="flat" size="sm" startContent={<RefreshCw size={16} />} onPress={load} isLoading={loading}>
              Refresh
            </Button>
            <Button color="primary" size="sm" startContent={<Plus size={16} />} onPress={() => { setForm(EMPTY_FORM); setCreateOpen(true); }}>
              New tier
            </Button>
          </div>
        }
      />

      <Card shadow="sm">
        <CardHeader className="flex items-center gap-2">
          <Crown size={18} className="text-primary" />
          <h3 className="text-lg font-semibold">Tiers</h3>
        </CardHeader>
        <CardBody>
          <Table aria-label="Premium tiers" isStriped>
            <TableHeader>
              <TableColumn>ID</TableColumn>
              <TableColumn>Name</TableColumn>
              <TableColumn className="text-right">Price</TableColumn>
              <TableColumn>Currency</TableColumn>
              <TableColumn>Status</TableColumn>
              <TableColumn>Updated</TableColumn>
              <TableColumn>Actions</TableColumn>
            </TableHeader>
            <TableBody emptyContent="No tiers yet" isLoading={loading} loadingContent={<Spinner />}>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>#{r.id}</TableCell>
                  <TableCell>{get(r, 'name') || r.name || '—'}</TableCell>
                  <TableCell className="text-right">{get(r, 'price') || '—'}</TableCell>
                  <TableCell>{get(r, 'currency') || '—'}</TableCell>
                  <TableCell>
                    <Chip color="default" variant="flat" size="sm">{r.status}</Chip>
                  </TableCell>
                  <TableCell className="text-default-500 text-xs">
                    {new Date(r.updated_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="flat" isLoading={working === r.id}
                        startContent={<RefreshCcw size={14} />} onPress={() => syncStripe(r.id)}>
                        Sync
                      </Button>
                      <Button size="sm" variant="flat" color="danger" isLoading={working === r.id}
                        startContent={<Trash2 size={14} />} onPress={() => remove(r.id)}>
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardBody>
      </Card>

      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)}>
        <ModalContent>
          <ModalHeader>New premium tier</ModalHeader>
          <ModalBody>
            <Input label="Name" value={form.name} onValueChange={(v) => setForm({ ...form, name: v })} variant="bordered" />
            <div className="flex gap-3">
              <Input label="Price" type="number" value={form.price}
                onValueChange={(v) => setForm({ ...form, price: v })} variant="bordered" className="flex-1" />
              <Input label="Currency" value={form.currency}
                onValueChange={(v) => setForm({ ...form, currency: v })} variant="bordered" className="w-32" />
            </div>
            <Textarea label="Description" value={form.description}
              onValueChange={(v) => setForm({ ...form, description: v })} minRows={2} />
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={() => setCreateOpen(false)}>Cancel</Button>
            <Button color="primary" onPress={create} isDisabled={!form.name.trim()}>Create</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
