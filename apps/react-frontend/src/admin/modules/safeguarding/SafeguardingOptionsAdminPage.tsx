// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/**
 * Safeguarding Options (Admin) — replaces lazyParityPage stub.
 *
 * Wires to AdminSafeguardingController:
 *   GET    /api/admin/safeguarding/options
 *   POST   /api/admin/safeguarding/options       (create)
 *   PUT    /api/admin/safeguarding/options/{id}  (update — incl. sort_order, is_active)
 *   DELETE /api/admin/safeguarding/options/{id}  (deactivate)
 *
 * The V1 model treats this as a policy registry: each "option" is a
 * safeguarding policy/severity entry with a sort order. Admins edit
 * label, description, sort order and active flag inline, and can add
 * new policy entries from the create panel.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  Button, Card, CardBody, CardHeader, Chip, Input, Spinner, Switch,
  Table, TableBody, TableCell, TableColumn, TableHeader, TableRow, Textarea,
} from '@heroui/react';
import { Shield, RefreshCw, Plus, Save, Trash2 } from 'lucide-react';
import { usePageTitle } from '@/hooks';
import { useToast } from '@/contexts';
import { api } from '@/lib/api';
import { PageHeader } from '../../components';

interface SafeguardingOption {
  id: number;
  option_key: string;
  option_type: string;
  label: string;
  description: string | null;
  help_url: string | null;
  sort_order: number;
  is_active: boolean;
  is_required: boolean;
}

interface OptionsResponse { data: SafeguardingOption[] }

interface OptionDraft {
  label: string;
  description: string;
  option_key: string;
  sort_order: number;
  is_active: boolean;
  is_required: boolean;
  option_type: string;
}

const EMPTY_DRAFT: OptionDraft = {
  label: '', description: '', option_key: '',
  sort_order: 0, is_active: true, is_required: false, option_type: 'checkbox',
};

export default function SafeguardingOptionsAdminPage() {
  usePageTitle('Admin - Safeguarding Options');
  const toast = useToast();
  const [options, setOptions] = useState<SafeguardingOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<OptionDraft>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);
  const [edits, setEdits] = useState<Record<number, Partial<SafeguardingOption>>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<OptionsResponse>('/v2/admin/safeguarding/options');
      if (res.success && res.data) {
        const payload = (res.data as unknown) as OptionsResponse;
        setOptions(payload.data ?? []);
        setEdits({});
      }
    } catch { toast.error('Failed to load safeguarding options'); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const create = useCallback(async () => {
    if (!draft.label.trim()) { toast.error('Label is required'); return; }
    setSaving(true);
    try {
      const res = await api.post('/v2/admin/safeguarding/options', draft);
      if (res.success) {
        toast.success('Option created');
        setDraft(EMPTY_DRAFT);
        load();
      } else { toast.error('Create failed'); }
    } catch { toast.error('Create failed'); }
    finally { setSaving(false); }
  }, [draft, load, toast]);

  const stage = (id: number, patch: Partial<SafeguardingOption>) =>
    setEdits((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  const saveRow = useCallback(async (opt: SafeguardingOption) => {
    const patch = edits[opt.id] ?? {};
    if (Object.keys(patch).length === 0) return;
    const merged = { ...opt, ...patch };
    try {
      const res = await api.put(`/v2/admin/safeguarding/options/${opt.id}`, {
        label: merged.label,
        description: merged.description,
        option_key: merged.option_key,
        option_type: merged.option_type,
        sort_order: merged.sort_order,
        is_active: merged.is_active,
        is_required: merged.is_required,
        help_url: merged.help_url,
      });
      if (res.success) { toast.success('Saved'); load(); }
      else toast.error('Save failed');
    } catch { toast.error('Save failed'); }
  }, [edits, load, toast]);

  const deactivate = useCallback(async (id: number) => {
    try {
      const res = await api.delete(`/v2/admin/safeguarding/options/${id}`);
      if (res.success) { toast.success('Deactivated'); load(); }
      else toast.error('Deactivate failed');
    } catch { toast.error('Deactivate failed'); }
  }, [load, toast]);

  const val = <K extends keyof SafeguardingOption>(opt: SafeguardingOption, key: K): SafeguardingOption[K] =>
    (edits[opt.id]?.[key] ?? opt[key]) as SafeguardingOption[K];

  return (
    <div>
      <PageHeader
        title="Safeguarding Options"
        description="Policy registry: severity tiers, SLA hours, escalation labels. Each option is a checkbox/preference shown to members during onboarding or in their privacy settings."
        actions={
          <Button variant="flat" size="sm" startContent={<RefreshCw size={16} />}
            onPress={load} isLoading={loading}>Refresh</Button>
        }
      />

      <Card shadow="sm" className="mb-4">
        <CardHeader className="flex items-center gap-2">
          <Plus size={18} className="text-primary" />
          <h3 className="text-lg font-semibold">Add new option</h3>
        </CardHeader>
        <CardBody className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Input label="Label" value={draft.label} onValueChange={(v) => setDraft({ ...draft, label: v })} variant="bordered" size="sm" />
          <Input label="Option key (slug)" placeholder="auto from label" value={draft.option_key} onValueChange={(v) => setDraft({ ...draft, option_key: v })} variant="bordered" size="sm" />
          <Textarea label="Description" value={draft.description} onValueChange={(v) => setDraft({ ...draft, description: v })} variant="bordered" size="sm" minRows={2} />
          <Input label="Sort order" type="number" value={String(draft.sort_order)} onValueChange={(v) => setDraft({ ...draft, sort_order: Number(v) || 0 })} variant="bordered" size="sm" />
          <div className="flex items-center gap-4">
            <Switch isSelected={draft.is_active} onValueChange={(v) => setDraft({ ...draft, is_active: v })}>Active</Switch>
            <Switch isSelected={draft.is_required} onValueChange={(v) => setDraft({ ...draft, is_required: v })}>Required</Switch>
          </div>
          <div className="md:col-span-2 flex justify-end">
            <Button color="primary" startContent={<Save size={16} />} onPress={create} isLoading={saving}>Create</Button>
          </div>
        </CardBody>
      </Card>

      <Card shadow="sm">
        <CardHeader className="flex items-center gap-2">
          <Shield size={18} className="text-primary" />
          <h3 className="text-lg font-semibold">Existing options</h3>
        </CardHeader>
        <CardBody>
          {loading ? <Spinner /> : (
            <Table aria-label="Safeguarding options" removeWrapper>
              <TableHeader>
                <TableColumn>Key</TableColumn>
                <TableColumn>Label</TableColumn>
                <TableColumn>Sort</TableColumn>
                <TableColumn>Active</TableColumn>
                <TableColumn>Required</TableColumn>
                <TableColumn>Actions</TableColumn>
              </TableHeader>
              <TableBody emptyContent="No options yet — add one above.">
                {options.map((opt) => (
                  <TableRow key={opt.id}>
                    <TableCell><code className="text-xs">{opt.option_key}</code></TableCell>
                    <TableCell>
                      <Input size="sm" variant="bordered" value={String(val(opt, 'label') ?? '')}
                        onValueChange={(v) => stage(opt.id, { label: v })} />
                    </TableCell>
                    <TableCell>
                      <Input size="sm" variant="bordered" type="number" value={String(val(opt, 'sort_order') ?? 0)}
                        onValueChange={(v) => stage(opt.id, { sort_order: Number(v) || 0 })} className="w-20" />
                    </TableCell>
                    <TableCell>
                      <Switch size="sm" isSelected={Boolean(val(opt, 'is_active'))}
                        onValueChange={(v) => stage(opt.id, { is_active: v })} />
                    </TableCell>
                    <TableCell>
                      <Switch size="sm" isSelected={Boolean(val(opt, 'is_required'))}
                        onValueChange={(v) => stage(opt.id, { is_required: v })} />
                    </TableCell>
                    <TableCell className="space-x-2">
                      <Button size="sm" color="primary" variant="flat" startContent={<Save size={14} />}
                        isDisabled={!edits[opt.id]} onPress={() => saveRow(opt)}>Save</Button>
                      <Button size="sm" color="danger" variant="flat" startContent={<Trash2 size={14} />}
                        onPress={() => deactivate(opt.id)}>Deactivate</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <div className="mt-3 text-xs text-default-500">
            {options.length} option{options.length === 1 ? '' : 's'} · {options.filter((o) => o.is_active).length} active
            <Chip size="sm" variant="flat" color="default" className="ml-2">policy registry</Chip>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
