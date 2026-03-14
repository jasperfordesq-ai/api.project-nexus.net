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
            Clear storage &amp; reload
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
import { JobsAdminPage } from "./pages/jobs";
import { NewsletterPage } from "./pages/newsletter";
import { FaqPage } from "./pages/faq";
import { GdprPage } from "./pages/gdpr";
import { EnterprisePage } from "./pages/enterprise";
import { FederationPage } from "./pages/federation";
import { ReportsPage } from "./pages/reports";
import { StaffingPage } from "./pages/staffing";
import { SessionsPage } from "./pages/sessions";
import { SavedSearchesPage } from "./pages/saved-searches";
import { SubAccountsPage } from "./pages/sub-accounts";

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
