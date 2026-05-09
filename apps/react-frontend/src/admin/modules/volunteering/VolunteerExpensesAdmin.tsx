// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/**
 * Volunteer Expenses (Admin) — replaces the Phase 65 parity stub with a
 * real CRUD review page wired to /api/admin/volunteer/expenses (already
 * fully implemented in VolunteerLongTailController).
 *
 * Flow: Submitted → UnderReview → Approved/Rejected → Reimbursed.
 * Admin can filter by status, approve / reject (with note), or mark
 * Approved expenses as Reimbursed.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Select,
  SelectItem,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
  Textarea,
} from '@heroui/react';
import { Receipt, RefreshCw, Check, X, BadgeCheck } from 'lucide-react';
import { usePageTitle } from '@/hooks';
import { useToast } from '@/contexts';
import { api } from '@/lib/api';
import { PageHeader } from '../../components';

interface VolunteerExpense {
  id: number;
  user_id: number;
  shift_id: number | null;
  amount: number;
  currency: string;
  category: string;
  description: string;
  receipt_url: string | null;
  status: 'Submitted' | 'UnderReview' | 'Approved' | 'Rejected' | 'Reimbursed';
  reviewer_note: string | null;
  reviewed_by_user_id: number | null;
  reviewed_at: string | null;
  reimbursed_at: string | null;
  created_at: string;
}

const STATUS_OPTIONS: Array<{ value: VolunteerExpense['status']; label: string }> = [
  { value: 'Submitted', label: 'Submitted' },
  { value: 'UnderReview', label: 'Under Review' },
  { value: 'Approved', label: 'Approved' },
  { value: 'Rejected', label: 'Rejected' },
  { value: 'Reimbursed', label: 'Reimbursed' },
];

function statusColor(s: VolunteerExpense['status']): 'default' | 'primary' | 'success' | 'danger' | 'warning' {
  switch (s) {
    case 'Submitted': return 'primary';
    case 'UnderReview': return 'warning';
    case 'Approved': return 'success';
    case 'Rejected': return 'danger';
    case 'Reimbursed': return 'success';
    default: return 'default';
  }
}

export default function VolunteerExpensesAdmin() {
  usePageTitle('Admin - Volunteer Expenses');
  const toast = useToast();

  const [filter, setFilter] = useState<VolunteerExpense['status']>('Submitted');
  const [rows, setRows] = useState<VolunteerExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<number | null>(null);

  const [reviewModal, setReviewModal] = useState<{ id: number; approve: boolean } | null>(null);
  const [reviewNote, setReviewNote] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ data: VolunteerExpense[]; total: number; status: string }>(
        `/v2/admin/volunteer/expenses?status=${encodeURIComponent(filter)}`,
      );
      if (res.success && res.data) {
        const payload = (res.data as unknown) as { data?: VolunteerExpense[] };
        setRows(payload.data ?? []);
      }
    } catch {
      toast.error('Failed to load volunteer expenses');
    } finally {
      setLoading(false);
    }
  }, [filter, toast]);

  useEffect(() => { load(); }, [load]);

  const submitReview = useCallback(async () => {
    if (!reviewModal) return;
    setWorking(reviewModal.id);
    try {
      const res = await api.post<{ data: VolunteerExpense }>(
        `/v2/admin/volunteer/expenses/${reviewModal.id}/review`,
        { approve: reviewModal.approve, note: reviewNote || null },
      );
      if (res.success) {
        toast.success(reviewModal.approve ? 'Expense approved' : 'Expense rejected');
        setReviewModal(null);
        setReviewNote('');
        await load();
      } else {
        toast.error('Review failed');
      }
    } catch {
      toast.error('Review failed');
    } finally {
      setWorking(null);
    }
  }, [reviewModal, reviewNote, toast, load]);

  const reimburse = useCallback(async (id: number) => {
    setWorking(id);
    try {
      const res = await api.post<{ data: VolunteerExpense }>(
        `/v2/admin/volunteer/expenses/${id}/reimburse`,
        {},
      );
      if (res.success) {
        toast.success('Marked reimbursed');
        await load();
      } else {
        toast.error('Reimburse failed');
      }
    } catch {
      toast.error('Reimburse failed');
    } finally {
      setWorking(null);
    }
  }, [toast, load]);

  const fmtAmount = (e: VolunteerExpense) => `${e.amount.toFixed(2)} ${e.currency}`;
  const fmtDate = (s: string | null) => (s ? new Date(s).toLocaleDateString() : '—');

  return (
    <div>
      <PageHeader
        title="Volunteer Expenses"
        description="Review, approve, and reimburse volunteer expense claims (Phase 65)."
        actions={
          <div className="flex items-center gap-2">
            <Select
              size="sm"
              variant="bordered"
              className="w-44"
              selectedKeys={new Set([filter])}
              onSelectionChange={(keys) => {
                const v = Array.from(keys)[0] as VolunteerExpense['status'] | undefined;
                if (v) setFilter(v);
              }}
              aria-label="Filter by status"
            >
              {STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} textValue={o.label}>{o.label}</SelectItem>
              ))}
            </Select>
            <Button
              variant="flat"
              size="sm"
              startContent={<RefreshCw size={16} />}
              onPress={load}
              isLoading={loading}
            >
              Refresh
            </Button>
          </div>
        }
      />

      <Card shadow="sm">
        <CardHeader className="flex items-center gap-2">
          <Receipt size={18} className="text-primary" />
          <h3 className="text-lg font-semibold">{filter} expenses</h3>
        </CardHeader>
        <CardBody>
          <Table aria-label="Volunteer expenses" isStriped>
            <TableHeader>
              <TableColumn>ID</TableColumn>
              <TableColumn>User</TableColumn>
              <TableColumn>Category</TableColumn>
              <TableColumn>Description</TableColumn>
              <TableColumn className="text-right">Amount</TableColumn>
              <TableColumn>Status</TableColumn>
              <TableColumn>Submitted</TableColumn>
              <TableColumn>Actions</TableColumn>
            </TableHeader>
            <TableBody
              emptyContent={`No expenses with status "${filter}"`}
              isLoading={loading}
              loadingContent={<Spinner />}
            >
              {rows.map((e) => (
                <TableRow key={e.id}>
                  <TableCell>#{e.id}</TableCell>
                  <TableCell>#{e.user_id}</TableCell>
                  <TableCell>{e.category}</TableCell>
                  <TableCell className="max-w-md truncate">{e.description}</TableCell>
                  <TableCell className="text-right font-medium">{fmtAmount(e)}</TableCell>
                  <TableCell>
                    <Chip color={statusColor(e.status)} variant="flat" size="sm">{e.status}</Chip>
                  </TableCell>
                  <TableCell className="text-default-500 text-xs">{fmtDate(e.created_at)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {(e.status === 'Submitted' || e.status === 'UnderReview') && (
                        <>
                          <Button
                            size="sm"
                            variant="flat"
                            color="success"
                            isLoading={working === e.id}
                            startContent={<Check size={14} />}
                            onPress={() => { setReviewModal({ id: e.id, approve: true }); setReviewNote(''); }}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="flat"
                            color="danger"
                            isLoading={working === e.id}
                            startContent={<X size={14} />}
                            onPress={() => { setReviewModal({ id: e.id, approve: false }); setReviewNote(''); }}
                          >
                            Reject
                          </Button>
                        </>
                      )}
                      {e.status === 'Approved' && (
                        <Button
                          size="sm"
                          variant="flat"
                          color="primary"
                          isLoading={working === e.id}
                          startContent={<BadgeCheck size={14} />}
                          onPress={() => reimburse(e.id)}
                        >
                          Mark reimbursed
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardBody>
      </Card>

      <Modal isOpen={!!reviewModal} onClose={() => setReviewModal(null)}>
        <ModalContent>
          <ModalHeader>{reviewModal?.approve ? 'Approve expense' : 'Reject expense'}</ModalHeader>
          <ModalBody>
            <Textarea
              label="Note (optional)"
              placeholder="Reason for the decision — visible to the volunteer."
              value={reviewNote}
              onValueChange={setReviewNote}
              minRows={3}
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={() => setReviewModal(null)}>Cancel</Button>
            <Button
              color={reviewModal?.approve ? 'success' : 'danger'}
              isLoading={working !== null}
              onPress={submitReview}
            >
              {reviewModal?.approve ? 'Approve' : 'Reject'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
