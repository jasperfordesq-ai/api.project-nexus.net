// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { Card, CardBody, CardHeader, Divider } from '@heroui/react';
import { HelpCircle, ArrowLeftRight, MessageSquareWarning, ShieldCheck, FileCheck, Eye, AlertTriangle } from 'lucide-react';
import { usePageTitle } from '@/hooks';
import { PageHeader } from '@/admin/components';

export default function BrokerHelp() {
  usePageTitle('Broker - Help');
  return (
    <div>
      <PageHeader
        title="Broker Help"
        description="Quick reference for the day-to-day broker workflow."
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card shadow="sm">
          <CardHeader className="flex items-center gap-2">
            <HelpCircle size={18} className="text-primary" />
            <h3 className="text-lg font-semibold">What is the Broker Panel?</h3>
          </CardHeader>
          <CardBody className="text-sm text-default-600 space-y-2">
            <p>
              The Broker Panel is a focused workspace for community brokers who
              spend most of their day moderating exchanges, reviewing flagged
              messages, and keeping safeguarding/vetting up to date.
            </p>
            <p>
              It shares data with the main Admin panel — every action here is
              audit-logged exactly as it would be in /admin.
            </p>
          </CardBody>
        </Card>

        <Card shadow="sm">
          <CardHeader className="flex items-center gap-2">
            <ArrowLeftRight size={18} className="text-primary" />
            <h3 className="text-lg font-semibold">Daily Workflow</h3>
          </CardHeader>
          <CardBody className="text-sm text-default-600 space-y-2">
            <p><strong>Members</strong> — approve pending members.</p>
            <Divider />
            <p><strong>Exchanges</strong> — approve/reject pending exchanges, view full history.</p>
            <Divider />
            <p>
              <strong>Messages</strong> — review messages flagged by automated
              moderation; mark approve/flag/reviewed.
            </p>
          </CardBody>
        </Card>

        <Card shadow="sm">
          <CardHeader className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-primary" />
            <h3 className="text-lg font-semibold">Compliance</h3>
          </CardHeader>
          <CardBody className="text-sm text-default-600 space-y-2">
            <p><strong>Safeguarding</strong> — review unreviewed safeguarding flags (red badge = urgent).</p>
            <p><strong>Vetting</strong> — track vetting expiry windows.</p>
            <p><strong>Monitoring</strong> — manage who is on the watchlist.</p>
            <p><strong>Risk Tags</strong> — tag listings as high-risk.</p>
            <p><strong>Insurance</strong> — track insurance certificates.</p>
          </CardBody>
        </Card>

        <Card shadow="sm">
          <CardHeader className="flex items-center gap-2">
            <FileCheck size={18} className="text-primary" />
            <h3 className="text-lg font-semibold">Records</h3>
          </CardHeader>
          <CardBody className="text-sm text-default-600 space-y-2">
            <p>
              <strong>Archives</strong> stores reviewed broker actions for audit
              and back-reference. Use the search filter to find historical
              decisions.
            </p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
