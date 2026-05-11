// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/**
 * Federation Onboarding Wizard (Item 14 — path-to-1000)
 *
 * Admin-side multi-step wizard to set up a federation partner protocol
 * connection. Distinct from the member-facing /federation/onboarding page,
 * which captures personal privacy/communication prefs.
 *
 * Steps:
 *   1. Choose protocol  (CreditCommons / Komunitin / NativeIngest)
 *   2. Select partner + enter remote endpoint URL & API key.
 *      Saved to TenantConfig keys:
 *        federation.partner.{id}.endpoint
 *        federation.partner.{id}.api_key
 *      via PUT /api/admin/config.
 *   3. Test connection — POST /api/admin/federation/protocols/partners/{id}/ping/{protocol}.
 *      (NativeIngest has no remote ping; this step is informational for it.)
 *   4. Enable partner — for an existing partner row in `pending` status,
 *      we surface POST /api/admin/federation/partnerships/{id}/approve.
 *      Creating a brand-new FederationPartner from the wizard is NOT exposed
 *      by the admin API yet (CompatibilityAlias's POST creates one only
 *      against another tenant in the same DB — see report). We render a
 *      placeholder for that path.
 *   5. Confirmation + next-step links.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Input,
  Progress,
  Select,
  SelectItem,
  Spinner,
} from '@heroui/react';
import {
  Globe,
  KeyRound,
  Link2,
  Plug,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePageTitle } from '@/hooks';
import { useToast, useTenant } from '@/contexts';
import { api } from '@/lib/api';
import { logError } from '@/lib/logger';
import { PageHeader } from '../../components';

type Protocol = 'credit-commons' | 'komunitin' | 'native';

interface PartnerSummary {
  id: number;
  partner_tenant_id?: number;
  tenant_id?: number;
  status?: string;
  shared_listings?: boolean;
}

interface PartnersResponse {
  data?: PartnerSummary[];
  partnerships?: PartnerSummary[];
}

const PROTOCOLS: Array<{ id: Protocol; label: string; description: string; canPing: boolean }> = [
  {
    id: 'credit-commons',
    label: 'CreditCommons',
    description: 'CC-protocol clearing house for inter-timebank credit transfers.',
    canPing: true,
  },
  {
    id: 'komunitin',
    label: 'Komunitin',
    description: 'JSON:API community-currency protocol (Komunitin v2).',
    canPing: true,
  },
  {
    id: 'native',
    label: 'Native Ingest',
    description: 'Project NEXUS native cross-tenant ingest (no remote ping).',
    canPing: false,
  },
];

const TOTAL_STEPS = 5;

export default function FederationOnboardingWizard() {
  usePageTitle('Admin - Federation Onboarding');
  const toast = useToast();
  const navigate = useNavigate();
  const { tenantPath } = useTenant();

  const [step, setStep] = useState(1);
  const [protocol, setProtocol] = useState<Protocol>('credit-commons');
  const [partners, setPartners] = useState<PartnerSummary[]>([]);
  const [partnersLoading, setPartnersLoading] = useState(false);
  const [partnerId, setPartnerId] = useState<number | null>(null);
  const [endpoint, setEndpoint] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [savingConfig, setSavingConfig] = useState(false);
  const [pingState, setPingState] = useState<'idle' | 'pinging' | 'ok' | 'fail'>('idle');
  const [pingDetail, setPingDetail] = useState<string | null>(null);
  const [activating, setActivating] = useState(false);

  // ─── Load partners list when reaching step 2 ──────────────────────────────
  useEffect(() => {
    if (step !== 2 || partners.length > 0) return;
    let cancelled = false;
    (async () => {
      setPartnersLoading(true);
      try {
        const res = await api.get<PartnersResponse>('/admin/federation/partnerships');
        if (!cancelled && res.success && res.data) {
          const payload = res.data as PartnersResponse;
          const list = payload.data ?? payload.partnerships ?? [];
          setPartners(Array.isArray(list) ? list : []);
        }
      } catch (err) {
        logError('FederationOnboardingWizard.loadPartners', err);
      } finally {
        if (!cancelled) setPartnersLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [step, partners.length]);

  // ─── Step transitions ─────────────────────────────────────────────────────
  const goNext = useCallback(() => setStep((s) => Math.min(s + 1, TOTAL_STEPS)), []);
  const goBack = useCallback(() => setStep((s) => Math.max(s - 1, 1)), []);

  const canAdvanceStep2 = useMemo(() => {
    if (partnerId == null) return false;
    if (protocol === 'native') return true; // native doesn't need remote endpoint
    return endpoint.trim().length > 0;
  }, [partnerId, protocol, endpoint]);

  // ─── Step 2 → save config keys ────────────────────────────────────────────
  const saveConfigAndAdvance = useCallback(async () => {
    if (partnerId == null) return;
    setSavingConfig(true);
    try {
      const payload: Record<string, string> = {};
      if (endpoint.trim()) {
        payload[`federation.partner.${partnerId}.endpoint`] = endpoint.trim();
      }
      if (apiKey.trim()) {
        payload[`federation.partner.${partnerId}.api_key`] = apiKey.trim();
      }
      if (Object.keys(payload).length > 0) {
        const res = await api.put('/admin/config', { config: payload });
        if (!res.success) {
          toast.error('Could not save partner config');
          return;
        }
      }
      goNext();
    } catch (err) {
      logError('FederationOnboardingWizard.saveConfig', err);
      toast.error('Failed to save configuration');
    } finally {
      setSavingConfig(false);
    }
  }, [partnerId, endpoint, apiKey, goNext, toast]);

  // ─── Step 3 → ping ────────────────────────────────────────────────────────
  const runPing = useCallback(async () => {
    if (partnerId == null) return;
    if (protocol === 'native') {
      setPingState('ok');
      setPingDetail('Native ingest does not require a remote ping.');
      return;
    }
    setPingState('pinging');
    setPingDetail(null);
    try {
      const res = await api.post<{ reachable: boolean; endpoint?: string }>(
        `/admin/federation/protocols/partners/${partnerId}/ping/${protocol}`,
        {},
      );
      const reachable = (res.data as { reachable?: boolean } | undefined)?.reachable === true;
      if (res.success && reachable) {
        setPingState('ok');
        setPingDetail('Remote node responded successfully.');
      } else {
        setPingState('fail');
        setPingDetail(res.error ?? 'Remote node did not respond.');
      }
    } catch (err) {
      logError('FederationOnboardingWizard.ping', err);
      setPingState('fail');
      setPingDetail('Network error contacting remote node.');
    }
  }, [partnerId, protocol]);

  // ─── Step 4 → activate (approve pending partner row) ──────────────────────
  const selectedPartner = partners.find((p) => p.id === partnerId) ?? null;

  const activate = useCallback(async () => {
    if (partnerId == null) return;
    setActivating(true);
    try {
      const res = await api.post(`/admin/federation/partnerships/${partnerId}/approve`, {});
      if (res.success) {
        toast.success('Partner activated');
        goNext();
      } else {
        toast.error(res.error ?? 'Could not activate partner');
      }
    } catch (err) {
      logError('FederationOnboardingWizard.activate', err);
      toast.error('Activation failed');
    } finally {
      setActivating(false);
    }
  }, [partnerId, goNext, toast]);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      <PageHeader
        title="Federation onboarding"
        description="Wire up a remote partner protocol connection step-by-step."
      />

      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-theme-subtle">Step {step} of {TOTAL_STEPS}</span>
          <span className="text-sm text-theme-subtle">
            {step === 1 && 'Choose protocol'}
            {step === 2 && 'Endpoint & key'}
            {step === 3 && 'Test connection'}
            {step === 4 && 'Enable'}
            {step === 5 && 'Done'}
          </span>
        </div>
        <Progress value={(step / TOTAL_STEPS) * 100} aria-label={`Step ${step} of ${TOTAL_STEPS}`} />
      </div>

      {/* ─── Step 1 ─────────────────────────────────────────────────────────── */}
      {step === 1 && (
        <Card>
          <CardHeader className="flex items-center gap-2">
            <Globe className="w-5 h-5" aria-hidden="true" />
            <h2 className="font-semibold">Choose protocol</h2>
          </CardHeader>
          <CardBody className="space-y-3">
            {PROTOCOLS.map((p) => {
              const selected = protocol === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setProtocol(p.id)}
                  className={`w-full text-left p-4 rounded-lg border transition-all ${
                    selected
                      ? 'border-primary bg-primary/10'
                      : 'border-theme-default bg-theme-elevated hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-theme-primary">{p.label}</div>
                      <div className="text-sm text-theme-subtle">{p.description}</div>
                    </div>
                    {selected && <Chip color="primary" size="sm">Selected</Chip>}
                  </div>
                </button>
              );
            })}
            <div className="flex justify-end pt-2">
              <Button color="primary" endContent={<ArrowRight className="w-4 h-4" />} onPress={goNext}>
                Continue
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {/* ─── Step 2 ─────────────────────────────────────────────────────────── */}
      {step === 2 && (
        <Card>
          <CardHeader className="flex items-center gap-2">
            <KeyRound className="w-5 h-5" aria-hidden="true" />
            <h2 className="font-semibold">Endpoint & API key</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            {partnersLoading ? (
              <div className="flex items-center gap-2"><Spinner size="sm" /> Loading partners...</div>
            ) : partners.length === 0 ? (
              <div className="p-4 rounded-lg bg-warning/10 border border-warning/30 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0" aria-hidden="true" />
                <div className="text-sm">
                  <strong>No partner records yet.</strong>
                  <p className="text-theme-subtle">
                    Creating a brand-new <code>FederationPartner</code> from this wizard is not
                    exposed by the current admin API. Use the existing partner-request flow to
                    create one, then return here to configure its protocol endpoint.
                  </p>
                </div>
              </div>
            ) : (
              <Select
                label="Partner"
                selectedKeys={partnerId != null ? [String(partnerId)] : []}
                onSelectionChange={(keys) => {
                  const v = Array.from(keys)[0];
                  setPartnerId(v != null ? parseInt(String(v), 10) : null);
                }}
              >
                {partners.map((p) => (
                  <SelectItem key={String(p.id)} textValue={`Partner #${p.id}`}>
                    Partner #{p.id}
                    {p.status ? ` — ${p.status}` : ''}
                    {p.partner_tenant_id ? ` (tenant ${p.partner_tenant_id})` : ''}
                  </SelectItem>
                ))}
              </Select>
            )}

            {protocol !== 'native' && (
              <>
                <Input
                  label="Remote endpoint URL"
                  placeholder="https://partner.example.org/api"
                  value={endpoint}
                  onValueChange={setEndpoint}
                  startContent={<Link2 className="w-4 h-4 text-theme-subtle" aria-hidden="true" />}
                />
                <Input
                  label="API key"
                  type="password"
                  placeholder="Optional; leave blank to keep existing"
                  value={apiKey}
                  onValueChange={setApiKey}
                  startContent={<KeyRound className="w-4 h-4 text-theme-subtle" aria-hidden="true" />}
                />
                <p className="text-xs text-theme-subtle">
                  Saved as TenantConfig keys{' '}
                  <code>federation.partner.{partnerId ?? '{id}'}.endpoint</code> and{' '}
                  <code>federation.partner.{partnerId ?? '{id}'}.api_key</code>.
                </p>
              </>
            )}

            <div className="flex justify-between pt-2">
              <Button variant="light" startContent={<ArrowLeft className="w-4 h-4" />} onPress={goBack}>
                Back
              </Button>
              <Button
                color="primary"
                endContent={<ArrowRight className="w-4 h-4" />}
                onPress={saveConfigAndAdvance}
                isDisabled={!canAdvanceStep2}
                isLoading={savingConfig}
              >
                Save & continue
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {/* ─── Step 3 ─────────────────────────────────────────────────────────── */}
      {step === 3 && (
        <Card>
          <CardHeader className="flex items-center gap-2">
            <Plug className="w-5 h-5" aria-hidden="true" />
            <h2 className="font-semibold">Test connection</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <p className="text-sm text-theme-subtle">
              Sends a minimal protocol-specific ping to verify reachability.
            </p>

            <div className="flex items-center gap-3">
              <Button
                color="primary"
                onPress={runPing}
                isLoading={pingState === 'pinging'}
                startContent={<Plug className="w-4 h-4" aria-hidden="true" />}
              >
                Ping {PROTOCOLS.find((p) => p.id === protocol)?.label}
              </Button>
              {pingState === 'ok' && (
                <span className="flex items-center gap-1 text-success">
                  <CheckCircle2 className="w-4 h-4" aria-hidden="true" /> Reachable
                </span>
              )}
              {pingState === 'fail' && (
                <span className="flex items-center gap-1 text-danger">
                  <XCircle className="w-4 h-4" aria-hidden="true" /> Unreachable
                </span>
              )}
            </div>

            {pingDetail && (
              <p className="text-sm text-theme-secondary">{pingDetail}</p>
            )}

            <div className="flex justify-between pt-2">
              <Button variant="light" startContent={<ArrowLeft className="w-4 h-4" />} onPress={goBack}>
                Back
              </Button>
              <Button
                color="primary"
                endContent={<ArrowRight className="w-4 h-4" />}
                onPress={goNext}
                isDisabled={pingState !== 'ok'}
              >
                Continue
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {/* ─── Step 4 ─────────────────────────────────────────────────────────── */}
      {step === 4 && (
        <Card>
          <CardHeader className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5" aria-hidden="true" />
            <h2 className="font-semibold">Enable partner</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            {selectedPartner?.status === 'pending' || selectedPartner?.status === 'Pending' ? (
              <p className="text-sm text-theme-secondary">
                Approving partner #{selectedPartner.id} will move its status from{' '}
                <Chip size="sm" variant="flat" color="warning">pending</Chip> to{' '}
                <Chip size="sm" variant="flat" color="success">active</Chip>.
              </p>
            ) : selectedPartner?.status ? (
              <div className="p-4 rounded-lg bg-theme-elevated text-sm">
                Partner #{selectedPartner.id} is already in status{' '}
                <Chip size="sm" variant="flat">{selectedPartner.status}</Chip>. No activation needed.
              </div>
            ) : (
              <p className="text-sm text-theme-subtle">No partner selected.</p>
            )}

            <div className="flex justify-between pt-2">
              <Button variant="light" startContent={<ArrowLeft className="w-4 h-4" />} onPress={goBack}>
                Back
              </Button>
              {(selectedPartner?.status === 'pending' || selectedPartner?.status === 'Pending') ? (
                <Button color="primary" onPress={activate} isLoading={activating}>
                  Activate partner
                </Button>
              ) : (
                <Button color="primary" endContent={<ArrowRight className="w-4 h-4" />} onPress={goNext}>
                  Continue
                </Button>
              )}
            </div>
          </CardBody>
        </Card>
      )}

      {/* ─── Step 5 ─────────────────────────────────────────────────────────── */}
      {step === 5 && (
        <Card>
          <CardHeader className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-success" aria-hidden="true" />
            <h2 className="font-semibold">All set</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <p className="text-sm text-theme-secondary">
              Federation is configured for partner #{partnerId}. Reconciliation runs on the
              5-minute cron; you can also trigger a manual reconcile.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                color="primary"
                variant="flat"
                onPress={() => navigate(tenantPath('/admin/federation/transfers'))}
              >
                View hour transfers
              </Button>
              <Button
                variant="flat"
                onPress={() => navigate(tenantPath('/admin/federation/audit'))}
              >
                Open audit log
              </Button>
              <Button
                variant="flat"
                onPress={() => navigate(tenantPath('/admin/federation/partners-admin'))}
              >
                Manage partners
              </Button>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
