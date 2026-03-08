// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

export { useApi, useMutation } from "./use-api";

// SignalR-based real-time messaging (recommended)
export {
  useMessagesHub,
  type SignalRStatus,
  type MessageNotification,
  type MessageReadData,
  type ConversationUpdatedData,
  type UnreadCountData,
  type UseMessagesHubOptions,
} from "./use-messages-hub";

// High-level real-time messages hook (uses SignalR internally)
export {
  useRealtimeMessages,
  type MessageEventType,
  type NewMessagePayload,
  type MessageReadPayload,
  type TypingPayload,
  type UserStatusPayload,
} from "./use-realtime-messages";

/**
 * @deprecated Use useMessagesHub instead. Raw WebSocket is not supported by the backend.
 * The backend uses SignalR at /hubs/messages, not raw WebSocket at /ws/messages.
 */
export { useWebSocket, type WebSocketStatus, type WebSocketMessage } from "./use-websocket";

// SWR-based API hooks
export {
  // User hooks
  useCurrentUser,
  useUser,
  useUserBalance,
  // Listings hooks
  useListings,
  useListing,
  // Transactions hooks
  useTransactions,
  useTransaction,
  // Messages hooks
  useConversations,
  useConversation,
  useUnreadMessageCount,
  // Connections hooks
  useConnections,
  useConnection,
  // Notifications hooks
  useNotifications,
  useUnreadNotificationCount,
  // Events hooks
  useEvents,
  useEvent,
  // Groups hooks
  useGroups,
  useGroup,
  // Feed hooks
  useFeed,
  usePost,
  // Mutation helper
  useApiMutation,
} from "./use-swr-api";

// File upload hooks
export {
  useFileUpload,
  createImagePreview,
  formatFileSize,
  type UploadedFile,
  type UploadProgress,
  type UseFileUploadOptions,
} from "./use-file-upload";
