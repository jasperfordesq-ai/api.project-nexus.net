// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { Card, CardBody } from '@heroui/react';
import { Users } from 'lucide-react';
import { usePageTitle } from '@/hooks';
import { PageHeader } from '@/admin/components';

export default function BrokerMembers() {
  usePageTitle('Broker - Members');
  return (
    <div>
      <PageHeader
        title="Members"
        description="Day-to-day member management for brokers — approvals, status, and quick actions."
      />
      <Card shadow="sm">
        <CardBody className="flex flex-col items-center gap-2 py-12 text-default-500">
          <Users size={36} className="text-primary" />
          <p className="font-medium">Broker member view coming in Phase 65.</p>
          <p className="text-xs text-default-400">
            Use the full Admin → Users page for member management until then.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
