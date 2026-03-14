// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import {
  Button,
  Chip,
  Skeleton,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Select,
  SelectItem,
} from "@heroui/react";
import { Upload, File, Image, FileText, Trash2, Download, FolderOpen } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { ProtectedRoute } from "@/components/protected-route";
import { MotionGlassCard } from "@/components/glass-card";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import { logger } from "@/lib/logger";
import { containerVariantsFast, itemVariants } from "@/lib/animations";

interface UserFile {
  id: number;
  name: string;
  size: number;
  type: string;
  category: string;
  url: string;
  created_at: string;
}

const categories = ["documents", "images", "verification", "other"];

function getFileIcon(type: string) {
  if (type?.startsWith("image")) return Image;
  if (type?.includes("pdf") || type?.includes("doc")) return FileText;
  return File;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

export default function FilesPage() {
  return (
    <ProtectedRoute>
      <FilesContent />
    </ProtectedRoute>
  );
}

function FilesContent() {
  const { user, logout } = useAuth();
  const [files, setFiles] = useState<UserFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [uploadCategory, setUploadCategory] = useState("documents");

  const fetchFiles = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await api.getMyFiles();
      setFiles(response || []);
    } catch (error) {
      logger.error("Failed to fetch files:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchFiles(); }, [fetchFiles]);
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      await api.uploadFile(formData, uploadCategory);
      await fetchFiles();
      onClose();
    } catch (error) {
      logger.error("Failed to upload file:", error);
      setActionError(error instanceof Error ? error.message : "Failed to upload file.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (fileId: number) => {
    try {
      await api.deleteFile(fileId);
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
    } catch (error) {
      logger.error("Failed to delete file:", error);
      setActionError(error instanceof Error ? error.message : "Failed to delete file.");
    }
  };

  const filtered = selectedCategory === "all" ? files : files.filter((f) => f.category === selectedCategory);

  return (
    <div className="min-h-screen">
      <Navbar user={user} onLogout={logout} />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {actionError && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
            {actionError}
          </div>
        )}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <FolderOpen className="w-8 h-8 text-indigo-400" />
              My Files
            </h1>
            <p className="text-white/50 mt-1">Manage your uploaded documents and images</p>
          </div>
          <Button color="primary" onPress={onOpen} startContent={<Upload className="w-4 h-4" />}>
            Upload
          </Button>
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {["all", ...categories].map((cat) => (
            <Chip
              key={cat}
              variant={selectedCategory === cat ? "solid" : "flat"}
              color={selectedCategory === cat ? "primary" : "default"}
              className="cursor-pointer capitalize"
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </Chip>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="p-4 rounded-xl bg-white/5 border border-white/10">
                <Skeleton className="w-3/4 h-5 rounded mb-2" />
                <Skeleton className="w-1/3 h-4 rounded" />
              </div>
            ))}
          </div>
        ) : filtered.length > 0 ? (
          <motion.div variants={containerVariantsFast} initial="hidden" animate="visible" className="space-y-4">
            {filtered.map((file) => {
              const IconComponent = getFileIcon(file.type);
              return (
                <MotionGlassCard key={file.id} variants={itemVariants} glow="none" padding="md" hover>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                        <IconComponent className="w-5 h-5 text-indigo-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-white font-medium truncate">{file.name}</p>
                        <div className="flex items-center gap-2 text-sm text-white/40">
                          <span>{formatSize(file.size)}</span>
                          <span>·</span>
                          <span className="capitalize">{file.category}</span>
                          <span>·</span>
                          <span>{new Date(file.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {file.url && (
                        <Button size="sm" variant="flat" isIconOnly as="a" href={file.url} target="_blank">
                          <Download className="w-4 h-4" />
                        </Button>
                      )}
                      <Button size="sm" variant="flat" color="danger" isIconOnly onPress={() => handleDelete(file.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </MotionGlassCard>
              );
            })}
          </motion.div>
        ) : (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
              <FolderOpen className="w-8 h-8 text-white/20" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No files uploaded</h3>
            <p className="text-white/50 mb-4">Upload documents, images, or verification files.</p>
            <Button color="primary" onPress={onOpen} startContent={<Upload className="w-4 h-4" />}>
              Upload File
            </Button>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      <Modal isOpen={isOpen} onClose={onClose} classNames={{ base: "bg-gray-900 border border-white/10" }}>
        <ModalContent>
          <ModalHeader className="text-white">Upload File</ModalHeader>
          <ModalBody>
            <Select
              label="Category"
              selectedKeys={[uploadCategory]}
              onSelectionChange={(keys) => setUploadCategory(Array.from(keys)[0] as string)}
              classNames={{ trigger: "bg-white/5 border-white/10", value: "text-white" }}
            >
              {categories.map((cat) => (
                <SelectItem key={cat} className="capitalize">{cat}</SelectItem>
              ))}
            </Select>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleUpload}
              className="mt-4 text-white/70 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-indigo-500 file:text-white file:cursor-pointer hover:file:bg-indigo-600"
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={onClose}>Cancel</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
