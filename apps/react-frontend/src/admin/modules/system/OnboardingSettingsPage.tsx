// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/**
 * Onboarding Settings (Admin) — replaces lazyParityPage stub.
 *
 * Wires to OnboardingController (Phase 53):
 *   GET    /api/onboarding/steps                — list all steps
 *   POST   /api/onboarding/admin/steps          — create step
 *   PUT    /api/onboarding/admin/steps/{id}     — update step (title, sort_order, etc.)
 *   DELETE /api/onboarding/admin/steps/{id}     — delete step
 *
 * Reorder uses up/down arrows that adjust sort_order then PUT.
 *
 * Required-profile-field toggles + welcome email template selector are
 * stored client-side as TenantConfig keys via /api/admin/config (existing
 * admin tenant config endpoint).
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button, Card, CardBody, CardHeader, Chip, Input, Modal, ModalBody,
  ModalContent, ModalFooter, ModalHeader, Select, SelectItem, Spinner,
  Switch, Textarea,
} from '@heroui/react';
import { ListChecks, RefreshCw, Plus, Save, Trash2, ArrowUp, ArrowDown, Eye } from 'lucide-react';
import { usePageTitle } from '@/hooks';
import { useToast } from '@/contexts';
import { api } from '@/lib/api';
import { PageHeader } from '../../components';

interface OnboardingStep {
  id: number;
  key: string;
  title: string;
  description: string | null;
  sort_order: number;
  is_required: boolean;
  xp_reward: number;
  is_enabled?: boolean;
}

interface StepsResponse { data: OnboardingStep[] }

interface EmailTemplate { id: number; name: string; subject: string }
interface EmailTemplatesResponse { data: EmailTemplate[] }

const PROFILE_FIELDS = [
  { key: 'name', label: 'Display name' },
  { key: 'email', label: 'Email' },
  { key: 'location', label: 'Location' },
  { key: 'bio', label: 'Bio' },
  { key: 'skills', label: 'Skills / categories' },
];

export default function OnboardingSettingsPage() {
  usePageTitle('Admin - Onboarding Settings');
  const toast = useToast();
  const [steps, setSteps] = useState<OnboardingStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [requiredFields, setRequiredFields] = useState<Record<string, boolean>>({
    name: true, email: true, location: false, bio: false, skills: false,
  });
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [welcomeTemplateId, setWelcomeTemplateId] = useState<string>('');

  const [draft, setDraft] = useState({ key: '', title: '', description: '', sort_order: 0, is_required: false, xp_reward: 0 });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [stepsRes, tplRes] = await Promise.all([
        api.get<StepsResponse>('/v2/onboarding/steps'),
        api.get<EmailTemplatesResponse>('/v2/admin/email-templates/v2'),
      ]);
      if (stepsRes.success && stepsRes.data) {
        const payload = (stepsRes.data as unknown) as StepsResponse;
        setSteps((payload.data ?? []).slice().sort((a, b) => a.sort_order - b.sort_order));
      }
      if (tplRes.success && tplRes.data) {
        const payload = (tplRes.data as unknown) as EmailTemplatesResponse;
        setTemplates(payload.data ?? []);
      }
    } catch { toast.error('Failed to load onboarding configuration'); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const sortedSteps = useMemo(() => steps.slice().sort((a, b) => a.sort_order - b.sort_order), [steps]);

  const createStep = useCallback(async () => {
    if (!draft.key.trim() || !draft.title.trim()) { toast.error('Key and title are required'); return; }
    try {
      const res = await api.post('/v2/onboarding/admin/steps', { ...draft, sort_order: steps.length });
      if (res.success) {
        toast.success('Step created');
        setShowCreate(false);
        setDraft({ key: '', title: '', description: '', sort_order: 0, is_required: false, xp_reward: 0 });
        load();
      } else toast.error('Create failed');
    } catch { toast.error('Create failed'); }
  }, [draft, steps.length, load, toast]);

  const updateStep = useCallback(async (step: OnboardingStep, patch: Partial<OnboardingStep>) => {
    try {
      const res = await api.put(`/v2/onboarding/admin/steps/${step.id}`, { ...step, ...patch });
      if (res.success) { setSteps((prev) => prev.map((s) => (s.id === step.id ? { ...s, ...patch } : s))); }
      else toast.error('Update failed');
    } catch { toast.error('Update failed'); }
  }, [toast]);

  const deleteStep = useCallback(async (id: number) => {
    try {
      const res = await api.delete(`/v2/onboarding/admin/steps/${id}`);
      if (res.success) { toast.success('Step deleted'); load(); }
      else toast.error('Delete failed');
    } catch { toast.error('Delete failed'); }
  }, [load, toast]);

  const move = useCallback(async (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= sortedSteps.length) return;
    const a = sortedSteps[idx];
    const b = sortedSteps[target];
    await Promise.all([
      updateStep(a, { sort_order: b.sort_order }),
      updateStep(b, { sort_order: a.sort_order }),
    ]);
    load();
  }, [sortedSteps, updateStep, load]);

  const saveTenantConfig = useCallback(async () => {
    try {
      const res = await api.put('/v2/admin/config', {
        'onboarding.required_fields': JSON.stringify(requiredFields),
        'onboarding.welcome_template_id': welcomeTemplateId,
      });
      if (res.success) toast.success('Settings saved');
      else toast.error('Save failed');
    } catch { toast.error('Save failed'); }
  }, [requiredFields, welcomeTemplateId, toast]);

  return (
    <div>
      <PageHeader
        title="Onboarding Settings"
        description="New-member onboarding flow: ordered steps, XP rewards, required profile fields, welcome email."
        actions={
          <div className="flex gap-2">
            <Button variant="flat" size="sm" startContent={<Eye size={16} />} onPress={() => setShowPreview(true)}>Preview</Button>
            <Button variant="flat" size="sm" startContent={<RefreshCw size={16} />} onPress={load} isLoading={loading}>Refresh</Button>
          </div>
        }
      />

      <Card shadow="sm" className="mb-4">
        <CardHeader className="flex items-center justify-between">
          <div className="flex items-center gap-2"><ListChecks size={18} className="text-primary" /><h3 className="text-lg font-semibold">Onboarding steps</h3></div>
          <Button size="sm" color="primary" startContent={<Plus size={14} />} onPress={() => setShowCreate(true)}>Add step</Button>
        </CardHeader>
        <CardBody>
          {loading ? <Spinner /> : sortedSteps.length === 0 ? (
            <p className="text-sm text-default-500">No onboarding steps configured. Add one above.</p>
          ) : (
            <ul className="space-y-2">
              {sortedSteps.map((step, idx) => (
                <li key={step.id} className="rounded-lg border border-divider p-3">
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col">
                      <Button isIconOnly size="sm" variant="light" isDisabled={idx === 0} onPress={() => move(idx, -1)}><ArrowUp size={14} /></Button>
                      <Button isIconOnly size="sm" variant="light" isDisabled={idx === sortedSteps.length - 1} onPress={() => move(idx, 1)}><ArrowDown size={14} /></Button>
                    </div>
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2">
                      <Input size="sm" variant="bordered" label="Title" value={step.title}
                        onValueChange={(v) => setSteps((p) => p.map((s) => s.id === step.id ? { ...s, title: v } : s))}
                        onBlur={() => updateStep(step, { title: step.title })} />
                      <Input size="sm" variant="bordered" label="XP reward" type="number" value={String(step.xp_reward)}
                        onValueChange={(v) => setSteps((p) => p.map((s) => s.id === step.id ? { ...s, xp_reward: Number(v) || 0 } : s))}
                        onBlur={() => updateStep(step, { xp_reward: step.xp_reward })} />
                      <Textarea size="sm" variant="bordered" label="Description" value={step.description ?? ''}
                        onValueChange={(v) => setSteps((p) => p.map((s) => s.id === step.id ? { ...s, description: v } : s))}
                        onBlur={() => updateStep(step, { description: step.description })}
                        minRows={1} className="md:col-span-2" />
                      <div className="flex items-center gap-4 md:col-span-2">
                        <Switch size="sm" isSelected={step.is_required}
                          onValueChange={(v) => { setSteps((p) => p.map((s) => s.id === step.id ? { ...s, is_required: v } : s)); updateStep(step, { is_required: v }); }}>Required</Switch>
                        <Chip size="sm" variant="flat"><code className="text-xs">{step.key}</code></Chip>
                        <div className="flex-1" />
                        <Button isIconOnly size="sm" variant="light" color="danger" onPress={() => deleteStep(step.id)}><Trash2 size={14} /></Button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card shadow="sm">
          <CardHeader><h3 className="text-lg font-semibold">Required profile fields</h3></CardHeader>
          <CardBody className="space-y-2">
            {PROFILE_FIELDS.map((f) => (
              <div key={f.key} className="flex items-center justify-between">
                <span className="text-sm">{f.label}</span>
                <Switch size="sm" isSelected={Boolean(requiredFields[f.key])}
                  onValueChange={(v) => setRequiredFields((p) => ({ ...p, [f.key]: v }))} />
              </div>
            ))}
          </CardBody>
        </Card>
        <Card shadow="sm">
          <CardHeader><h3 className="text-lg font-semibold">Welcome email</h3></CardHeader>
          <CardBody className="space-y-3">
            <Select label="Template" size="sm" variant="bordered"
              selectedKeys={welcomeTemplateId ? new Set([welcomeTemplateId]) : new Set()}
              onSelectionChange={(keys) => setWelcomeTemplateId(Array.from(keys)[0] as string ?? '')}>
              {(templates.map((t) => (
                <SelectItem key={String(t.id)} textValue={t.name}>{t.name}</SelectItem>
              )) as never)}
            </Select>
            <p className="text-xs text-default-500">Sent on first login after registration.</p>
          </CardBody>
        </Card>
      </div>

      <div className="mt-4 flex justify-end">
        <Button color="primary" startContent={<Save size={16} />} onPress={saveTenantConfig}>Save settings</Button>
      </div>

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)}>
        <ModalContent>
          <ModalHeader>Add onboarding step</ModalHeader>
          <ModalBody className="space-y-3">
            <Input label="Key (slug)" value={draft.key} onValueChange={(v) => setDraft({ ...draft, key: v })} variant="bordered" size="sm" />
            <Input label="Title" value={draft.title} onValueChange={(v) => setDraft({ ...draft, title: v })} variant="bordered" size="sm" />
            <Textarea label="Description" value={draft.description} onValueChange={(v) => setDraft({ ...draft, description: v })} variant="bordered" size="sm" />
            <Input label="XP reward" type="number" value={String(draft.xp_reward)} onValueChange={(v) => setDraft({ ...draft, xp_reward: Number(v) || 0 })} variant="bordered" size="sm" />
            <Switch isSelected={draft.is_required} onValueChange={(v) => setDraft({ ...draft, is_required: v })}>Required</Switch>
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={() => setShowCreate(false)}>Cancel</Button>
            <Button color="primary" onPress={createStep}>Create</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={showPreview} onClose={() => setShowPreview(false)} size="2xl">
        <ModalContent>
          <ModalHeader>Member preview</ModalHeader>
          <ModalBody>
            <p className="text-sm text-default-500 mb-3">What a new member will see (in order):</p>
            <ol className="list-decimal pl-6 space-y-2">
              {sortedSteps.map((s) => (
                <li key={s.id}>
                  <strong>{s.title}</strong>
                  {s.is_required && <Chip size="sm" color="warning" variant="flat" className="ml-2">required</Chip>}
                  {s.xp_reward > 0 && <Chip size="sm" color="success" variant="flat" className="ml-2">+{s.xp_reward} XP</Chip>}
                  {s.description && <p className="text-xs text-default-500 mt-1">{s.description}</p>}
                </li>
              ))}
            </ol>
          </ModalBody>
          <ModalFooter><Button onPress={() => setShowPreview(false)}>Close</Button></ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
