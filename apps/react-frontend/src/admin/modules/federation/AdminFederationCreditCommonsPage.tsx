// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/**
 * CreditCommons Config (Admin) — protocol-level configuration for the
 * CreditCommons federation client (`Services/Federation/CreditCommonsClient`).
 *
 * Wires to:
 *   GET   /api/v2/admin/federation/cc-config     (AdminExplicitParityController)
 *   PUT   /api/v2/admin/federation/cc-config     (AdminExplicitParityController)
 *   POST  /api/admin/federation/protocols/partners/{id}/ping/credit-commons
 *          (AdminFederationProtocolsController)
 *   POST  /api/admin/federation/protocols/reconcile
 *          (manual sync trigger — see AdminFederationProtocolsController)
 *
 * Per-partner endpoint + API key are resolved server-side from
 * TenantConfig keys `federation.partner.{id}.endpoint` and
 * `federation.partner.{id}.api_key` (see Phase 68 wiring).
 */

import { useCallback, useEffect, useState } from 'react';
import {
  Button, Card, CardBody, CardHeader, Chip, Input, Spinner, Switch, Table,
  TableBody, TableCell, TableColumn, TableHeader, TableRow,
} from '@heroui/react';
import {
  Activity, Eye, EyeOff, Network, Plug, RefreshCw, Save, Zap,
} from 'lucide-react';
import { usePageTitle } from '@/hooks';
import { useToast } from '@/contexts';
import { api } from '@/lib/api';
import { PageHeader } from '../../components';

interface CcConfig {
  endpoint?: string;
  api_key?: string;
  refresh_interval_seconds?: number;
  max_retries?: number;
  enabled?: boolean;
  last_sync_at?: string;
  last_sync_status?: string;
  partner_id?: number;
}

interface AuditRow {
  id: number;
  action?: string;
  status?: string;
  occurred_at?: string;
  created_at?: string;
  details?: string;
}

export default function AdminFederationCreditCommonsPage() {
  usePageTitle('Admin - CreditCommons Config');
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pinging, setPinging] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [showKey, setShowKey] = useState(false);

  const [endpoint, setEndpoint] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [refreshInterval, setRefreshInterval] = useState('300');
  const [maxRetries, setMaxRetries] = useState('5');
  const [enabled, setEnabled] = useState(true);
  const [partnerId, setPartnerId] = useState('');
  const [lastSync, setLastSync] = useState<{ at?: string; status?: string }>({});

  const [audit, setAudit] = useState<AuditRow[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<CcConfig>('/v2/admin/federation/cc-config');
      const cfg = (res.data ?? {}) as CcConfig & { data?: CcConfig };
      const c = (cfg.data ?? cfg) as CcConfig;
      setEndpoint(c.endpoint ?? '');
      setApiKey(c.api_key ?? '');
      setRefreshInterval(String(c.refresh_interval_seconds ?? 300));
      setMaxRetries(String(c.max_retries ?? 5));
      setEnabled(c.enabled ?? true);
      setPartnerId(c.partner_id != null ? String(c.partner_id) : '');
      setLastSync({ at: c.last_sync_at, status: c.last_sync_status });

      // Pull recent federation audit entries for context (best-effort).
      try {
        const auditRes = await api.get<{ data: AuditRow[] }>('/v2/admin/federation/audit-log?limit=20');
        const payload = auditRes.data as unknown as { data?: AuditRow[] } | AuditRow[];
        const rows = Array.isArray(payload) ? payload : (payload?.data ?? []);
        setAudit(rows.slice(0, 20));
      } catch { /* audit endpoint may not exist on every deploy */ }
    } catch { toast.error('Failed to load CreditCommons config'); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const save = useCallback(async () => {
    setSaving(true);
    try {
      const res = await api.put('/v2/admin/federation/cc-config', {
        endpoint,
        api_key: apiKey,
        refresh_interval_seconds: parseInt(refreshInterval, 10) || 300,
        max_retries: parseInt(maxRetries, 10) || 5,
        enabled,
        partner_id: partnerId ? parseInt(partnerId, 10) : null,
      });
      if (res.success) toast.success('Config saved');
      else toast.error('Save failed');
    } catch { toast.error('Save failed'); }
    finally { setSaving(false); }
  }, [endpoint, apiKey, refreshInterval, maxRetries, enabled, partnerId, toast]);

  const testConnection = useCallback(async () => {
    if (!partnerId) { toast.error('Set a partner id first'); return; }
    setPinging(true);
    try {
      const res = await api.post(`/admin/federation/protocols/partners/${partnerId}/ping/credit-commons`, {});
      if (res.success) toast.success('Ping OK');
      else toast.error('Ping failed');
    } catch { toast.error('Ping failed'); }
    finally { setPinging(false); }
  }, [partnerId, toast]);

  const forceSync = useCallback(async () => {
    setSyncing(true);
    try {
      const res = await api.post('/admin/federation/protocols/reconcile', {});
      if (res.success) { toast.success('Reconciliation triggered'); await load(); }
      else toast.error('Reconcile failed');
    } catch { toast.error('Reconcile failed'); }
    finally { setSyncing(false); }
  }, [load, toast]);

  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;

  return (
    <div>
      <PageHeader
        title="CreditCommons Protocol Config"
        description="Protocol-level configuration for the CreditCommons federation client. Per-partner credentials resolve server-side from TenantConfig."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="flat" size="sm" startContent={<RefreshCw size={16} />}
              onPress={load}>Refresh</Button>
            <Button variant="flat" size="sm" startContent={<Plug size={16} />}
              onPress={testConnection} isLoading={pinging}>Test connection</Button>
            <Button variant="flat" size="sm" startContent={<Zap size={16} />}
              onPress={forceSync} isLoading={syncing}>Force sync</Button>
            <Button color="primary" size="sm" startContent={<Save size={16} />}
              onPress={save} isLoading={saving}>Save</Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card shadow="sm">
          <CardHeader className="flex items-center gap-2">
            <Network size={18} className="text-primary" />
            <h3 className="text-lg font-semibold">Connection</h3>
          </CardHeader>
          <CardBody className="space-y-3">
            <Input label="CC node endpoint URL" value={endpoint}
              onValueChange={setEndpoint}
              placeholder="https://cc.example.org" />
            <div className="flex gap-2 items-end">
              <Input label="API key" type={showKey ? 'text' : 'password'}
                value={apiKey} onValueChange={setApiKey} className="flex-1" />
              <Button isIconOnly variant="flat" size="sm"
                onPress={() => setShowKey(!showKey)}>
                {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </Button>
            </div>
            <Input label="Partner ID" type="number" value={partnerId}
              onValueChange={setPartnerId}
              description="Federation partner row this config binds to" />
            <div className="flex items-center justify-between">
              <span className="text-sm">Enabled</span>
              <Switch isSelected={enabled} onValueChange={setEnabled} />
            </div>
          </CardBody>
        </Card>

        <Card shadow="sm">
          <CardHeader className="flex items-center gap-2">
            <Activity size={18} className="text-primary" />
            <h3 className="text-lg font-semibold">Sync behaviour</h3>
          </CardHeader>
          <CardBody className="space-y-3">
            <Input label="Refresh interval (seconds)" type="number"
              value={refreshInterval} onValueChange={setRefreshInterval} />
            <Input label="Max retries" type="number"
              value={maxRetries} onValueChange={setMaxRetries} />
            <div className="rounded border p-3 bg-default-50 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-default-500">Last sync:</span>
                <span>{lastSync.at ? new Date(lastSync.at).toLocaleString() : '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-default-500">Status:</span>
                <Chip size="sm" variant="flat"
                  color={lastSync.status === 'ok' || lastSync.status === 'success' ? 'success'
                    : lastSync.status === 'failed' ? 'danger' : 'default'}>
                  {lastSync.status ?? 'unknown'}
                </Chip>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      <Card shadow="sm" className="mt-4">
        <CardHeader><h3 className="text-lg font-semibold">Recent activity</h3></CardHeader>
        <CardBody>
          <Table aria-label="CC audit" isStriped>
            <TableHeader>
              <TableColumn>When</TableColumn>
              <TableColumn>Action</TableColumn>
              <TableColumn>Status</TableColumn>
              <TableColumn>Details</TableColumn>
            </TableHeader>
            <TableBody emptyContent="No recent activity">
              {audit.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{new Date(r.occurred_at ?? r.created_at ?? '').toLocaleString()}</TableCell>
                  <TableCell>{r.action ?? '—'}</TableCell>
                  <TableCell><Chip size="sm" variant="flat">{r.status ?? '—'}</Chip></TableCell>
                  <TableCell className="max-w-md truncate text-xs">{r.details ?? ''}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardBody>
      </Card>
    </div>
  );
}
