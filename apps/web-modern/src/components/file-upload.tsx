"use client";

import { useState, useRef, useCallback, type ChangeEvent, type DragEvent } from "react";
import { Button, Progress, Image } from "@heroui/react";
import { Upload, X, ImageIcon, FileIcon, AlertCircle, Check } from "lucide-react";
import {
  useFileUpload,
  createImagePreview,
  formatFileSize,
  type UploadedFile,
  type UseFileUploadOptions,
} from "@/hooks/use-file-upload";

interface FileUploadProps extends UseFileUploadOptions {
  onFileUploaded?: (file: UploadedFile) => void;
  accept?: string;
  multiple?: boolean;
  showPreview?: boolean;
  label?: string;
  description?: string;
  className?: string;
}

export function FileUpload({
  onFileUploaded,
  accept = "image/*",
  multiple = false,
  showPreview = true,
  label = "Upload file",
  description = "Drag and drop or click to select",
  className = "",
  ...uploadOptions
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const { upload, cancel, reset, isUploading, progress, error, uploadedFile } =
    useFileUpload({
      ...uploadOptions,
      onUploadComplete: (file) => {
        uploadOptions.onUploadComplete?.(file);
        onFileUploaded?.(file);
      },
    });

  const handleFileSelect = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;

      const file = files[0];
      setSelectedFile(file);

      // Create preview for images
      if (showPreview && file.type.startsWith("image/")) {
        try {
          const previewUrl = await createImagePreview(file);
          setPreview(previewUrl);
        } catch {
          setPreview(null);
        }
      }

      // Upload the file
      await upload(file);
    },
    [upload, showPreview]
  );

  const handleInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      handleFileSelect(e.target.files);
    },
    [handleFileSelect]
  );

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      handleFileSelect(e.dataTransfer.files);
    },
    [handleFileSelect]
  );

  const handleClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleClear = useCallback(() => {
    setSelectedFile(null);
    setPreview(null);
    reset();
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }, [reset]);

  return (
    <div className={className}>
      {/* Hidden input */}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleInputChange}
        className="hidden"
      />

      {/* Drop zone */}
      {!selectedFile && !uploadedFile && (
        <div
          onClick={handleClick}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
            transition-all duration-200
            ${
              isDragOver
                ? "border-indigo-500 bg-indigo-500/10"
                : "border-white/20 bg-white/5 hover:border-white/30 hover:bg-white/10"
            }
          `}
        >
          <div className="flex flex-col items-center gap-3">
            <div
              className={`
                w-12 h-12 rounded-full flex items-center justify-center
                ${isDragOver ? "bg-indigo-500/20" : "bg-white/10"}
              `}
            >
              <Upload
                className={`w-6 h-6 ${isDragOver ? "text-indigo-400" : "text-white/50"}`}
              />
            </div>
            <div>
              <p className="font-medium text-white">{label}</p>
              <p className="text-sm text-white/50">{description}</p>
            </div>
          </div>
        </div>
      )}

      {/* Selected file / Upload progress */}
      {(selectedFile || uploadedFile) && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="flex items-start gap-4">
            {/* Preview or icon */}
            <div className="flex-shrink-0">
              {preview ? (
                <Image
                  src={preview}
                  alt="Preview"
                  width={80}
                  height={80}
                  className="rounded-lg object-cover"
                />
              ) : uploadedFile?.url ? (
                <Image
                  src={uploadedFile.url}
                  alt="Uploaded"
                  width={80}
                  height={80}
                  className="rounded-lg object-cover"
                />
              ) : selectedFile?.type.startsWith("image/") ? (
                <div className="w-20 h-20 rounded-lg bg-white/10 flex items-center justify-center">
                  <ImageIcon className="w-8 h-8 text-white/30" />
                </div>
              ) : (
                <div className="w-20 h-20 rounded-lg bg-white/10 flex items-center justify-center">
                  <FileIcon className="w-8 h-8 text-white/30" />
                </div>
              )}
            </div>

            {/* File info */}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-white truncate">
                {selectedFile?.name || uploadedFile?.filename}
              </p>
              <p className="text-sm text-white/50">
                {formatFileSize(selectedFile?.size || uploadedFile?.size || 0)}
              </p>

              {/* Progress bar */}
              {isUploading && progress && (
                <div className="mt-2">
                  <Progress
                    value={progress.percentage}
                    size="sm"
                    color="primary"
                    className="max-w-full"
                  />
                  <p className="text-xs text-white/40 mt-1">
                    {progress.percentage}% uploaded
                  </p>
                </div>
              )}

              {/* Error message */}
              {error && (
                <div className="mt-2 flex items-center gap-2 text-red-400">
                  <AlertCircle className="w-4 h-4" />
                  <p className="text-sm">{error.message}</p>
                </div>
              )}

              {/* Success message */}
              {uploadedFile && !isUploading && (
                <div className="mt-2 flex items-center gap-2 text-green-400">
                  <Check className="w-4 h-4" />
                  <p className="text-sm">Upload complete</p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex-shrink-0">
              {isUploading ? (
                <Button
                  isIconOnly
                  size="sm"
                  variant="flat"
                  onPress={cancel}
                  className="bg-white/10 text-white"
                >
                  <X className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  isIconOnly
                  size="sm"
                  variant="flat"
                  onPress={handleClear}
                  className="bg-white/10 text-white"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Avatar-specific upload component
interface AvatarUploadProps {
  currentAvatar?: string;
  onAvatarChange?: (url: string) => void;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function AvatarUpload({
  currentAvatar,
  onAvatarChange,
  size = "lg",
  className = "",
}: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const { upload, isUploading, error } = useFileUpload({
    maxFileSize: 2 * 1024 * 1024, // 2MB for avatars
    allowedTypes: ["image/jpeg", "image/png", "image/webp"],
    onUploadComplete: (file) => {
      setPreview(file.url);
      onAvatarChange?.(file.url);
    },
  });

  const sizeClasses = {
    sm: "w-16 h-16",
    md: "w-24 h-24",
    lg: "w-32 h-32",
  };

  const handleFileSelect = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Create local preview immediately
      try {
        const previewUrl = await createImagePreview(file);
        setPreview(previewUrl);
      } catch {
        // Continue anyway
      }

      await upload(file);
    },
    [upload]
  );

  const displayUrl = preview || currentAvatar;

  return (
    <div className={className}>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />

      <div
        onClick={() => inputRef.current?.click()}
        className={`
          ${sizeClasses[size]} rounded-full cursor-pointer
          relative overflow-hidden group
          ${isUploading ? "animate-pulse" : ""}
        `}
      >
        {displayUrl ? (
          <img
            src={displayUrl}
            alt="Avatar"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-white/10 flex items-center justify-center">
            <ImageIcon className="w-1/3 h-1/3 text-white/30" />
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <Upload className="w-6 h-6 text-white" />
        </div>

        {/* Loading overlay */}
        {isUploading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-400 mt-2 text-center">{error.message}</p>
      )}
    </div>
  );
}
