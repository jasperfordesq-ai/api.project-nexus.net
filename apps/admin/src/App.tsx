// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { Refine, Authenticated } from "@refinedev/core";
import { RefineThemes, notificationProvider } from "@refinedev/antd";
import routerProvider, {
  CatchAllNavigate,
  DocumentTitleHandler,
} from "@refinedev/react-router-v6";
import { BrowserRouter, Routes, Route, Outlet, Navigate } from "react-router-dom";
import { ConfigProvider, App as AntApp, theme } from "antd";
import "@refinedev/antd/dist/reset.css";
import { Component, type ReactNode, type ErrorInfo } from 'react';

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('App crash:', error, info); }
  render() {
    if (this.state.error) {
      const err = this.state.error as Error;
      return (
        <div style={{ padding: 40, fontFamily: 'monospace', background: '#fff1f0', minHeight: '100vh' }}>
          <h2 style={{ color: '#cf1322' }}>Admin panel failed to load</h2>
          <p><strong>{err.name}:</strong> {err.message}</p>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, background: '#fff', padding: 16, border: '1px solid #ffa39e' }}>
            {err.stack}
          </pre>
          <button onClick={() => { localStorage.clear(); sessionStorage.clear(); window.location.reload(); }}
            style={{ marginTop: 16, padding: '8px 16px', cursor: 'pointer' }}>
            Clear storage & reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}


import { authProvider } from "./providers/auth-provider";
import { dataProvider } from "./providers/data-provider";
import { accessControlProvider } from "./providers/access-control-provider";
import { resources } from "./config/resources";
import { ThemeProvider, useThemeMode } from "./contexts/theme-context";
import { AdminLayout } from "./components/layout";
import { LoginPage } from "./pages/login";
import { TwoFactorPage } from "./pages/login/two-factor";
import { DashboardPage } from "./pages/dashboard";
import { UserList } from "./pages/users/list";
import { UserShow } from "./pages/users/show";
import { UserEdit } from "./pages/users/edit";
import { ModerationList } from "./pages/moderation/list";
import { CategoryList } from "./pages/categories/list";
import { CategoryCreate } from "./pages/categories/create";
import { CategoryEdit } from "./pages/categories/edit";
import { RoleList } from "./pages/roles/list";
import { RoleCreate } from "./pages/roles/create";
import { RoleEdit } from "./pages/roles/edit";
import { RegistrationPolicyPage } from "./pages/registration/policy";
import { RegistrationPendingPage } from "./pages/registration/pending";
import { SystemSettingsPage } from "./pages/system/settings";
import { AnnouncementsPage } from "./pages/system/announcements";
import { LockdownPage } from "./pages/system/lockdown";
import { HealthPage } from "./pages/system/health";
import { AuditLogList } from "./pages/audit/list";
import { AnalyticsPage } from "./pages/analytics";
import { TenantConfigPage } from "./pages/config";

// Full pages (replacing stubs)
import { CrmPage } from "./pages/crm";
import { BlogListPage } from "./pages/blog/list";
import { BlogEditPage } from "./pages/blog/edit";
import { BrokerPage } from "./pages/broker";
import { EmailTemplatesPage } from "./pages/email";
import { EventsAdminPage } from "./pages/events";
import { GamificationPage } from "./pages/gamification";
import { GroupsAdminPage } from "./pages/groups";
import { MatchingPage } from "./pages/matching";
import { NotificationsAdminPage } from "./pages/notifications";
import { OrganisationsPage } from "./pages/organisations";
import { PagesCmsPage } from "./pages/pages-cms";
import { SearchAdminPage } from "./pages/search-admin";
import { TranslationsPage } from "./pages/translations";
import { VettingPage } from "./pages/vetting";
import { SafeguardingPage } from "./pages/safeguarding";
import { JobsAdminPage } from "./pages/jobs";
import { NewsletterPage } from "./pages/newsletter";
import { TimebankingPage } from "./pages/timebanking";
import { ListingsAdminPage } from "./pages/listings";
import { LegalDocumentsPage } from "./pages/legal-documents";
import { ResourcesAdminPage } from "./pages/resources";
import { VolunteeringAdminPage } from "./pages/volunteering";
import { FaqPage } from "./pages/faq";
import { GdprPage } from "./pages/gdpr";
import { EnterprisePage } from "./pages/enterprise";
import { FederationPage } from "./pages/federation";
import { ReportsPage } from "./pages/reports";
import { StaffingPage } from "./pages/staffing";
import { SessionsPage } from "./pages/sessions";
import { SavedSearchesPage } from "./pages/saved-searches";
import { SubAccountsPage } from "./pages/sub-accounts";
import { CompatAdminPage } from "./pages/compat";

function NotFoundPage() {
  return (
    <div style={{ padding: 40, textAlign: "center" }}>
      <h1>404 - Page not found</h1>
      <p>The page you are looking for does not exist.</p>
      <a href="/">Go to dashboard</a>
    </div>
  );
}

function AppInner() {
  const { mode } = useThemeMode();

  const themeConfig = {
    ...RefineThemes.Blue,
    algorithm: mode === "dark" ? theme.darkAlgorithm : theme.defaultAlgorithm,
  };

  return (
    <ConfigProvider theme={themeConfig}>
      <AntApp>
        <Refine
          routerProvider={routerProvider}
          authProvider={authProvider}
          dataProvider={dataProvider}
          accessControlProvider={accessControlProvider}
          notificationProvider={notificationProvider}
          resources={resources}
          options={{
            syncWithLocation: true,
            warnWhenUnsavedChanges: true,
            disableTelemetry: true,
          }}
        >
          <Routes>
            {/* Public routes */}
            <Route
              element={
                <Authenticated key="auth-pages" fallback={<Outlet />}>
                  <Navigate to="/" />
                </Authenticated>
              }
            >
              <Route path="/login" element={<LoginPage />} />
              <Route path="/2fa" element={<TwoFactorPage />} />
            </Route>

            {/* Protected routes */}
            <Route
              element={
                <Authenticated key="authenticated" fallback={<CatchAllNavigate to="/login" />}>
                  <AdminLayout />
                </Authenticated>
              }
            >
              <Route index element={<DashboardPage />} />

              {/* People */}
              <Route path="/users" element={<UserList />} />
              <Route path="/users/:id" element={<UserShow />} />
              <Route path="/users/:id/edit" element={<UserEdit />} />
              <Route path="/crm" element={<CrmPage />} />
              <Route path="/organisations" element={<OrganisationsPage />} />
              <Route path="/broker" element={<BrokerPage />} />

              {/* Content */}
              <Route path="/moderation" element={<ModerationList />} />
              <Route path="/categories" element={<CategoryList />} />
              <Route path="/categories/create" element={<CategoryCreate />} />
              <Route path="/categories/:id/edit" element={<CategoryEdit />} />
              <Route path="/blog" element={<BlogListPage />} />
              <Route path="/blog/create" element={<BlogEditPage />} />
              <Route path="/blog/:id/edit" element={<BlogEditPage />} />
              <Route path="/pages-cms" element={<PagesCmsPage />} />
              <Route path="/faq" element={<FaqPage />} />
              <Route path="/reports" element={<ReportsPage />} />

              {/* Community */}
              <Route path="/events" element={<EventsAdminPage />} />
              <Route path="/groups" element={<GroupsAdminPage />} />
              <Route path="/gamification" element={<GamificationPage />} />
              <Route path="/matching" element={<MatchingPage />} />
              <Route path="/jobs" element={<JobsAdminPage />} />

              {/* Communication */}
              <Route path="/notifications" element={<NotificationsAdminPage />} />
              <Route path="/email-templates" element={<EmailTemplatesPage />} />
              <Route path="/translations" element={<TranslationsPage />} />
              <Route path="/newsletter" element={<NewsletterPage />} />

              {/* Security */}
              <Route path="/roles" element={<RoleList />} />
              <Route path="/roles/create" element={<RoleCreate />} />
              <Route path="/roles/:id/edit" element={<RoleEdit />} />
              <Route path="/vetting" element={<VettingPage />} />
              <Route path="/safeguarding" element={<SafeguardingPage />} />
              <Route path="/audit" element={<AuditLogList />} />
              <Route path="/registration" element={<RegistrationPolicyPage />} />
              <Route path="/registration/pending" element={<RegistrationPendingPage />} />

              {/* System */}
              <Route path="/system/settings" element={<SystemSettingsPage />} />
              <Route path="/system/config" element={<TenantConfigPage />} />
              <Route path="/system/announcements" element={<AnnouncementsPage />} />
              <Route path="/system/lockdown" element={<LockdownPage />} />
              <Route path="/system/health" element={<HealthPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/search-admin" element={<SearchAdminPage />} />
              <Route path="/gdpr" element={<GdprPage />} />
              <Route path="/enterprise" element={<EnterprisePage />} />
              <Route path="/federation" element={<FederationPage />} />
              <Route path="/staffing" element={<StaffingPage />} />
              <Route path="/sessions" element={<SessionsPage />} />
              <Route path="/saved-searches" element={<SavedSearchesPage />} />
              <Route path="/sub-accounts" element={<SubAccountsPage />} />

              {/* V1.5 parity surfaces backed by ASP.NET admin compatibility endpoints */}
              <Route path="/listings" element={<ListingsAdminPage />} />
              <Route path="/attributes" element={<ListingsAdminPage />} />
              <Route path="/menus" element={<ListingsAdminPage />} />
              <Route path="/plans" element={<ListingsAdminPage />} />
              <Route path="/plans/subscriptions" element={<ListingsAdminPage />} />
              <Route path="/moderation/feed" element={<ModerationList />} />
              <Route path="/moderation/comments" element={<ModerationList />} />
              <Route path="/moderation/reviews" element={<ModerationList />} />
              <Route path="/moderation/reports" element={<ModerationList />} />
              <Route path="/moderation/queue" element={<ModerationList />} />
              <Route path="/crm/notes" element={<CrmPage />} />
              <Route path="/crm/tasks" element={<CrmPage />} />
              <Route path="/crm/tags" element={<CrmPage />} />
              <Route path="/crm/timeline" element={<CrmPage />} />
              <Route path="/crm/funnel" element={<CrmPage />} />
              <Route path="/groups/analytics" element={<GroupsAdminPage />} />
              <Route path="/groups/approvals" element={<GroupsAdminPage />} />
              <Route path="/groups/moderation" element={<GroupsAdminPage />} />
              <Route path="/groups/types" element={<GroupsAdminPage />} />
              <Route path="/groups/recommendations" element={<GroupsAdminPage />} />
              <Route path="/jobs/moderation" element={<JobsAdminPage />} />
              <Route path="/jobs/bias-audit" element={<JobsAdminPage />} />
              <Route path="/jobs/pipeline" element={<JobsAdminPage />} />
              <Route path="/jobs/templates" element={<JobsAdminPage />} />
              <Route path="/gamification/analytics" element={<GamificationPage />} />
              <Route path="/gamification/campaigns" element={<GamificationPage />} />
              <Route path="/gamification/badge-config" element={<GamificationPage />} />
              <Route path="/custom-badges" element={<GamificationPage />} />
              <Route path="/smart-matching" element={<MatchingPage />} />
              <Route path="/smart-matching/analytics" element={<MatchingPage />} />
              <Route path="/smart-matching/configuration" element={<MatchingPage />} />
              <Route path="/match-approvals" element={<MatchingPage />} />
              <Route path="/newsletters" element={<NewsletterPage />} />
              <Route path="/newsletters/subscribers" element={<NewsletterPage />} />
              <Route path="/newsletters/segments" element={<NewsletterPage />} />
              <Route path="/newsletters/templates" element={<NewsletterPage />} />
              <Route path="/newsletters/analytics" element={<NewsletterPage />} />
              <Route path="/newsletters/bounces" element={<NewsletterPage />} />
              <Route path="/newsletters/diagnostics" element={<NewsletterPage />} />
              <Route path="/ai-settings" element={<CompatAdminPage title="AI Settings" apiPath="/api/admin/config/ai" />} />
              <Route path="/email-settings" element={<CompatAdminPage title="Email Settings" apiPath="/api/admin/email/config" />} />
              <Route path="/algorithm-settings" element={<CompatAdminPage title="Algorithm Settings" apiPath="/api/admin/config/algorithms" />} />
              <Route path="/seo" element={<CompatAdminPage title="SEO Overview" apiPath="/api/admin/config/seo" />} />
              <Route path="/404-errors" element={<CompatAdminPage title="404 Error Tracking" apiPath="/api/admin/404-errors" />} />
              <Route path="/timebanking" element={<TimebankingPage />} />
              <Route path="/timebanking/alerts" element={<TimebankingPage />} />
              <Route path="/timebanking/org-wallets" element={<TimebankingPage />} />
              <Route path="/timebanking/starting-balances" element={<TimebankingPage />} />
              <Route path="/enterprise/roles" element={<EnterprisePage />} />
              <Route path="/enterprise/permissions" element={<EnterprisePage />} />
              <Route path="/enterprise/gdpr" element={<EnterprisePage />} />
              <Route path="/enterprise/gdpr/requests" element={<EnterprisePage />} />
              <Route path="/enterprise/gdpr/consents" element={<EnterprisePage />} />
              <Route path="/enterprise/gdpr/breaches" element={<EnterprisePage />} />
              <Route path="/enterprise/gdpr/audit" element={<EnterprisePage />} />
              <Route path="/enterprise/monitoring" element={<EnterprisePage />} />
              <Route path="/enterprise/monitoring/health" element={<EnterprisePage />} />
              <Route path="/enterprise/monitoring/logs" element={<EnterprisePage />} />
              <Route path="/enterprise/config" element={<EnterprisePage />} />
              <Route path="/enterprise/config/secrets" element={<EnterprisePage />} />
              <Route path="/enterprise/config/features" element={<EnterprisePage />} />
              <Route path="/legal-documents" element={<LegalDocumentsPage />} />
              <Route path="/legal-documents/compliance" element={<LegalDocumentsPage />} />
              <Route path="/federation/partnerships" element={<FederationPage />} />
              <Route path="/federation/directory" element={<FederationPage />} />
              <Route path="/federation/analytics" element={<FederationPage />} />
              <Route path="/federation/data" element={<FederationPage />} />
              <Route path="/federation/credit-agreements" element={<FederationPage />} />
              <Route path="/federation/neighborhoods" element={<FederationPage />} />
              <Route path="/federation/external-partners" element={<FederationPage />} />
              <Route path="/federation/webhooks" element={<FederationPage />} />
              <Route path="/cron-jobs" element={<CompatAdminPage title="Cron Jobs" apiPath="/api/admin/cron-jobs" />} />
              <Route path="/cron-jobs/logs" element={<CompatAdminPage title="Cron Job Logs" apiPath="/api/admin/cron-jobs/logs" />} />
              <Route path="/cron-jobs/settings" element={<CompatAdminPage title="Cron Job Settings" apiPath="/api/admin/cron-jobs/settings" />} />
              <Route path="/activity-log" element={<CompatAdminPage title="Activity Log" apiPath="/api/admin/dashboard/activity" />} />
              <Route path="/volunteering" element={<VolunteeringAdminPage />} />
              <Route path="/volunteering/approvals" element={<VolunteeringAdminPage />} />
              <Route path="/volunteering/expenses" element={<VolunteeringAdminPage />} />
              <Route path="/volunteering/training" element={<VolunteeringAdminPage />} />
              <Route path="/volunteering/safeguarding" element={<VolunteeringAdminPage />} />
              <Route path="/polls" element={<CompatAdminPage title="Polls" apiPath="/api/admin/polls" />} />
              <Route path="/goals" element={<CompatAdminPage title="Goals" apiPath="/api/admin/goals" />} />
              <Route path="/resources" element={<ResourcesAdminPage />} />
              <Route path="/resources/categories" element={<ResourcesAdminPage />} />
              <Route path="/marketplace" element={<CompatAdminPage title="Marketplace" apiPath="/api/admin/marketplace" />} />
              <Route path="/marketplace/moderation" element={<CompatAdminPage title="Marketplace Moderation" apiPath="/api/admin/marketplace/moderation" />} />
              <Route path="/marketplace/sellers" element={<CompatAdminPage title="Marketplace Sellers" apiPath="/api/admin/marketplace/sellers" />} />
              <Route path="/marketplace/coupons" element={<CompatAdminPage title="Coupons" apiPath="/api/admin/marketplace/coupons" />} />
              <Route path="/ideation" element={<CompatAdminPage title="Ideation" apiPath="/api/admin/ideation" />} />
              <Route path="/deliverability" element={<CompatAdminPage title="Deliverability" apiPath="/api/admin/deliverability/dashboard" />} />
              <Route path="/deliverability/list" element={<CompatAdminPage title="Deliverables" apiPath="/api/admin/deliverability" />} />
              <Route path="/deliverability/analytics" element={<CompatAdminPage title="Deliverability Analytics" apiPath="/api/admin/deliverability/analytics" />} />
              <Route path="/super" element={<CompatAdminPage title="Super Admin" apiPath="/api/admin/super/dashboard" />} />
              <Route path="/super/tenants" element={<CompatAdminPage title="Tenants" apiPath="/api/admin/super/tenants" />} />
              <Route path="/super/tenants/hierarchy" element={<CompatAdminPage title="Tenant Hierarchy" apiPath="/api/admin/super/tenants/hierarchy" />} />
              <Route path="/pages" element={<CompatAdminPage title="Pages" apiPath="/api/admin/pages" />} />
              <Route path="/pages/builder/:id" element={<CompatAdminPage title="Page Builder" apiPath="/api/admin/pages" />} />
              <Route path="/menus/builder/:id" element={<CompatAdminPage title="Menu Builder" apiPath="/api/admin/menus" />} />
              <Route path="/blog/edit/:id" element={<BlogEditPage />} />
              <Route path="/categories/edit/:id" element={<CategoryEdit />} />
              <Route path="/newsletters/create" element={<NewsletterPage />} />
              <Route path="/newsletters/edit/:id" element={<NewsletterPage />} />
              <Route path="/newsletters/segments/create" element={<NewsletterPage />} />
              <Route path="/newsletters/segments/edit/:id" element={<NewsletterPage />} />
              <Route path="/newsletters/templates/create" element={<NewsletterPage />} />
              <Route path="/newsletters/templates/edit/:id" element={<NewsletterPage />} />
              <Route path="/newsletters/send-time-optimizer" element={<NewsletterPage />} />
              <Route path="/newsletters/:id/stats" element={<NewsletterPage />} />
              <Route path="/newsletters/:id/activity" element={<NewsletterPage />} />
              <Route path="/safeguarding-options" element={<SafeguardingPage />} />
              <Route path="/settings" element={<SystemSettingsPage />} />
              <Route path="/settings/registration-policy" element={<RegistrationPolicyPage />} />
              <Route path="/onboarding-settings" element={<CompatAdminPage title="Onboarding Settings" apiPath="/api/admin/onboarding-settings" />} />
              <Route path="/tenant-features" element={<CompatAdminPage title="Tenant Features" apiPath="/api/admin/config/features" />} />
              <Route path="/module-configuration" element={<CompatAdminPage title="Module Configuration" apiPath="/api/admin/config/modules" />} />
              <Route path="/translation-config" element={<CompatAdminPage title="Translation Config" apiPath="/api/admin/config/languages" />} />
              <Route path="/seed-generator" element={<CompatAdminPage title="Seed Generator" apiPath="/api/admin/seed-generator" />} />
              <Route path="/tests" element={<CompatAdminPage title="Test Runner" apiPath="/api/admin/tests" />} />
              <Route path="/webp-converter" element={<CompatAdminPage title="WebP Converter" apiPath="/api/admin/webp-converter" />} />
              <Route path="/image-settings" element={<CompatAdminPage title="Image Settings" apiPath="/api/admin/config/images" />} />
              <Route path="/native-app" element={<CompatAdminPage title="Native App" apiPath="/api/admin/config/native-app" />} />
              <Route path="/blog-restore" element={<CompatAdminPage title="Blog Restore" apiPath="/api/admin/blog/restore" />} />
              <Route path="/reports/members" element={<CompatAdminPage title="Member Reports" apiPath="/api/admin/reports/members" />} />
              <Route path="/reports/hours" element={<CompatAdminPage title="Hours Reports" apiPath="/api/admin/reports/hours" />} />
              <Route path="/reports/inactive-members" element={<CompatAdminPage title="Inactive Members" apiPath="/api/admin/reports/inactive-members" />} />
              <Route path="/reports/municipal-impact" element={<CompatAdminPage title="Municipal Impact Reports" apiPath="/api/admin/reports/municipal-impact" />} />
              <Route path="/impact-report" element={<CompatAdminPage title="Impact Report" apiPath="/api/admin/impact-report" />} />
              <Route path="/performance" element={<CompatAdminPage title="Performance Dashboard" apiPath="/api/admin/performance" />} />
              <Route path="/matching-diagnostic" element={<CompatAdminPage title="Matching Diagnostic" apiPath="/api/admin/matching-diagnostic" />} />
              <Route path="/nexus-score/analytics" element={<CompatAdminPage title="NexusScore Analytics" apiPath="/api/admin/nexus-score/analytics" />} />
              <Route path="/smart-match-users" element={<CompatAdminPage title="Smart Match Users" apiPath="/api/admin/smart-match-users" />} />
              <Route path="/smart-match-monitoring" element={<CompatAdminPage title="Smart Match Monitoring" apiPath="/api/admin/smart-match-monitoring" />} />
              <Route path="/users/create" element={<CompatAdminPage title="Create User" apiPath="/api/admin/users" />} />
              <Route path="/users/:id/permissions" element={<CompatAdminPage title="User Permissions" apiPath="/api/admin/enterprise/permissions" />} />
              <Route path="/tenants" element={<CompatAdminPage title="Tenants" apiPath="/api/admin/super/tenants" />} />
              <Route path="/tenants/create" element={<CompatAdminPage title="Create Tenant" apiPath="/api/admin/super/tenants" />} />
              <Route path="/tenants/:id" element={<CompatAdminPage title="Tenant Detail" apiPath="/api/admin/super/tenants/:id" />} />
              <Route path="/tenants/:id/edit" element={<CompatAdminPage title="Edit Tenant" apiPath="/api/admin/super/tenants/:id" />} />
              <Route path="/tenants/hierarchy" element={<CompatAdminPage title="Tenant Hierarchy" apiPath="/api/admin/super/tenants/hierarchy" />} />
              <Route path="/provisioning-requests" element={<CompatAdminPage title="Provisioning Requests" apiPath="/api/admin/provisioning-requests" />} />
              <Route path="/platform/pilot-inquiries" element={<CompatAdminPage title="Pilot Inquiries" apiPath="/api/admin/platform/pilot-inquiries" />} />
              <Route path="/community-analytics" element={<CompatAdminPage title="Community Analytics" apiPath="/api/admin/community-analytics" />} />
              <Route path="/analytics/regional" element={<CompatAdminPage title="Regional Analytics" apiPath="/api/admin/analytics/regional" />} />
              <Route path="/regional-points" element={<CompatAdminPage title="Regional Points" apiPath="/api/admin/regional-points" />} />
              <Route path="/national/kiss" element={<CompatAdminPage title="National KISS Dashboard" apiPath="/api/admin/national/kiss" />} />
              <Route path="/agents" element={<CompatAdminPage title="Agents" apiPath="/api/admin/agents" />} />
              <Route path="/agents/proposals" element={<CompatAdminPage title="Agent Proposals" apiPath="/api/admin/agents/proposals" />} />
              <Route path="/agents/runs" element={<CompatAdminPage title="Agent Runs" apiPath="/api/admin/agents/runs" />} />
              <Route path="/ai/ki-agents" element={<CompatAdminPage title="KI Agents" apiPath="/api/admin/ai/ki-agents" />} />
              <Route path="/advertising/campaigns" element={<CompatAdminPage title="Ad Campaigns" apiPath="/api/admin/advertising/campaigns" />} />
              <Route path="/advertising/push-campaigns" element={<CompatAdminPage title="Push Campaigns" apiPath="/api/admin/advertising/push-campaigns" />} />
              <Route path="/billing" element={<CompatAdminPage title="Billing" apiPath="/api/admin/billing" />} />
              <Route path="/billing/plans" element={<CompatAdminPage title="Billing Plans" apiPath="/api/admin/billing/plans" />} />
              <Route path="/billing/invoices" element={<CompatAdminPage title="Invoices" apiPath="/api/admin/billing/invoices" />} />
              <Route path="/billing/revenue" element={<CompatAdminPage title="Revenue Dashboard" apiPath="/api/admin/billing/revenue" />} />
              <Route path="/member-premium" element={<CompatAdminPage title="Member Premium" apiPath="/api/admin/member-premium" />} />
              <Route path="/member-premium/subscribers" element={<CompatAdminPage title="Premium Subscribers" apiPath="/api/admin/member-premium/subscribers" />} />
              <Route path="/broker-controls" element={<BrokerPage />} />
              <Route path="/broker-controls/*" element={<BrokerPage />} />
              <Route path="/bulk" element={<CompatAdminPage title="Bulk Operations" apiPath="/api/admin/super/bulk" />} />
              <Route path="/billing/checkout-return" element={<CompatAdminPage title="Checkout Return" apiPath="/api/admin/billing/checkout-return" />} />
              <Route path="/cron-jobs/setup" element={<CompatAdminPage title="Cron Job Setup" apiPath="/api/admin/cron-jobs/setup" />} />
              <Route path="/custom-badges/create" element={<CompatAdminPage title="Create Custom Badge" apiPath="/api/admin/gamification/badges" />} />
              <Route path="/deliverability/create" element={<CompatAdminPage title="Create Deliverable" apiPath="/api/admin/deliverability" />} />
              <Route path="/deliverability/edit/:id" element={<CompatAdminPage title="Edit Deliverable" apiPath="/api/admin/deliverability" />} />
              <Route path="/enterprise/fadp" element={<CompatAdminPage title="FADP" apiPath="/api/admin/enterprise/fadp" />} />
              <Route path="/enterprise/gdpr/breaches/:id" element={<EnterprisePage />} />
              <Route path="/enterprise/gdpr/consent-types" element={<EnterprisePage />} />
              <Route path="/enterprise/gdpr/requests/create" element={<EnterprisePage />} />
              <Route path="/enterprise/gdpr/requests/:id" element={<EnterprisePage />} />
              <Route path="/enterprise/monitoring/log-files" element={<EnterprisePage />} />
              <Route path="/enterprise/monitoring/log-files/:filename" element={<EnterprisePage />} />
              <Route path="/enterprise/monitoring/requirements" element={<EnterprisePage />} />
              <Route path="/enterprise/roles/create" element={<EnterprisePage />} />
              <Route path="/enterprise/roles/:id" element={<EnterprisePage />} />
              <Route path="/enterprise/roles/:id/edit" element={<EnterprisePage />} />
              <Route path="/feed-algorithm" element={<CompatAdminPage title="Feed Algorithm" apiPath="/api/admin/config/feed-algorithm" />} />
              <Route path="/gamification/campaigns/create" element={<GamificationPage />} />
              <Route path="/gamification/campaigns/edit/:id" element={<GamificationPage />} />
              <Route path="/geocode-groups" element={<GroupsAdminPage />} />
              <Route path="/group-locations" element={<GroupsAdminPage />} />
              <Route path="/group-ranking" element={<GroupsAdminPage />} />
              <Route path="/group-types" element={<GroupsAdminPage />} />
              <Route path="/groups/:id/detail" element={<GroupsAdminPage />} />
              <Route path="/groups/:id/edit" element={<GroupsAdminPage />} />
              <Route path="/groups/ranking" element={<GroupsAdminPage />} />
              <Route path="/help" element={<CompatAdminPage title="Admin Help" apiPath="/api/admin/help" />} />
              <Route path="/landing-page" element={<CompatAdminPage title="Landing Page Builder" apiPath="/api/admin/pages" />} />
              <Route path="/legal-documents/create" element={<LegalDocumentsPage />} />
              <Route path="/legal-documents/:id" element={<LegalDocumentsPage />} />
              <Route path="/legal-documents/:id/edit" element={<LegalDocumentsPage />} />
              <Route path="/legal-documents/:id/versions" element={<LegalDocumentsPage />} />
              <Route path="/match-approvals/:id" element={<MatchingPage />} />
              <Route path="/match-debug" element={<MatchingPage />} />
              <Route path="/plans/create" element={<ListingsAdminPage />} />
              <Route path="/plans/edit/:id" element={<ListingsAdminPage />} />
              <Route path="/regional-analytics/subscriptions" element={<CompatAdminPage title="Regional Analytics Subscriptions" apiPath="/api/admin/regional-analytics/subscriptions" />} />
              <Route path="/reports/social-value" element={<CompatAdminPage title="Social Value Reports" apiPath="/api/admin/reports/social-value" />} />
              <Route path="/resources/create" element={<ResourcesAdminPage />} />
              <Route path="/resources/edit/:id" element={<ResourcesAdminPage />} />
              <Route path="/seo/audit" element={<CompatAdminPage title="SEO Audit" apiPath="/api/admin/config/seo/audit" />} />
              <Route path="/seo/redirects" element={<CompatAdminPage title="Redirects" apiPath="/api/admin/config/seo/redirects" />} />
              <Route path="/timebanking/create-org" element={<TimebankingPage />} />
              <Route path="/timebanking/user-report" element={<TimebankingPage />} />
              <Route path="/timebanking/user-report/:id" element={<TimebankingPage />} />
              <Route path="/volunteering/config" element={<VolunteeringAdminPage />} />
              <Route path="/volunteering/consents" element={<VolunteeringAdminPage />} />
              <Route path="/volunteering/giving-days" element={<VolunteeringAdminPage />} />
              <Route path="/volunteering/hours" element={<VolunteeringAdminPage />} />
              <Route path="/volunteering/organizations" element={<VolunteeringAdminPage />} />
              <Route path="/volunteering/projects" element={<VolunteeringAdminPage />} />
              <Route path="/federation/activity" element={<FederationPage />} />
              <Route path="/federation/aggregates" element={<FederationPage />} />
              <Route path="/federation/api-docs" element={<FederationPage />} />
              <Route path="/federation/api-keys" element={<FederationPage />} />
              <Route path="/federation/api-keys/create" element={<FederationPage />} />
              <Route path="/federation/audit" element={<FederationPage />} />
              <Route path="/federation/cc-config" element={<FederationPage />} />
              <Route path="/federation/directory/profile" element={<FederationPage />} />
              <Route path="/federation/tenant/:tenantId/features" element={<FederationPage />} />
              <Route path="/federation/whitelist" element={<FederationPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
          <DocumentTitleHandler />
        </Refine>
      </AntApp>
    </ConfigProvider>
  );
}

export default function App() {
  return (
    <ErrorBoundary><BrowserRouter>
      <ThemeProvider>
        <AppInner />
      </ThemeProvider>
    </BrowserRouter></ErrorBoundary>
  );
}
