// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/**
 * Broker App Entry Point (lazy-loaded)
 *
 * V1 parity: dedicated /broker/* sub-app. Reuses the existing broker page
 * components from /admin/modules/broker/ (already implemented under V2's
 * legacy /admin/broker-controls/* URLs) and remounts them at the V1-style
 * /broker/* URLs inside the BrokerLayout shell.
 */

import { lazy, Suspense, type ComponentType } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AdminRoute } from '@/admin/AdminRoute';
import { BrokerLayout } from './BrokerLayout';
import { LoadingScreen } from '@/components/feedback';
import { ErrorBoundary } from '@/components/feedback/ErrorBoundary';

const BrokerDashboard = lazy(() => import('@/admin/modules/broker/BrokerDashboard'));
const ExchangeManagement = lazy(() => import('@/admin/modules/broker/ExchangeManagement'));
const ExchangeDetail = lazy(() => import('@/admin/modules/broker/ExchangeDetail'));
const RiskTags = lazy(() => import('@/admin/modules/broker/RiskTags'));
const MessageReview = lazy(() => import('@/admin/modules/broker/MessageReview'));
const MessageDetail = lazy(() => import('@/admin/modules/broker/MessageDetail'));
const UserMonitoring = lazy(() => import('@/admin/modules/broker/UserMonitoring'));
const VettingRecords = lazy(() => import('@/admin/modules/broker/VettingRecords'));
const InsuranceCertificates = lazy(() => import('@/admin/modules/broker/InsuranceCertificates'));
const BrokerConfiguration = lazy(() => import('@/admin/modules/broker/BrokerConfiguration'));
const ReviewArchive = lazy(() => import('@/admin/modules/broker/ReviewArchive'));
const ArchiveDetail = lazy(() => import('@/admin/modules/broker/ArchiveDetail'));

// Optional pages — fall back to a simple coming-soon view if not implemented.
const Members = lazy(() => import('./pages/BrokerMembers'));
const Onboarding = lazy(() => import('./pages/BrokerOnboarding'));
const Safeguarding = lazy(() => import('./pages/BrokerSafeguarding'));
const Help = lazy(() => import('./pages/BrokerHelp'));

function Lazy({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<LoadingScreen message="Loading…" />}>{children}</Suspense>;
}

export default function BrokerApp() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route element={<AdminRoute />}>
          <Route element={<BrokerLayout />}>
            <Route index element={<Lazy><BrokerDashboard /></Lazy>} />

            {/* Daily workflow */}
            <Route path="members" element={<Lazy><Members /></Lazy>} />
            <Route path="onboarding" element={<Lazy><Onboarding /></Lazy>} />
            <Route path="exchanges" element={<Lazy><ExchangeManagement /></Lazy>} />
            <Route path="exchanges/:id" element={<Lazy><ExchangeDetail /></Lazy>} />
            <Route path="messages" element={<Lazy><MessageReview /></Lazy>} />
            <Route path="messages/:id" element={<Lazy><MessageDetail /></Lazy>} />

            {/* Compliance */}
            <Route path="safeguarding" element={<Lazy><Safeguarding /></Lazy>} />
            <Route path="vetting" element={<Lazy><VettingRecords /></Lazy>} />
            <Route path="monitoring" element={<Lazy><UserMonitoring /></Lazy>} />
            <Route path="risk-tags" element={<Lazy><RiskTags /></Lazy>} />
            <Route path="insurance" element={<Lazy><InsuranceCertificates /></Lazy>} />

            {/* Records */}
            <Route path="archives" element={<Lazy><ReviewArchive /></Lazy>} />
            <Route path="archives/:id" element={<Lazy><ArchiveDetail /></Lazy>} />

            {/* Settings */}
            <Route path="configuration" element={<Lazy><BrokerConfiguration /></Lazy>} />
            <Route path="help" element={<Lazy><Help /></Lazy>} />

            {/* Catch-all → dashboard */}
            <Route path="*" element={<Navigate to="" replace />} />
          </Route>
        </Route>
      </Routes>
    </ErrorBoundary>
  );
}
