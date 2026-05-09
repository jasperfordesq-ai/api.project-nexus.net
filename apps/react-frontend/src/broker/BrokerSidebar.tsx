// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/**
 * Broker Sidebar — V1 redesign parity port.
 *
 * The Broker Panel is a SEPARATE app from /admin. It shares the API
 * (AdminBrokerController) but has its own narrowed sidebar focused on
 * day-to-day broker workflow: members → exchanges → messages → compliance.
 */

import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@heroui/react';
import { useAuth, useTenant } from '@/contexts';
import { adminBroker } from '@/admin/api/adminApi';
import {
  LayoutDashboard,
  Users,
  Sparkles,
  ArrowLeftRight,
  MessageSquareWarning,
  ShieldCheck,
  FileCheck,
  Eye,
  AlertTriangle,
  Archive,
  Cog,
  HelpCircle,
  Settings,
  PanelLeftClose,
  PanelLeft,
  type LucideIcon,
} from 'lucide-react';

interface BrokerNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badgeKey?: 'unreviewed_messages' | 'pending_exchanges' | 'safeguarding_alerts' | 'pending_members';
  urgent?: boolean;
}

interface BrokerNavGroup {
  label: string;
  items: BrokerNavItem[];
}

const NAV_GROUPS: BrokerNavGroup[] = [
  {
    label: 'Daily Workflow',
    items: [
      { label: 'Members', href: '/broker/members', icon: Users, badgeKey: 'pending_members' },
      { label: 'Onboarding', href: '/broker/onboarding', icon: Sparkles },
      { label: 'Exchanges', href: '/broker/exchanges', icon: ArrowLeftRight, badgeKey: 'pending_exchanges' },
      { label: 'Messages', href: '/broker/messages', icon: MessageSquareWarning, badgeKey: 'unreviewed_messages', urgent: true },
    ],
  },
  {
    label: 'Compliance',
    items: [
      { label: 'Safeguarding', href: '/broker/safeguarding', icon: ShieldCheck, badgeKey: 'safeguarding_alerts', urgent: true },
      { label: 'Vetting', href: '/broker/vetting', icon: FileCheck },
      { label: 'Monitoring', href: '/broker/monitoring', icon: Eye },
      { label: 'Risk Tags', href: '/broker/risk-tags', icon: AlertTriangle },
      { label: 'Insurance', href: '/broker/insurance', icon: FileCheck },
    ],
  },
  {
    label: 'Records',
    items: [
      { label: 'Archives', href: '/broker/archives', icon: Archive },
    ],
  },
  {
    label: 'Settings',
    items: [
      { label: 'Configuration', href: '/broker/configuration', icon: Cog },
      { label: 'Help', href: '/broker/help', icon: HelpCircle },
    ],
  },
];

interface BadgeCounts {
  unreviewed_messages: number;
  pending_exchanges: number;
  safeguarding_alerts: number;
  pending_members: number;
}

interface BrokerSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function BrokerSidebar({ collapsed, onToggle }: BrokerSidebarProps) {
  const location = useLocation();
  const { tenantPath } = useTenant();
  const { user } = useAuth();
  const userRecord = user as Record<string, unknown> | null;
  const isAdmin =
    (user?.role as string) === 'admin' ||
    (user?.role as string) === 'tenant_admin' ||
    (user?.role as string) === 'super_admin' ||
    userRecord?.is_admin === true ||
    userRecord?.is_super_admin === true ||
    userRecord?.is_tenant_super_admin === true;

  const [badges, setBadges] = useState<BadgeCounts>({
    unreviewed_messages: 0,
    pending_exchanges: 0,
    safeguarding_alerts: 0,
    pending_members: 0,
  });

  const fetchBadges = useCallback(async () => {
    try {
      const res = await adminBroker.getUnreviewedCount();
      const next: BadgeCounts = { ...badges };
      if (res.success && res.data) next.unreviewed_messages = res.data.count;
      setBadges(next);
    } catch {
      /* silent */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchBadges();
    const i = setInterval(fetchBadges, 60000);
    return () => clearInterval(i);
  }, [fetchBadges]);

  const isActive = (href: string) => {
    const fullPath = tenantPath(href);
    if (href === '/broker') return location.pathname === fullPath;
    return location.pathname.startsWith(fullPath);
  };

  const renderItem = (item: BrokerNavItem) => {
    const Icon = item.icon;
    const count = item.badgeKey ? badges[item.badgeKey] : 0;
    return (
      <li key={item.href}>
        <Link
          to={tenantPath(item.href)}
          className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors ${
            isActive(item.href)
              ? 'bg-primary/10 text-primary font-medium'
              : 'text-default-500 hover:bg-default-100 hover:text-foreground'
          }`}
          title={collapsed ? item.label : undefined}
        >
          <Icon size={16} className="shrink-0" />
          {!collapsed && <span>{item.label}</span>}
          {!collapsed && count > 0 && (
            <span
              className={`ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                item.urgent ? 'bg-danger text-danger-foreground' : 'bg-primary text-primary-foreground'
              }`}
            >
              {count}
            </span>
          )}
        </Link>
      </li>
    );
  };

  return (
    <aside
      className={`fixed left-0 top-0 z-40 h-screen border-r border-divider bg-content1 transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Header */}
      <div className="flex h-16 items-center justify-between border-b border-divider px-4">
        {!collapsed && (
          <Link to={tenantPath('/broker')} className="flex items-center gap-2 text-lg font-bold text-foreground">
            <ShieldCheck size={20} className="text-primary" />
            <span>Broker</span>
          </Link>
        )}
        <Button
          variant="light"
          isIconOnly
          onPress={onToggle}
          className="rounded-lg p-2 text-default-500 hover:bg-default-100 hover:text-foreground min-w-0 h-auto"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <PanelLeft size={20} /> : <PanelLeftClose size={20} />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="h-[calc(100vh-4rem)] overflow-y-auto px-2 py-3">
        <ul className="space-y-1">
          {/* Dashboard */}
          <li>
            <Link
              to={tenantPath('/broker')}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                location.pathname === tenantPath('/broker')
                  ? 'bg-primary/10 text-primary'
                  : 'text-default-600 hover:bg-default-100 hover:text-foreground'
              }`}
              title={collapsed ? 'Dashboard' : undefined}
            >
              <LayoutDashboard size={20} className="shrink-0" />
              {!collapsed && <span>Dashboard</span>}
            </Link>
          </li>

          {NAV_GROUPS.map((group) => (
            <li key={group.label} className="pt-3">
              {!collapsed && (
                <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-default-400">
                  {group.label}
                </p>
              )}
              <ul className="space-y-0.5">
                {group.items.map(renderItem)}
              </ul>
            </li>
          ))}

          {/* Footer link back to admin (only if user is admin) */}
          {isAdmin && (
            <li className="pt-6">
              {!collapsed && <div className="my-2 border-t border-divider" />}
              <Link
                to={tenantPath('/admin')}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-default-500 hover:bg-default-100 hover:text-foreground"
                title={collapsed ? 'Full Admin' : undefined}
              >
                <Settings size={18} className="shrink-0" />
                {!collapsed && <span>Full Admin</span>}
              </Link>
            </li>
          )}
        </ul>
      </nav>
    </aside>
  );
}

export default BrokerSidebar;
