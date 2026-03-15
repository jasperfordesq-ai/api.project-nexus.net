// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

"use client";

import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from "@microsoft/signalr";
import { useEffect, useRef, useState, useCallback } from "react";
import { getToken } from "@/lib/api";
import { logger } from "@/lib/logger";

export type SignalRStatus = "connecting" | "connected" | "disconnected" | "reconnecting" | "error";

export interface MessageNotification {
  id: number;
  conversationId: number;
  content: string;
  sender: {
    id: number;
    firstName: string;
    lastName: string;
  };
  isRead: boolean;
  createdAt: string;
}

export interface MessageReadData {
  conversation_id: number;
  read_by_user_id: number;
  marked_read: number;
}

export interface ConversationUpdatedData {
  conversation_id: number;
  last_message: {
    id: number;
    content: string;
    sender_id: number;
    created_at: string;
  };
}

export interface UnreadCountData {
  unread_count: number;
}

export interface UseMessagesHubOptions {
  onMessage?: (message: MessageNotification) => void;
  onMessageRead?: (data: MessageReadData) => void;
  onConversationUpdated?: (data: ConversationUpdatedData) => void;
  onUnreadCountUpdated?: (count: number) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
  enabled?: boolean;
}

function getHubUrl(): string {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5080";
  return `${baseUrl}/hubs/messages`;
}

export function useMessagesHub({
  onMessage,
  onMessageRead,
  onConversationUpdated,
  onUnreadCountUpdated,
  onConnect,
  onDisconnect,
  onError,
  enabled = true,
}: UseMessagesHubOptions = {}) {
  const connectionRef = useRef<HubConnection | null>(null);
  const [status, setStatus] = useState<SignalRStatus>("disconnected");
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Store callbacks in refs to avoid reconnection on callback changes
  const callbacksRef = useRef({
    onMessage,
    onMessageRead,
    onConversationUpdated,
    onUnreadCountUpdated,
    onConnect,
    onDisconnect,
    onError,
  });

  // Update refs when callbacks change
  useEffect(() => {
    callbacksRef.current = {
      onMessage,
      onMessageRead,
      onConversationUpdated,
      onUnreadCountUpdated,
      onConnect,
      onDisconnect,
      onError,
    };
  }, [onMessage, onMessageRead, onConversationUpdated, onUnreadCountUpdated, onConnect, onDisconnect, onError]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const initialToken = getToken();
    if (!initialToken) {
      logger.warn("MessagesHub: No auth token available, skipping connection");
      return;
    }

    // Track if effect is still active (handles React Strict Mode double-invoke)
    let isActive = true;

    const hubUrl = getHubUrl();
    logger.debug("MessagesHub: Connecting to", hubUrl);

    const connection = new HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: () => getToken() || "",
        withCredentials: false, // Don't send cookies - we use JWT Bearer token
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(LogLevel.Warning)
      .build();

    // Register event handlers
    connection.on("ReceiveMessage", (message: MessageNotification) => {
      logger.debug("MessagesHub: Received message", message);
      callbacksRef.current.onMessage?.(message);
    });

    connection.on("MessageRead", (data: MessageReadData) => {
      logger.debug("MessagesHub: Messages read", data);
      callbacksRef.current.onMessageRead?.(data);
    });

    connection.on("ConversationUpdated", (data: ConversationUpdatedData) => {
      logger.debug("MessagesHub: Conversation updated", data);
      callbacksRef.current.onConversationUpdated?.(data);
    });

    connection.on("UnreadCountUpdated", (data: UnreadCountData) => {
      logger.debug("MessagesHub: Unread count updated", data);
      callbacksRef.current.onUnreadCountUpdated?.(data.unread_count);
    });

    // Connection state handlers
    connection.onreconnecting((error) => {
      if (!isActive) return;
      logger.debug("MessagesHub: Reconnecting...", error?.message);
      setStatus("reconnecting");
      setConnectionError(error?.message || null);
    });

    connection.onreconnected((connectionId) => {
      if (!isActive) return;
      logger.debug("MessagesHub: Reconnected", connectionId);
      setStatus("connected");
      setConnectionError(null);
      callbacksRef.current.onConnect?.();
    });

    connection.onclose((error) => {
      if (!isActive) return;
      logger.debug("MessagesHub: Connection closed", error?.message);
      setStatus("disconnected");
      callbacksRef.current.onDisconnect?.();
    });

    // Start connection
    setStatus("connecting");
    connection
      .start()
      .then(() => {
        if (!isActive) {
          // Effect was cleaned up during connection - stop immediately
          connection.stop().catch(() => {});
          return;
        }
        logger.info("MessagesHub: Connected successfully");
        setStatus("connected");
        setConnectionError(null);
        connectionRef.current = connection;
        callbacksRef.current.onConnect?.();
      })
      .catch((err: Error) => {
        const errorMessage = err.message || "Unknown connection error";
        // "stopped during negotiation" is expected in React Strict Mode - ignore completely
        if (errorMessage.includes("stopped during negotiation") || !isActive) {
          return;
        }
        logger.error("MessagesHub: Connection failed:", errorMessage);
        setStatus("error");
        setConnectionError(errorMessage);
        callbacksRef.current.onError?.(err);
      });

    return () => {
      isActive = false;
      if (connection.state !== HubConnectionState.Disconnected) {
        connection.stop().catch(() => {});
      }
      connectionRef.current = null;
    };
  }, [enabled]);

  const joinConversation = useCallback(async (conversationId: number) => {
    const connection = connectionRef.current;
    if (connection?.state === HubConnectionState.Connected) {
      try {
        await connection.invoke("JoinConversation", conversationId);
        logger.debug("MessagesHub: Joined conversation", conversationId);
      } catch (err) {
        logger.error("MessagesHub: Failed to join conversation", err);
      }
    }
  }, []);

  const leaveConversation = useCallback(async (conversationId: number) => {
    const connection = connectionRef.current;
    if (connection?.state === HubConnectionState.Connected) {
      try {
        await connection.invoke("LeaveConversation", conversationId);
        logger.debug("MessagesHub: Left conversation", conversationId);
      } catch (err) {
        logger.error("MessagesHub: Failed to leave conversation", err);
      }
    }
  }, []);

  return {
    status,
    connectionError,
    isConnected: status === "connected",
    joinConversation,
    leaveConversation,
  };
}
