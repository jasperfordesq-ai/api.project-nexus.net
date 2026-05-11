// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/**
 * Federation API Docs (Admin) — static reference for the V2 federation
 * surface. The endpoint inventory is hard-coded against the actual
 * AdminFederationProtocolsController + FederationGateway routes so this
 * doc stays accurate without a live OpenAPI feed.
 *
 * No GET /api/admin/federation/endpoints exists today — partner-facing
 * docs would normally live under /api/federation/openapi.json if/when
 * exported. Until then this page renders the well-known contract.
 */

import { useState } from 'react';
import {
  Accordion, AccordionItem, Card, CardBody, CardHeader, Chip, Tab, Tabs,
} from '@heroui/react';
import { Book, Code, Key, Network, Webhook } from 'lucide-react';
import { usePageTitle } from '@/hooks';
import { PageHeader } from '../../components';

interface EndpointRow {
  method: string;
  path: string;
  description: string;
  auth: 'admin' | 'api-key' | 'public';
}

const ADMIN_ENDPOINTS: EndpointRow[] = [
  { method: 'POST', path: '/api/admin/federation/protocols/partners/{id}/ping/credit-commons', description: 'Connectivity check for CC partner', auth: 'admin' },
  { method: 'POST', path: '/api/admin/federation/protocols/partners/{id}/ping/komunitin', description: 'Connectivity check for Komunitin partner', auth: 'admin' },
  { method: 'GET',  path: '/api/admin/federation/protocols/transfers', description: 'List federated hour transfers', auth: 'admin' },
  { method: 'POST', path: '/api/admin/federation/protocols/transfers', description: 'Propose outbound hour transfer', auth: 'admin' },
  { method: 'POST', path: '/api/admin/federation/protocols/transfers/{id}/commit', description: 'Commit a proposed transfer', auth: 'admin' },
  { method: 'POST', path: '/api/admin/federation/protocols/transfers/{id}/cancel', description: 'Cancel a proposed transfer', auth: 'admin' },
  { method: 'POST', path: '/api/admin/federation/protocols/reconcile', description: 'Manually trigger reconciliation pass', auth: 'admin' },
  { method: 'POST', path: '/api/admin/federation/protocols/ingest/listings', description: 'Native-protocol inbound listing ingest', auth: 'admin' },
  { method: 'POST', path: '/api/admin/federation/protocols/ingest/exchanges', description: 'Native-protocol inbound exchange ingest', auth: 'admin' },
  { method: 'GET',  path: '/api/v2/admin/federation/cc-config', description: 'Read CreditCommons config', auth: 'admin' },
  { method: 'PUT',  path: '/api/v2/admin/federation/cc-config', description: 'Update CreditCommons config', auth: 'admin' },
  { method: 'GET',  path: '/api/v2/admin/federation/webhooks', description: 'List federation webhooks', auth: 'admin' },
  { method: 'PUT',  path: '/api/v2/admin/federation/webhooks/{id}', description: 'Update webhook subscription', auth: 'admin' },
  { method: 'GET',  path: '/api/v2/admin/federation/activity', description: 'Federation activity stream', auth: 'admin' },
  { method: 'GET',  path: '/api/v2/admin/federation/topics', description: 'Subscribable topics', auth: 'admin' },
];

const PARTNER_ENDPOINTS: EndpointRow[] = [
  { method: 'POST', path: '/api/federation/credit-commons/transactions', description: 'Inbound CC transaction proposal', auth: 'api-key' },
  { method: 'POST', path: '/api/federation/credit-commons/transactions/{id}/commit', description: 'Inbound CC commit', auth: 'api-key' },
  { method: 'GET',  path: '/api/federation/credit-commons/accounts/{id}/balance', description: 'Inbound CC balance query', auth: 'api-key' },
  { method: 'POST', path: '/api/federation/komunitin/transfers', description: 'Inbound Komunitin transfer (JSON:API)', auth: 'api-key' },
  { method: 'GET',  path: '/api/federation/komunitin/transfers/{id}', description: 'Inbound Komunitin transfer status', auth: 'api-key' },
  { method: 'POST', path: '/api/federation/ingest/listings', description: 'Native protocol inbound listing', auth: 'api-key' },
  { method: 'POST', path: '/api/federation/ingest/exchanges', description: 'Native protocol inbound exchange', auth: 'api-key' },
];

const TRANSFER_PROPOSE_PAYLOAD = `{
  "partner_id": 42,
  "protocol": "credit-commons",
  "to_account": "neighbourhood-xyz",
  "amount_hours": 2.5,
  "memo": "Q2 reconciliation"
}`;

const KOMUNITIN_PAYLOAD = `{
  "data": {
    "type": "transfers",
    "attributes": {
      "amount": 1500,
      "meta": { "description": "cross-instance gift" }
    },
    "relationships": {
      "payer":   { "data": { "type": "accounts", "id": "abc-123" } },
      "payee":   { "data": { "type": "accounts", "id": "def-456" } }
    }
  }
}`;

const WEBHOOK_PAYLOAD = `{
  "event": "transfer.committed",
  "occurred_at": "2026-05-11T10:24:00Z",
  "data": { "transfer_id": 1024, "status": "Reconciled" }
}`;

function methodColor(m: string) {
  switch (m) {
    case 'GET': return 'primary';
    case 'POST': return 'success';
    case 'PUT': return 'warning';
    case 'DELETE': return 'danger';
    default: return 'default';
  }
}

function EndpointTable({ rows }: { rows: EndpointRow[] }) {
  return (
    <div className="space-y-1">
      {rows.map((r) => (
        <div key={r.method + r.path}
          className="flex items-start gap-3 p-2 rounded hover:bg-default-50 border-b last:border-0">
          <Chip size="sm" variant="flat" color={methodColor(r.method) as 'primary'}>{r.method}</Chip>
          <code className="text-xs flex-1 break-all">{r.path}</code>
          <span className="text-xs text-default-500 max-w-md text-right">{r.description}</span>
        </div>
      ))}
    </div>
  );
}

export default function AdminFederationApiDocsPage() {
  usePageTitle('Admin - Federation API Docs');
  const [tab, setTab] = useState('admin');

  return (
    <div>
      <PageHeader
        title="Federation API Documentation"
        description="Reference for V2 federation contracts (admin surface + inbound partner surface)."
      />

      <Card shadow="sm" className="mb-4">
        <CardHeader className="flex items-center gap-2">
          <Book size={18} className="text-primary" />
          <h3 className="text-lg font-semibold">What is federation?</h3>
        </CardHeader>
        <CardBody className="prose prose-sm max-w-none">
          <p>
            Federation lets independent NEXUS instances exchange listings,
            transactions and trust signals without a shared database. V2
            supports three protocols today:
          </p>
          <ul>
            <li><strong>CreditCommons</strong> — bilateral hour transfers
              with a remote CC node. Proposed → Sent → Acknowledged →
              Reconciled state machine.</li>
            <li><strong>Komunitin</strong> — JSON:API transfer protocol,
              used by Spanish / Catalan timebanks.</li>
            <li><strong>Native ingest</strong> — V2-to-V2 federation
              with idempotent inbound listing and exchange ingest.</li>
          </ul>
          <p>
            Per-partner credentials live in <code>TenantConfig</code> under
            <code>federation.partner.&#123;id&#125;.endpoint</code> and
            <code>federation.partner.&#123;id&#125;.api_key</code>.
          </p>
        </CardBody>
      </Card>

      <Card shadow="sm" className="mb-4">
        <CardHeader className="flex items-center gap-2">
          <Network size={18} className="text-primary" />
          <h3 className="text-lg font-semibold">Endpoint inventory</h3>
        </CardHeader>
        <CardBody>
          <Tabs selectedKey={tab} onSelectionChange={(k) => setTab(String(k))} aria-label="Endpoint surface">
            <Tab key="admin" title={`Admin (${ADMIN_ENDPOINTS.length})`}>
              <EndpointTable rows={ADMIN_ENDPOINTS} />
            </Tab>
            <Tab key="partner" title={`Inbound partner (${PARTNER_ENDPOINTS.length})`}>
              <EndpointTable rows={PARTNER_ENDPOINTS} />
            </Tab>
          </Tabs>
        </CardBody>
      </Card>

      <Card shadow="sm" className="mb-4">
        <CardHeader className="flex items-center gap-2">
          <Key size={18} className="text-primary" />
          <h3 className="text-lg font-semibold">Authentication</h3>
        </CardHeader>
        <CardBody className="prose prose-sm max-w-none">
          <p><strong>Admin endpoints</strong> require a JWT with the <code>admin</code> role
            and pass through the <code>AdminOnly</code> policy.</p>
          <p><strong>Inbound partner endpoints</strong> authenticate via the partner
            API key issued under <code>Federation → API Keys</code>. The key is sent
            as either <code>X-API-Key</code> header or <code>Authorization: Bearer</code>;
            both are accepted by the <code>FederationApiKeyMiddleware</code>.</p>
        </CardBody>
      </Card>

      <Card shadow="sm" className="mb-4">
        <CardHeader className="flex items-center gap-2">
          <Webhook size={18} className="text-primary" />
          <h3 className="text-lg font-semibold">Webhook contracts</h3>
        </CardHeader>
        <CardBody className="prose prose-sm max-w-none">
          <p>
            Webhook subscribers receive POSTs with a JSON envelope of
            <code>&#123; event, occurred_at, data &#125;</code>. Events include:
          </p>
          <ul>
            <li><code>transfer.proposed</code></li>
            <li><code>transfer.committed</code></li>
            <li><code>transfer.reconciled</code></li>
            <li><code>transfer.failed</code></li>
            <li><code>listing.federated</code></li>
            <li><code>exchange.federated</code></li>
          </ul>
        </CardBody>
      </Card>

      <Card shadow="sm">
        <CardHeader className="flex items-center gap-2">
          <Code size={18} className="text-primary" />
          <h3 className="text-lg font-semibold">Example payloads</h3>
        </CardHeader>
        <CardBody>
          <Accordion>
            <AccordionItem key="propose" title="Propose CreditCommons transfer">
              <pre className="text-xs bg-default-50 p-3 rounded overflow-x-auto">{TRANSFER_PROPOSE_PAYLOAD}</pre>
            </AccordionItem>
            <AccordionItem key="komunitin" title="Komunitin transfer (JSON:API)">
              <pre className="text-xs bg-default-50 p-3 rounded overflow-x-auto">{KOMUNITIN_PAYLOAD}</pre>
            </AccordionItem>
            <AccordionItem key="webhook" title="Webhook delivery envelope">
              <pre className="text-xs bg-default-50 p-3 rounded overflow-x-auto">{WEBHOOK_PAYLOAD}</pre>
            </AccordionItem>
          </Accordion>
        </CardBody>
      </Card>
    </div>
  );
}
