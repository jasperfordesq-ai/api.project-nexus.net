// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/**
 * Broker Safeguarding view. Currently a thin redirect/wrapper around the
 * existing /admin/safeguarding page; the broker-specific dashboard lands
 * in Phase 65 alongside the rest of the day-to-day broker workflow.
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTenant } from '@/contexts';
import { LoadingScreen } from '@/components/feedback';

export default function BrokerSafeguarding() {
  const navigate = useNavigate();
  const { tenantPath } = useTenant();
  useEffect(() => {
    navigate(tenantPath('/admin/safeguarding'), { replace: true });
  }, [navigate, tenantPath]);
  return <LoadingScreen message="Opening safeguarding…" />;
}
