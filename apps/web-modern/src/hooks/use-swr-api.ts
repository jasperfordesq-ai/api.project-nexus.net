"use client";

import useSWR, { type SWRConfiguration } from "swr";
import useSWRMutation, { type SWRMutationConfiguration } from "swr/mutation";
import {
  api,
  type User,
  type Listing,
  type Transaction,
  type Conversation,
  type Message,
  type Notification,
  type Event,
  type Group,
  type Connection,
  type Post,
  type PaginatedResponse,
  type WalletBalance,
} from "@/lib/api";

// ============================================
// User hooks
// ============================================

export function useCurrentUser(config?: SWRConfiguration<User>) {
  return useSWR<User>("current-user", () => api.getCurrentUser(), {
    revalidateOnFocus: false,
    dedupingInterval: 60000, // 1 minute
    ...config,
  });
}

export function useUser(userId: number, config?: SWRConfiguration<User>) {
  return useSWR<User>(
    userId ? `user-${userId}` : null,
    () => api.getUser(userId),
    {
      revalidateOnFocus: false,
      ...config,
    }
  );
}

export function useUserBalance(config?: SWRConfiguration<WalletBalance>) {
  return useSWR<WalletBalance>("user-balance", () => api.getBalance(), {
    revalidateOnFocus: true,
    refreshInterval: 30000, // Refresh every 30 seconds
    ...config,
  });
}

// ============================================
// Listings hooks
// ============================================

interface ListingsParams {
  page?: number;
  limit?: number;
  type?: "offer" | "request";
  status?: "active" | "completed" | "cancelled";
  userId?: number;
}

export function useListings(
  params?: ListingsParams,
  config?: SWRConfiguration<PaginatedResponse<Listing>>
) {
  const key = params ? `listings-${JSON.stringify(params)}` : "listings";
  return useSWR<PaginatedResponse<Listing>>(
    key,
    () => api.getListings(params),
    {
      revalidateOnFocus: false,
      ...config,
    }
  );
}

export function useListing(
  listingId: number,
  config?: SWRConfiguration<Listing>
) {
  return useSWR<Listing>(
    listingId ? `listing-${listingId}` : null,
    () => api.getListing(listingId),
    {
      revalidateOnFocus: false,
      ...config,
    }
  );
}

// ============================================
// Transactions hooks
// ============================================

interface TransactionsParams {
  page?: number;
  limit?: number;
}

export function useTransactions(
  params?: TransactionsParams,
  config?: SWRConfiguration<PaginatedResponse<Transaction>>
) {
  const key = params ? `transactions-${JSON.stringify(params)}` : "transactions";
  return useSWR<PaginatedResponse<Transaction>>(
    key,
    () => api.getTransactions(params),
    {
      revalidateOnFocus: false,
      ...config,
    }
  );
}

export function useTransaction(
  transactionId: number,
  config?: SWRConfiguration<Transaction>
) {
  return useSWR<Transaction>(
    transactionId ? `transaction-${transactionId}` : null,
    () => api.getTransaction(transactionId),
    {
      revalidateOnFocus: false,
      ...config,
    }
  );
}

// ============================================
// Messages/Conversations hooks
// ============================================

export function useConversations(config?: SWRConfiguration<Conversation[]>) {
  return useSWR<Conversation[]>(
    "conversations",
    () => api.getConversations(),
    {
      revalidateOnFocus: true,
      refreshInterval: 30000, // Poll for new conversations
      ...config,
    }
  );
}

export function useConversation(
  conversationId: number,
  config?: SWRConfiguration<Conversation & { messages: Message[] }>
) {
  return useSWR<Conversation & { messages: Message[] }>(
    conversationId ? `conversation-${conversationId}` : null,
    () => api.getConversation(conversationId),
    {
      revalidateOnFocus: true,
      ...config,
    }
  );
}

export function useUnreadMessageCount(
  config?: SWRConfiguration<{ count: number }>
) {
  return useSWR<{ count: number }>(
    "unread-messages",
    () => api.getUnreadMessageCount(),
    {
      revalidateOnFocus: true,
      refreshInterval: 15000, // Check every 15 seconds
      ...config,
    }
  );
}

// ============================================
// Connections hooks
// ============================================

interface ConnectionsParams {
  page?: number;
  limit?: number;
}

export function useConnections(
  params?: ConnectionsParams,
  config?: SWRConfiguration<PaginatedResponse<Connection>>
) {
  const key = params ? `connections-${JSON.stringify(params)}` : "connections";
  return useSWR<PaginatedResponse<Connection>>(
    key,
    () => api.getConnections(params),
    {
      revalidateOnFocus: false,
      ...config,
    }
  );
}

export function useConnection(
  connectionId: number,
  config?: SWRConfiguration<Connection>
) {
  return useSWR<Connection>(
    connectionId ? `connection-${connectionId}` : null,
    () => api.getConnection(connectionId),
    {
      revalidateOnFocus: false,
      ...config,
    }
  );
}

// ============================================
// Notifications hooks
// ============================================

interface NotificationsParams {
  page?: number;
  limit?: number;
}

export function useNotifications(
  params?: NotificationsParams,
  config?: SWRConfiguration<PaginatedResponse<Notification>>
) {
  const key = params
    ? `notifications-${JSON.stringify(params)}`
    : "notifications";
  return useSWR<PaginatedResponse<Notification>>(
    key,
    () => api.getNotifications(params),
    {
      revalidateOnFocus: true,
      refreshInterval: 30000,
      ...config,
    }
  );
}

export function useUnreadNotificationCount(
  config?: SWRConfiguration<{ count: number }>
) {
  return useSWR<{ count: number }>(
    "unread-notifications",
    () => api.getUnreadNotificationCount(),
    {
      revalidateOnFocus: true,
      refreshInterval: 15000,
      ...config,
    }
  );
}

// ============================================
// Events hooks
// ============================================

interface EventsParams {
  page?: number;
  limit?: number;
  upcoming?: boolean;
}

export function useEvents(
  params?: EventsParams,
  config?: SWRConfiguration<PaginatedResponse<Event>>
) {
  const key = params ? `events-${JSON.stringify(params)}` : "events";
  return useSWR<PaginatedResponse<Event>>(key, () => api.getEvents(params), {
    revalidateOnFocus: false,
    ...config,
  });
}

export function useEvent(eventId: number, config?: SWRConfiguration<Event>) {
  return useSWR<Event>(
    eventId ? `event-${eventId}` : null,
    () => api.getEvent(eventId),
    {
      revalidateOnFocus: false,
      ...config,
    }
  );
}

// ============================================
// Groups hooks
// ============================================

interface GroupsParams {
  page?: number;
  limit?: number;
}

export function useGroups(
  params?: GroupsParams,
  config?: SWRConfiguration<PaginatedResponse<Group>>
) {
  const key = params ? `groups-${JSON.stringify(params)}` : "groups";
  return useSWR<PaginatedResponse<Group>>(key, () => api.getGroups(params), {
    revalidateOnFocus: false,
    ...config,
  });
}

export function useGroup(groupId: number, config?: SWRConfiguration<Group>) {
  return useSWR<Group>(
    groupId ? `group-${groupId}` : null,
    () => api.getGroup(groupId),
    {
      revalidateOnFocus: false,
      ...config,
    }
  );
}

// ============================================
// Feed hooks
// ============================================

interface FeedParams {
  page?: number;
  limit?: number;
}

export function useFeed(
  params?: FeedParams,
  config?: SWRConfiguration<PaginatedResponse<Post>>
) {
  const key = params ? `feed-${JSON.stringify(params)}` : "feed";
  return useSWR<PaginatedResponse<Post>>(key, () => api.getFeed(params), {
    revalidateOnFocus: true,
    ...config,
  });
}

export function usePost(postId: number, config?: SWRConfiguration<Post>) {
  return useSWR<Post>(
    postId ? `post-${postId}` : null,
    () => api.getPost(postId),
    {
      revalidateOnFocus: false,
      ...config,
    }
  );
}

// ============================================
// Mutation hooks for common operations
// ============================================

// Generic mutation helper
export function useApiMutation<T, A extends unknown[]>(
  key: string,
  mutationFn: (...args: A) => Promise<T>,
  config?: SWRMutationConfiguration<T, Error, string, A>
) {
  return useSWRMutation<T, Error, string, A>(
    key,
    async (_, { arg }) => mutationFn(...arg),
    config
  );
}
