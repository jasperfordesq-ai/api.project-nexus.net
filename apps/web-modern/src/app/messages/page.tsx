// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

"use client";

import { useEffect, useState, useRef, useCallback, Suspense } from "react";
import { motion } from "framer-motion";
import { Button, Skeleton, Input } from "@heroui/react";
import { AvatarWithFallback } from "@/components/avatar-with-fallback";
import {
  MessageSquare,
  Send,
  Search,
  ArrowLeft,
  Check,
  CheckCheck,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { ProtectedRoute } from "@/components/protected-route";
import { GlassCard } from "@/components/glass-card";
import { useAuth } from "@/contexts/auth-context";
import { api, type Conversation, type Message as MessageType } from "@/lib/api";
import { logger } from "@/lib/logger";
import { useRealtimeMessages } from "@/hooks";

export default function MessagesPage() {
  return (
    <ProtectedRoute>
      <Suspense>
        <MessagesContent />
      </Suspense>
    </ProtectedRoute>
  );
}

function MessagesContent() {
  const { user, logout } = useAuth();
  const searchParams = useSearchParams();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<
    (Conversation & { messages: MessageType[] }) | null
  >(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const selectedConvoIdRef = useRef<number | null>(null);

  // Keep ref in sync with state
  useEffect(() => {
    selectedConvoIdRef.current = selectedConversation?.id ?? null;
  }, [selectedConversation?.id]);

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  // Handle incoming real-time messages
  const handleNewMessage = useCallback(
    (message: MessageType, conversationId: number) => {
      const activeConvoId = selectedConvoIdRef.current;

      // Update selected conversation if it's the active one
      setSelectedConversation((prev) =>
        prev && prev.id === conversationId
          ? { ...prev, messages: [...prev.messages, message] }
          : prev
      );

      // Update conversation list
      setConversations((prev) =>
        prev.map((convo) => {
          if (convo.id === conversationId) {
            return {
              ...convo,
              last_message: message,
              unread_count:
                activeConvoId === conversationId
                  ? 0
                  : convo.unread_count + 1,
            };
          }
          return convo;
        })
      );
    },
    []
  );

  // Handle message read status updates
  const handleMessageRead = useCallback(
    (conversationId: number, messageIds: number[]) => {
      setSelectedConversation((prev) =>
        prev && prev.id === conversationId
          ? {
              ...prev,
              messages: prev.messages.map((msg) =>
                messageIds.includes(msg.id) ? { ...msg, read: true } : msg
              ),
            }
          : prev
      );
    },
    []
  );

  // Real-time messaging hook
  const {
    isConnected,
    sendTypingStart,
    sendTypingStop,
    getTypingUsers,
    isUserOnline,
    joinConversation,
    leaveConversation,
  } = useRealtimeMessages({
    onNewMessage: handleNewMessage,
    onMessageRead: handleMessageRead,
    enabled: true,
  });

  // Join/leave SignalR conversation group when selecting a conversation
  useEffect(() => {
    if (isConnected && selectedConversation) {
      joinConversation(selectedConversation.id);
      return () => {
        leaveConversation(selectedConversation.id);
      };
    }
  }, [isConnected, selectedConversation?.id, joinConversation, leaveConversation]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedConversation?.messages]);

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const convos = await api.getConversations();
        setConversations(convos);
      } catch (error) {
        logger.error("Failed to fetch conversations:", error);
        setConversations([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchConversations();
  }, []);

  const handleSelectConversation = async (convo: Conversation) => {
    setIsLoadingMessages(true);
    try {
      const fullConvo = await api.getConversation(convo.id);
      setSelectedConversation(fullConvo);

      // Mark as read
      if (convo.unread_count > 0) {
        await api.markConversationAsRead(convo.id);
        setConversations((prev) =>
          prev.map((c) => (c.id === convo.id ? { ...c, unread_count: 0 } : c))
        );
      }
    } catch (error) {
      logger.error("Failed to fetch conversation:", error);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  // When ?user=<id> is present in the URL, open or start a conversation with
  // that user automatically once the conversations list has loaded.
  useEffect(() => {
    const targetUserId = searchParams.get("user");
    if (!targetUserId || isLoading) return;
    const userId = Number(targetUserId);
    if (isNaN(userId) || userId <= 0) return;

    // Find an existing conversation with this user
    const existing = conversations.find((c) =>
      c.participants?.some((p) => p.id === userId)
    );
    if (existing) {
      handleSelectConversation(existing);
    } else if (user) {
      // No existing conversation — initiate one by sending an opening message.
      // Silently fail if empty content is rejected; the user can type manually.
      api.sendMessage({ receiver_id: userId, content: "" }).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, isLoading]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation) return;

    // Find the other participant (recipient)
    const recipient = selectedConversation.participants?.find(
      (p) => p.id !== user?.id
    );
    if (!recipient) return;

    // Stop typing indicator
    sendTypingStop(selectedConversation.id);

    setSendError(null);
    setIsSending(true);
    try {
      const message = await api.sendMessage({
        conversation_id: selectedConversation.id,
        content: newMessage.trim(),
      });

      setSelectedConversation((prev) =>
        prev
          ? {
              ...prev,
              messages: [...prev.messages, message],
            }
          : null
      );
      setNewMessage("");
    } catch (error) {
      logger.error("Failed to send message:", error);
      setSendError(error instanceof Error ? error.message : "Failed to send message.");
    } finally {
      setIsSending(false);
    }
  };

  // Handle typing indicator
  const handleMessageInputChange = (value: string) => {
    setNewMessage(value);

    if (!selectedConversation) return;

    // Send typing start
    if (value.length > 0) {
      sendTypingStart(selectedConversation.id);

      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Stop typing after 2 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        sendTypingStop(selectedConversation.id);
      }, 2000);
    } else {
      // Stop typing when input is cleared
      sendTypingStop(selectedConversation.id);
    }
  };

  const filteredConversations = (conversations || []).filter((convo) => {
    const otherParticipant = convo.participants?.find((p) => p.id !== user?.id);
    const name =
      `${otherParticipant?.first_name} ${otherParticipant?.last_name}`.toLowerCase();
    return name.includes(searchQuery.toLowerCase());
  });

  // Get other participant for selected conversation
  const otherParticipant = selectedConversation?.participants?.find(
    (p) => p.id !== user?.id
  );

  // Get typing users for current conversation
  const currentTypingUsers = selectedConversation
    ? getTypingUsers(selectedConversation.id)
    : new Set();
  const isOtherUserTyping =
    otherParticipant && currentTypingUsers.has(otherParticipant.id);

  return (
    <div className="min-h-screen">
      <Navbar user={user} onLogout={logout} />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Messages</h1>
              <p className="text-white/50 mt-1">Chat with community members</p>
            </div>
            {/* Connection status indicator */}
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs ${
                isConnected
                  ? "bg-green-500/20 text-green-400"
                  : "bg-red-500/20 text-red-400"
              }`}
            >
              {isConnected ? (
                <>
                  <Wifi className="w-3 h-3" />
                  <span>Live</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3" />
                  <span>Offline</span>
                </>
              )}
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-220px)]">
          {/* Conversations List */}
          <GlassCard
            className={`lg:col-span-1 overflow-hidden ${
              selectedConversation ? "hidden lg:block" : ""
            }`}
            glow="none"
            padding="none"
          >
            <div className="p-4 border-b border-white/10">
              <Input
                placeholder="Search conversations..."
                value={searchQuery}
                onValueChange={setSearchQuery}
                startContent={<Search className="w-4 h-4 text-white/40" />}
                size="sm"
                classNames={{
                  input: "text-white placeholder:text-white/30",
                  inputWrapper: [
                    "bg-white/5",
                    "border border-white/10",
                    "hover:bg-white/10",
                  ],
                }}
              />
            </div>

            <div className="overflow-y-auto h-[calc(100%-72px)]">
              {isLoading ? (
                <div className="p-4 space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="w-12 h-12 rounded-full" />
                      <div className="flex-1">
                        <Skeleton className="w-3/4 h-4 rounded mb-2" />
                        <Skeleton className="w-1/2 h-3 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredConversations.length > 0 ? (
                filteredConversations.map((convo) => {
                  const participant = convo.participants?.find(
                    (p) => p.id !== user?.id
                  );
                  const isOnline = participant && isUserOnline(participant.id);

                  return (
                    <button
                      key={convo.id}
                      onClick={() => handleSelectConversation(convo)}
                      className={`w-full p-4 flex items-center gap-3 hover:bg-white/5 transition-colors text-left ${
                        selectedConversation?.id === convo.id
                          ? "bg-white/10"
                          : ""
                      }`}
                    >
                      <div className="relative">
                        <AvatarWithFallback
                          name={`${participant?.first_name} ${participant?.last_name}`}
                          className="ring-2 ring-white/10"
                        />
                        {/* Online indicator */}
                        {isOnline && (
                          <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#0a0a0f]" />
                        )}
                        {convo.unread_count > 0 && (
                          <span className="absolute -top-1 -right-1 w-5 h-5 bg-indigo-500 rounded-full text-xs font-bold text-white flex items-center justify-center">
                            {convo.unread_count > 9 ? "9+" : convo.unread_count}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-white truncate">
                          {participant?.first_name} {participant?.last_name}
                        </p>
                        <p className="text-sm text-white/50 truncate">
                          {convo.last_message?.content || "No messages yet"}
                        </p>
                      </div>
                      {convo.last_message && (
                        <span className="text-xs text-white/30">
                          {new Date(
                            convo.last_message.created_at
                          ).toLocaleDateString()}
                        </span>
                      )}
                    </button>
                  );
                })
              ) : (
                <div className="p-8 text-center">
                  <MessageSquare className="w-12 h-12 text-white/20 mx-auto mb-4" />
                  <p className="text-white/50">No conversations yet</p>
                </div>
              )}
            </div>
          </GlassCard>

          {/* Chat Area */}
          <GlassCard
            className={`lg:col-span-2 overflow-hidden flex flex-col ${
              !selectedConversation ? "hidden lg:flex" : ""
            }`}
            glow="none"
            padding="none"
          >
            {selectedConversation ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-white/10 flex items-center gap-4">
                  <Button
                    isIconOnly
                    variant="light"
                    className="lg:hidden text-white"
                    onPress={() => setSelectedConversation(null)}
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                  <div className="relative">
                    <AvatarWithFallback
                      name={`${otherParticipant?.first_name} ${otherParticipant?.last_name}`}
                      className="ring-2 ring-white/10"
                    />
                    {otherParticipant && isUserOnline(otherParticipant.id) && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#0a0a0f]" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-white">
                      {otherParticipant?.first_name} {otherParticipant?.last_name}
                    </p>
                    <p className="text-xs text-white/50">
                      {isOtherUserTyping
                        ? "Typing..."
                        : otherParticipant && isUserOnline(otherParticipant.id)
                        ? "Online"
                        : "Offline"}
                    </p>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {isLoadingMessages ? (
                    <div className="space-y-4">
                      {[...Array(5)].map((_, i) => (
                        <div
                          key={i}
                          className={`flex ${
                            i % 2 === 0 ? "justify-start" : "justify-end"
                          }`}
                        >
                          <Skeleton
                            className={`h-12 rounded-2xl ${
                              i % 2 === 0 ? "w-2/3" : "w-1/2"
                            }`}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <>
                      {selectedConversation.messages.map((message) => {
                        const isOwn = message.sender_id === user?.id;

                        return (
                          <div
                            key={message.id}
                            className={`flex ${
                              isOwn ? "justify-end" : "justify-start"
                            }`}
                          >
                            <div
                              className={`max-w-[70%] px-4 py-2 rounded-2xl ${
                                isOwn
                                  ? "bg-indigo-500 text-white rounded-br-md"
                                  : "bg-white/10 text-white rounded-bl-md"
                              }`}
                            >
                              <p>{message.content}</p>
                              <div
                                className={`flex items-center gap-1 mt-1 ${
                                  isOwn ? "justify-end" : ""
                                }`}
                              >
                                <span
                                  className={`text-xs ${
                                    isOwn ? "text-white/70" : "text-white/40"
                                  }`}
                                >
                                  {new Date(
                                    message.created_at
                                  ).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                                {isOwn && (
                                  <span className="text-white/70">
                                    {message.read ? (
                                      <CheckCheck className="w-3 h-3" />
                                    ) : (
                                      <Check className="w-3 h-3" />
                                    )}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {/* Typing indicator */}
                      {isOtherUserTyping && (
                        <div className="flex justify-start">
                          <div className="bg-white/10 px-4 py-2 rounded-2xl rounded-bl-md">
                            <div className="flex gap-1">
                              <span className="w-2 h-2 bg-white/50 rounded-full animate-bounce" />
                              <span
                                className="w-2 h-2 bg-white/50 rounded-full animate-bounce"
                                style={{ animationDelay: "0.1s" }}
                              />
                              <span
                                className="w-2 h-2 bg-white/50 rounded-full animate-bounce"
                                style={{ animationDelay: "0.2s" }}
                              />
                            </div>
                          </div>
                        </div>
                      )}
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </div>

                {/* Message Input */}
                <form
                  onSubmit={handleSendMessage}
                  className="p-4 border-t border-white/10"
                >
                  {sendError && (
                    <p className="text-xs text-red-400 mb-2">{sendError}</p>
                  )}
                  <div className="flex gap-3">
                    <Input
                      placeholder="Type a message..."
                      value={newMessage}
                      onValueChange={handleMessageInputChange}
                      classNames={{
                        input: "text-white placeholder:text-white/30",
                        inputWrapper: [
                          "bg-white/5",
                          "border border-white/10",
                          "hover:bg-white/10",
                          "group-data-[focus=true]:bg-white/10",
                        ],
                      }}
                      className="flex-1"
                    />
                    <Button
                      type="submit"
                      isIconOnly
                      isLoading={isSending}
                      isDisabled={!newMessage.trim()}
                      className="bg-indigo-500 text-white"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <MessageSquare className="w-16 h-16 text-white/20 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">
                    Select a conversation
                  </h3>
                  <p className="text-white/50">
                    Choose a conversation to start messaging
                  </p>
                </div>
              </div>
            )}
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
