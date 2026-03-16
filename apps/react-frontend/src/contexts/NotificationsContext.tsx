// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/**
 * NEXUS Notifications Context
 *
 * Provides:
 * - Unread count tracking via polling
 * - Real-time unread count updates via SignalR (PusherContext)
 * - Toast notifications for new events
 *
 * Originally used Pusher directly for real-time notifications. Now delegates
 * real-time to the PusherContext (which uses SignalR) and uses polling as
 * the primary mechanism for notification counts.
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import { api } from '@/lib/api';
import { logError } from '@/lib/logger';
import { useAuth } from './AuthContext';
import { usePusherOptional } from './PusherContext';

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

const POLLING_INTERVAL = 60000; // 60 seconds polling

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface NotificationCounts {
  total: number;
  messages: number;
  listings: number;
  transactions: number;
  connections: number;
  events: number;
  groups: number;
  achievements: number;
  system: number;
}

interface NotificationsState {
  unreadCount: number;
  counts: NotificationCounts;
  isConnected: boolean;
  connectionError: string | null;
}

interface NotificationsContextValue extends NotificationsState {
  refreshCounts: () => Promise<void>;
  markAsRead: (id: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────────────────────────

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

// ─────────────────────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────────────────────

interface NotificationsProviderProps {
  children: ReactNode;
}

export function NotificationsProvider({ children }: NotificationsProviderProps) {
  const { user, isAuthenticated } = useAuth();
  const realtime = usePusherOptional();

  const [state, setState] = useState<NotificationsState>({
    unreadCount: 0,
    counts: {
      total: 0,
      messages: 0,
      listings: 0,
      transactions: 0,
      connections: 0,
      events: 0,
      groups: 0,
      achievements: 0,
      system: 0,
    },
    isConnected: false,
    connectionError: null,
  });

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─────────────────────────────────────────────────────────────────────────
  // Fetch Notification Counts
  // ─────────────────────────────────────────────────────────────────────────

  const refreshCounts = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      // Fetch both notification counts and unread message count in parallel
      const [notifResponse, messagesResponse] = await Promise.all([
        api.get<NotificationCounts>('/notifications/counts'),
        api.get<{ count: number }>('/messages/unread-count').catch(() => null),
      ]);

      if (notifResponse.success && notifResponse.data) {
        const counts = notifResponse.data;
        const unreadMessages = messagesResponse?.success ? messagesResponse.data?.count ?? 0 : 0;

        setState((prev) => ({
          ...prev,
          unreadCount: counts.total ?? 0,
          counts: {
            total: counts.total ?? 0,
            messages: unreadMessages,
            listings: counts.listings ?? 0,
            transactions: counts.transactions ?? 0,
            connections: counts.connections ?? 0,
            events: counts.events ?? 0,
            groups: counts.groups ?? 0,
            achievements: counts.achievements ?? 0,
            system: counts.system ?? 0,
          },
        }));
      }
    } catch (error) {
      logError('Failed to fetch notification counts', error);
    }
  }, [isAuthenticated]);

  // ─────────────────────────────────────────────────────────────────────────
  // Mark as Read
  // ─────────────────────────────────────────────────────────────────────────

  const markAsRead = useCallback(async (id: number) => {
    try {
      const response = await api.post(`/notifications/${id}/read`);
      if (response.success) {
        setState((prev) => ({
          ...prev,
          unreadCount: Math.max(0, prev.unreadCount - 1),
        }));
      }
    } catch (error) {
      logError('Failed to mark notification as read', error);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      const response = await api.post('/notifications/read-all');
      if (response.success) {
        setState((prev) => ({
          ...prev,
          unreadCount: 0,
          counts: {
            ...prev.counts,
            total: 0,
            listings: 0,
            transactions: 0,
            connections: 0,
            events: 0,
            groups: 0,
            achievements: 0,
            system: 0,
          },
        }));
      }
    } catch (error) {
      logError('Failed to mark all notifications as read', error);
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Real-time unread count from SignalR (via PusherContext)
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!realtime) return;

    const unsubMessage = realtime.onNewMessage(() => {
      // A new message arrived — bump the unread message count
      setState((prev) => ({
        ...prev,
        counts: {
          ...prev.counts,
          messages: prev.counts.messages + 1,
        },
      }));
    });

    const unsubUnread = realtime.onUnreadCount((data) => {
      setState((prev) => ({
        ...prev,
        counts: {
          ...prev.counts,
          messages: data.messages,
        },
      }));
    });

    return () => {
      unsubMessage();
      unsubUnread();
    };
  }, [realtime]);

  // Track SignalR connection state
  useEffect(() => {
    setState((prev) => ({
      ...prev,
      isConnected: realtime?.isConnected ?? false,
    }));
  }, [realtime?.isConnected]);

  // ─────────────────────────────────────────────────────────────────────────
  // Polling & Init
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      setState((prev) => ({
        ...prev,
        isConnected: false,
        unreadCount: 0,
      }));
      return;
    }

    // Fetch initial counts
    refreshCounts();

    // Set up polling fallback
    pollingRef.current = setInterval(refreshCounts, POLLING_INTERVAL);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [isAuthenticated, user?.id, refreshCounts]);

  // ─────────────────────────────────────────────────────────────────────────
  // Context Value
  // ─────────────────────────────────────────────────────────────────────────

  const value = useMemo<NotificationsContextValue>(
    () => ({
      ...state,
      refreshCounts,
      markAsRead,
      markAllAsRead,
    }),
    [state, refreshCounts, markAsRead, markAllAsRead]
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useNotifications(): NotificationsContextValue {
  const context = useContext(NotificationsContext);

  if (!context) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }

  return context;
}

export default NotificationsContext;
