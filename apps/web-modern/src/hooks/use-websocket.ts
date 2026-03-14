"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { getToken } from "@/lib/api";
import { logger } from "@/lib/logger";

export type WebSocketStatus = "connecting" | "connected" | "disconnected" | "error";

export interface WebSocketMessage<T = unknown> {
  type: string;
  payload: T;
  timestamp?: string;
}

interface UseWebSocketOptions {
  url: string;
  onMessage?: (message: WebSocketMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  /** Maximum number of reconnection attempts before giving up (default: 10) */
  reconnectAttempts?: number;
  /** Base reconnection interval in ms; doubles each attempt up to maxReconnectInterval (default: 1000) */
  reconnectInterval?: number;
  /** Maximum reconnection interval in ms (default: 30000) */
  maxReconnectInterval?: number;
  enabled?: boolean;
}

export function useWebSocket({
  url,
  onMessage,
  onConnect,
  onDisconnect,
  onError,
  reconnectAttempts = 10,
  reconnectInterval = 1000,
  maxReconnectInterval = 30000,
  enabled = true,
}: UseWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectCountRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [status, setStatus] = useState<WebSocketStatus>("disconnected");
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);

  const connect = useCallback(() => {
    if (!enabled) return;

    const token = getToken();
    if (!token) {
      logger.warn("WebSocket: No auth token available");
      return;
    }

    // Close existing connection if any
    if (wsRef.current) {
      wsRef.current.close();
    }

    setStatus("connecting");

    // Add token to WebSocket URL
    const wsUrl = new URL(url);
    wsUrl.searchParams.set("token", token);

    try {
      const ws = new WebSocket(wsUrl.toString());
      wsRef.current = ws;

      ws.onopen = () => {
        logger.debug("WebSocket connected");
        setStatus("connected");
        reconnectCountRef.current = 0; // Reset retry count on successful connection
        onConnect?.();
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          setLastMessage(message);
          onMessage?.(message);
        } catch (e) {
          logger.error("WebSocket: Failed to parse message", e);
        }
      };

      ws.onerror = (event) => {
        // Note: Browser WebSocket error events don't expose error details for security reasons
        // The actual error (e.g., connection refused) will trigger onclose
        logger.error("WebSocket error: Connection failed to", wsUrl.origin);
        setStatus("error");
        onError?.(event);
      };

      ws.onclose = () => {
        logger.debug("WebSocket disconnected");
        setStatus("disconnected");
        wsRef.current = null;
        onDisconnect?.();

        // Attempt to reconnect with exponential backoff
        if (
          enabled &&
          reconnectCountRef.current < reconnectAttempts
        ) {
          reconnectCountRef.current += 1;
          const delay = Math.min(
            reconnectInterval * Math.pow(2, reconnectCountRef.current - 1),
            maxReconnectInterval
          );
          logger.debug(
            `WebSocket: Attempting reconnect ${reconnectCountRef.current}/${reconnectAttempts} in ${delay}ms`
          );
          reconnectTimeoutRef.current = setTimeout(connect, delay);
        } else if (reconnectCountRef.current >= reconnectAttempts) {
          logger.warn(`WebSocket: Max reconnection attempts (${reconnectAttempts}) reached`);
        }
      };
    } catch (error) {
      logger.error("WebSocket: Failed to connect", error);
      setStatus("error");
    }
  }, [
    url,
    enabled,
    onMessage,
    onConnect,
    onDisconnect,
    onError,
    reconnectAttempts,
    reconnectInterval,
    maxReconnectInterval,
  ]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    reconnectCountRef.current = reconnectAttempts; // Prevent reconnection

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setStatus("disconnected");
  }, [reconnectAttempts]);

  const send = useCallback((message: WebSocketMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      return true;
    }
    logger.warn("WebSocket: Cannot send, not connected");
    return false;
  }, []);

  // Connect on mount
  useEffect(() => {
    if (enabled) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, connect, disconnect]);

  return {
    status,
    lastMessage,
    send,
    connect,
    disconnect,
    isConnected: status === "connected",
  };
}
