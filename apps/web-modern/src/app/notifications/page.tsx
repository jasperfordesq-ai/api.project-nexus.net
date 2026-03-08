"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Button,
  Skeleton,
  Pagination,
  Chip,
  Switch,
} from "@heroui/react";
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  MessageSquare,
  UserPlus,
  Wallet,
  Calendar,
  Users,
  Star,
  ListTodo,
  Settings,
  Mail,
  Smartphone,
  Monitor,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { ProtectedRoute } from "@/components/protected-route";
import { MotionGlassCard, GlassCard } from "@/components/glass-card";
import { useAuth } from "@/contexts/auth-context";
import { api, type Notification, type PaginatedResponse } from "@/lib/api";
import { logger } from "@/lib/logger";
import { containerVariantsFast, itemVariantsLeft, itemVariants } from "@/lib/animations";

export default function NotificationsPage() {
  return (
    <ProtectedRoute>
      <NotificationsContent />
    </ProtectedRoute>
  );
}

function NotificationsContent() {
  const { user, logout } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [activeTab, setActiveTab] = useState<"notifications" | "preferences">("notifications");
  const [notifConfig, setNotifConfig] = useState<Record<string, { email: boolean; push: boolean; in_app: boolean }> | null>(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const response: PaginatedResponse<Notification> = await api.getNotifications({
        unread_only: showUnreadOnly,
        page: currentPage,
        limit: 20,
      });
      setNotifications(response?.data || []);
      setTotalPages(response?.pagination?.total_pages || 1);

      const countRes = await api.getUnreadNotificationCount();
      setUnreadCount(countRes?.count || 0);
    } catch (error) {
      logger.error("Failed to fetch notifications:", error);
      setNotifications([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, showUnreadOnly]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Real-time polling every 30 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const pollResult = await api.pollNotifications();
        if (pollResult?.count > 0) {
          setUnreadCount(pollResult.count);
          // Refresh the list if we have new notifications
          if (pollResult.latest && pollResult.latest.length > 0) {
            fetchNotifications();
          }
        }
      } catch (error) {
        logger.error("Failed to poll notifications:", error);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const fetchNotificationConfig = useCallback(async () => {
    setIsLoadingConfig(true);
    try {
      const config = await api.getNotificationConfig();
      setNotifConfig(config);
    } catch (error) {
      logger.error("Failed to fetch notification config:", error);
    } finally {
      setIsLoadingConfig(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "preferences" && !notifConfig) {
      fetchNotificationConfig();
    }
  }, [activeTab, notifConfig, fetchNotificationConfig]);

  const handleConfigChange = async (category: string, channel: string, value: boolean) => {
    try {
      const updated = {
        ...notifConfig,
        [category]: {
          ...notifConfig?.[category],
          [channel]: value,
        },
      };
      await api.updateNotificationConfig({ [category]: { [channel]: value } });
      setNotifConfig(updated as Record<string, { email: boolean; push: boolean; in_app: boolean }>);
    } catch (error) {
      logger.error("Failed to update notification config:", error);
    }
  };

  const getCategoryLabel = (key: string) => {
    const labels: Record<string, string> = {
      messages: "Messages",
      connections: "Connections",
      transactions: "Transactions",
      events: "Events",
      groups: "Groups",
      listings: "Listings",
      badges: "Badges & XP",
      system: "System",
    };
    return labels[key] || key.charAt(0).toUpperCase() + key.slice(1);
  };

  const handleMarkAsRead = async (id: number) => {
    try {
      await api.markNotificationAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      logger.error("Failed to mark notification as read:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.markAllNotificationsAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      logger.error("Failed to mark all as read:", error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "message":
        return <MessageSquare className="w-5 h-5" />;
      case "connection":
      case "connection_request":
      case "connection_accepted":
        return <UserPlus className="w-5 h-5" />;
      case "transaction":
      case "transfer":
        return <Wallet className="w-5 h-5" />;
      case "event":
      case "event_reminder":
        return <Calendar className="w-5 h-5" />;
      case "group":
      case "group_invite":
        return <Users className="w-5 h-5" />;
      case "badge":
      case "xp":
      case "level_up":
        return <Star className="w-5 h-5" />;
      case "listing":
        return <ListTodo className="w-5 h-5" />;
      default:
        return <Bell className="w-5 h-5" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "message":
        return "bg-blue-500/20 text-blue-400";
      case "connection":
      case "connection_request":
      case "connection_accepted":
        return "bg-emerald-500/20 text-emerald-400";
      case "transaction":
      case "transfer":
        return "bg-amber-500/20 text-amber-400";
      case "event":
      case "event_reminder":
        return "bg-purple-500/20 text-purple-400";
      case "group":
      case "group_invite":
        return "bg-cyan-500/20 text-cyan-400";
      case "badge":
      case "xp":
      case "level_up":
        return "bg-yellow-500/20 text-yellow-400";
      default:
        return "bg-indigo-500/20 text-indigo-400";
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar user={user} unreadCount={unreadCount} onLogout={logout} />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              Notifications
              {unreadCount > 0 && (
                <Chip
                  size="sm"
                  className="bg-indigo-500/20 text-indigo-400"
                >
                  {unreadCount} unread
                </Chip>
              )}
            </h1>
            <p className="text-white/50 mt-1">
              Stay updated with your community activity
            </p>
          </div>
          {unreadCount > 0 && (
            <Button
              className="bg-white/10 text-white hover:bg-white/20"
              startContent={<CheckCheck className="w-4 h-4" />}
              onPress={handleMarkAllAsRead}
            >
              Mark All Read
            </Button>
          )}
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="flex gap-2 mb-4">
            <Button
              size="sm"
              className={
                activeTab === "notifications"
                  ? "bg-indigo-500 text-white"
                  : "bg-white/5 text-white/70 hover:bg-white/10"
              }
              startContent={<Bell className="w-4 h-4" />}
              onPress={() => setActiveTab("notifications")}
            >
              Notifications
            </Button>
            <Button
              size="sm"
              className={
                activeTab === "preferences"
                  ? "bg-indigo-500 text-white"
                  : "bg-white/5 text-white/70 hover:bg-white/10"
              }
              startContent={<Settings className="w-4 h-4" />}
              onPress={() => setActiveTab("preferences")}
            >
              Preferences
            </Button>
          </div>
        </div>

        {activeTab === "preferences" ? (
          /* Notification Preferences */
          <motion.div variants={containerVariantsFast} initial="hidden" animate="visible" className="space-y-4">
            <MotionGlassCard variants={itemVariants} glow="none" padding="lg">
              <h2 className="text-lg font-semibold text-white mb-2">Notification Preferences</h2>
              <p className="text-sm text-white/50 mb-6">
                Choose how you want to be notified for each category.
              </p>
              {isLoadingConfig ? (
                <div className="space-y-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="p-4 rounded-lg bg-white/5">
                      <Skeleton className="w-full h-10 rounded" />
                    </div>
                  ))}
                </div>
              ) : notifConfig ? (
                <div className="space-y-1">
                  {/* Header row */}
                  <div className="flex items-center gap-4 px-4 py-2">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white/60">Category</p>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="w-16 flex flex-col items-center">
                        <Mail className="w-4 h-4 text-white/40 mb-1" />
                        <span className="text-xs text-white/40">Email</span>
                      </div>
                      <div className="w-16 flex flex-col items-center">
                        <Smartphone className="w-4 h-4 text-white/40 mb-1" />
                        <span className="text-xs text-white/40">Push</span>
                      </div>
                      <div className="w-16 flex flex-col items-center">
                        <Monitor className="w-4 h-4 text-white/40 mb-1" />
                        <span className="text-xs text-white/40">In-App</span>
                      </div>
                    </div>
                  </div>
                  {/* Config rows */}
                  {Object.entries(notifConfig).map(([category, channels]) => (
                    <div
                      key={category}
                      className="flex items-center gap-4 px-4 py-3 rounded-lg hover:bg-white/5 transition-colors"
                    >
                      <div className="flex-1">
                        <p className="text-white font-medium">{getCategoryLabel(category)}</p>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="w-16 flex justify-center">
                          <Switch
                            size="sm"
                            isSelected={channels.email}
                            onValueChange={(v) => handleConfigChange(category, "email", v)}
                            classNames={{ wrapper: "bg-white/10 group-data-[selected=true]:bg-indigo-500" }}
                          />
                        </div>
                        <div className="w-16 flex justify-center">
                          <Switch
                            size="sm"
                            isSelected={channels.push}
                            onValueChange={(v) => handleConfigChange(category, "push", v)}
                            classNames={{ wrapper: "bg-white/10 group-data-[selected=true]:bg-indigo-500" }}
                          />
                        </div>
                        <div className="w-16 flex justify-center">
                          <Switch
                            size="sm"
                            isSelected={channels.in_app}
                            onValueChange={(v) => handleConfigChange(category, "in_app", v)}
                            classNames={{ wrapper: "bg-white/10 group-data-[selected=true]:bg-indigo-500" }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-white/50 text-center py-4">Unable to load preferences</p>
              )}
            </MotionGlassCard>
          </motion.div>
        ) : (
        <>
        {/* Filter */}
        <div className="mb-6">
          <div className="flex gap-2">
            <Button
              size="sm"
              className={
                !showUnreadOnly
                  ? "bg-indigo-500 text-white"
                  : "bg-white/5 text-white/70 hover:bg-white/10"
              }
              onPress={() => {
                setShowUnreadOnly(false);
                setCurrentPage(1);
              }}
            >
              All
            </Button>
            <Button
              size="sm"
              className={
                showUnreadOnly
                  ? "bg-indigo-500 text-white"
                  : "bg-white/5 text-white/70 hover:bg-white/10"
              }
              onPress={() => {
                setShowUnreadOnly(true);
                setCurrentPage(1);
              }}
            >
              Unread Only
            </Button>
          </div>
        </div>

        {/* Notifications List */}
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="p-4 rounded-xl bg-white/5 border border-white/10"
              >
                <Skeleton className="w-full h-16 rounded-lg" />
              </div>
            ))}
          </div>
        ) : notifications.length > 0 ? (
          <>
            <motion.div
              variants={containerVariantsFast}
              initial="hidden"
              animate="visible"
              className="space-y-3"
            >
              {notifications.map((notification) => (
                <MotionGlassCard
                  key={notification.id}
                  variants={itemVariantsLeft}
                  glow="none"
                  padding="md"
                  hover
                  className={notification.read ? "opacity-60" : ""}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${getNotificationColor(
                        notification.type
                      )}`}
                    >
                      {getNotificationIcon(notification.type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-white">
                            {notification.title}
                          </p>
                          <p className="text-sm text-white/60 mt-1">
                            {notification.message}
                          </p>
                        </div>
                        {!notification.read && (
                          <div className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0 mt-2" />
                        )}
                      </div>
                      <p className="text-xs text-white/40 mt-2">
                        {new Date(notification.created_at).toLocaleDateString()}{" "}
                        at{" "}
                        {new Date(notification.created_at).toLocaleTimeString(
                          [],
                          {
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )}
                      </p>
                    </div>

                    {!notification.read && (
                      <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        className="text-white/50 hover:text-white"
                        onPress={() => handleMarkAsRead(notification.id)}
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </MotionGlassCard>
              ))}
            </motion.div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center mt-8">
                <Pagination
                  total={totalPages}
                  page={currentPage}
                  onChange={setCurrentPage}
                  classNames={{
                    wrapper: "gap-2",
                    item: "bg-white/5 text-white border-white/10 hover:bg-white/10",
                    cursor: "bg-indigo-500 text-white",
                  }}
                />
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
              <Bell className="w-8 h-8 text-white/20" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              No notifications
            </h3>
            <p className="text-white/50">
              {showUnreadOnly
                ? "You're all caught up!"
                : "You don't have any notifications yet"}
            </p>
          </div>
        )}
        </>
        )}
      </div>
    </div>
  );
}
