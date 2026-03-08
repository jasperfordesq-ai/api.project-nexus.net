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
  reconnectAttempts?: number;
  reconnectInterval?: number;
  enabled?: boolean;
}

export function useWebSocket({
  url,
  onMessage,
  onConnect,
  onDisconnect,
  onError,
  reconnectAttempts = 5,
  reconnectInterval = 3000,
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
        reconnectCountRef.current = 0;
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

        // Attempt to reconnect
        if (
          enabled &&
          reconnectCountRef.current < reconnectAttempts
        ) {
          reconnectCountRef.current += 1;
          logger.debug(
            `WebSocket: Attempting reconnect ${reconnectCountRef.current}/${reconnectAttempts}`
          );
          reconnectTimeoutRef.current = setTimeout(connect, reconnectInterval);
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
