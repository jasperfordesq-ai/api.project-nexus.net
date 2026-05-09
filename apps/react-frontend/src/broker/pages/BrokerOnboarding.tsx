// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { Card, CardBody } from '@heroui/react';
import { Sparkles } from 'lucide-react';
import { usePageTitle } from '@/hooks';
import { PageHeader } from '@/admin/components';

export default function BrokerOnboarding() {
  usePageTitle('Broker - Onboarding');
  return (
    <div>
      <PageHeader
        title="Onboarding"
        description="Track members in onboarding and shepherd them through identity verification + activation."
      />
      <Card shadow="sm">
        <CardBody className="flex flex-col items-center gap-2 py-12 text-default-500">
          <Sparkles size={36} className="text-primary" />
          <p className="font-medium">Broker onboarding view coming in Phase 65.</p>
          <p className="text-xs text-default-400">
            Use Admin → CRM → Onboarding Funnel for the full funnel view.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
