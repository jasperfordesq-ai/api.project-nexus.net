"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Button,
  Input,
  Chip,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Pagination,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Select,
  SelectItem,
  Spinner,
  Textarea,
} from "@heroui/react";
import {
  Users,
  Search,
  Shield,
  UserX,
  UserCheck,
  ChevronLeft,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { AdminProtectedRoute } from "@/components/admin-protected-route";
import { GlassCard } from "@/components/glass-card";
import { useAuth } from "@/contexts/auth-context";
import { api, type AdminUser } from "@/lib/api";

export default function AdminUsersPage() {
  return (
    <AdminProtectedRoute>
      <AdminUsersContent />
    </AdminProtectedRoute>
  );
}

function AdminUsersContent() {
  const { user, logout } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  // Modal state
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [modalType, setModalType] = useState<"suspend" | "activate" | "edit" | null>(null);
  const [suspendReason, setSuspendReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit: 20 };
      if (search) params.search = search;
      if (roleFilter) params.role = roleFilter;
      if (statusFilter) params.status = statusFilter;

      const response = await api.adminGetUsers(params);
      setUsers(response.data);
      setTotalPages(response?.pagination?.total_pages || 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, roleFilter, statusFilter]);

  const handleSearch = () => {
    setPage(1);
    fetchUsers();
  };

  const handleSuspend = async () => {
    if (!selectedUser) return;
    setIsSubmitting(true);
    try {
      await api.adminSuspendUser(selectedUser.id, suspendReason);
      setModalType(null);
      setSuspendReason("");
      fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to suspend user");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleActivate = async () => {
    if (!selectedUser) return;
    setIsSubmitting(true);
    try {
      await api.adminActivateUser(selectedUser.id);
      setModalType(null);
      fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to activate user");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar user={user} onLogout={logout} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link href="/admin">
            <Button isIconOnly variant="ghost" size="sm">
              <ChevronLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-indigo-400" />
              <h1 className="text-3xl font-bold text-white">User Management</h1>
            </div>
            <p className="text-white/50 mt-1">View and manage platform users</p>
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

        {/* Filters */}
        <GlassCard className="mb-6">
          <div className="flex flex-wrap gap-4">
            <Input
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              startContent={<Search className="w-4 h-4 text-white/30" />}
              classNames={{
                input: "text-white",
                inputWrapper: "bg-white/5 border-white/10",
              }}
              className="max-w-xs"
            />
            <Select
              placeholder="Filter by role"
              selectedKeys={roleFilter ? [roleFilter] : []}
              onSelectionChange={(keys) => setRoleFilter(Array.from(keys)[0] as string || "")}
              classNames={{
                trigger: "bg-white/5 border-white/10",
                value: "text-white",
              }}
              className="max-w-[150px]"
            >
              <SelectItem key="">All roles</SelectItem>
              <SelectItem key="admin">Admin</SelectItem>
              <SelectItem key="member">Member</SelectItem>
            </Select>
            <Select
              placeholder="Filter by status"
              selectedKeys={statusFilter ? [statusFilter] : []}
              onSelectionChange={(keys) => setStatusFilter(Array.from(keys)[0] as string || "")}
              classNames={{
                trigger: "bg-white/5 border-white/10",
                value: "text-white",
              }}
              className="max-w-[150px]"
            >
              <SelectItem key="">All status</SelectItem>
              <SelectItem key="active">Active</SelectItem>
              <SelectItem key="suspended">Suspended</SelectItem>
            </Select>
            <Button color="primary" onPress={handleSearch}>
              Search
            </Button>
          </div>
        </GlassCard>

        {/* Users Table */}
        <GlassCard>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : (
            <>
              <Table
                aria-label="Users table"
                classNames={{
                  wrapper: "bg-transparent shadow-none",
                  th: "bg-white/5 text-white/70",
                  td: "text-white",
                }}
              >
                <TableHeader>
                  <TableColumn>USER</TableColumn>
                  <TableColumn>ROLE</TableColumn>
                  <TableColumn>STATUS</TableColumn>
                  <TableColumn>JOINED</TableColumn>
                  <TableColumn>LAST LOGIN</TableColumn>
                  <TableColumn>ACTIONS</TableColumn>
                </TableHeader>
                <TableBody emptyContent="No users found">
                  {users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {u.first_name} {u.last_name}
                          </p>
                          <p className="text-white/50 text-sm">{u.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="sm"
                          color={u.role === "admin" ? "secondary" : "default"}
                          variant="flat"
                        >
                          {u.role}
                        </Chip>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="sm"
                          color={u.is_active ? "success" : "danger"}
                          variant="flat"
                        >
                          {u.is_active ? "Active" : "Suspended"}
                        </Chip>
                      </TableCell>
                      <TableCell>
                        {new Date(u.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {u.last_login_at
                          ? new Date(u.last_login_at).toLocaleDateString()
                          : "Never"}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Link href={`/admin/users/${u.id}`}>
                            <Button size="sm" variant="flat">
                              View
                            </Button>
                          </Link>
                          {u.is_active ? (
                            <Button
                              size="sm"
                              color="danger"
                              variant="flat"
                              isDisabled={u.id === user?.id}
                              onPress={() => {
                                setSelectedUser(u);
                                setModalType("suspend");
                              }}
                            >
                              <UserX className="w-4 h-4" />
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              color="success"
                              variant="flat"
                              onPress={() => {
                                setSelectedUser(u);
                                setModalType("activate");
                              }}
                            >
                              <UserCheck className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="flex justify-center mt-4">
                  <Pagination
                    total={totalPages}
                    page={page}
                    onChange={setPage}
                    showControls
                    classNames={{
                      cursor: "bg-indigo-500",
                    }}
                  />
                </div>
              )}
            </>
          )}
        </GlassCard>
      </div>

      {/* Suspend Modal */}
      <Modal
        isOpen={modalType === "suspend"}
        onClose={() => {
          setModalType(null);
          setSuspendReason("");
        }}
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
              <span className="text-white font-medium">
                {selectedUser?.first_name} {selectedUser?.last_name}
              </span>
              ?
            </p>
            <Textarea
              label="Reason (optional)"
              placeholder="Enter reason for suspension..."
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

      {/* Activate Modal */}
      <Modal
        isOpen={modalType === "activate"}
        onClose={() => setModalType(null)}
        classNames={{
          base: "bg-zinc-900 border border-white/10",
          header: "border-b border-white/10",
          body: "py-6",
          footer: "border-t border-white/10",
        }}
      >
        <ModalContent>
          <ModalHeader className="text-white">Activate User</ModalHeader>
          <ModalBody>
            <p className="text-white/70">
              Are you sure you want to activate{" "}
              <span className="text-white font-medium">
                {selectedUser?.first_name} {selectedUser?.last_name}
              </span>
              ? This will restore their access to the platform.
            </p>
            {selectedUser?.suspension_reason && (
              <div className="mt-4 p-3 bg-red-500/10 rounded-lg">
                <p className="text-red-400 text-sm">
                  <strong>Suspension reason:</strong> {selectedUser.suspension_reason}
                </p>
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" onPress={() => setModalType(null)}>
              Cancel
            </Button>
            <Button color="success" onPress={handleActivate} isLoading={isSubmitting}>
              Activate User
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
