// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

"use client";

import { useCallback, useState } from "react";
import {
  useMessagesHub,
  type MessageNotification,
  type MessageReadData,
} from "./use-messages-hub";
import type { Message as MessageType } from "@/lib/api";

// Re-export types for backwards compatibility
export type MessageEventType =
  | "new_message"
  | "message_read"
  | "typing_start"
  | "typing_stop"
  | "user_online"
  | "user_offline";

export interface NewMessagePayload {
  message: MessageType;
  conversation_id: number;
}

export interface MessageReadPayload {
  conversation_id: number;
  message_ids: number[];
  reader_id: number;
}

export interface TypingPayload {
  conversation_id: number;
  user_id: number;
  user_name: string;
}

export interface UserStatusPayload {
  user_id: number;
}

interface UseRealtimeMessagesOptions {
  onNewMessage?: (message: MessageType, conversationId: number) => void;
  onMessageRead?: (conversationId: number, messageIds: number[], readerId: number) => void;
  onTypingStart?: (conversationId: number, userId: number, userName: string) => void;
  onTypingStop?: (conversationId: number, userId: number) => void;
  onUserOnline?: (userId: number) => void;
  onUserOffline?: (userId: number) => void;
  enabled?: boolean;
}

export function useRealtimeMessages({
  onNewMessage,
  onMessageRead,
  enabled = true,
}: UseRealtimeMessagesOptions = {}) {
  const [typingUsers, setTypingUsers] = useState<Map<number, Set<number>>>(new Map());
  const [onlineUsers, setOnlineUsers] = useState<Set<number>>(new Set());

  // Handle incoming SignalR message
  const handleMessage = useCallback(
    (notification: MessageNotification) => {
      // Convert SignalR MessageNotification to MessageType
      const message: MessageType = {
        id: notification.id,
        conversation_id: notification.conversation_id,
        content: notification.content,
        sender_id: notification.sender.id,
        read: notification.isRead,
        created_at: notification.createdAt,
      };
      onNewMessage?.(message, notification.conversation_id);
    },
    [onNewMessage]
  );

  // Handle message read events from SignalR
  const handleMessageRead = useCallback(
    (data: MessageReadData) => {
      // SignalR returns marked_read (count) not message_ids array
      // We'll pass an empty array since we don't have specific IDs
      onMessageRead?.(data.conversation_id, [], data.read_by_user_id);
    },
    [onMessageRead]
  );

  const { status, isConnected, joinConversation, leaveConversation } = useMessagesHub({
    onMessage: handleMessage,
    onMessageRead: handleMessageRead,
    enabled,
  });

  // Typing indicators are not currently supported by SignalR hub
  // These are no-op stubs for API compatibility
  const sendTypingStart = useCallback((_conversationId: number) => {
    // Not implemented in SignalR hub yet
  }, []);

  const sendTypingStop = useCallback((_conversationId: number) => {
    // Not implemented in SignalR hub yet
  }, []);

  // Mark messages as read - use the REST API instead of SignalR
  const sendMarkAsRead = useCallback(
    (_conversationId: number, _messageIds: number[]) => {
      // Use api.markConversationAsRead() instead - handled in component
    },
    []
  );

  // Check if a user is typing in a conversation
  const isUserTyping = useCallback(
    (conversationId: number, userId: number) => {
      const conversationTypers = typingUsers.get(conversationId);
      return conversationTypers?.has(userId) || false;
    },
    [typingUsers]
  );

  // Get all typing users for a conversation
  const getTypingUsers = useCallback(
    (conversationId: number) => {
      return typingUsers.get(conversationId) || new Set<number>();
    },
    [typingUsers]
  );

  // Check if a user is online
  const isUserOnline = useCallback(
    (userId: number) => {
      return onlineUsers.has(userId);
    },
    [onlineUsers]
  );

  return {
    status,
    isConnected,
    typingUsers,
    onlineUsers,
    sendTypingStart,
    sendTypingStop,
    sendMarkAsRead,
    isUserTyping,
    getTypingUsers,
    isUserOnline,
    // Expose join/leave for components that need them
    joinConversation,
    leaveConversation,
  };
}
