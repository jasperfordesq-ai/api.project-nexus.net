// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/**
 * GDPR Request Detail (Admin) — workflow + audit trail for a single
 * data subject request.
 *
 * Source: GET /api/v2/admin/enterprise/gdpr/requests/{id}
 *   returns { data: { export_request, deletion_request } } — one of them is
 *   null depending on the request type.
 *
 * Workflow actions:
 *   POST /api/v2/admin/enterprise/gdpr/requests/{id}/notes — append note
 *   PUT  /api/v2/admin/enterprise/gdpr/requests/{id}/assign — change assignee
 *   POST /api/v2/admin/enterprise/gdpr/requests/{id}/export — trigger export
 *
 * Status transitions (Acknowledge → InProgress → Completed/Denied) go
 * through the same /notes endpoint with a payload that includes the new
 * status; the persisted-write path stores them in TenantConfig today and
 * the typed entities will replace that lookup in a follow-up.
 */

import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Button, Card, CardBody, CardHeader, Chip, Divider, Modal, ModalBody,
  ModalContent, ModalFooter, ModalHeader, Spinner, Textarea, useDisclosure,
} from '@heroui/react';
import { CheckCircle, Clock, FileSearch, Send, ShieldQuestion, XCircle } from 'lucide-react';
import { usePageTitle } from '@/hooks';
import { useToast } from '@/contexts';
import { api } from '@/lib/api';
import { PageHeader } from '../../components';

type ReqKind = 'export' | 'deletion';
type ReqStatus = 'Pending' | 'Acknowledged' | 'InProgress' | 'Completed' | 'Denied';

interface RawRequest {
  id: number;
  userId?: number;
  user_id?: number;
  status?: string | number;
  Status?: string;
  reason?: string | null;
  Reason?: string | null;
  notes?: string | null;
  Notes?: string | null;
  createdAt?: string;
  created_at?: string;
  CreatedAt?: string;
  deadline?: string | null;
  Deadline?: string | null;
  reviewedAt?: string | null;
  reviewed_at?: string | null;
  completedAt?: string | null;
  completed_at?: string | null;
  AssignedToId?: number | null;
  assigned_to_id?: number | null;
}

interface DetailEnvelope {
  data?: {
    export_request: RawRequest | null;
    deletion_request: RawRequest | null;
  };
}

function statusFrom(r: RawRequest | null): ReqStatus {
  if (!r) return 'Pending';
  const raw = (r.Status ?? r.status ?? 'Pending').toString();
  const normalised = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
  if (['Pending', 'Acknowledged', 'Inprogress', 'Completed', 'Denied'].includes(normalised)) {
    return (normalised === 'Inprogress' ? 'InProgress' : normalised) as ReqStatus;
  }
  return 'Pending';
}

function statusColor(s: ReqStatus): 'default' | 'warning' | 'primary' | 'success' | 'danger' {
  switch (s) {
    case 'Pending': return 'warning';
    case 'Acknowledged': return 'primary';
    case 'InProgress': return 'primary';
    case 'Completed': return 'success';
    case 'Denied': return 'danger';
  }
}

function nextStatuses(s: ReqStatus): ReqStatus[] {
  switch (s) {
    case 'Pending': return ['Acknowledged', 'Denied'];
    case 'Acknowledged': return ['InProgress', 'Denied'];
    case 'InProgress': return ['Completed', 'Denied'];
    default: return [];
  }
}

export default function GdprRequestDetailPage() {
  usePageTitle('Admin - GDPR Request Detail');
  const params = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const idNum = Number(params.id);
  const [exportReq, setExportReq] = useState<RawRequest | null>(null);
  const [deletionReq, setDeletionReq] = useState<RawRequest | null>(null);
  const [loading, setLoading] = useState(true);

  const { isOpen, onOpen, onClose } = useDisclosure();
  const [pendingStatus, setPendingStatus] = useState<ReqStatus | null>(null);
  const [noteText, setNoteText] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<DetailEnvelope>(`/v2/admin/enterprise/gdpr/requests/${idNum}`);
      if (res.success) {
        const payload = (res.data as unknown) as DetailEnvelope | { data?: DetailEnvelope };
        const dataNode = (payload as DetailEnvelope).data
          ?? ((payload as { data?: DetailEnvelope }).data?.data);
        setExportReq(dataNode?.export_request ?? null);
        setDeletionReq(dataNode?.deletion_request ?? null);
      }
    } catch {
      toast.error('Failed to load GDPR request');
    } finally {
      setLoading(false);
    }
  }, [idNum, toast]);

  useEffect(() => { if (!Number.isNaN(idNum)) load(); }, [idNum, load]);

  const primary: { kind: ReqKind; row: RawRequest } | null =
    exportReq ? { kind: 'export', row: exportReq }
    : deletionReq ? { kind: 'deletion', row: deletionReq }
    : null;

  const status = statusFrom(primary?.row ?? null);

  const openTransition = useCallback((next: ReqStatus) => {
    setPendingStatus(next);
    setNoteText('');
    onOpen();
  }, [onOpen]);

  const submitTransition = useCallback(async () => {
    if (!pendingStatus || !primary) return;
    setBusy(true);
    try {
      const res = await api.request(`/v2/admin/enterprise/gdpr/requests/${idNum}/notes`, {
        method: 'POST',
        body: {
          status: pendingStatus,
          note: noteText.trim() || null,
          kind: primary.kind,
        },
      });
      if (res.success) {
        toast.success(`Marked ${pendingStatus}`);
        onClose();
        await load();
      } else {
        toast.error('Transition failed');
      }
    } catch {
      toast.error('Transition failed');
    } finally {
      setBusy(false);
    }
  }, [pendingStatus, primary, idNum, noteText, toast, onClose, load]);

  const triggerExport = useCallback(async () => {
    setBusy(true);
    try {
      const res = await api.request(`/v2/admin/enterprise/gdpr/requests/${idNum}/export`, {
        method: 'POST',
        body: {},
      });
      if (res.success) {
        toast.success('Export triggered');
        await load();
      } else {
        toast.error('Export failed');
      }
    } catch {
      toast.error('Export failed');
    } finally {
      setBusy(false);
    }
  }, [idNum, load, toast]);

  if (Number.isNaN(idNum)) {
    return (
      <div className="p-6 text-sm text-danger">Invalid request id.</div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center"><Spinner /></div>
    );
  }

  if (!primary) {
    return (
      <div>
        <PageHeader title={`GDPR Request #${idNum}`} description="Not found" />
        <Card><CardBody>
          <p className="text-sm text-default-600">No request found with this id.</p>
          <Button className="mt-3" variant="flat" onPress={() => navigate('/admin/enterprise/gdpr/requests')}>
            Back to requests
          </Button>
        </CardBody></Card>
      </div>
    );
  }

  const r = primary.row;
  const createdAt = r.createdAt ?? r.created_at ?? r.CreatedAt;
  const deadline = r.deadline ?? r.Deadline;
  const reason = r.reason ?? r.Reason;
  const notes = r.notes ?? r.Notes;
  const reviewedAt = r.reviewedAt ?? r.reviewed_at;
  const completedAt = r.completedAt ?? r.completed_at;
  const userId = r.userId ?? r.user_id;

  return (
    <div>
      <PageHeader
        title={`GDPR Request #${idNum}`}
        description={`Type: ${primary.kind} • Subject: user #${userId ?? '?'}`}
        actions={
          <div className="flex items-center gap-2">
            {nextStatuses(status).map((next) => (
              <Button key={next} size="sm" variant="flat" color={statusColor(next)}
                onPress={() => openTransition(next)}
                startContent={next === 'Denied' ? <XCircle size={14} /> : <CheckCircle size={14} />}
              >
                Mark {next}
              </Button>
            ))}
            {primary.kind === 'export' && status !== 'Completed' && (
              <Button size="sm" variant="flat" color="primary"
                startContent={<FileSearch size={14} />}
                isLoading={busy} onPress={triggerExport}>
                Trigger Export
              </Button>
            )}
          </div>
        }
      />

      <Card shadow="sm" className="mb-4">
        <CardHeader className="flex items-center gap-2">
          <ShieldQuestion size={18} className="text-primary" />
          <h3 className="text-lg font-semibold">Request Details</h3>
          <Chip className="ml-auto" size="sm" color={statusColor(status)} variant="flat">{status}</Chip>
        </CardHeader>
        <CardBody className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <p className="text-xs text-default-500">Subject</p>
            <p className="text-sm">user #{userId}</p>
          </div>
          <div>
            <p className="text-xs text-default-500">Kind</p>
            <p className="text-sm capitalize">{primary.kind}</p>
          </div>
          <div>
            <p className="text-xs text-default-500">Submitted</p>
            <p className="text-sm">{createdAt ? new Date(createdAt).toLocaleString() : '—'}</p>
          </div>
          <div>
            <p className="text-xs text-default-500">Deadline</p>
            <p className="text-sm">{deadline ? new Date(deadline).toLocaleDateString() : '—'}</p>
          </div>
          <div>
            <p className="text-xs text-default-500">Reviewed</p>
            <p className="text-sm">{reviewedAt ? new Date(reviewedAt).toLocaleString() : '—'}</p>
          </div>
          <div>
            <p className="text-xs text-default-500">Completed</p>
            <p className="text-sm">{completedAt ? new Date(completedAt).toLocaleString() : '—'}</p>
          </div>
          <div className="md:col-span-2">
            <p className="text-xs text-default-500">Reason from requester</p>
            <p className="whitespace-pre-wrap text-sm">{reason ?? '—'}</p>
          </div>
          <div className="md:col-span-2">
            <p className="text-xs text-default-500">Internal notes</p>
            <p className="whitespace-pre-wrap text-sm">{notes ?? '—'}</p>
          </div>
        </CardBody>
      </Card>

      <Card shadow="sm">
        <CardHeader className="flex items-center gap-2">
          <Clock size={18} className="text-default-500" />
          <h3 className="text-lg font-semibold">Audit Trail</h3>
        </CardHeader>
        <CardBody>
          <ol className="space-y-2 text-sm">
            <li className="flex items-center gap-2">
              <Chip size="sm" variant="flat">submitted</Chip>
              <span className="text-default-600">{createdAt ? new Date(createdAt).toLocaleString() : '—'}</span>
            </li>
            {reviewedAt && (
              <li className="flex items-center gap-2">
                <Chip size="sm" color="primary" variant="flat">reviewed</Chip>
                <span className="text-default-600">{new Date(reviewedAt).toLocaleString()}</span>
              </li>
            )}
            {completedAt && (
              <li className="flex items-center gap-2">
                <Chip size="sm" color="success" variant="flat">completed</Chip>
                <span className="text-default-600">{new Date(completedAt).toLocaleString()}</span>
              </li>
            )}
          </ol>
          <Divider className="my-3" />
          <p className="text-xs text-default-500">
            Per-note granular timeline is persisted server-side via{' '}
            <code>/api/v2/admin/enterprise/gdpr/requests/{idNum}/notes</code>;{' '}
            it is rendered above as status milestones in V2.
          </p>
        </CardBody>
      </Card>

      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalContent>
          <ModalHeader>Mark request as {pendingStatus}</ModalHeader>
          <ModalBody>
            <Textarea
              size="sm" variant="bordered" label="Reason / note"
              value={noteText} onValueChange={setNoteText} maxRows={5}
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={onClose}>Cancel</Button>
            <Button color="primary" isLoading={busy} startContent={<Send size={14} />} onPress={submitTransition}>
              Confirm
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
