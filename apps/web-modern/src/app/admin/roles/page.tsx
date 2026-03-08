"use client";

import { useEffect, useState } from "react";
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
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Spinner,
  Textarea,
  Checkbox,
  CheckboxGroup,
} from "@heroui/react";
import {
  Users2,
  Plus,
  Edit2,
  Trash2,
  ChevronLeft,
  AlertCircle,
  Shield,
  Lock,
} from "lucide-react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { AdminProtectedRoute } from "@/components/admin-protected-route";
import { GlassCard } from "@/components/glass-card";
import { useAuth } from "@/contexts/auth-context";
import { api, type AdminRole } from "@/lib/api";

const AVAILABLE_PERMISSIONS = [
  { key: "users.view", label: "View Users", group: "Users" },
  { key: "users.edit", label: "Edit Users", group: "Users" },
  { key: "users.suspend", label: "Suspend Users", group: "Users" },
  { key: "listings.view", label: "View Listings", group: "Listings" },
  { key: "listings.edit", label: "Edit Listings", group: "Listings" },
  { key: "listings.moderate", label: "Moderate Listings", group: "Listings" },
  { key: "listings.delete", label: "Delete Listings", group: "Listings" },
  { key: "categories.manage", label: "Manage Categories", group: "Categories" },
  { key: "config.view", label: "View Config", group: "Configuration" },
  { key: "config.edit", label: "Edit Config", group: "Configuration" },
  { key: "roles.manage", label: "Manage Roles", group: "Roles" },
  { key: "groups.moderate", label: "Moderate Groups", group: "Groups" },
  { key: "events.moderate", label: "Moderate Events", group: "Events" },
];

export default function AdminRolesPage() {
  return (
    <AdminProtectedRoute>
      <AdminRolesContent />
    </AdminProtectedRoute>
  );
}

function AdminRolesContent() {
  const { user, logout } = useAuth();
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [modalType, setModalType] = useState<"create" | "edit" | "delete" | null>(null);
  const [selectedRole, setSelectedRole] = useState<AdminRole | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    permissions: [] as string[],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchRoles = async () => {
    setIsLoading(true);
    try {
      const response = await api.adminGetRoles();
      setRoles(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load roles");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const openCreateModal = () => {
    setFormData({ name: "", description: "", permissions: [] });
    setSelectedRole(null);
    setModalType("create");
  };

  const openEditModal = (role: AdminRole) => {
    setFormData({
      name: role.name,
      description: role.description || "",
      permissions: role.permissions || [],
    });
    setSelectedRole(role);
    setModalType("edit");
  };

  const openDeleteModal = (role: AdminRole) => {
    setSelectedRole(role);
    setModalType("delete");
  };

  const handleCreate = async () => {
    setIsSubmitting(true);
    try {
      await api.adminCreateRole(formData);
      setModalType(null);
      fetchRoles();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create role");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedRole) return;
    setIsSubmitting(true);
    try {
      await api.adminUpdateRole(selectedRole.id, formData);
      setModalType(null);
      fetchRoles();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update role");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedRole) return;
    setIsSubmitting(true);
    try {
      await api.adminDeleteRole(selectedRole.id);
      setModalType(null);
      fetchRoles();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete role");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Group permissions by category for display
  const groupedPermissions = AVAILABLE_PERMISSIONS.reduce((acc, perm) => {
    if (!acc[perm.group]) {
      acc[perm.group] = [];
    }
    acc[perm.group].push(perm);
    return acc;
  }, {} as Record<string, typeof AVAILABLE_PERMISSIONS>);

  return (
    <div className="min-h-screen">
      <Navbar user={user} onLogout={logout} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/admin">
              <Button isIconOnly variant="ghost" size="sm">
                <ChevronLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <Users2 className="w-8 h-8 text-pink-400" />
                <h1 className="text-3xl font-bold text-white">Roles</h1>
              </div>
              <p className="text-white/50 mt-1">Manage user roles and permissions</p>
            </div>
          </div>
          <Button color="primary" startContent={<Plus className="w-4 h-4" />} onPress={openCreateModal}>
            Add Role
          </Button>
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

        {/* Roles Table */}
        <GlassCard>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : (
            <Table
              aria-label="Roles table"
              classNames={{
                wrapper: "bg-transparent shadow-none",
                th: "bg-white/5 text-white/70",
                td: "text-white",
              }}
            >
              <TableHeader>
                <TableColumn>ROLE</TableColumn>
                <TableColumn>PERMISSIONS</TableColumn>
                <TableColumn>TYPE</TableColumn>
                <TableColumn>ACTIONS</TableColumn>
              </TableHeader>
              <TableBody emptyContent="No roles found">
                {roles.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{role.name}</p>
                          {role.is_system && (
                            <Lock className="w-3 h-3 text-white/50" />
                          )}
                        </div>
                        {role.description && (
                          <p className="text-white/50 text-sm">{role.description}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-md">
                        {role.permissions && role.permissions.length > 0 ? (
                          role.permissions.slice(0, 3).map((perm) => (
                            <Chip key={perm} size="sm" variant="flat">
                              {perm}
                            </Chip>
                          ))
                        ) : (
                          <span className="text-white/50 text-sm">No permissions</span>
                        )}
                        {role.permissions && role.permissions.length > 3 && (
                          <Chip size="sm" variant="flat">
                            +{role.permissions.length - 3} more
                          </Chip>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="sm"
                        color={role.is_system ? "warning" : "default"}
                        variant="flat"
                        startContent={role.is_system ? <Shield className="w-3 h-3" /> : null}
                      >
                        {role.is_system ? "System" : "Custom"}
                      </Chip>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="flat"
                          isIconOnly
                          isDisabled={role.is_system}
                          onPress={() => openEditModal(role)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          color="danger"
                          variant="flat"
                          isIconOnly
                          isDisabled={role.is_system}
                          onPress={() => openDeleteModal(role)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </GlassCard>
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={modalType === "create" || modalType === "edit"}
        onClose={() => setModalType(null)}
        size="2xl"
        classNames={{
          base: "bg-zinc-900 border border-white/10",
          header: "border-b border-white/10",
          body: "py-6",
          footer: "border-t border-white/10",
        }}
      >
        <ModalContent>
          <ModalHeader className="text-white">
            {modalType === "create" ? "Create Role" : "Edit Role"}
          </ModalHeader>
          <ModalBody>
            <div className="space-y-6">
              <Input
                label="Role Name"
                placeholder="e.g., Moderator"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                classNames={{
                  input: "text-white",
                  inputWrapper: "bg-white/5 border-white/10",
                }}
              />
              <Textarea
                label="Description"
                placeholder="Describe this role's purpose..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                classNames={{
                  input: "text-white",
                  inputWrapper: "bg-white/5 border-white/10",
                }}
              />

              <div>
                <p className="text-white font-medium mb-4">Permissions</p>
                <div className="space-y-4 max-h-64 overflow-y-auto">
                  {Object.entries(groupedPermissions).map(([group, perms]) => (
                    <div key={group} className="space-y-2">
                      <p className="text-white/70 text-sm font-medium">{group}</p>
                      <CheckboxGroup
                        value={formData.permissions}
                        onChange={(value) => setFormData({ ...formData, permissions: value as string[] })}
                        classNames={{
                          wrapper: "gap-2",
                        }}
                      >
                        {perms.map((perm) => (
                          <Checkbox
                            key={perm.key}
                            value={perm.key}
                            classNames={{
                              label: "text-white/70",
                            }}
                          >
                            {perm.label}
                          </Checkbox>
                        ))}
                      </CheckboxGroup>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" onPress={() => setModalType(null)}>
              Cancel
            </Button>
            <Button
              color="primary"
              onPress={modalType === "create" ? handleCreate : handleUpdate}
              isLoading={isSubmitting}
              isDisabled={!formData.name.trim()}
            >
              {modalType === "create" ? "Create" : "Update"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={modalType === "delete"}
        onClose={() => setModalType(null)}
        classNames={{
          base: "bg-zinc-900 border border-white/10",
          header: "border-b border-white/10",
          body: "py-6",
          footer: "border-t border-white/10",
        }}
      >
        <ModalContent>
          <ModalHeader className="text-white">Delete Role</ModalHeader>
          <ModalBody>
            <p className="text-white/70">
              Are you sure you want to delete the role{" "}
              <span className="text-white font-medium">{selectedRole?.name}</span>?
              Users with this role will lose their assigned permissions.
            </p>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" onPress={() => setModalType(null)}>
              Cancel
            </Button>
            <Button color="danger" onPress={handleDelete} isLoading={isSubmitting}>
              Delete
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
