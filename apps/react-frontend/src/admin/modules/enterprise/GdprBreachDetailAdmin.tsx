// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/**
 * GDPR Breach Detail (Admin) — wires
 *   GET /api/admin/gdpr/breaches/{id}
 *   PUT /api/admin/gdpr/breaches/{id}
 *   PUT /api/admin/gdpr/breaches/{id}/report-authority
 * (GdprBreachController). Replaces the GdprBreachDetailPage parity stub.
 */

import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Button, Card, CardBody, CardHeader, Chip, Divider, Input, Select, SelectItem,
  Spinner, Textarea,
} from '@heroui/react';
import { ArrowLeft, ShieldAlert, Save, Send } from 'lucide-react';
import { usePageTitle } from '@/hooks';
import { useToast } from '@/contexts';
import { api } from '@/lib/api';
import { PageHeader } from '../../components';

interface BreachDetail {
  id: number;
  title: string;
  description: string;
  severity: string;
  status: string;
  affected_users_count: number;
  data_types_affected: string | null;
  detected_at: string;
  contained_at: string | null;
  resolved_at: string | null;
  reported_to_authority_at: string | null;
  authority_reference: string | null;
  remediation_steps: string | null;
  reported_by: { id: number; firstName: string; lastName: string } | null;
  created_at: string;
  updated_at: string;
}

const STATUS_OPTIONS = ['detected', 'contained', 'investigating', 'remediated', 'resolved', 'closed'];
const SEVERITY_OPTIONS = ['low', 'medium', 'high', 'critical'];

function severityColor(s: string): 'default' | 'primary' | 'warning' | 'danger' {
  switch (s) {
    case 'critical': return 'danger';
    case 'high': return 'warning';
    case 'medium': return 'primary';
    default: return 'default';
  }
}

export default function GdprBreachDetailAdminPage() {
  usePageTitle('Admin - Breach Detail');
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const [breach, setBreach] = useState<BreachDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reporting, setReporting] = useState(false);

  const [status, setStatus] = useState<string>('');
  const [severity, setSeverity] = useState<string>('');
  const [remediation, setRemediation] = useState('');
  const [affected, setAffected] = useState('0');
  const [authRef, setAuthRef] = useState('');

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await api.get<BreachDetail>(`/v2/admin/gdpr/breaches/${id}`);
      if (res.success && res.data) {
        const b = res.data as unknown as BreachDetail;
        setBreach(b);
        setStatus(b.status);
        setSeverity(b.severity);
        setRemediation(b.remediation_steps ?? '');
        setAffected(String(b.affected_users_count ?? 0));
        setAuthRef(b.authority_reference ?? '');
      } else {
        toast.error('Breach not found');
      }
    } catch { toast.error('Failed to load breach'); }
    finally { setLoading(false); }
  }, [id, toast]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!id) return;
    const affectedNum = parseInt(affected, 10);
    if (Number.isNaN(affectedNum) || affectedNum < 0) { toast.error('Affected count must be non-negative'); return; }
    setSaving(true);
    try {
      const res = await api.put(`/v2/admin/gdpr/breaches/${id}`, {
        status, severity,
        remediation_steps: remediation,
        affected_users_count: affectedNum,
      });
      if (res.success) { toast.success('Breach updated'); load(); }
      else toast.error(res.error?.message || 'Update failed');
    } catch { toast.error('Update failed'); }
    finally { setSaving(false); }
  };

  const reportToAuthority = async () => {
    if (!id) return;
    if (!confirm('Mark this breach as reported to the supervisory authority? This action cannot be undone.')) return;
    setReporting(true);
    try {
      const res = await api.put(`/v2/admin/gdpr/breaches/${id}/report-authority`, {
        authority_reference: authRef.trim() || null,
      });
      if (res.success) { toast.success('Reported to authority'); load(); }
      else toast.error(res.error?.message || 'Report failed');
    } catch { toast.error('Report failed'); }
    finally { setReporting(false); }
  };

  if (loading) {
    return <div className="flex justify-center p-12"><Spinner /></div>;
  }
  if (!breach) {
    return (
      <div>
        <PageHeader title="Breach Not Found" description="The requested breach record does not exist." />
        <Button variant="flat" startContent={<ArrowLeft size={16} />} onPress={() => navigate('/admin/enterprise/gdpr/breaches')}>Back</Button>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={breach.title}
        description={`Breach #${breach.id} — detected ${new Date(breach.detected_at).toLocaleString()}`}
        actions={
          <Button variant="flat" size="sm" startContent={<ArrowLeft size={16} />}
            onPress={() => navigate('/admin/enterprise/gdpr/breaches')}>Back</Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Card shadow="sm">
          <CardHeader className="flex items-center gap-2">
            <ShieldAlert size={18} className="text-danger" />
            <h3 className="text-lg font-semibold">Overview</h3>
          </CardHeader>
          <CardBody className="space-y-3 text-sm">
            <p className="text-default-700">{breach.description}</p>
            <Divider />
            <div className="flex flex-wrap gap-2">
              <Chip color={severityColor(breach.severity)} variant="flat">Severity: {breach.severity}</Chip>
              <Chip variant="flat">Status: {breach.status}</Chip>
              {breach.reported_to_authority_at && <Chip color="success" variant="flat">Reported to authority</Chip>}
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-default-500">
              <div><span className="font-medium text-default-700">Detected:</span> {new Date(breach.detected_at).toLocaleString()}</div>
              <div><span className="font-medium text-default-700">Contained:</span> {breach.contained_at ? new Date(breach.contained_at).toLocaleString() : '—'}</div>
              <div><span className="font-medium text-default-700">Resolved:</span> {breach.resolved_at ? new Date(breach.resolved_at).toLocaleString() : '—'}</div>
              <div><span className="font-medium text-default-700">Reported:</span> {breach.reported_to_authority_at ? new Date(breach.reported_to_authority_at).toLocaleString() : '—'}</div>
              <div><span className="font-medium text-default-700">Affected users:</span> {breach.affected_users_count}</div>
              <div><span className="font-medium text-default-700">Data types:</span> {breach.data_types_affected ?? '—'}</div>
            </div>
            {breach.reported_by && (
              <div className="text-xs text-default-500">
                Reported by: {breach.reported_by.firstName} {breach.reported_by.lastName} (#{breach.reported_by.id})
              </div>
            )}
          </CardBody>
        </Card>

        <Card shadow="sm">
          <CardHeader>
            <h3 className="text-lg font-semibold">Update Breach</h3>
          </CardHeader>
          <CardBody className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Select label="Status" selectedKeys={new Set([status])}
                onSelectionChange={(keys) => { const v = Array.from(keys)[0] as string; if (v) setStatus(v); }}>
                {STATUS_OPTIONS.map((s) => <SelectItem key={s} textValue={s}>{s}</SelectItem>) as never}
              </Select>
              <Select label="Severity" selectedKeys={new Set([severity])}
                onSelectionChange={(keys) => { const v = Array.from(keys)[0] as string; if (v) setSeverity(v); }}>
                {SEVERITY_OPTIONS.map((s) => <SelectItem key={s} textValue={s}>{s}</SelectItem>) as never}
              </Select>
            </div>
            <Input label="Affected users count" type="number" min={0} value={affected} onValueChange={setAffected} />
            <Textarea label="Remediation steps" value={remediation} onValueChange={setRemediation} minRows={4} />
            <Button color="primary" onPress={save} isLoading={saving} startContent={<Save size={16} />}>Save Changes</Button>
            <Divider />
            <div className="space-y-2">
              <p className="text-xs text-default-500">Once a breach is reported to the supervisory authority (e.g. DPC under GDPR Art. 33), record the reference number below.</p>
              <Input label="Authority reference" value={authRef} onValueChange={setAuthRef}
                isDisabled={!!breach.reported_to_authority_at} />
              <Button color="warning" variant="flat" startContent={<Send size={16} />} onPress={reportToAuthority}
                isDisabled={!!breach.reported_to_authority_at} isLoading={reporting}>
                {breach.reported_to_authority_at ? 'Already Reported' : 'Report to Authority'}
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
