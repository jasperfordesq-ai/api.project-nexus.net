"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Button,
  Avatar,
  Chip,
  Skeleton,
  Textarea,
  Tabs,
  Tab,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Pagination,
} from "@heroui/react";
import {
  Users,
  ArrowLeft,
  Lock,
  Globe,
  UserPlus,
  UserMinus,
  Calendar,
  Edit,
  Trash2,
  MessageSquare,
  Heart,
  Send,
  Crown,
  Shield,
  Megaphone,
  MessageCircle,
} from "lucide-react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { ProtectedRoute } from "@/components/protected-route";
import { GlassCard, MotionGlassCard } from "@/components/glass-card";
import { useAuth } from "@/contexts/auth-context";
import {
  api,
  type Group,
  type GroupMember,
  type Post,
  type Event,
  type PaginatedResponse,
} from "@/lib/api";
import { logger } from "@/lib/logger";
import { containerVariantsFast, itemVariants } from "@/lib/animations";

export default function GroupDetailPage() {
  return (
    <ProtectedRoute>
      <GroupDetailContent />
    </ProtectedRoute>
  );
}

function GroupDetailContent() {
  const params = useParams();
  const router = useRouter();
  const groupId = Number(params.id);
  const { user, logout } = useAuth();

  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [discussions, setDiscussions] = useState<any[]>([]);
  const [newDiscussionTitle, setNewDiscussionTitle] = useState("");
  const [newDiscussionContent, setNewDiscussionContent] = useState("");
  const [isCreatingDiscussion, setIsCreatingDiscussion] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("posts");

  // Post form state
  const [newPostContent, setNewPostContent] = useState("");
  const [isPostingLoading, setIsPostingLoading] = useState(false);

  // Membership state
  const [isMember, setIsMember] = useState(false);
  const [memberRole, setMemberRole] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  const {
    isOpen: isDeleteOpen,
    onOpen: onDeleteOpen,
    onClose: onDeleteClose,
  } = useDisclosure();
  const {
    isOpen: isLeaveOpen,
    onOpen: onLeaveOpen,
    onClose: onLeaveClose,
  } = useDisclosure();

  const fetchGroup = useCallback(async () => {
    setIsLoading(true);
    try {
      const [groupData, membersData] = await Promise.all([
        api.getGroup(groupId),
        api.getGroupMembers(groupId),
      ]);
      setGroup(groupData);
      const membersList = membersData?.data || [];
      setMembers(membersList);

      // Check if current user is a member
      const currentMember = membersList.find(
        (m) => m.user_id === user?.id
      );
      setIsMember(!!currentMember);
      setMemberRole(currentMember?.role || null);

      // Fetch group-specific posts and events
      const gId = groupData?.id;
      if (gId) {
        fetchAnnouncements(gId);
        fetchDiscussions(gId);
      }

      const [feedData, eventsData] = await Promise.all([
        api.getFeed({ group_id: groupId, limit: 20 }),
        api.getEvents({ group_id: groupId, limit: 10 }),
      ]);
      setPosts(feedData?.data || []);
      setEvents(eventsData?.data || []);
    } catch (error) {
      logger.error("Failed to fetch group:", error);
      setMembers([]);
      setPosts([]);
      setEvents([]);
    } finally {
      setIsLoading(false);
    }
  }, [groupId, user?.id]);

  useEffect(() => {
    fetchGroup();
  }, [fetchGroup]);

  const fetchAnnouncements = useCallback(async (gId: number) => {
    try {
      const data = await api.getGroupAnnouncements(gId);
      setAnnouncements(data || []);
    } catch (error) {
      logger.error("Failed to fetch announcements:", error);
    }
  }, []);

  const fetchDiscussions = useCallback(async (gId: number) => {
    try {
      const data = await api.getGroupDiscussions(gId);
      setDiscussions(data || []);
    } catch (error) {
      logger.error("Failed to fetch discussions:", error);
    }
  }, []);

  const handleCreateDiscussion = async (groupId: number) => {
    if (!newDiscussionTitle.trim()) return;
    setIsCreatingDiscussion(true);
    try {
      await api.createGroupDiscussion(groupId, {
        title: newDiscussionTitle,
        content: newDiscussionContent,
      });
      setNewDiscussionTitle("");
      setNewDiscussionContent("");
      await fetchDiscussions(groupId);
    } catch (error) {
      logger.error("Failed to create discussion:", error);
    } finally {
      setIsCreatingDiscussion(false);
    }
  };

    useEffect(() => {
    api.getUnreadMessageCount().then((res) => setUnreadCount(res?.count || 0));
  }, []);

  const handleJoin = async () => {
    setIsJoining(true);
    try {
      await api.joinGroup(groupId);
      setIsMember(true);
      setMemberRole("member");
      fetchGroup();
    } catch (error) {
      logger.error("Failed to join group:", error);
    } finally {
      setIsJoining(false);
    }
  };

  const handleLeave = async () => {
    setIsLeaving(true);
    try {
      await api.leaveGroup(groupId);
      setIsMember(false);
      setMemberRole(null);
      onLeaveClose();
      fetchGroup();
    } catch (error) {
      logger.error("Failed to leave group:", error);
    } finally {
      setIsLeaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await api.deleteGroup(groupId);
      router.push("/groups");
    } catch (error) {
      logger.error("Failed to delete group:", error);
      setIsDeleting(false);
    }
  };

  const handleCreatePost = async () => {
    if (!newPostContent.trim()) return;
    setIsPostingLoading(true);
    try {
      const post = await api.createPost({
        content: newPostContent,
        group_id: groupId,
      });
      setPosts((prev) => [post, ...prev]);
      setNewPostContent("");
    } catch (error) {
      logger.error("Failed to create post:", error);
    } finally {
      setIsPostingLoading(false);
    }
  };

  const handleLikePost = async (postId: number, isLiked: boolean) => {
    try {
      if (isLiked) {
        await api.unlikePost(postId);
      } else {
        await api.likePost(postId);
      }
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                is_liked: !isLiked,
                like_count: isLiked ? p.like_count - 1 : p.like_count + 1,
              }
            : p
        )
      );
    } catch (error) {
      logger.error("Failed to toggle like:", error);
    }
  };

  const isOwner = group?.created_by === user?.id;
  const isAdmin = memberRole === "admin";

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return <Crown className="w-4 h-4 text-yellow-400" />;
      case "moderator":
        return <Shield className="w-4 h-4 text-blue-400" />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar user={user} unreadCount={unreadCount} onLogout={logout} />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <Link
          href="/groups"
          className="inline-flex items-center gap-2 text-white/60 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Groups
        </Link>

        {isLoading ? (
          <div className="space-y-6">
            <div className="p-8 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-6 mb-6">
                <Skeleton className="w-20 h-20 rounded-xl" />
                <div className="flex-1">
                  <Skeleton className="w-48 h-8 rounded mb-2" />
                  <Skeleton className="w-32 h-4 rounded" />
                </div>
              </div>
              <Skeleton className="w-full h-24 rounded" />
            </div>
          </div>
        ) : group ? (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-6"
          >
            {/* Group Header */}
            <MotionGlassCard variants={itemVariants} glow="none" padding="lg">
              <div className="flex flex-col sm:flex-row items-start gap-6 mb-6">
                <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-indigo-500/30 to-purple-500/30 flex items-center justify-center flex-shrink-0">
                  <Users className="w-10 h-10 text-indigo-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-3xl font-bold text-white">
                      {group.name}
                    </h1>
                    <Chip
                      size="sm"
                      variant="flat"
                      startContent={
                        group.is_public ? (
                          <Globe className="w-3 h-3" />
                        ) : (
                          <Lock className="w-3 h-3" />
                        )
                      }
                      className={
                        group.is_public
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-amber-500/20 text-amber-400"
                      }
                    >
                      {group.is_public ? "Public" : "Private"}
                    </Chip>
                  </div>
                  <p className="text-white/70 mb-4">{group.description}</p>
                  <div className="flex items-center gap-4 text-white/50 text-sm">
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {group.member_count} members
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      Created{" "}
                      {new Date(group.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 flex-shrink-0">
                  {isMember ? (
                    <>
                      {(isOwner || isAdmin) && (
                        <Link href={`/groups/${group.id}/edit`}>
                          <Button
                            className="bg-white/10 text-white hover:bg-white/20"
                            startContent={<Edit className="w-4 h-4" />}
                          >
                            Edit
                          </Button>
                        </Link>
                      )}
                      {isOwner && (
                        <Button
                          className="bg-red-500/20 text-red-400 hover:bg-red-500/30"
                          startContent={<Trash2 className="w-4 h-4" />}
                          onPress={onDeleteOpen}
                        >
                          Delete
                        </Button>
                      )}
                      {!isOwner && (
                        <Button
                          className="bg-white/10 text-white hover:bg-white/20"
                          startContent={<UserMinus className="w-4 h-4" />}
                          onPress={onLeaveOpen}
                        >
                          Leave
                        </Button>
                      )}
                    </>
                  ) : (
                    <Button
                      className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white"
                      startContent={<UserPlus className="w-4 h-4" />}
                      onPress={handleJoin}
                      isLoading={isJoining}
                    >
                      Join Group
                    </Button>
                  )}
                </div>
              </div>
            </MotionGlassCard>

            {/* Tabs */}
            <div className="flex justify-center">
              <Tabs
                selectedKey={activeTab as any}
                onSelectionChange={(key) => setActiveTab(key as string)}
                classNames={{
                  tabList: "bg-white/5 border border-white/10",
                  cursor: "bg-indigo-500",
                  tab: "text-white/50 data-[selected=true]:text-white",
                }}
              >
                <Tab key="posts" title="Posts" />
                <Tab key="members" title="Members" />
                <Tab key="events" title="Events" />
                <Tab key="announcements" title="Announcements" />
                <Tab key="discussions" title="Discussions" />
              </Tabs>
            </div>

            {/* Tab Content */}
            {(activeTab as string) === "posts" && (
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="space-y-4"
              >
                {/* New Post Form */}
                {isMember && (
                  <MotionGlassCard
                    variants={itemVariants}
                    glow="none"
                    padding="md"
                  >
                    <div className="flex items-start gap-4">
                      <Avatar
                        name={`${user?.first_name} ${user?.last_name}`}
                        size="md"
                        className="ring-2 ring-white/10"
                      />
                      <div className="flex-1">
                        <Textarea
                          placeholder="Share something with the group..."
                          value={newPostContent}
                          onValueChange={setNewPostContent}
                          minRows={2}
                          classNames={{
                            input: "text-white placeholder:text-white/30",
                            inputWrapper: [
                              "bg-white/5",
                              "border border-white/10",
                              "hover:bg-white/10",
                              "group-data-[focus=true]:bg-white/10",
                            ],
                          }}
                        />
                        <div className="flex justify-end mt-3">
                          <Button
                            className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white"
                            startContent={<Send className="w-4 h-4" />}
                            onPress={handleCreatePost}
                            isLoading={isPostingLoading}
                            isDisabled={!newPostContent.trim()}
                          >
                            Post
                          </Button>
                        </div>
                      </div>
                    </div>
                  </MotionGlassCard>
                )}

                {/* Posts List */}
                {posts.length > 0 ? (
                  posts.map((post) => (
                    <MotionGlassCard
                      key={post.id}
                      variants={itemVariants}
                      glow="none"
                      padding="md"
                    >
                      <div className="flex items-start gap-4">
                        <Link href={`/members/${post.author?.id}`}>
                          <Avatar
                            name={`${post.author?.first_name} ${post.author?.last_name}`}
                            size="md"
                            className="ring-2 ring-white/10"
                          />
                        </Link>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <Link href={`/members/${post.author?.id}`}>
                              <p className="font-semibold text-white hover:text-indigo-400 transition-colors">
                                {post.author?.first_name} {post.author?.last_name}
                              </p>
                            </Link>
                            <p className="text-xs text-white/40">
                              {new Date(post.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <p className="text-white/70 mt-2 whitespace-pre-wrap">
                            {post.content}
                          </p>
                          <div className="flex items-center gap-4 mt-4">
                            <button
                              onClick={() =>
                                handleLikePost(post.id, post.is_liked)
                              }
                              className="flex items-center gap-1 text-white/50 hover:text-red-400 transition-colors"
                            >
                              <Heart
                                className={`w-4 h-4 ${
                                  post.is_liked
                                    ? "fill-red-400 text-red-400"
                                    : ""
                                }`}
                              />
                              <span className="text-sm">{post.like_count}</span>
                            </button>
                            <span className="flex items-center gap-1 text-white/50">
                              <MessageSquare className="w-4 h-4" />
                              <span className="text-sm">
                                {post.comment_count}
                              </span>
                            </span>
                          </div>
                        </div>
                      </div>
                    </MotionGlassCard>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3">
                      <MessageSquare className="w-6 h-6 text-white/20" />
                    </div>
                    <p className="text-white/50">No posts yet</p>
                    {isMember && (
                      <p className="text-white/40 text-sm mt-1">
                        Be the first to share something!
                      </p>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {(activeTab as string) === "members" && (
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 sm:grid-cols-2 gap-4"
              >
                {members.map((member) => (
                  <MotionGlassCard
                    key={member.id}
                    variants={itemVariants}
                    glow="none"
                    padding="md"
                    hover
                  >
                    <div className="flex items-center gap-4">
                      <Link href={`/members/${member.user?.id}`}>
                        <Avatar
                          name={`${member.user?.first_name} ${member.user?.last_name}`}
                          size="lg"
                          className="ring-2 ring-white/10"
                        />
                      </Link>
                      <div className="flex-1 min-w-0">
                        <Link href={`/members/${member.user?.id}`}>
                          <p className="font-semibold text-white hover:text-indigo-400 transition-colors">
                            {member.user?.first_name} {member.user?.last_name}
                          </p>
                        </Link>
                        <div className="flex items-center gap-2 mt-1">
                          {getRoleIcon(member.role)}
                          <span className="text-sm text-white/50 capitalize">
                            {member.role}
                          </span>
                        </div>
                        <p className="text-xs text-white/40 mt-1">
                          Joined{" "}
                          {new Date(member.joined_at).toLocaleDateString()}
                        </p>
                      </div>
                      {member.user?.id !== user?.id && (
                        <Link href={`/messages?user=${member.user?.id}`}>
                          <Button
                            isIconOnly
                            size="sm"
                            className="bg-white/10 text-white hover:bg-white/20"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </Button>
                        </Link>
                      )}
                    </div>
                  </MotionGlassCard>
                ))}
                {members.length === 0 && (
                  <div className="col-span-2 text-center py-12">
                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3">
                      <Users className="w-6 h-6 text-white/20" />
                    </div>
                    <p className="text-white/50">No members yet</p>
                  </div>
                )}
              </motion.div>
            )}

            {(activeTab as string) === "events" && (
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="space-y-4"
              >
                {events.length > 0 ? (
                  events.map((event) => (
                    <Link key={event.id} href={`/events/${event.id}`}>
                      <MotionGlassCard
                        variants={itemVariants}
                        glow="none"
                        padding="md"
                        hover
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 rounded-lg bg-indigo-500/20 flex flex-col items-center justify-center flex-shrink-0">
                            <span className="text-xs text-indigo-400 uppercase">
                              {new Date(event.start_time).toLocaleDateString(
                                "en-US",
                                { month: "short" }
                              )}
                            </span>
                            <span className="text-xl font-bold text-white">
                              {new Date(event.start_time).getDate()}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-white">
                              {event.title}
                            </h4>
                            <p className="text-sm text-white/50 line-clamp-1">
                              {event.description}
                            </p>
                            <p className="text-xs text-white/40 mt-1">
                              {new Date(event.start_time).toLocaleTimeString(
                                [],
                                { hour: "2-digit", minute: "2-digit" }
                              )}{" "}
                              • {event.attendee_count} attending
                            </p>
                          </div>
                        </div>
                      </MotionGlassCard>
                    </Link>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3">
                      <Calendar className="w-6 h-6 text-white/20" />
                    </div>
                    <p className="text-white/50">No events yet</p>
                    {(isOwner || isAdmin) && (
                      <Link href={`/events/new?group=${groupId}`}>
                        <Button
                          size="sm"
                          className="mt-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white"
                        >
                          Create Event
                        </Button>
                      </Link>
                    )}
             
            {(activeTab as string) === "announcements" && (
              <div className="space-y-4">
                {announcements.length > 0 ? (
                  announcements.map((ann: any) => (
                    <MotionGlassCard key={ann.id} variants={itemVariants} glow="none" padding="md" hover={false}>
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                          <Megaphone className="w-4 h-4 text-amber-400" />
                        </div>
                        <div>
                          <h4 className="text-white font-semibold">{ann.title}</h4>
                          <p className="text-white/60 text-sm mt-1">{ann.content}</p>
                          <p className="text-white/30 text-xs mt-2">{new Date(ann.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </MotionGlassCard>
                  ))
                ) : (
                  <div className="text-center py-12 text-white/40">
                    <Megaphone className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p>No announcements yet</p>
                  </div>
                )}
              </div>
            )}

            {(activeTab as string) === "discussions" && (
              <div className="space-y-4">
                {isMember && (
                  <GlassCard padding="md">
                    <h4 className="text-white font-semibold mb-3">Start a Discussion</h4>
                    <input
                      type="text"
                      placeholder="Discussion title..."
                      value={newDiscussionTitle}
                      onChange={(e) => setNewDiscussionTitle(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder:text-white/30 text-sm mb-2 outline-none focus:border-indigo-500/50"
                    />
                    <Textarea
                      placeholder="Share your thoughts..."
                      value={newDiscussionContent}
                      onValueChange={setNewDiscussionContent}
                      minRows={2}
                      classNames={{
                        input: "text-white placeholder:text-white/30",
                        inputWrapper: ["bg-white/5", "border border-white/10", "hover:bg-white/10"],
                      }}
                    />
                    <Button
                      size="sm"
                      color="primary"
                      className="mt-2"
                      isLoading={isCreatingDiscussion}
                      isDisabled={!newDiscussionTitle.trim()}
                      onPress={() => group && handleCreateDiscussion(group.id)}
                    >
                      Post Discussion
                    </Button>
                  </GlassCard>
                )}
                {discussions.length > 0 ? (
                  discussions.map((disc: any) => (
                    <MotionGlassCard key={disc.id} variants={itemVariants} glow="none" padding="md" hover={false}>
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                          <MessageCircle className="w-4 h-4 text-indigo-400" />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-white font-semibold">{disc.title}</h4>
                          {disc.content && <p className="text-white/60 text-sm mt-1">{disc.content}</p>}
                          <div className="flex items-center gap-3 mt-2 text-xs text-white/30">
                            <span>{new Date(disc.created_at).toLocaleDateString()}</span>
                            {disc.reply_count != null && <span>{disc.reply_count} replies</span>}
                          </div>
                        </div>
                      </div>
                    </MotionGlassCard>
                  ))
                ) : (
                  <div className="text-center py-12 text-white/40">
                    <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p>No discussions yet. Start one!</p>
                  </div>
                )}
              </div>
            )}
     </div>
                )}
              </motion.div>
            )}
          </motion.div>
        ) : (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-white/20" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              Group not found
            </h3>
            <p className="text-white/50 mb-6">
              This group may have been removed or doesn&apos;t exist.
            </p>
            <Link href="/groups">
              <Button className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
                Browse Groups
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteOpen}
        onClose={onDeleteClose}
        classNames={{
          base: "bg-black/90 border border-white/10",
          header: "border-b border-white/10",
          body: "py-6",
          footer: "border-t border-white/10",
        }}
      >
        <ModalContent>
          <ModalHeader className="text-white">Delete Group</ModalHeader>
          <ModalBody>
            <p className="text-white/70">
              Are you sure you want to delete this group? All posts, members,
              and events will be removed. This action cannot be undone.
            </p>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="light"
              className="text-white/70"
              onPress={onDeleteClose}
            >
              Cancel
            </Button>
            <Button
              className="bg-red-500 text-white"
              onPress={handleDelete}
              isLoading={isDeleting}
            >
              Delete
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Leave Confirmation Modal */}
      <Modal
        isOpen={isLeaveOpen}
        onClose={onLeaveClose}
        classNames={{
          base: "bg-black/90 border border-white/10",
          header: "border-b border-white/10",
          body: "py-6",
          footer: "border-t border-white/10",
        }}
      >
        <ModalContent>
          <ModalHeader className="text-white">Leave Group</ModalHeader>
          <ModalBody>
            <p className="text-white/70">
              Are you sure you want to leave this group? You can rejoin anytime
              if the group is public.
            </p>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="light"
              className="text-white/70"
              onPress={onLeaveClose}
            >
              Cancel
            </Button>
            <Button
              className="bg-red-500 text-white"
              onPress={handleLeave}
              isLoading={isLeaving}
            >
              Leave
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
