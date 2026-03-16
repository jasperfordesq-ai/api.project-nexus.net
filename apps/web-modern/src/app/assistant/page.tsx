// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

"use client";

import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { Button, Input, Spinner } from "@heroui/react";
import {
  Bot,
  Send,
  User,
  AlertCircle,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { ProtectedRoute } from "@/components/protected-route";
import { GlassCard } from "@/components/glass-card";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  tokensUsed?: number;
  error?: boolean;
}

export default function AssistantPage() {
  return (
    <ProtectedRoute>
      <AssistantContent />
    </ProtectedRoute>
  );
}

function AssistantContent() {
  const { user, logout } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [model, setModel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Check AI service status on mount
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const status = await api.aiStatus();
        setIsAvailable(status.available);
        setModel(status.model);
      } catch {
        setIsAvailable(false);
      }
    };
    checkStatus();
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);
    setError(null);

    try {
      // Build context from recent messages (last 5 exchanges), excluding the new user message (sent as prompt)
      const recentMessages = messages.slice(-10);
      const context = recentMessages
        .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
        .join("\n");

      const response = await api.aiChat(userMessage.content, context || undefined);

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: response.response,
        timestamp: new Date(),
        tokensUsed: response.tokens_used,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to get response";

      // Add error message to chat
      const errorChatMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: errorMessage,
        timestamp: new Date(),
        error: true,
      };
      setMessages((prev) => [...prev, errorChatMessage]);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    setError(null);
  };

  const suggestedQuestions = [
    "What is timebanking?",
    "How do I earn credits?",
    "How do I create a listing?",
    "What can I do with my credits?",
  ];

  return (
    <div className="min-h-screen">
      <Navbar user={user} onLogout={logout} />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <Sparkles className="w-8 h-8 text-indigo-400" />
                AI Assistant
              </h1>
              <p className="text-white/50 mt-1">
                Ask questions about timebanking and our community
              </p>
            </div>
            {messages.length > 0 && (
              <Button
                variant="light"
                className="text-white/70 hover:text-white"
                onPress={handleClearChat}
                startContent={<RefreshCw className="w-4 h-4" />}
              >
                Clear Chat
              </Button>
            )}
          </div>

          {/* Status indicator */}
          <div className="mt-4 flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                isAvailable === null
                  ? "bg-yellow-500 animate-pulse"
                  : isAvailable
                  ? "bg-green-500"
                  : "bg-red-500"
              }`}
            />
            <span className="text-sm text-white/50">
              {isAvailable === null
                ? "Checking AI service..."
                : isAvailable
                ? `AI Online${model ? ` (${model})` : ""}`
                : "AI Offline"}
            </span>
          </div>
        </motion.div>

        <GlassCard
          className="h-[calc(100vh-280px)] flex flex-col"
          glow="none"
          padding="none"
        >
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-4">
                <Bot className="w-16 h-16 text-indigo-400/50 mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">
                  How can I help you today?
                </h3>
                <p className="text-white/50 mb-6 max-w-md">
                  I&apos;m your community assistant. Ask me anything about timebanking,
                  how to use the platform, or get help with your account.
                </p>

                {/* Suggested questions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
                  {suggestedQuestions.map((question) => (
                    <button
                      key={question}
                      onClick={() => setInput(question)}
                      className="p-3 text-left text-sm text-white/70 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 hover:border-white/20 transition-colors"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${
                      message.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`flex gap-3 max-w-[85%] ${
                        message.role === "user" ? "flex-row-reverse" : ""
                      }`}
                    >
                      {/* Avatar */}
                      <div
                        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                          message.role === "user"
                            ? "bg-indigo-500"
                            : message.error
                            ? "bg-red-500/20"
                            : "bg-white/10"
                        }`}
                      >
                        {message.role === "user" ? (
                          <User className="w-4 h-4 text-white" />
                        ) : message.error ? (
                          <AlertCircle className="w-4 h-4 text-red-400" />
                        ) : (
                          <Bot className="w-4 h-4 text-indigo-400" />
                        )}
                      </div>

                      {/* Message bubble */}
                      <div
                        className={`px-4 py-3 rounded-2xl ${
                          message.role === "user"
                            ? "bg-indigo-500 text-white rounded-br-md"
                            : message.error
                            ? "bg-red-500/10 border border-red-500/20 text-red-300 rounded-bl-md"
                            : "bg-white/10 text-white rounded-bl-md"
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{message.content}</p>
                        <div
                          className={`flex items-center gap-2 mt-2 text-xs ${
                            message.role === "user"
                              ? "text-white/70 justify-end"
                              : message.error
                              ? "text-red-400/70"
                              : "text-white/40"
                          }`}
                        >
                          <span>
                            {message.timestamp.toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          {message.tokensUsed && (
                            <span>• {message.tokensUsed} tokens</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}

                {/* Loading indicator */}
                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-start"
                  >
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                        <Bot className="w-4 h-4 text-indigo-400" />
                      </div>
                      <div className="px-4 py-3 rounded-2xl rounded-bl-md bg-white/10">
                        <div className="flex items-center gap-2">
                          <Spinner size="sm" color="primary" />
                          <span className="text-white/50">Thinking...</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input Area */}
          <form
            onSubmit={handleSend}
            className="p-4 border-t border-white/10"
          >
            {!isAvailable && isAvailable !== null && (
              <div className="mb-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400" />
                <span className="text-sm text-red-300">
                  AI service is currently unavailable. Please try again later.
                </span>
              </div>
            )}
            <div className="flex gap-3">
              <Input
                placeholder="Type your message..."
                value={input}
                onValueChange={setInput}
                isDisabled={!isAvailable || isLoading}
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
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend(e);
                  }
                }}
              />
              <Button
                type="submit"
                isIconOnly
                isLoading={isLoading}
                isDisabled={!input.trim() || !isAvailable}
                className="bg-indigo-500 text-white"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            <p className="mt-2 text-xs text-white/30 text-center">
              AI responses are generated and may not always be accurate.
            </p>
          </form>
        </GlassCard>
      </div>
    </div>
  );
}
