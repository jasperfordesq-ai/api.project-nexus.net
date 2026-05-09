// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/**
 * Admin Layout Shell
 * Provides the admin sidebar + header + content area.
 * All admin pages render inside this layout.
 */

import { useState } from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import { Button } from '@heroui/react';
import { AlertTriangle } from 'lucide-react';
import { AdminSidebar } from './components/AdminSidebar';
import { AdminHeader } from './components/AdminHeader';
import { AdminBreadcrumbs } from './components/AdminBreadcrumbs';
import { DevelopmentStatusBanner } from '@/components/layout/DevelopmentStatusBanner';
import { ErrorBoundary } from '@/components/feedback/ErrorBoundary';

// Per-page admin fallback: shows a friendly empty-state when an admin module
// crashes (typically because the API returned a stub shape that the page's
// render path didn't expect). Keeps the rest of the admin navigable.
function AdminPageFallback() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6 py-12">
      <div className="max-w-lg text-center">
        <AlertTriangle className="mx-auto mb-4 h-10 w-10 text-warning-500" />
        <h2 className="mb-2 text-lg font-semibold">This admin page didn't load</h2>
        <p className="mb-6 text-sm text-default-500">
          The page expected data from the API that wasn't available, so it stopped
          rendering instead of showing partial state. The rest of the admin still
          works — try another item in the sidebar, or reload to retry this one.
        </p>
        <div className="flex justify-center gap-2">
          <Button color="primary" variant="flat" as={Link} to="/admin">
            Admin home
          </Button>
          <Button variant="bordered" onPress={() => window.location.reload()}>
            Reload
          </Button>
        </div>
      </div>
    </div>
  );
}

export function AdminLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background">
      {/* Development status banner — always visible, non-dismissible */}
      <DevelopmentStatusBanner />

      {/* Sidebar — hidden on mobile, shown on md+ */}
      <div className="hidden md:block">
        <AdminSidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed((prev) => !prev)}
        />
      </div>

      {/* Header */}
      <AdminHeader sidebarCollapsed={sidebarCollapsed} onSidebarToggle={() => setMobileSidebarOpen(true)} />

      {/* Mobile sidebar overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}
      {/* Mobile sidebar drawer */}
      {mobileSidebarOpen && (
        <div className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-divider bg-content1 transition-transform duration-300 md:hidden">
          <AdminSidebar
            collapsed={false}
            onToggle={() => setMobileSidebarOpen(false)}
          />
        </div>
      )}

      {/* Main content */}
      <main
        className={`min-h-screen pt-16 transition-all duration-300 ${
          sidebarCollapsed ? 'md:ml-16' : 'md:ml-64'
        }`}
      >
        <div className="p-3 sm:p-4 md:p-6">
          <AdminBreadcrumbs />
          {/* key={location.pathname} forces a fresh ErrorBoundary on every route
              change, so a crash on one admin page does not poison the next one. */}
          <ErrorBoundary key={location.pathname} fallback={<AdminPageFallback />}>
            <Outlet />
          </ErrorBoundary>
        </div>
      </main>
    </div>
  );
}

export default AdminLayout;
