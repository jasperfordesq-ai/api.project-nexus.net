// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/**
 * Pilot Inquiry Admin — inbound pilot-program inquiries.
 *
 * Backend:
 *   POST  /api/pilot-inquiry            (MiscParityController — public submit)
 *   GET   /api/v2/admin/pilot-inquiries (AdminExplicitParityController)
 *   GET   /api/v2/admin/pilot-inquiries/{id}
 *   GET   /api/v2/admin/pilot-inquiries/export
 *   GET   /api/v2/admin/pilot-inquiries/stats
 *   POST  /api/v2/admin/pilot-inquiries/{id}/assign
 *   POST  /api/v2/admin/pilot-inquiries/{id}/notes
 *   POST  /api/v2/admin/pilot-inquiries/{id}/stage
 *
 * Gap: no first-class PilotInquiry entity in V2. Submissions are stored
 * as CompatibilityAuditEntries by the parity layer; this page renders
 * the recorded payloads and lets admins record stage transitions and
 * notes through the same parity write path.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button, Card, CardBody, CardHeader, Chip, Input, Modal, ModalBody, ModalContent,
  ModalFooter, ModalHeader, Select, SelectItem, Spinner, Textarea,
  Table, TableBody, TableCell, TableColumn, TableHeader, TableRow,
  useDisclosure,
} from '@heroui/react';
import { Inbox, RefreshCw, MessageSquare, ArrowRight, Filter, Download } from 'lucide-react';
import { usePageTitle } from '@/hooks';
import { useToast } from '@/contexts';
import { api } from '@/lib/api';
import { PageHeader } from '../../components';

interface AuditEntry {
  id: number;
  name: string;
  path: string;
  action: string;
  status: string;
  payload: Record<string, unknown> | null;
  occurred_at?: string;
}

interface InquiryRow {
  id: number;
  contact: string;
  org: string;
  country: string;
  use_case: string;
  status: string;
  occurred_at: string | null;
}

type Stage = 'new' | 'contacted' | 'qualified' | 'rejected' | 'converted';
const STAGES: Stage[] = ['new', 'contacted', 'qualified', 'rejected', 'converted'];

function stageColor(s: string): 'default' | 'primary' | 'success' | 'warning' | 'danger' {
  switch (s) {
    case 'new': return 'primary';
    case 'contacted': return 'warning';
    case 'qualified': return 'success';
    case 'converted': return 'success';
    case 'rejected': return 'danger';
    default: return 'default';
  }
}

function project(e: AuditEntry): InquiryRow {
  const p = (e.payload ?? {}) as Record<string, unknown>;
  const str = (k: string, d = ''): string => (typeof p[k] === 'string' ? p[k] as string : d);
  return {
    id: e.id,
    contact: str('contact') || str('email') || str('name') || '(anonymous)',
    org: str('org') || str('organization') || '—',
    country: str('country') || '—',
    use_case: str('use_case') || str('message') || '',
    status: str('status', e.action === 'stage' ? 'contacted' : 'new'),
    occurred_at: e.occurred_at ?? null,
  };
}

export default function PilotInquiryAdminPage() {
  usePageTitle('Admin - Pilot Inquiries');
  const toast = useToast();
  const notesModal = useDisclosure();
  const stageModal = useDisclosure();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [working] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [countryFilter, setCountryFilter] = useState<string>('');
  const [target, setTarget] = useState<InquiryRow | null>(null);
  const [note, setNote] = useState('');
  const [newStage, setNewStage] = useState<Stage>('contacted');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ data: AuditEntry[] }>('/v2/admin/pilot-inquiries');
      if (res.success && res.data) {
        const payload = (res.data as unknown) as { data?: AuditEntry[] };
        setEntries(payload.data ?? []);
      }
    } catch { toast.error('Failed to load pilot inquiries'); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const rows = useMemo(() => {
    const projected = entries.map(project);
    return projected.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (countryFilter && !r.country.toLowerCase().includes(countryFilter.toLowerCase())) return false;
      return true;
    });
  }, [entries, statusFilter, countryFilter]);

  const openNotes = useCallback((row: InquiryRow) => {
    setTarget(row); setNote(''); notesModal.onOpen();
  }, [notesModal]);

  const openStage = useCallback((row: InquiryRow) => {
    setTarget(row); setNewStage('contacted'); stageModal.onOpen();
  }, [stageModal]);

  const saveNote = useCallback(async () => {
    if (!target || !note.trim()) return;
    setSaving(true);
    try {
      const res = await api.post(`/v2/admin/pilot-inquiries/${target.id}/notes`, { note: note.trim() });
      if (res.success) {
        toast.success('Note added');
        notesModal.onClose();
        await load();
      } else { toast.error(res.error || 'Failed'); }
    } catch { toast.error('Failed'); }
    finally { setSaving(false); }
  }, [target, note, toast, notesModal, load]);

  const saveStage = useCallback(async () => {
    if (!target) return;
    setSaving(true);
    try {
      const res = await api.post(`/v2/admin/pilot-inquiries/${target.id}/stage`, { status: newStage });
      if (res.success) {
        toast.success(`Stage → ${newStage}`);
        stageModal.onClose();
        await load();
      } else { toast.error(res.error || 'Failed'); }
    } catch { toast.error('Failed'); }
    finally { setSaving(false); }
  }, [target, newStage, toast, stageModal, load]);

  const exportCsv = useCallback(async () => {
    try {
      const res = await api.get<{ data: unknown }>('/v2/admin/pilot-inquiries/export');
      if (res.success) toast.success('Export queued (check downloads/exports)');
      else toast.error('Export failed');
    } catch { toast.error('Export failed'); }
  }, [toast]);

  return (
    <div>
      <PageHeader
        title="Pilot Inquiries"
        description="Inbound pilot-program inquiries submitted through the public /api/pilot-inquiry endpoint. Triage queue: assign, change stage, add internal notes. Submissions are stored in CompatibilityAuditEntries (no dedicated entity yet)."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="flat" size="sm" startContent={<Download size={16} />}
              onPress={exportCsv}>Export</Button>
            <Button variant="flat" size="sm" startContent={<RefreshCw size={16} />}
              onPress={load} isLoading={loading}>Refresh</Button>
          </div>
        }
      />

      <Card shadow="sm" className="mb-3">
        <CardBody className="flex flex-col md:flex-row gap-3 items-center">
          <Filter size={16} className="text-default-500" />
          <Select label="Status" size="sm" className="max-w-[200px]" selectedKeys={new Set([statusFilter])}
            onSelectionChange={(keys) => {
              const v = Array.from(keys)[0] as string | undefined;
              if (v) setStatusFilter(v);
            }}>
            {(['all', ...STAGES] as const).map((s) => (
              <SelectItem key={s} textValue={s}>{s}</SelectItem>
            )) as never}
          </Select>
          <Input label="Country contains" size="sm" className="max-w-[260px]"
            value={countryFilter} onValueChange={setCountryFilter} />
          <p className="text-xs text-default-500 ml-auto">{rows.length} of {entries.length} shown</p>
        </CardBody>
      </Card>

      <Card shadow="sm">
        <CardHeader className="flex items-center gap-2">
          <Inbox size={18} className="text-primary" />
          <h3 className="text-lg font-semibold">Inquiries</h3>
        </CardHeader>
        <CardBody>
          <Table aria-label="Pilot inquiries" isStriped>
            <TableHeader>
              <TableColumn>ID</TableColumn>
              <TableColumn>Contact</TableColumn>
              <TableColumn>Org</TableColumn>
              <TableColumn>Country</TableColumn>
              <TableColumn>Use case</TableColumn>
              <TableColumn>Status</TableColumn>
              <TableColumn>Submitted</TableColumn>
              <TableColumn>Actions</TableColumn>
            </TableHeader>
            <TableBody emptyContent="No inquiries match the current filters." isLoading={loading} loadingContent={<Spinner />}>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>#{r.id}</TableCell>
                  <TableCell className="font-medium">{r.contact}</TableCell>
                  <TableCell>{r.org}</TableCell>
                  <TableCell><code className="text-xs">{r.country}</code></TableCell>
                  <TableCell className="max-w-md text-xs text-default-600 truncate">{r.use_case}</TableCell>
                  <TableCell><Chip size="sm" variant="flat" color={stageColor(r.status)}>{r.status}</Chip></TableCell>
                  <TableCell className="text-xs text-default-500">
                    {r.occurred_at ? new Date(r.occurred_at).toLocaleString() : '—'}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" variant="flat" isLoading={working === r.id}
                        startContent={<ArrowRight size={14} />} onPress={() => openStage(r)}>Stage</Button>
                      <Button size="sm" variant="flat" isLoading={working === r.id}
                        startContent={<MessageSquare size={14} />} onPress={() => openNotes(r)}>Notes</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardBody>
      </Card>

      <Modal isOpen={notesModal.isOpen} onClose={notesModal.onClose}>
        <ModalContent>
          <ModalHeader>Add note to inquiry #{target?.id}</ModalHeader>
          <ModalBody>
            <Textarea label="Note" value={note} onValueChange={setNote} minRows={4} />
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={notesModal.onClose}>Cancel</Button>
            <Button color="primary" onPress={saveNote} isLoading={saving}>Save note</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={stageModal.isOpen} onClose={stageModal.onClose}>
        <ModalContent>
          <ModalHeader>Change stage for #{target?.id}</ModalHeader>
          <ModalBody>
            <Select label="New stage" selectedKeys={new Set([newStage])}
              onSelectionChange={(keys) => {
                const v = Array.from(keys)[0] as Stage | undefined;
                if (v) setNewStage(v);
              }}>
              {STAGES.map((s) => <SelectItem key={s} textValue={s}>{s}</SelectItem>) as never}
            </Select>
            <p className="text-xs text-default-500 mt-2">
              Marking <strong>contacted</strong> records an outreach event;
              <strong> qualified</strong> means ready to convert to a provisioning request.
            </p>
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={stageModal.onClose}>Cancel</Button>
            <Button color="primary" onPress={saveStage} isLoading={saving}>Apply</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
