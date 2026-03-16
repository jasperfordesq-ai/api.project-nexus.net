// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/**
 * PusherContext - Real-time messaging via SignalR
 *
 * Originally used Pusher for WebSocket connectivity; now uses the ASP.NET Core
 * SignalR hub at /hubs/messages. The exported interface is unchanged so that
 * all consumers (MessagesPage, ConversationPage, FeedPage, etc.) keep working.
 *
 * SignalR hub server methods:
 *   - JoinConversation(conversationId: number)
 *   - LeaveConversation(conversationId: number)
 *
 * SignalR hub client events:
 *   - ReceiveMessage: new message received
 *   - MessageRead: messages marked as read
 *   - ConversationUpdated: conversation metadata changed
 *   - UnreadCountUpdated: total unread count changed
 */

import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from 'react';
import * as signalR from '@microsoft/signalr';
import { useAuth } from './AuthContext';
import { api, tokenManager, API_BASE } from '@/lib/api';
import { logError } from '@/lib/logger';

interface PusherContextValue {
  /** Whether SignalR is connected */
  isConnected: boolean;
  /** Subscribe to a conversation channel (joins SignalR group) */
  subscribeToConversation: (otherUserId: number) => void;
  /** Unsubscribe from a conversation channel (leaves SignalR group) */
  unsubscribeFromConversation: (otherUserId: number) => void;
  /** Register a callback for new messages */
  onNewMessage: (callback: (message: NewMessageEvent) => void) => () => void;
  /** Register a callback for typing indicators */
  onTyping: (callback: (event: TypingEvent) => void) => () => void;
  /** Register a callback for unread count updates */
  onUnreadCount: (callback: (event: UnreadCountEvent) => void) => () => void;
  /** Register a callback for new feed posts */
  onFeedPost: (callback: (event: FeedPostEvent) => void) => () => void;
  /** Send typing indicator */
  sendTyping: (toUserId: number, isTyping: boolean) => void;
}

export interface NewMessageEvent {
  id: number;
  sender_id: number;
  receiver_id: number;
  body: string;
  created_at: string;
  timestamp: number;
}

export interface TypingEvent {
  user_id: number;
  is_typing: boolean;
  timestamp: number;
}

export interface UnreadCountEvent {
  notifications: number;
  messages: number;
  timestamp: number;
}

export interface FeedPostEvent {
  post: import('@/components/feed/types').FeedItem;
  timestamp: number;
}

const PusherContext = createContext<PusherContextValue | null>(null);

interface PusherProviderProps {
  children: ReactNode;
}

/**
 * Resolve the SignalR hub URL.
 * In dev, the Vite proxy handles /hubs/* so we can use a relative URL.
 * In production, the API_BASE may be an absolute URL (e.g. https://api.project-nexus.net/api)
 * in which case we derive the hub URL from the same origin.
 */
function getHubUrl(): string {
  // If API_BASE starts with http, derive hub URL from same origin
  if (API_BASE.startsWith('http')) {
    const url = new URL(API_BASE);
    return `${url.origin}/hubs/messages`;
  }
  // Relative — Vite proxy will forward /hubs/*
  return '/hubs/messages';
}

export function PusherProvider({ children }: PusherProviderProps) {
  const { user, isAuthenticated } = useAuth();
  const [isConnected, setIsConnected] = useState(false);

  const connectionRef = useRef<signalR.HubConnection | null>(null);
  const joinedConversationsRef = useRef<Set<number>>(new Set());

  // Event listeners — same pattern as the original Pusher implementation
  const messageListenersRef = useRef<Set<(message: NewMessageEvent) => void>>(new Set());
  const typingListenersRef = useRef<Set<(event: TypingEvent) => void>>(new Set());
  const unreadListenersRef = useRef<Set<(event: UnreadCountEvent) => void>>(new Set());
  const feedPostListenersRef = useRef<Set<(event: FeedPostEvent) => void>>(new Set());

  // Initialize SignalR connection when authenticated
  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      return;
    }

    const accessToken = tokenManager.getAccessToken();
    if (!accessToken) return;

    const hubUrl = getHubUrl();

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: () => tokenManager.getAccessToken() || '',
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    connectionRef.current = connection;

    // --- Bind SignalR client events to listener callbacks ---

    // ReceiveMessage: new message in a conversation
    connection.on('ReceiveMessage', (message: NewMessageEvent) => {
      messageListenersRef.current.forEach((listener) => listener(message));
    });

    // MessageRead: messages marked as read (could update UI)
    connection.on('MessageRead', (_data: { conversationId: number; readByUserId: number }) => {
      // No direct listener for this yet — consumers can add one if needed
    });

    // ConversationUpdated: conversation metadata changed
    connection.on('ConversationUpdated', (_data: unknown) => {
      // No direct listener — refresh handled by consumers
    });

    // UnreadCountUpdated: total unread count changed
    connection.on('UnreadCountUpdated', (data: { unreadCount: number }) => {
      const event: UnreadCountEvent = {
        notifications: 0,
        messages: data.unreadCount,
        timestamp: Date.now(),
      };
      unreadListenersRef.current.forEach((listener) => listener(event));
    });

    // Connection state handlers
    connection.onreconnecting(() => {
      setIsConnected(false);
    });

    connection.onreconnected(() => {
      setIsConnected(true);
      // Rejoin any conversations we were subscribed to
      joinedConversationsRef.current.forEach((conversationId) => {
        connection.invoke('JoinConversation', conversationId).catch(() => {
          // Silent fail on rejoin — will retry on next reconnect
        });
      });
    });

    connection.onclose(() => {
      setIsConnected(false);
    });

    // Start connection
    connection
      .start()
      .then(() => {
        setIsConnected(true);
      })
      .catch((err) => {
        logError('SignalR connection failed', err);
        setIsConnected(false);
      });

    // Cleanup on unmount
    return () => {
      connection.stop();
      connectionRef.current = null;
      joinedConversationsRef.current.clear();
      setIsConnected(false);
    };
  }, [isAuthenticated, user?.id]);

  /**
   * Subscribe to a conversation — invokes JoinConversation on the SignalR hub.
   * The hub validates that the user is a participant before adding them to the group.
   */
  const subscribeToConversation = useCallback((conversationId: number) => {
    const connection = connectionRef.current;
    if (!connection || connection.state !== signalR.HubConnectionState.Connected) return;

    if (joinedConversationsRef.current.has(conversationId)) return;

    connection
      .invoke('JoinConversation', conversationId)
      .then(() => {
        joinedConversationsRef.current.add(conversationId);
      })
      .catch((err) => {
        logError(`Failed to join conversation ${conversationId}`, err);
      });
  }, []);

  /**
   * Unsubscribe from a conversation — invokes LeaveConversation on the SignalR hub.
   */
  const unsubscribeFromConversation = useCallback((conversationId: number) => {
    const connection = connectionRef.current;
    if (!connection || connection.state !== signalR.HubConnectionState.Connected) return;

    connection
      .invoke('LeaveConversation', conversationId)
      .then(() => {
        joinedConversationsRef.current.delete(conversationId);
      })
      .catch(() => {
        // Silent fail — conversation may already be left
        joinedConversationsRef.current.delete(conversationId);
      });
  }, []);

  /**
   * Register a callback for new messages.
   * Returns an unsubscribe function.
   */
  const onNewMessage = useCallback((callback: (message: NewMessageEvent) => void) => {
    messageListenersRef.current.add(callback);
    return () => {
      messageListenersRef.current.delete(callback);
    };
  }, []);

  /**
   * Register a callback for typing indicators.
   * Returns an unsubscribe function.
   */
  const onTyping = useCallback((callback: (event: TypingEvent) => void) => {
    typingListenersRef.current.add(callback);
    return () => {
      typingListenersRef.current.delete(callback);
    };
  }, []);

  /**
   * Register a callback for unread count updates.
   * Returns an unsubscribe function.
   */
  const onUnreadCount = useCallback((callback: (event: UnreadCountEvent) => void) => {
    unreadListenersRef.current.add(callback);
    return () => {
      unreadListenersRef.current.delete(callback);
    };
  }, []);

  /**
   * Register a callback for new feed posts.
   * Returns an unsubscribe function.
   * Note: Feed posts are not currently broadcast via the SignalR hub —
   * this listener is kept for future implementation.
   */
  const onFeedPost = useCallback((callback: (event: FeedPostEvent) => void) => {
    feedPostListenersRef.current.add(callback);
    return () => {
      feedPostListenersRef.current.delete(callback);
    };
  }, []);

  /**
   * Send typing indicator to another user via HTTP.
   * The SignalR hub does not currently support typing indicators,
   * so we fall back to the REST endpoint.
   */
  const sendTyping = useCallback(async (toUserId: number, isTyping: boolean) => {
    try {
      await api.post('/messages/typing', {
        recipient_id: toUserId,
        is_typing: isTyping,
      });
    } catch {
      // Silent fail - typing indicators are not critical
    }
  }, []);

  const value: PusherContextValue = {
    isConnected,
    subscribeToConversation,
    unsubscribeFromConversation,
    onNewMessage,
    onTyping,
    onUnreadCount,
    onFeedPost,
    sendTyping,
  };

  return (
    <PusherContext.Provider value={value}>
      {children}
    </PusherContext.Provider>
  );
}

/**
 * Hook to access real-time messaging context.
 * Named usePusher for backwards compatibility with existing consumers.
 */
export function usePusher(): PusherContextValue {
  const context = useContext(PusherContext);
  if (!context) {
    throw new Error('usePusher must be used within a PusherProvider');
  }
  return context;
}

/**
 * Hook to optionally access real-time messaging context (returns null if not available).
 */
export function usePusherOptional(): PusherContextValue | null {
  return useContext(PusherContext);
}
