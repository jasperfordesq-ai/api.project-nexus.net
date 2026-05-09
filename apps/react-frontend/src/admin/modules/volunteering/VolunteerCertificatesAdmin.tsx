// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/**
 * Volunteer Certificates (Admin) — Phase 65 issue + revoke flows.
 * Wired to /api/admin/volunteer/certificates and /revoke (real endpoints).
 */

import { useCallback, useState } from 'react';
import {
  Button, Card, CardBody, CardHeader, Input, Modal, ModalBody, ModalContent,
  ModalFooter, ModalHeader, Switch, Textarea,
} from '@heroui/react';
import { Award, Send } from 'lucide-react';
import { usePageTitle } from '@/hooks';
import { useToast } from '@/contexts';
import { api } from '@/lib/api';
import { PageHeader } from '../../components';

interface IssueForm {
  user_id: string;
  title: string;
  description: string;
  hours_recognised: string;
  issued_by: string;
  expires_at: string;
  is_publicly_verifiable: boolean;
}

interface IssuedCertificate {
  id: number;
  user_id: number;
  title: string;
  hours_recognised: number | null;
  verification_code: string;
  issued_at: string;
}

const EMPTY: IssueForm = {
  user_id: '', title: '', description: '', hours_recognised: '',
  issued_by: '', expires_at: '', is_publicly_verifiable: true,
};

export default function VolunteerCertificatesAdmin() {
  usePageTitle('Admin - Volunteer Certificates');
  const toast = useToast();
  const [form, setForm] = useState<IssueForm>(EMPTY);
  const [issued, setIssued] = useState<IssuedCertificate[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<{ id: number; title: string } | null>(null);
  const [revokeReason, setRevokeReason] = useState('');

  const submit = useCallback(async () => {
    if (!form.user_id || !form.title) {
      toast.error('User ID and title are required');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post<{ data: IssuedCertificate }>(
        '/v2/admin/volunteer/certificates',
        {
          user_id: parseInt(form.user_id, 10),
          title: form.title,
          description: form.description || null,
          hours_recognised: form.hours_recognised ? parseFloat(form.hours_recognised) : null,
          issued_by: form.issued_by || null,
          expires_at: form.expires_at || null,
          is_publicly_verifiable: form.is_publicly_verifiable,
        },
      );
      if (res.success && res.data) {
        const payload = (res.data as unknown) as { data?: IssuedCertificate };
        if (payload.data) setIssued((prev) => [payload.data!, ...prev]);
        toast.success('Certificate issued');
        setForm(EMPTY);
      } else { toast.error('Issue failed'); }
    } catch { toast.error('Issue failed'); }
    finally { setSubmitting(false); }
  }, [form, toast]);

  const revoke = useCallback(async () => {
    if (!revokeTarget) return;
    if (!revokeReason.trim()) { toast.error('Revocation reason required'); return; }
    try {
      const res = await api.post(`/v2/admin/volunteer/certificates/${revokeTarget.id}/revoke`, {
        reason: revokeReason,
      });
      if (res.success) {
        toast.success('Certificate revoked');
        setIssued((prev) => prev.filter((c) => c.id !== revokeTarget.id));
        setRevokeTarget(null);
        setRevokeReason('');
      } else { toast.error('Revoke failed'); }
    } catch { toast.error('Revoke failed'); }
  }, [revokeTarget, revokeReason, toast]);

  return (
    <div>
      <PageHeader title="Volunteer Certificates"
        description="Issue and revoke recognition certificates (Phase 65). Verification codes are publicly checkable at /api/certificates/verify/{code}." />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card shadow="sm">
          <CardHeader className="flex items-center gap-2">
            <Award size={18} className="text-primary" />
            <h3 className="text-lg font-semibold">Issue certificate</h3>
          </CardHeader>
          <CardBody className="space-y-3">
            <Input label="User ID" value={form.user_id}
              onValueChange={(v) => setForm({ ...form, user_id: v })} type="number" isRequired />
            <Input label="Title" value={form.title}
              onValueChange={(v) => setForm({ ...form, title: v })} isRequired />
            <Textarea label="Description" value={form.description}
              onValueChange={(v) => setForm({ ...form, description: v })} minRows={2} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Hours recognised" value={form.hours_recognised}
                onValueChange={(v) => setForm({ ...form, hours_recognised: v })} type="number" step="0.5" />
              <Input label="Issued by" value={form.issued_by}
                onValueChange={(v) => setForm({ ...form, issued_by: v })} />
            </div>
            <Input label="Expires at (optional)" type="date" value={form.expires_at}
              onValueChange={(v) => setForm({ ...form, expires_at: v })} />
            <div className="flex items-center justify-between">
              <span className="text-sm">Publicly verifiable</span>
              <Switch isSelected={form.is_publicly_verifiable}
                onValueChange={(v) => setForm({ ...form, is_publicly_verifiable: v })} />
            </div>
            <Button color="primary" startContent={<Send size={16} />}
              onPress={submit} isLoading={submitting}>Issue certificate</Button>
          </CardBody>
        </Card>
        <Card shadow="sm">
          <CardHeader><h3 className="text-lg font-semibold">Recently issued (this session)</h3></CardHeader>
          <CardBody>
            {issued.length === 0 ? (
              <p className="text-sm text-default-400 py-8 text-center">
                No certificates issued in this session yet. Use the form to issue one.
              </p>
            ) : (
              <ul className="space-y-2">
                {issued.map((c) => (
                  <li key={c.id} className="flex items-center justify-between rounded-lg border border-divider p-3 text-sm">
                    <div>
                      <p className="font-medium">{c.title}</p>
                      <p className="text-xs text-default-500">User #{c.user_id} · {c.hours_recognised ?? '—'} hr · code <code>{c.verification_code}</code></p>
                    </div>
                    <Button size="sm" variant="flat" color="danger"
                      onPress={() => { setRevokeTarget({ id: c.id, title: c.title }); setRevokeReason(''); }}>
                      Revoke
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
      <Modal isOpen={!!revokeTarget} onClose={() => setRevokeTarget(null)}>
        <ModalContent>
          <ModalHeader>Revoke "{revokeTarget?.title}"</ModalHeader>
          <ModalBody>
            <Textarea label="Reason" isRequired
              placeholder="Why is this certificate being revoked?"
              value={revokeReason} onValueChange={setRevokeReason} minRows={3} />
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={() => setRevokeTarget(null)}>Cancel</Button>
            <Button color="danger" onPress={revoke}>Revoke</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
