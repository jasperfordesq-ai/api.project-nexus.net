// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/**
 * Volunteer Emergency Alerts (Admin) — Phase 65 broadcast + acknowledge.
 *   GET  /api/volunteer/alerts/active
 *   POST /api/admin/volunteer/alerts
 *   POST /api/admin/volunteer/alerts/{id}/acknowledge
 *
 * NOTE: this is the volunteer-coordination alert system, NOT the separate
 * Caring Community emergency alert parity surface.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  Button, Card, CardBody, CardHeader, Chip, Input, Modal, ModalBody,
  ModalContent, ModalFooter, ModalHeader, Select, SelectItem, Spinner,
  Table, TableBody, TableCell, TableColumn, TableHeader, TableRow, Textarea,
} from '@heroui/react';
import { AlertTriangle, Plus, RefreshCw, Check } from 'lucide-react';
import { usePageTitle } from '@/hooks';
import { useToast } from '@/contexts';
import { api } from '@/lib/api';
import { PageHeader } from '../../components';

type Severity = 'Info' | 'Warning' | 'Urgent';

interface Alert {
  id: number;
  opportunity_id: number | null;
  shift_id: number | null;
  title: string;
  body: string;
  severity: Severity;
  created_by_user_id: number;
  is_active: boolean;
  acknowledged_at: string | null;
  created_at: string;
}

const SEVERITY_OPTIONS: Severity[] = ['Info', 'Warning', 'Urgent'];

function severityColor(s: Severity): 'default' | 'warning' | 'danger' {
  return s === 'Urgent' ? 'danger' : s === 'Warning' ? 'warning' : 'default';
}

export default function VolunteerEmergencyAlertsAdmin() {
  usePageTitle('Admin - Volunteer Emergency Alerts');
  const toast = useToast();
  const [rows, setRows] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    title: '', body: '', severity: 'Info' as Severity,
    opportunity_id: '', shift_id: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ data: Alert[] }>('/v2/volunteer/alerts/active');
      if (res.success && res.data) {
        const payload = (res.data as unknown) as { data?: Alert[] };
        setRows(payload.data ?? []);
      }
    } catch { toast.error('Failed to load alerts'); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const ack = useCallback(async (id: number) => {
    setWorking(id);
    try {
      const res = await api.post(`/v2/admin/volunteer/alerts/${id}/acknowledge`, {});
      if (res.success) {
        toast.success('Alert acknowledged');
        await load();
      } else { toast.error('Acknowledge failed'); }
    } catch { toast.error('Acknowledge failed'); }
    finally { setWorking(null); }
  }, [toast, load]);

  const submit = useCallback(async () => {
    if (!form.title.trim() || !form.body.trim()) {
      toast.error('Title and body required');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post('/v2/admin/volunteer/alerts', {
        title: form.title,
        body: form.body,
        severity: form.severity,
        opportunity_id: form.opportunity_id ? parseInt(form.opportunity_id, 10) : null,
        shift_id: form.shift_id ? parseInt(form.shift_id, 10) : null,
      });
      if (res.success) {
        toast.success('Alert broadcast');
        setCreateOpen(false);
        setForm({ title: '', body: '', severity: 'Info', opportunity_id: '', shift_id: '' });
        await load();
      } else { toast.error('Broadcast failed'); }
    } catch { toast.error('Broadcast failed'); }
    finally { setSubmitting(false); }
  }, [form, toast, load]);

  return (
    <div>
      <PageHeader
        title="Volunteer Emergency Alerts"
        description="Broadcast and acknowledge volunteer-coordination alerts (Phase 65). For urgent communications about shifts, sites, or opportunities. Distinct from Caring Community alerts."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="flat" size="sm" startContent={<RefreshCw size={16} />}
              onPress={load} isLoading={loading}>Refresh</Button>
            <Button color="primary" size="sm" startContent={<Plus size={16} />}
              onPress={() => setCreateOpen(true)}>Broadcast new alert</Button>
          </div>
        }
      />
      <Card shadow="sm">
        <CardHeader className="flex items-center gap-2">
          <AlertTriangle size={18} className="text-warning" />
          <h3 className="text-lg font-semibold">Active alerts ({rows.length})</h3>
        </CardHeader>
        <CardBody>
          <Table aria-label="Active alerts" isStriped>
            <TableHeader>
              <TableColumn>ID</TableColumn>
              <TableColumn>Severity</TableColumn>
              <TableColumn>Title</TableColumn>
              <TableColumn>Body</TableColumn>
              <TableColumn>Scope</TableColumn>
              <TableColumn>Created</TableColumn>
              <TableColumn>Action</TableColumn>
            </TableHeader>
            <TableBody emptyContent="No active alerts" isLoading={loading} loadingContent={<Spinner />}>
              {rows.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>#{a.id}</TableCell>
                  <TableCell>
                    <Chip color={severityColor(a.severity)} variant="flat" size="sm">{a.severity}</Chip>
                  </TableCell>
                  <TableCell className="font-medium">{a.title}</TableCell>
                  <TableCell className="max-w-md truncate text-sm">{a.body}</TableCell>
                  <TableCell className="text-xs text-default-500">
                    {a.opportunity_id ? `Opp #${a.opportunity_id}` : ''}
                    {a.shift_id ? ` · Shift #${a.shift_id}` : ''}
                    {!a.opportunity_id && !a.shift_id ? 'All volunteers' : ''}
                  </TableCell>
                  <TableCell className="text-xs text-default-500">{new Date(a.created_at).toLocaleString()}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="flat" color="success" isLoading={working === a.id}
                      startContent={<Check size={14} />} onPress={() => ack(a.id)}>
                      Acknowledge
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardBody>
      </Card>

      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} size="2xl">
        <ModalContent>
          <ModalHeader>Broadcast new alert</ModalHeader>
          <ModalBody className="space-y-3">
            <Input label="Title" value={form.title}
              onValueChange={(v) => setForm({ ...form, title: v })} isRequired />
            <Textarea label="Body" value={form.body}
              onValueChange={(v) => setForm({ ...form, body: v })} isRequired minRows={3} />
            <Select label="Severity" size="sm" variant="bordered"
              selectedKeys={new Set([form.severity])}
              onSelectionChange={(keys) => {
                const v = Array.from(keys)[0] as Severity | undefined;
                if (v) setForm({ ...form, severity: v });
              }}>
              {(SEVERITY_OPTIONS.map((s) => (
                <SelectItem key={s} textValue={s}>{s}</SelectItem>
              )) as never)}
            </Select>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Opportunity ID (optional)" type="number" value={form.opportunity_id}
                onValueChange={(v) => setForm({ ...form, opportunity_id: v })} />
              <Input label="Shift ID (optional)" type="number" value={form.shift_id}
                onValueChange={(v) => setForm({ ...form, shift_id: v })} />
            </div>
            <p className="text-xs text-default-400">
              Leave both IDs empty to broadcast to all volunteers in the tenant.
            </p>
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={() => setCreateOpen(false)}>Cancel</Button>
            <Button color="primary" onPress={submit} isLoading={submitting}>Broadcast</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
