"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Button,
  Input,
  Chip,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Spinner,
  Textarea,
  Select,
  SelectItem,
  Card,
  CardBody,
  Divider,
} from "@heroui/react";
import {
  User as UserIcon,
  ChevronLeft,
  AlertCircle,
  Edit2,
  Shield,
  Ban,
  CheckCircle,
  Mail,
  Calendar,
  Activity,
} from "lucide-react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { AdminProtectedRoute } from "@/components/admin-protected-route";
import { GlassCard } from "@/components/glass-card";
import { useAuth } from "@/contexts/auth-context";
import { api, type AdminUserDetails, type AdminUser } from "@/lib/api";

export default function AdminUserDetailPage() {
  return (
    <AdminProtectedRoute>
      <AdminUserDetailContent />
    </AdminProtectedRoute>
  );
}

function AdminUserDetailContent() {
  const { user, logout } = useAuth();
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;

  const [userData, setUserData] = useState<AdminUserDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [modalType, setModalType] = useState<"edit" | "suspend" | null>(null);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    role: "member",
  });
  const [suspendReason, setSuspendReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchUser = async () => {
    setIsLoading(true);
    try {
      const response = await api.adminGetUser(parseInt(userId));
      setUserData(response);
      setFormData({
        first_name: response.user.first_name,
        last_name: response.user.last_name,
        email: response.user.email,
        role: response.user.role,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load user");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchUser();
    }
  }, [userId]);

  const handleUpdate = async () => {
    setIsSubmitting(true);
    try {
      await api.adminUpdateUser(parseInt(userId), formData);
      setModalType(null);
      fetchUser();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update user");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSuspend = async () => {
    setIsSubmitting(true);
    try {
      await api.adminSuspendUser(parseInt(userId), suspendReason || undefined);
      setModalType(null);
      setSuspendReason("");
      fetchUser();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to suspend user");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleActivate = async () => {
    setIsSubmitting(true);
    try {
      await api.adminActivateUser(parseInt(userId));
      fetchUser();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to activate user");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <Navbar user={user} onLogout={logout} />
        <div className="flex justify-center items-center py-20">
          <Spinner size="lg" />
        </div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="min-h-screen">
        <Navbar user={user} onLogout={logout} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">User not found</h2>
            <p className="text-white/50 mb-4">{error || "The requested user could not be found."}</p>
            <Link href="/admin/users">
              <Button color="primary">Back to Users</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { user: u, stats } = userData;

  return (
    <div className="min-h-screen">
      <Navbar user={user} onLogout={logout} />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link href="/admin/users">
            <Button isIconOnly variant="ghost" size="sm">
              <ChevronLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <UserIcon className="w-8 h-8 text-blue-400" />
              <h1 className="text-3xl font-bold text-white">
                {u.first_name} {u.last_name}
              </h1>
            </div>
            <p className="text-white/50 mt-1">{u.email}</p>
          </div>
          <div className="flex gap-2">
            <Chip
              color={u.role === "admin" ? "secondary" : "default"}
              variant="flat"
              startContent={<Shield className="w-3 h-3" />}
            >
              {u.role}
            </Chip>
            <Chip
              color={u.suspended_at ? "danger" : u.is_active ? "success" : "warning"}
              variant="flat"
            >
              {u.suspended_at ? "Suspended" : u.is_active ? "Active" : "Inactive"}
            </Chip>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <p className="text-red-400">{error}</p>
            <Button size="sm" variant="light" onPress={() => setError(null)}>
              Dismiss
            </Button>
          </div>
        )}

        {/* Suspension Warning */}
        {u.suspended_at && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Ban className="w-5 h-5 text-red-400" />
              <span className="font-semibold text-red-400">User Suspended</span>
            </div>
            {u.suspension_reason && (
              <p className="text-white/70">Reason: {u.suspension_reason}</p>
            )}
            <p className="text-white/50 text-sm mt-1">
              Suspended on {formatDate(u.suspended_at)}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* User Details */}
          <GlassCard>
            <h2 className="text-lg font-semibold text-white mb-4">User Details</h2>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-white/50" />
                <div>
                  <p className="text-white/50 text-sm">Email</p>
                  <p className="text-white">{u.email}</p>
                </div>
              </div>
              <Divider className="bg-white/10" />
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-white/50" />
                <div>
                  <p className="text-white/50 text-sm">Member since</p>
                  <p className="text-white">{formatDate(u.created_at)}</p>
                </div>
              </div>
              <Divider className="bg-white/10" />
              <div className="flex items-center gap-3">
                <Activity className="w-5 h-5 text-white/50" />
                <div>
                  <p className="text-white/50 text-sm">Last login</p>
                  <p className="text-white">{formatDate(u.last_login_at)}</p>
                </div>
              </div>
              <Divider className="bg-white/10" />
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-white/50" />
                <div>
                  <p className="text-white/50 text-sm">Level</p>
                  <p className="text-white">Level {u.level || 1} ({u.total_xp || 0} XP)</p>
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Stats */}
          <GlassCard>
            <h2 className="text-lg font-semibold text-white mb-4">Activity Stats</h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-white/5 rounded-lg">
                <p className="text-2xl font-bold text-white">{stats.listings}</p>
                <p className="text-white/50 text-sm">Listings</p>
              </div>
              <div className="text-center p-4 bg-white/5 rounded-lg">
                <p className="text-2xl font-bold text-white">{stats.transactions}</p>
                <p className="text-white/50 text-sm">Transactions</p>
              </div>
              <div className="text-center p-4 bg-white/5 rounded-lg">
                <p className="text-2xl font-bold text-white">{stats.connections}</p>
                <p className="text-white/50 text-sm">Connections</p>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Actions */}
        <GlassCard className="mt-6">
          <h2 className="text-lg font-semibold text-white mb-4">Actions</h2>
          <div className="flex flex-wrap gap-3">
            <Button
              color="primary"
              startContent={<Edit2 className="w-4 h-4" />}
              onPress={() => setModalType("edit")}
            >
              Edit User
            </Button>
            {u.suspended_at ? (
              <Button
                color="success"
                variant="flat"
                startContent={<CheckCircle className="w-4 h-4" />}
                onPress={handleActivate}
                isLoading={isSubmitting}
              >
                Activate User
              </Button>
            ) : (
              <Button
                color="danger"
                variant="flat"
                startContent={<Ban className="w-4 h-4" />}
                onPress={() => setModalType("suspend")}
              >
                Suspend User
              </Button>
            )}
          </div>
        </GlassCard>
      </div>

      {/* Edit Modal */}
      <Modal
        isOpen={modalType === "edit"}
        onClose={() => setModalType(null)}
        classNames={{
          base: "bg-zinc-900 border border-white/10",
          header: "border-b border-white/10",
          body: "py-6",
          footer: "border-t border-white/10",
        }}
      >
        <ModalContent>
          <ModalHeader className="text-white">Edit User</ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <Input
                label="First Name"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                classNames={{
                  input: "text-white",
                  inputWrapper: "bg-white/5 border-white/10",
                }}
              />
              <Input
                label="Last Name"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                classNames={{
                  input: "text-white",
                  inputWrapper: "bg-white/5 border-white/10",
                }}
              />
              <Input
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                classNames={{
                  input: "text-white",
                  inputWrapper: "bg-white/5 border-white/10",
                }}
              />
              <Select
                label="Role"
                selectedKeys={[formData.role]}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                classNames={{
                  trigger: "bg-white/5 border-white/10",
                  value: "text-white",
                }}
              >
                <SelectItem key="member">Member</SelectItem>
                <SelectItem key="admin">Admin</SelectItem>
              </Select>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" onPress={() => setModalType(null)}>
              Cancel
            </Button>
            <Button color="primary" onPress={handleUpdate} isLoading={isSubmitting}>
              Save Changes
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Suspend Modal */}
      <Modal
        isOpen={modalType === "suspend"}
        onClose={() => setModalType(null)}
        classNames={{
          base: "bg-zinc-900 border border-white/10",
          header: "border-b border-white/10",
          body: "py-6",
          footer: "border-t border-white/10",
        }}
      >
        <ModalContent>
          <ModalHeader className="text-white">Suspend User</ModalHeader>
          <ModalBody>
            <p className="text-white/70 mb-4">
              Are you sure you want to suspend{" "}
              <span className="text-white font-medium">{u.first_name} {u.last_name}</span>?
              They will not be able to log in until reactivated.
            </p>
            <Textarea
              label="Reason (optional)"
              placeholder="Explain why this user is being suspended..."
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              classNames={{
                input: "text-white",
                inputWrapper: "bg-white/5 border-white/10",
              }}
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" onPress={() => setModalType(null)}>
              Cancel
            </Button>
            <Button color="danger" onPress={handleSuspend} isLoading={isSubmitting}>
              Suspend User
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
