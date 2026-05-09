// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/**
 * Volunteer Wellbeing (Admin) — Phase 65 follow-up review queue.
 * Wired to /api/admin/volunteer/wellbeing/follow-ups (real endpoint).
 */

import { useCallback, useEffect, useState } from 'react';
import {
  Button, Card, CardBody, CardHeader, Chip, Modal, ModalBody, ModalContent,
  ModalFooter, ModalHeader, Spinner, Table, TableBody, TableCell, TableColumn,
  TableHeader, TableRow, Textarea,
} from '@heroui/react';
import { Heart, RefreshCw, Check } from 'lucide-react';
import { usePageTitle } from '@/hooks';
import { useToast } from '@/contexts';
import { api } from '@/lib/api';
import { PageHeader } from '../../components';

interface WellbeingPulse {
  id: number;
  user_id: number;
  shift_id: number | null;
  score: number;
  note: string | null;
  requires_follow_up: boolean;
  is_resolved: boolean;
  resolved_by_user_id: number | null;
  resolved_at: string | null;
  resolution_note: string | null;
  created_at: string;
}

function scoreColor(s: number): 'success' | 'warning' | 'danger' {
  return s >= 4 ? 'success' : s >= 3 ? 'warning' : 'danger';
}

export default function VolunteerWellbeingAdmin() {
  usePageTitle('Admin - Volunteer Wellbeing');
  const toast = useToast();
  const [rows, setRows] = useState<WellbeingPulse[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolveTarget, setResolveTarget] = useState<number | null>(null);
  const [resolveNote, setResolveNote] = useState('');
  const [working, setWorking] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ data: WellbeingPulse[] }>('/v2/admin/volunteer/wellbeing/follow-ups');
      if (res.success && res.data) {
        const payload = (res.data as unknown) as { data?: WellbeingPulse[] };
        setRows(payload.data ?? []);
      }
    } catch {
      toast.error('Failed to load wellbeing follow-ups');
    } finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const submit = useCallback(async () => {
    if (resolveTarget === null) return;
    setWorking(resolveTarget);
    try {
      const res = await api.post(`/v2/admin/volunteer/wellbeing/${resolveTarget}/resolve`, {
        resolution_note: resolveNote || null,
      });
      if (res.success) {
        toast.success('Wellbeing pulse resolved');
        setResolveTarget(null);
        setResolveNote('');
        await load();
      } else { toast.error('Resolve failed'); }
    } catch { toast.error('Resolve failed'); }
    finally { setWorking(null); }
  }, [resolveTarget, resolveNote, toast, load]);

  return (
    <div>
      <PageHeader
        title="Volunteer Wellbeing"
        description="Unresolved volunteer wellbeing pulses flagged for follow-up (Phase 65)."
        actions={
          <Button variant="flat" size="sm" startContent={<RefreshCw size={16} />}
            onPress={load} isLoading={loading}>Refresh</Button>
        }
      />
      <Card shadow="sm">
        <CardHeader className="flex items-center gap-2">
          <Heart size={18} className="text-danger" />
          <h3 className="text-lg font-semibold">Pending follow-ups ({rows.length})</h3>
        </CardHeader>
        <CardBody>
          <Table aria-label="Wellbeing follow-ups" isStriped>
            <TableHeader>
              <TableColumn>ID</TableColumn>
              <TableColumn>User</TableColumn>
              <TableColumn>Score</TableColumn>
              <TableColumn>Note</TableColumn>
              <TableColumn>Submitted</TableColumn>
              <TableColumn>Action</TableColumn>
            </TableHeader>
            <TableBody emptyContent="No unresolved follow-ups" isLoading={loading} loadingContent={<Spinner />}>
              {rows.map((w) => (
                <TableRow key={w.id}>
                  <TableCell>#{w.id}</TableCell>
                  <TableCell>#{w.user_id}</TableCell>
                  <TableCell>
                    <Chip color={scoreColor(w.score)} variant="flat" size="sm">{w.score}/5</Chip>
                  </TableCell>
                  <TableCell className="max-w-md whitespace-pre-wrap text-sm">{w.note ?? '—'}</TableCell>
                  <TableCell className="text-xs text-default-500">{new Date(w.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="flat" color="success" isLoading={working === w.id}
                      startContent={<Check size={14} />}
                      onPress={() => { setResolveTarget(w.id); setResolveNote(''); }}>
                      Mark resolved
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardBody>
      </Card>
      <Modal isOpen={resolveTarget !== null} onClose={() => setResolveTarget(null)}>
        <ModalContent>
          <ModalHeader>Resolve wellbeing pulse #{resolveTarget}</ModalHeader>
          <ModalBody>
            <Textarea label="Resolution note (optional)"
              placeholder="What action was taken? Visible to the volunteer."
              value={resolveNote} onValueChange={setResolveNote} minRows={3} />
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={() => setResolveTarget(null)}>Cancel</Button>
            <Button color="success" isLoading={working !== null} onPress={submit}>Resolve</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
