// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/**
 * Module Configuration (Admin) — tenant feature-module on/off toggles.
 *
 * Source: GET /api/v2/admin/enterprise/config/features (returns EnterpriseConfig
 * rows where Category == "features" or Key startsWith "feature.").
 * Toggle writes PATCH /api/v2/admin/enterprise/config/features which
 * funnels through the AdminExplicitParityController persisted-write path
 * (TenantConfig JSON for now; typed EnterpriseConfig wiring is a follow-up).
 *
 * Modules surfaced as the default catalog mirror CLAUDE.md parity status
 * (Marketplace + Caring Community default off until complete, etc).
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button, Card, CardBody, CardHeader, Chip, Spinner, Switch,
  Table, TableBody, TableCell, TableColumn, TableHeader, TableRow,
} from '@heroui/react';
import { RefreshCw, ToggleRight } from 'lucide-react';
import { usePageTitle } from '@/hooks';
import { useToast } from '@/contexts';
import { api } from '@/lib/api';
import { PageHeader } from '../../components';

interface FeatureRow {
  key: string;
  value: string | null;
  description?: string | null;
  updated_at?: string | null;
}

interface ModuleEntry {
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  updated_at?: string | null;
  source: 'server' | 'default';
}

// Default module catalog — describes what we expect tenants to toggle.
// Values are merged with server-side EnterpriseConfig rows; server wins.
const DEFAULT_MODULES: Array<{ key: string; name: string; description: string; defaultOn: boolean }> = [
  { key: 'feature.marketplace', name: 'Marketplace', description: 'Buy/sell listings, orders, Stripe payments. Tracked parity gap; leave off until complete.', defaultOn: false },
  { key: 'feature.caring_community', name: 'Caring Community', description: 'Caregiving, warmth pass, civic digest. Tracked parity gap; leave off until complete.', defaultOn: false },
  { key: 'feature.federation', name: 'Federation', description: 'Cross-tenant timebank federation (CreditCommons + Komunitin).', defaultOn: true },
  { key: 'feature.ai', name: 'AI Assistants', description: 'Multi-provider AI (Ollama/Anthropic/OpenAI/Gemini) + named agents.', defaultOn: true },
  { key: 'feature.voice_messages', name: 'Voice Messages', description: 'Audio messages in conversations with transcription.', defaultOn: true },
  { key: 'feature.passkeys', name: 'Passkeys (WebAuthn)', description: 'Passwordless authentication via FIDO2 credentials.', defaultOn: true },
  { key: 'feature.totp_2fa', name: 'TOTP 2FA', description: 'Time-based one-time password second factor.', defaultOn: true },
  { key: 'feature.donations', name: 'Money Donations', description: 'Stripe Checkout-backed monetary donations.', defaultOn: false },
  { key: 'feature.blog_cms', name: 'Blog & CMS', description: 'Tenant-owned blog posts, categories, static pages.', defaultOn: true },
  { key: 'feature.semantic_search', name: 'Semantic Search', description: 'Meilisearch-backed natural-language search.', defaultOn: false },
];

function asBool(value: string | null | undefined): boolean {
  if (value == null) return false;
  const v = value.toLowerCase().trim();
  return v === 'true' || v === '1' || v === 'on' || v === 'yes' || v === 'enabled';
}

export default function ModuleConfigurationPage() {
  usePageTitle('Admin - Module Configuration');
  const toast = useToast();
  const [serverRows, setServerRows] = useState<FeatureRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<FeatureRow[]>('/v2/admin/enterprise/config/features');
      if (res.success) {
        const payload = (res.data as unknown) as { data?: FeatureRow[] } | FeatureRow[] | null;
        const rows = Array.isArray(payload) ? payload : (payload?.data ?? []);
        setServerRows(rows);
      }
    } catch {
      toast.error('Failed to load module configuration');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const modules: ModuleEntry[] = useMemo(() => {
    const byKey = new Map(serverRows.map((r) => [r.key, r] as const));
    return DEFAULT_MODULES.map((m) => {
      const server = byKey.get(m.key);
      if (server) {
        return {
          key: m.key,
          name: m.name,
          description: m.description,
          enabled: asBool(server.value),
          updated_at: server.updated_at,
          source: 'server' as const,
        };
      }
      return {
        key: m.key,
        name: m.name,
        description: m.description,
        enabled: m.defaultOn,
        source: 'default' as const,
      };
    });
  }, [serverRows]);

  const toggleModule = useCallback(async (entry: ModuleEntry, nextValue: boolean) => {
    // Optimistic update; rollback on failure
    setPendingKey(entry.key);
    const previous = serverRows;
    setServerRows((rows) => {
      const others = rows.filter((r) => r.key !== entry.key);
      return [...others, { key: entry.key, value: String(nextValue), updated_at: new Date().toISOString() }];
    });
    try {
      const res = await api.request('/v2/admin/enterprise/config/features', {
        method: 'PATCH',
        body: { key: entry.key, value: String(nextValue) },
      });
      if (!res.success) {
        throw new Error('Server rejected toggle');
      }
      toast.success(`${entry.name} ${nextValue ? 'enabled' : 'disabled'}`);
    } catch {
      setServerRows(previous);
      toast.error(`Failed to toggle ${entry.name}`);
    } finally {
      setPendingKey(null);
    }
  }, [serverRows, toast]);

  return (
    <div>
      <PageHeader
        title="Module Configuration"
        description="Toggle tenant feature modules on/off. Server-stored values override defaults. Marketplace and Caring Community are tracked parity gaps; leave disabled until complete."
        actions={
          <Button variant="flat" size="sm" startContent={<RefreshCw size={16} />}
            onPress={load} isLoading={loading}>Refresh</Button>
        }
      />
      <Card shadow="sm">
        <CardHeader className="flex items-center gap-2">
          <ToggleRight size={18} className="text-primary" />
          <h3 className="text-lg font-semibold">Feature Modules ({modules.length})</h3>
        </CardHeader>
        <CardBody>
          <Table aria-label="Module configuration" isStriped>
            <TableHeader>
              <TableColumn>Module</TableColumn>
              <TableColumn>Description</TableColumn>
              <TableColumn>Source</TableColumn>
              <TableColumn>Last Modified</TableColumn>
              <TableColumn className="text-right">Enabled</TableColumn>
            </TableHeader>
            <TableBody emptyContent="No modules configured" isLoading={loading} loadingContent={<Spinner />}>
              {modules.map((m) => (
                <TableRow key={m.key}>
                  <TableCell>
                    <p className="font-medium text-sm">{m.name}</p>
                    <code className="text-[10px] text-default-400">{m.key}</code>
                  </TableCell>
                  <TableCell className="text-sm max-w-md">{m.description}</TableCell>
                  <TableCell>
                    <Chip size="sm" variant="flat" color={m.source === 'server' ? 'success' : 'default'}>
                      {m.source === 'server' ? 'tenant' : 'default'}
                    </Chip>
                  </TableCell>
                  <TableCell className="text-xs text-default-500">
                    {m.updated_at ? new Date(m.updated_at).toLocaleString() : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Switch
                      size="sm"
                      isSelected={m.enabled}
                      isDisabled={pendingKey === m.key}
                      onValueChange={(v) => toggleModule(m, v)}
                      aria-label={`Toggle ${m.name}`}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardBody>
      </Card>
    </div>
  );
}
