// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/**
 * Broker Layout Shell — separate from AdminLayout.
 *
 * V1 parity: the Broker Panel is its own self-contained app with a narrowed
 * sidebar and no admin navigation chrome. Pages render inside <Outlet />.
 */

import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { BrokerSidebar } from './BrokerSidebar';
import { AdminHeader } from '@/admin/components/AdminHeader';

export function BrokerLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <div className="hidden md:block">
        <BrokerSidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed((prev) => !prev)}
        />
      </div>

      <AdminHeader sidebarCollapsed={sidebarCollapsed} onSidebarToggle={() => setMobileSidebarOpen(true)} />

      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}
      {mobileSidebarOpen && (
        <div className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-divider bg-content1 transition-transform duration-300 md:hidden">
          <BrokerSidebar collapsed={false} onToggle={() => setMobileSidebarOpen(false)} />
        </div>
      )}

      <main
        className={`min-h-screen pt-16 transition-all duration-300 ${
          sidebarCollapsed ? 'md:ml-16' : 'md:ml-64'
        }`}
      >
        <div className="p-3 sm:p-4 md:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default BrokerLayout;
