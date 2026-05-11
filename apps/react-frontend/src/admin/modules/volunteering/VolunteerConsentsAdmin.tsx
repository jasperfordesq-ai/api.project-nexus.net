// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/**
 * Volunteer Guardian Consents (Admin) — review queue + approve/reject.
 * Wired to /api/admin/volunteer/guardian-consents/* (VolunteerAdminController).
 *
 * Under-18 volunteers must have a parent/guardian record approved before they
 * can take shifts. This page is the coordinator's review surface.
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
import { ShieldCheck, Check, X, RefreshCw } from 'lucide-react';
import { usePageTitle } from '@/hooks';
import { useToast } from '@/contexts';
import { api } from '@/lib/api';
import { PageHeader } from '../../components';

type ConsentStatus = 'Pending' | 'Granted' | 'Revoked' | 'Rejected';

interface Consent {
  id: number;
  minor_user_id: number;
  guardian_name: string;
  guardian_email: string;
  guardian_relationship: string | null;
  consented_at: string | null;
  revoked_at: string | null;
  consent_document_url: string | null;
  status: ConsentStatus;
  reviewer_note: string | null;
  reviewed_at: string | null;
  created_at: string;
}

const STATUS_OPTIONS: Array<{ value: ConsentStatus | 'all'; label: string }> = [
  { value: 'Pending', label: 'Pending' },
  { value: 'Granted', label: 'Granted' },
  { value: 'Rejected', label: 'Rejected' },
  { value: 'Revoked', label: 'Revoked' },
  { value: 'all', label: 'All' },
];

function statusColor(s: ConsentStatus): 'default' | 'primary' | 'success' | 'danger' | 'warning' {
  switch (s) {
    case 'Pending': return 'warning';
    case 'Granted': return 'success';
    case 'Rejected': return 'danger';
    case 'Revoked': return 'default';
    default: return 'default';
  }
}

export default function VolunteerConsentsAdmin() {
  usePageTitle('Admin - Guardian Consents');
  const toast = useToast();

  const [filter, setFilter] = useState<ConsentStatus | 'all'>('Pending');
  const [rows, setRows] = useState<Consent[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<number | null>(null);
  const [reviewModal, setReviewModal] = useState<{ id: number; approve: boolean } | null>(null);
  const [reviewNote, setReviewNote] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const url =
        filter === 'all'
          ? '/v2/admin/volunteer/guardian-consents'
          : `/v2/admin/volunteer/guardian-consents?status=${encodeURIComponent(filter)}`;
      const res = await api.get<{ data: Consent[]; total: number; status: string }>(url);
      if (res.success && res.data) {
        const payload = (res.data as unknown) as { data?: Consent[] };
        setRows(payload.data ?? []);
      }
    } catch {
      toast.error('Failed to load consents');
    } finally {
      setLoading(false);
    }
  }, [filter, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const submitReview = useCallback(async () => {
    if (!reviewModal) return;
    setWorking(reviewModal.id);
    try {
      const action = reviewModal.approve ? 'approve' : 'reject';
      const res = await api.post<{ data: Consent }>(
        `/v2/admin/volunteer/guardian-consents/${reviewModal.id}/${action}`,
        { note: reviewNote || null },
      );
      if (res.success) {
        toast.success(reviewModal.approve ? 'Consent approved' : 'Consent rejected');
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

  const fmtDate = (s: string | null) => (s ? new Date(s).toLocaleDateString() : '—');

  return (
    <div>
      <PageHeader
        title="Guardian Consents"
        description="Approve or reject parental/guardian consent records for under-18 volunteers."
        actions={
          <div className="flex items-center gap-2">
            <Select
              size="sm"
              variant="bordered"
              className="w-44"
              selectedKeys={new Set([filter])}
              onSelectionChange={(keys) => {
                const v = Array.from(keys)[0] as ConsentStatus | 'all' | undefined;
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
          <ShieldCheck size={18} className="text-primary" />
          <h3 className="text-lg font-semibold">{filter === 'all' ? 'All' : filter} consents ({rows.length})</h3>
        </CardHeader>
        <CardBody>
          <Table aria-label="Guardian consents" isStriped>
            <TableHeader>
              <TableColumn>ID</TableColumn>
              <TableColumn>Minor User</TableColumn>
              <TableColumn>Guardian</TableColumn>
              <TableColumn>Email</TableColumn>
              <TableColumn>Relationship</TableColumn>
              <TableColumn>Status</TableColumn>
              <TableColumn>Submitted</TableColumn>
              <TableColumn>Actions</TableColumn>
            </TableHeader>
            <TableBody
              emptyContent={`No consents with status "${filter}"`}
              isLoading={loading}
              loadingContent={<Spinner />}
            >
              {rows.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>#{c.id}</TableCell>
                  <TableCell>#{c.minor_user_id}</TableCell>
                  <TableCell className="font-medium">{c.guardian_name}</TableCell>
                  <TableCell className="text-xs">{c.guardian_email}</TableCell>
                  <TableCell>{c.guardian_relationship ?? '—'}</TableCell>
                  <TableCell>
                    <Chip color={statusColor(c.status)} variant="flat" size="sm">{c.status}</Chip>
                  </TableCell>
                  <TableCell className="text-default-500 text-xs">{fmtDate(c.created_at)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {c.status === 'Pending' && (
                        <>
                          <Button
                            size="sm"
                            variant="flat"
                            color="success"
                            isLoading={working === c.id}
                            startContent={<Check size={14} />}
                            onPress={() => { setReviewModal({ id: c.id, approve: true }); setReviewNote(''); }}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="flat"
                            color="danger"
                            isLoading={working === c.id}
                            startContent={<X size={14} />}
                            onPress={() => { setReviewModal({ id: c.id, approve: false }); setReviewNote(''); }}
                          >
                            Reject
                          </Button>
                        </>
                      )}
                      {c.consent_document_url && (
                        <Button
                          size="sm"
                          variant="flat"
                          as="a"
                          href={c.consent_document_url}
                          target="_blank"
                          rel="noreferrer noopener"
                        >
                          Document
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
          <ModalHeader>{reviewModal?.approve ? 'Approve consent' : 'Reject consent'}</ModalHeader>
          <ModalBody>
            <Textarea
              label="Note (optional)"
              placeholder="Reason for the decision — kept on the record."
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
