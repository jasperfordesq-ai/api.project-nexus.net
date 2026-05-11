// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/**
 * Translation Config (Admin) — replaces lazyParityPage stub.
 *
 * Wires to AdminTranslationsController:
 *   GET    /api/admin/translations?locale=&ns=&search=&page=&limit=
 *   POST   /api/admin/translations         (upsert single key)
 *   POST   /api/admin/translations/bulk    (bulk import, up to 1000)
 *   GET    /api/admin/translations/stats   (locale list + coverage)
 *   GET    /api/admin/translations/missing?locale=
 *
 * V2 ships seeded language packs for en, ga, fr, es, de, pl, pt (~40 keys
 * each, per CLAUDE.md). This page lets admins filter, search, inline-edit
 * translations, and add new keys via a modal.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button, Card, CardBody, CardHeader, Chip, Input, Modal, ModalBody,
  ModalContent, ModalFooter, ModalHeader, Select, SelectItem, Spinner,
  Table, TableBody, TableCell, TableColumn, TableHeader, TableRow,
} from '@heroui/react';
import { Languages, RefreshCw, Plus, Save, Search } from 'lucide-react';
import { usePageTitle } from '@/hooks';
import { useToast } from '@/contexts';
import { api } from '@/lib/api';
import { PageHeader } from '../../components';

interface Translation {
  id: number;
  locale: string;
  key: string;
  value: string;
  namespace: string;
  is_approved: boolean;
}

interface TranslationsResponse {
  locale: string;
  data: Translation[];
  total: number;
}

interface StatsResponse {
  data: {
    total_translations: number;
    supported_locales: Array<{ id: number; locale: string; name: string; is_default: boolean }>;
    coverage: Array<{ locale: string; count: number }>;
  };
}

const FALLBACK_LOCALES = ['en', 'ga', 'fr', 'es', 'de', 'pl', 'pt'];

export default function TranslationConfigPage() {
  usePageTitle('Admin - Translations');
  const toast = useToast();

  const [locales, setLocales] = useState<Array<{ locale: string; name: string }>>([]);
  const [coverage, setCoverage] = useState<Record<string, number>>({});
  const [locale, setLocale] = useState<string>('en');
  const [ns, setNs] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [rows, setRows] = useState<Translation[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [edits, setEdits] = useState<Record<number, string>>({});
  const [showAdd, setShowAdd] = useState(false);
  const [draftKey, setDraftKey] = useState('');
  const [draftNs, setDraftNs] = useState('common');
  const [draftValues, setDraftValues] = useState<Record<string, string>>({});

  const loadStats = useCallback(async () => {
    try {
      const res = await api.get<StatsResponse>('/v2/admin/translations/stats');
      if (res.success && res.data) {
        const payload = (res.data as unknown) as StatsResponse;
        const locs = payload.data.supported_locales;
        setLocales(locs.length > 0 ? locs.map((l) => ({ locale: l.locale, name: l.name })) : FALLBACK_LOCALES.map((l) => ({ locale: l, name: l.toUpperCase() })));
        setCoverage(Object.fromEntries(payload.data.coverage.map((c) => [c.locale, c.count])));
      } else {
        setLocales(FALLBACK_LOCALES.map((l) => ({ locale: l, name: l.toUpperCase() })));
      }
    } catch {
      setLocales(FALLBACK_LOCALES.map((l) => ({ locale: l, name: l.toUpperCase() })));
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ locale });
      if (ns) qs.append('ns', ns);
      if (search) qs.append('search', search);
      qs.append('limit', '500');
      const res = await api.get<TranslationsResponse>(`/v2/admin/translations?${qs.toString()}`);
      if (res.success && res.data) {
        const payload = (res.data as unknown) as TranslationsResponse;
        setRows(payload.data ?? []);
        setTotal(payload.total ?? 0);
        setEdits({});
      }
    } catch { toast.error('Failed to load translations'); }
    finally { setLoading(false); }
  }, [locale, ns, search, toast]);

  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { load(); }, [load]);

  const namespaces = useMemo(() => {
    const set = new Set(rows.map((r) => r.namespace));
    return Array.from(set).sort();
  }, [rows]);

  const saveRow = useCallback(async (row: Translation) => {
    const newValue = edits[row.id];
    if (newValue == null || newValue === row.value) return;
    try {
      const res = await api.post('/v2/admin/translations', {
        locale: row.locale, key: row.key, value: newValue, namespace: row.namespace,
      });
      if (res.success) {
        toast.success('Saved');
        setRows((prev) => prev.map((r) => r.id === row.id ? { ...r, value: newValue } : r));
        setEdits((prev) => { const { [row.id]: _, ...rest } = prev; return rest; });
      } else toast.error('Save failed');
    } catch { toast.error('Save failed'); }
  }, [edits, toast]);

  const addKey = useCallback(async () => {
    if (!draftKey.trim()) { toast.error('Key is required'); return; }
    const entries = Object.entries(draftValues).filter(([, v]) => v.trim());
    if (entries.length === 0) { toast.error('At least one translation is required'); return; }
    try {
      let ok = 0;
      for (const [loc, value] of entries) {
        const res = await api.post('/v2/admin/translations', { locale: loc, key: draftKey.trim(), value: value.trim(), namespace: draftNs.trim() || 'common' });
        if (res.success) ok++;
      }
      toast.success(`Added ${ok} translation${ok === 1 ? '' : 's'}`);
      setShowAdd(false);
      setDraftKey(''); setDraftNs('common'); setDraftValues({});
      load();
    } catch { toast.error('Add failed'); }
  }, [draftKey, draftNs, draftValues, load, toast]);

  return (
    <div>
      <PageHeader
        title="Translation Config"
        description={`i18n key management across ${locales.length} languages. Inline-edit values; bulk import via Admin API.`}
        actions={
          <div className="flex gap-2">
            <Button size="sm" color="primary" startContent={<Plus size={14} />} onPress={() => setShowAdd(true)}>Add key</Button>
            <Button variant="flat" size="sm" startContent={<RefreshCw size={16} />} onPress={load} isLoading={loading}>Refresh</Button>
          </div>
        }
      />

      <Card shadow="sm" className="mb-4">
        <CardBody className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <Select label="Language" size="sm" variant="bordered"
            selectedKeys={new Set([locale])}
            onSelectionChange={(keys) => setLocale(Array.from(keys)[0] as string ?? 'en')}>
            {(locales.map((l) => (
              <SelectItem key={l.locale} textValue={`${l.locale} (${coverage[l.locale] ?? 0})`}>
                {l.locale} — {l.name} ({coverage[l.locale] ?? 0})
              </SelectItem>
            )) as never)}
          </Select>
          <Select label="Namespace" size="sm" variant="bordered"
            selectedKeys={ns ? new Set([ns]) : new Set(['__all__'])}
            onSelectionChange={(keys) => { const v = Array.from(keys)[0] as string; setNs(v === '__all__' ? '' : v); }}>
            <SelectItem key="__all__" textValue="(all)">(all namespaces)</SelectItem>
            {(namespaces.map((n) => (
              <SelectItem key={n} textValue={n}>{n}</SelectItem>
            )) as never)}
          </Select>
          <Input label="Search key or value" size="sm" variant="bordered" value={search}
            onValueChange={setSearch} startContent={<Search size={14} />} />
          <div className="flex items-end">
            <Chip size="sm" variant="flat" color="default">{total} key{total === 1 ? '' : 's'}</Chip>
          </div>
        </CardBody>
      </Card>

      <Card shadow="sm">
        <CardHeader className="flex items-center gap-2">
          <Languages size={18} className="text-primary" />
          <h3 className="text-lg font-semibold">Translations — {locale}</h3>
        </CardHeader>
        <CardBody>
          {loading ? <Spinner /> : (
            <Table aria-label="Translations" removeWrapper>
              <TableHeader>
                <TableColumn>Namespace</TableColumn>
                <TableColumn>Key</TableColumn>
                <TableColumn>Value</TableColumn>
                <TableColumn>Status</TableColumn>
                <TableColumn>Actions</TableColumn>
              </TableHeader>
              <TableBody emptyContent="No translations match the current filter.">
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell><code className="text-xs">{row.namespace}</code></TableCell>
                    <TableCell><code className="text-xs">{row.key}</code></TableCell>
                    <TableCell>
                      <Input size="sm" variant="bordered" value={edits[row.id] ?? row.value}
                        onValueChange={(v) => setEdits((p) => ({ ...p, [row.id]: v }))} />
                    </TableCell>
                    <TableCell>
                      {row.is_approved ? <Chip size="sm" color="success" variant="flat">approved</Chip>
                        : <Chip size="sm" color="warning" variant="flat">needs review</Chip>}
                    </TableCell>
                    <TableCell>
                      <Button size="sm" color="primary" variant="flat" startContent={<Save size={14} />}
                        isDisabled={edits[row.id] == null || edits[row.id] === row.value}
                        onPress={() => saveRow(row)}>Save</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardBody>
      </Card>

      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} size="2xl">
        <ModalContent>
          <ModalHeader>Add translation key</ModalHeader>
          <ModalBody className="space-y-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Input label="Key" placeholder="e.g. auth.login.button" value={draftKey} onValueChange={setDraftKey} variant="bordered" size="sm" />
              <Input label="Namespace" value={draftNs} onValueChange={setDraftNs} variant="bordered" size="sm" />
            </div>
            <p className="text-xs text-default-500">Fill in any language — empty values will be skipped.</p>
            {locales.map((l) => (
              <Input key={l.locale} size="sm" variant="bordered"
                label={`${l.locale} — ${l.name}`}
                value={draftValues[l.locale] ?? ''}
                onValueChange={(v) => setDraftValues((p) => ({ ...p, [l.locale]: v }))} />
            ))}
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={() => setShowAdd(false)}>Cancel</Button>
            <Button color="primary" onPress={addKey}>Add</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
