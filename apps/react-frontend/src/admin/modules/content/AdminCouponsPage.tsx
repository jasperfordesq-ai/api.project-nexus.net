// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/**
 * Merchant Coupons (Admin) — moderation view of seller-created coupons.
 *
 * Wires to AdminMarketplaceController:
 *   GET    /api/admin/marketplace/coupons
 *   POST   /api/admin/marketplace/coupons/{id}/suspend
 *   DELETE /api/admin/marketplace/coupons/{id}
 *
 * Coupons stay in scope per CLAUDE.md even though the full Marketplace
 * module is OOS — sellers create their own coupons via
 * /api/marketplace/coupons (MarketplaceController). This admin surface
 * exists to suspend abusive codes and prune expired ones.
 *
 * GAP: there is currently NO admin "create coupon" endpoint — coupons
 * are owned by a seller user. Use the member-facing create flow or
 * impersonate a seller if a system coupon is required.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button, Card, CardBody, CardHeader, Chip, Input, Select, SelectItem,
  Spinner, Table, TableBody, TableCell, TableColumn, TableHeader, TableRow,
} from '@heroui/react';
import { AlertTriangle, Ban, RefreshCw, Tag, Trash2 } from 'lucide-react';
import { usePageTitle } from '@/hooks';
import { useToast } from '@/contexts';
import { api } from '@/lib/api';
import { PageHeader } from '../../components';

interface Coupon {
  id: number;
  code: string;
  description: string;
  discount_type?: string;
  discountType?: string;
  discount_amount?: number;
  discountAmount?: number;
  max_uses?: number | null;
  used_count?: number;
  is_active?: boolean;
  isActive?: boolean;
  expires_at?: string | null;
  expiresAt?: string | null;
  seller_user_id?: number;
  sellerUserId?: number;
  created_at?: string;
  createdAt?: string;
}

type StatusFilter = 'all' | 'active' | 'expired' | 'disabled';

function status(c: Coupon): 'active' | 'expired' | 'disabled' {
  const active = c.is_active ?? c.isActive ?? true;
  if (!active) return 'disabled';
  const exp = c.expires_at ?? c.expiresAt;
  if (exp && new Date(exp) < new Date()) return 'expired';
  return 'active';
}

export default function AdminCouponsPage() {
  usePageTitle('Admin - Marketplace Coupons');
  const toast = useToast();

  const [rows, setRows] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ data: Coupon[] }>('/admin/marketplace/coupons');
      const payload = res.data as unknown as { data?: Coupon[] };
      setRows(payload?.data ?? []);
    } catch { toast.error('Failed to load coupons'); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const suspend = useCallback(async (id: number) => {
    try {
      const res = await api.post(`/admin/marketplace/coupons/${id}/suspend`, {});
      if (res.success) { toast.success('Coupon suspended'); await load(); }
      else { toast.error('Suspend failed'); }
    } catch { toast.error('Suspend failed'); }
  }, [load, toast]);

  const remove = useCallback(async (id: number) => {
    if (!confirm('Delete this coupon? Redemptions will be retained for audit.')) return;
    try {
      const res = await api.delete(`/admin/marketplace/coupons/${id}`);
      if (res.success) { toast.success('Coupon deleted'); await load(); }
      else { toast.error('Delete failed'); }
    } catch { toast.error('Delete failed'); }
  }, [load, toast]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((c) => {
      if (statusFilter !== 'all' && status(c) !== statusFilter) return false;
      if (!q) return true;
      return c.code?.toLowerCase().includes(q) || (c.description ?? '').toLowerCase().includes(q);
    });
  }, [rows, search, statusFilter]);

  return (
    <div>
      <PageHeader
        title="Merchant Coupons"
        description="Seller-managed discount codes. Admin can suspend or delete coupons; create flow is seller-driven."
        actions={
          <Button variant="flat" size="sm" startContent={<RefreshCw size={16} />}
            onPress={load} isLoading={loading}>Refresh</Button>
        }
      />

      <Card shadow="sm" className="mb-4 border-l-4 border-warning">
        <CardBody className="flex flex-row gap-3 items-start">
          <AlertTriangle size={20} className="text-warning shrink-0 mt-0.5" />
          <div className="text-sm">
            Marketplace module is OOS; coupons remain in scope as a small
            admin-managed system. There is no admin <em>create</em>
            endpoint — sellers create coupons via the member-facing API.
          </div>
        </CardBody>
      </Card>

      <Card shadow="sm" className="mb-4">
        <CardBody className="flex flex-row gap-2 items-end">
          <Input size="sm" placeholder="Search code or description"
            value={search} onValueChange={setSearch} className="max-w-xs" />
          <Select size="sm" label="Status" selectedKeys={[statusFilter]}
            onChange={(e) => setStatusFilter((e.target.value || 'all') as StatusFilter)}
            className="max-w-[180px]">
            <SelectItem key="all">All</SelectItem>
            <SelectItem key="active">Active</SelectItem>
            <SelectItem key="expired">Expired</SelectItem>
            <SelectItem key="disabled">Disabled</SelectItem>
          </Select>
        </CardBody>
      </Card>

      <Card shadow="sm">
        <CardHeader className="flex items-center gap-2">
          <Tag size={18} className="text-primary" />
          <h3 className="text-lg font-semibold">Coupons ({filtered.length})</h3>
        </CardHeader>
        <CardBody>
          <Table aria-label="Coupons" isStriped>
            <TableHeader>
              <TableColumn>Code</TableColumn>
              <TableColumn>Description</TableColumn>
              <TableColumn>Discount</TableColumn>
              <TableColumn>Used / Max</TableColumn>
              <TableColumn>Expires</TableColumn>
              <TableColumn>Status</TableColumn>
              <TableColumn>Actions</TableColumn>
            </TableHeader>
            <TableBody emptyContent="No coupons match the filter"
              isLoading={loading} loadingContent={<Spinner />}>
              {filtered.map((c) => {
                const s = status(c);
                const dt = c.discount_type ?? c.discountType ?? 'fixed';
                const da = c.discount_amount ?? c.discountAmount ?? 0;
                const exp = c.expires_at ?? c.expiresAt;
                const used = c.used_count ?? 0;
                const max = c.max_uses ?? null;
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono">{c.code}</TableCell>
                    <TableCell className="max-w-xs truncate">{c.description}</TableCell>
                    <TableCell>{dt === 'percentage' ? `${da}%` : `${da.toFixed(2)}`}</TableCell>
                    <TableCell className="tabular-nums">{used}{max != null ? ` / ${max}` : ''}</TableCell>
                    <TableCell>{exp ? new Date(exp).toLocaleDateString() : '—'}</TableCell>
                    <TableCell>
                      <Chip size="sm" color={s === 'active' ? 'success' : s === 'expired' ? 'warning' : 'default'}
                        variant="flat">{s}</Chip>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="flat" startContent={<Ban size={14} />}
                          onPress={() => suspend(c.id)} isDisabled={s === 'disabled'}>Suspend</Button>
                        <Button size="sm" variant="flat" color="danger" startContent={<Trash2 size={14} />}
                          onPress={() => remove(c.id)}>Delete</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardBody>
      </Card>
    </div>
  );
}
