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
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Switch,
  Spinner,
  Textarea,
} from "@heroui/react";
import {
  FolderTree,
  Plus,
  Edit2,
  Trash2,
  ChevronLeft,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { AdminProtectedRoute } from "@/components/admin-protected-route";
import { GlassCard } from "@/components/glass-card";
import { useAuth } from "@/contexts/auth-context";
import { api, type AdminCategory } from "@/lib/api";

export default function AdminCategoriesPage() {
  return (
    <AdminProtectedRoute>
      <AdminCategoriesContent />
    </AdminProtectedRoute>
  );
}

function AdminCategoriesContent() {
  const { user, logout } = useAuth();
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [modalType, setModalType] = useState<"create" | "edit" | "delete" | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<AdminCategory | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    slug: "",
    sort_order: 0,
    is_active: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchCategories = async () => {
    setIsLoading(true);
    try {
      const response = await api.adminGetCategories();
      setCategories(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load categories");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const openCreateModal = () => {
    setFormData({ name: "", description: "", slug: "", sort_order: 0, is_active: true });
    setSelectedCategory(null);
    setModalType("create");
  };

  const openEditModal = (category: AdminCategory) => {
    setFormData({
      name: category.name,
      description: category.description || "",
      slug: category.slug,
      sort_order: category.sort_order,
      is_active: category.is_active,
    });
    setSelectedCategory(category);
    setModalType("edit");
  };

  const openDeleteModal = (category: AdminCategory) => {
    setSelectedCategory(category);
    setModalType("delete");
  };

  const handleCreate = async () => {
    setIsSubmitting(true);
    try {
      await api.adminCreateCategory(formData);
      setModalType(null);
      fetchCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create category");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedCategory) return;
    setIsSubmitting(true);
    try {
      await api.adminUpdateCategory(selectedCategory.id, formData);
      setModalType(null);
      fetchCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update category");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedCategory) return;
    setIsSubmitting(true);
    try {
      await api.adminDeleteCategory(selectedCategory.id);
      setModalType(null);
      fetchCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete category");
    } finally {
      setIsSubmitting(false);
    }
  };

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
                <FolderTree className="w-8 h-8 text-purple-400" />
                <h1 className="text-3xl font-bold text-white">Categories</h1>
              </div>
              <p className="text-white/50 mt-1">Manage listing categories</p>
            </div>
          </div>
          <Button color="primary" startContent={<Plus className="w-4 h-4" />} onPress={openCreateModal}>
            Add Category
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

        {/* Categories Table */}
        <GlassCard>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : (
            <Table
              aria-label="Categories table"
              classNames={{
                wrapper: "bg-transparent shadow-none",
                th: "bg-white/5 text-white/70",
                td: "text-white",
              }}
            >
              <TableHeader>
                <TableColumn>NAME</TableColumn>
                <TableColumn>SLUG</TableColumn>
                <TableColumn>LISTINGS</TableColumn>
                <TableColumn>ORDER</TableColumn>
                <TableColumn>STATUS</TableColumn>
                <TableColumn>ACTIONS</TableColumn>
              </TableHeader>
              <TableBody emptyContent="No categories found">
                {categories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{category.name}</p>
                        {category.description && (
                          <p className="text-white/50 text-sm truncate max-w-xs">
                            {category.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-indigo-400 text-sm">{category.slug}</code>
                    </TableCell>
                    <TableCell>{category.listing_count || 0}</TableCell>
                    <TableCell>{category.sort_order}</TableCell>
                    <TableCell>
                      <Chip
                        size="sm"
                        color={category.is_active ? "success" : "default"}
                        variant="flat"
                      >
                        {category.is_active ? "Active" : "Inactive"}
                      </Chip>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="flat"
                          isIconOnly
                          onPress={() => openEditModal(category)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          color="danger"
                          variant="flat"
                          isIconOnly
                          isDisabled={(category.listing_count || 0) > 0}
                          onPress={() => openDeleteModal(category)}
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
        classNames={{
          base: "bg-zinc-900 border border-white/10",
          header: "border-b border-white/10",
          body: "py-6",
          footer: "border-t border-white/10",
        }}
      >
        <ModalContent>
          <ModalHeader className="text-white">
            {modalType === "create" ? "Create Category" : "Edit Category"}
          </ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <Input
                label="Name"
                placeholder="Category name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                classNames={{
                  input: "text-white",
                  inputWrapper: "bg-white/5 border-white/10",
                }}
              />
              <Textarea
                label="Description"
                placeholder="Category description (optional)"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                classNames={{
                  input: "text-white",
                  inputWrapper: "bg-white/5 border-white/10",
                }}
              />
              <Input
                label="Slug"
                placeholder="category-slug"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                classNames={{
                  input: "text-white",
                  inputWrapper: "bg-white/5 border-white/10",
                }}
                description="Leave blank to auto-generate from name"
              />
              <Input
                label="Sort Order"
                type="number"
                value={String(formData.sort_order)}
                onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                classNames={{
                  input: "text-white",
                  inputWrapper: "bg-white/5 border-white/10",
                }}
              />
              <div className="flex items-center justify-between">
                <span className="text-white">Active</span>
                <Switch
                  isSelected={formData.is_active}
                  onValueChange={(value) => setFormData({ ...formData, is_active: value })}
                />
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
          <ModalHeader className="text-white">Delete Category</ModalHeader>
          <ModalBody>
            <p className="text-white/70">
              Are you sure you want to delete{" "}
              <span className="text-white font-medium">{selectedCategory?.name}</span>?
              This action cannot be undone.
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
