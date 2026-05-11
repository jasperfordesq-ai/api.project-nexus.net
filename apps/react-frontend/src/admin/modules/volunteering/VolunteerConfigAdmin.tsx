// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/**
 * Volunteer Tenant Policy (Admin) — singleton config per tenant.
 * Wired to GET/PUT /api/admin/volunteer/policy (VolunteerAdminController).
 */

import { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Input,
  Spinner,
  Switch,
} from '@heroui/react';
import { Settings, Save, RefreshCw } from 'lucide-react';
import { usePageTitle } from '@/hooks';
import { useToast } from '@/contexts';
import { api } from '@/lib/api';
import { PageHeader } from '../../components';

interface Policy {
  id: number;
  tenant_id: number;
  min_age: number;
  hours_required_for_certificate: number;
  certificate_template_id: number | null;
  require_guardian_consent_under: number;
  auto_approve_verified_adults: boolean;
  updated_at: string;
}

interface PolicyForm {
  min_age: string;
  hours_required_for_certificate: string;
  certificate_template_id: string;
  require_guardian_consent_under: string;
  auto_approve_verified_adults: boolean;
}

function policyToForm(p: Policy): PolicyForm {
  return {
    min_age: String(p.min_age),
    hours_required_for_certificate: String(p.hours_required_for_certificate),
    certificate_template_id: p.certificate_template_id != null ? String(p.certificate_template_id) : '',
    require_guardian_consent_under: String(p.require_guardian_consent_under),
    auto_approve_verified_adults: p.auto_approve_verified_adults,
  };
}

export default function VolunteerConfigAdmin() {
  usePageTitle('Admin - Volunteer Policy');
  const toast = useToast();

  const [policy, setPolicy] = useState<Policy | null>(null);
  const [form, setForm] = useState<PolicyForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ data: Policy }>('/v2/admin/volunteer/policy');
      if (res.success && res.data) {
        const payload = (res.data as unknown) as { data?: Policy };
        if (payload.data) {
          setPolicy(payload.data);
          setForm(policyToForm(payload.data));
        }
      }
    } catch {
      toast.error('Failed to load policy');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const save = useCallback(async () => {
    if (!form) return;
    setSaving(true);
    try {
      const body = {
        min_age: parseInt(form.min_age, 10) || 0,
        hours_required_for_certificate: parseFloat(form.hours_required_for_certificate) || 0,
        certificate_template_id: form.certificate_template_id
          ? parseInt(form.certificate_template_id, 10) || null
          : null,
        require_guardian_consent_under: parseInt(form.require_guardian_consent_under, 10) || 0,
        auto_approve_verified_adults: form.auto_approve_verified_adults,
      };
      const res = await api.put<{ data: Policy }>('/v2/admin/volunteer/policy', body);
      if (res.success && res.data) {
        toast.success('Policy saved');
        const payload = (res.data as unknown) as { data?: Policy };
        if (payload.data) {
          setPolicy(payload.data);
          setForm(policyToForm(payload.data));
        }
      } else {
        toast.error('Save failed');
      }
    } catch {
      toast.error('Save failed');
    } finally {
      setSaving(false);
    }
  }, [form, toast]);

  return (
    <div>
      <PageHeader
        title="Volunteer Policy"
        description="Tenant-wide volunteer rules: minimum age, guardian consent threshold, certificate template."
        actions={
          <Button
            variant="flat"
            size="sm"
            startContent={<RefreshCw size={16} />}
            onPress={load}
            isLoading={loading}
          >
            Refresh
          </Button>
        }
      />

      <Card shadow="sm">
        <CardHeader className="flex items-center gap-2">
          <Settings size={18} className="text-primary" />
          <h3 className="text-lg font-semibold">Volunteering rules</h3>
        </CardHeader>
        <CardBody>
          {loading || !form ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : (
            <div className="flex flex-col gap-4 max-w-xl">
              <Input
                type="number"
                label="Minimum age to volunteer"
                description="Volunteers younger than this cannot sign up at all."
                value={form.min_age}
                onValueChange={(v) => setForm({ ...form, min_age: v })}
              />
              <Input
                type="number"
                step="0.5"
                label="Hours required for certificate"
                description="Total hours volunteered before an auto-issued certificate becomes available."
                value={form.hours_required_for_certificate}
                onValueChange={(v) => setForm({ ...form, hours_required_for_certificate: v })}
              />
              <Input
                type="number"
                label="Certificate template ID"
                description="Optional template ID used when auto-generating certificates. Leave blank to use the default."
                value={form.certificate_template_id}
                onValueChange={(v) => setForm({ ...form, certificate_template_id: v })}
              />
              <Input
                type="number"
                label="Require guardian consent under (age)"
                description="Volunteers younger than this need an approved guardian consent record."
                value={form.require_guardian_consent_under}
                onValueChange={(v) => setForm({ ...form, require_guardian_consent_under: v })}
              />
              <Switch
                isSelected={form.auto_approve_verified_adults}
                onValueChange={(v) => setForm({ ...form, auto_approve_verified_adults: v })}
              >
                Auto-approve ID-verified adults
              </Switch>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  color="primary"
                  isLoading={saving}
                  startContent={<Save size={16} />}
                  onPress={save}
                >
                  Save policy
                </Button>
              </div>

              {policy && (
                <p className="text-default-500 text-xs">
                  Last updated: {new Date(policy.updated_at).toLocaleString()}
                </p>
              )}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
