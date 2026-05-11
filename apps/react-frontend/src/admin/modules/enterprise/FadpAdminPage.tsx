// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/**
 * FADP Admin — Swiss Federal Act on Data Protection registry.
 *
 * Sources:
 *   GET /api/v2/admin/fadp/processing-register
 *     (data.legal_documents[], data.consent_types[])
 *   GET /api/v2/admin/fadp/consent-ledger (last 200 consent records)
 *   GET /api/v2/admin/fadp/processing-register.csv (CSV download)
 *
 * The V2 API treats LegalDocuments + GdprConsentTypes as the FADP-equivalent
 * processing register. The PHP V1 also had explicit "processing-activities"
 * records but those route through the persisted-write path in V2 and only
 * have stub support — the live data lives in the legal-docs/consent-types
 * tables.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  Button, Card, CardBody, CardHeader, Chip, Spinner, Tab, Tabs,
  Table, TableBody, TableCell, TableColumn, TableHeader, TableRow,
} from '@heroui/react';
import { Download, FileText, RefreshCw, ShieldCheck } from 'lucide-react';
import { usePageTitle } from '@/hooks';
import { useToast } from '@/contexts';
import { api, API_BASE } from '@/lib/api';
import { PageHeader } from '../../components';

interface LegalDoc {
  slug: string;
  title: string;
  version: string | null;
  isActive?: boolean;
  is_active?: boolean;
  requiresAcceptance?: boolean;
  requires_acceptance?: boolean;
  updatedAt?: string | null;
  updated_at?: string | null;
}

interface ConsentType {
  slug: string;
  name: string;
  description: string | null;
  isRequired?: boolean;
  is_required?: boolean;
  version: string | null;
  isActive?: boolean;
  is_active?: boolean;
}

interface ProcessingRegister {
  legal_documents?: LegalDoc[];
  consent_types?: ConsentType[];
}

interface ConsentRecord {
  id: number;
  userId?: number;
  user_id?: number;
  consentType?: string;
  consent_type?: string;
  isGranted?: boolean;
  is_granted?: boolean;
  grantedAt?: string | null;
  granted_at?: string | null;
  revokedAt?: string | null;
  revoked_at?: string | null;
}

export default function FadpAdminPage() {
  usePageTitle('Admin - FADP Register');
  const toast = useToast();
  const [register, setRegister] = useState<ProcessingRegister | null>(null);
  const [ledger, setLedger] = useState<ConsentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [regRes, ledRes] = await Promise.all([
        api.get<ProcessingRegister>('/v2/admin/fadp/processing-register'),
        api.get<ConsentRecord[]>('/v2/admin/fadp/consent-ledger'),
      ]);
      if (regRes.success) {
        const payload = (regRes.data as unknown) as ProcessingRegister | { data?: ProcessingRegister };
        const reg = (payload as { data?: ProcessingRegister })?.data ?? (payload as ProcessingRegister);
        setRegister(reg ?? null);
      }
      if (ledRes.success) {
        const payload = (ledRes.data as unknown) as ConsentRecord[] | { data?: ConsentRecord[] };
        const rows = Array.isArray(payload) ? payload : (payload?.data ?? []);
        setLedger(rows);
      }
    } catch {
      toast.error('Failed to load FADP register');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const downloadCsv = useCallback(() => {
    const url = `${API_BASE}/v2/admin/fadp/processing-register.csv`;
    window.open(url, '_blank');
  }, []);

  const legalDocs = register?.legal_documents ?? [];
  const consentTypes = register?.consent_types ?? [];

  return (
    <div>
      <PageHeader
        title="FADP Processing Register"
        description="Swiss Federal Act on Data Protection — register of processing activities, consent types, and ledger of granted/revoked consents. Equivalent to GDPR Article 30."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="flat" size="sm" startContent={<Download size={16} />} onPress={downloadCsv}>
              Export CSV
            </Button>
            <Button variant="flat" size="sm" startContent={<RefreshCw size={16} />}
              onPress={load} isLoading={loading}>Refresh</Button>
          </div>
        }
      />
      <Card shadow="sm">
        <CardHeader className="flex items-center gap-2">
          <ShieldCheck size={18} className="text-primary" />
          <h3 className="text-lg font-semibold">Processing Register</h3>
        </CardHeader>
        <CardBody>
          <Tabs aria-label="FADP register tabs">
            <Tab key="docs" title={`Legal Documents (${legalDocs.length})`}>
              <Table aria-label="Legal documents" isStriped>
                <TableHeader>
                  <TableColumn>Slug</TableColumn>
                  <TableColumn>Title</TableColumn>
                  <TableColumn>Version</TableColumn>
                  <TableColumn>Active</TableColumn>
                  <TableColumn>Requires Acceptance</TableColumn>
                  <TableColumn>Updated</TableColumn>
                </TableHeader>
                <TableBody emptyContent="No legal documents" isLoading={loading} loadingContent={<Spinner />}>
                  {legalDocs.map((d) => (
                    <TableRow key={d.slug}>
                      <TableCell><code className="text-xs">{d.slug}</code></TableCell>
                      <TableCell className="text-sm">{d.title}</TableCell>
                      <TableCell><Chip size="sm" variant="flat">{d.version ?? '—'}</Chip></TableCell>
                      <TableCell>
                        {(d.isActive ?? d.is_active) ? (
                          <Chip size="sm" color="success" variant="flat">active</Chip>
                        ) : (
                          <Chip size="sm" variant="flat">inactive</Chip>
                        )}
                      </TableCell>
                      <TableCell>{(d.requiresAcceptance ?? d.requires_acceptance) ? 'yes' : 'no'}</TableCell>
                      <TableCell className="text-xs text-default-500">
                        {(() => {
                          const ts = d.updatedAt ?? d.updated_at;
                          return ts ? new Date(ts).toLocaleDateString() : '—';
                        })()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Tab>
            <Tab key="consents" title={`Consent Types (${consentTypes.length})`}>
              <Table aria-label="Consent types" isStriped>
                <TableHeader>
                  <TableColumn>Slug</TableColumn>
                  <TableColumn>Name</TableColumn>
                  <TableColumn>Required</TableColumn>
                  <TableColumn>Version</TableColumn>
                  <TableColumn>Active</TableColumn>
                </TableHeader>
                <TableBody emptyContent="No consent types" isLoading={loading} loadingContent={<Spinner />}>
                  {consentTypes.map((c) => (
                    <TableRow key={c.slug}>
                      <TableCell><code className="text-xs">{c.slug}</code></TableCell>
                      <TableCell className="text-sm">
                        <p className="font-medium">{c.name}</p>
                        {c.description && <p className="text-[10px] text-default-500">{c.description}</p>}
                      </TableCell>
                      <TableCell>{(c.isRequired ?? c.is_required) ? <Chip size="sm" color="warning" variant="flat">required</Chip> : 'optional'}</TableCell>
                      <TableCell>{c.version ?? '—'}</TableCell>
                      <TableCell>{(c.isActive ?? c.is_active) ? 'yes' : 'no'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Tab>
            <Tab key="ledger" title={`Consent Ledger (${ledger.length})`}>
              <Table aria-label="Consent ledger" isStriped>
                <TableHeader>
                  <TableColumn>ID</TableColumn>
                  <TableColumn>User</TableColumn>
                  <TableColumn>Consent Type</TableColumn>
                  <TableColumn>Granted</TableColumn>
                  <TableColumn>Granted At</TableColumn>
                  <TableColumn>Revoked At</TableColumn>
                </TableHeader>
                <TableBody emptyContent="No consent records" isLoading={loading} loadingContent={<Spinner />}>
                  {ledger.map((r) => {
                    const granted = r.isGranted ?? r.is_granted ?? false;
                    return (
                      <TableRow key={r.id}>
                        <TableCell>#{r.id}</TableCell>
                        <TableCell>user #{r.userId ?? r.user_id}</TableCell>
                        <TableCell><code className="text-xs">{r.consentType ?? r.consent_type}</code></TableCell>
                        <TableCell>
                          {granted ? <Chip size="sm" color="success" variant="flat">granted</Chip>
                                   : <Chip size="sm" color="default" variant="flat">revoked</Chip>}
                        </TableCell>
                        <TableCell className="text-xs text-default-500">
                          {(() => {
                            const ts = r.grantedAt ?? r.granted_at;
                            return ts ? new Date(ts).toLocaleString() : '—';
                          })()}
                        </TableCell>
                        <TableCell className="text-xs text-default-500">
                          {(() => {
                            const ts = r.revokedAt ?? r.revoked_at;
                            return ts ? new Date(ts).toLocaleString() : '—';
                          })()}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Tab>
          </Tabs>
          {!loading && legalDocs.length === 0 && consentTypes.length === 0 && (
            <div className="mt-4 flex items-center gap-2 text-sm text-default-500">
              <FileText size={16} /> No processing activities defined yet.
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
