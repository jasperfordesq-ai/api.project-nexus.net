"use client";

import { useState, useCallback, useRef } from "react";
import { getToken } from "@/lib/api";

export interface UploadedFile {
  id: string;
  url: string;
  filename: string;
  contentType: string;
  size: number;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface UseFileUploadOptions {
  endpoint?: string;
  maxFileSize?: number; // in bytes
  allowedTypes?: string[];
  onUploadStart?: (file: File) => void;
  onUploadProgress?: (progress: UploadProgress) => void;
  onUploadComplete?: (result: UploadedFile) => void;
  onUploadError?: (error: Error) => void;
}

const DEFAULT_MAX_SIZE = 5 * 1024 * 1024; // 5MB
const DEFAULT_ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

export function useFileUpload({
  endpoint = "/api/uploads",
  maxFileSize = DEFAULT_MAX_SIZE,
  allowedTypes = DEFAULT_ALLOWED_TYPES,
  onUploadStart,
  onUploadProgress,
  onUploadComplete,
  onUploadError,
}: UseFileUploadOptions = {}) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const validateFile = useCallback(
    (file: File): Error | null => {
      if (file.size > maxFileSize) {
        return new Error(
          `File size exceeds the maximum allowed size of ${Math.round(maxFileSize / 1024 / 1024)}MB`
        );
      }

      if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
        return new Error(
          `File type "${file.type}" is not allowed. Allowed types: ${allowedTypes.join(", ")}`
        );
      }

      return null;
    },
    [maxFileSize, allowedTypes]
  );

  const upload = useCallback(
    async (file: File): Promise<UploadedFile | null> => {
      // Validate file
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        onUploadError?.(validationError);
        return null;
      }

      // Reset state
      setIsUploading(true);
      setError(null);
      setProgress({ loaded: 0, total: file.size, percentage: 0 });
      onUploadStart?.(file);

      // Create abort controller for cancellation
      abortControllerRef.current = new AbortController();

      try {
        const token = getToken();
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5080";

        // Create form data
        const formData = new FormData();
        formData.append("file", file);

        // Use XMLHttpRequest for progress tracking
        const result = await new Promise<UploadedFile>((resolve, reject) => {
          const xhr = new XMLHttpRequest();

          xhr.upload.addEventListener("progress", (event) => {
            if (event.lengthComputable) {
              const progressData: UploadProgress = {
                loaded: event.loaded,
                total: event.total,
                percentage: Math.round((event.loaded / event.total) * 100),
              };
              setProgress(progressData);
              onUploadProgress?.(progressData);
            }
          });

          xhr.addEventListener("load", () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const response = JSON.parse(xhr.responseText);
                resolve(response);
              } catch {
                reject(new Error("Failed to parse upload response"));
              }
            } else {
              try {
                const errorResponse = JSON.parse(xhr.responseText);
                reject(new Error(errorResponse.message || "Upload failed"));
              } catch {
                reject(new Error(`Upload failed with status ${xhr.status}`));
              }
            }
          });

          xhr.addEventListener("error", () => {
            reject(new Error("Network error during upload"));
          });

          xhr.addEventListener("abort", () => {
            reject(new Error("Upload cancelled"));
          });

          // Handle abort signal
          abortControllerRef.current?.signal.addEventListener("abort", () => {
            xhr.abort();
          });

          xhr.open("POST", `${baseUrl}${endpoint}`);

          if (token) {
            xhr.setRequestHeader("Authorization", `Bearer ${token}`);
          }

          xhr.send(formData);
        });

        setUploadedFile(result);
        setProgress({ loaded: file.size, total: file.size, percentage: 100 });
        onUploadComplete?.(result);

        return result;
      } catch (err) {
        const uploadError =
          err instanceof Error ? err : new Error("Upload failed");
        setError(uploadError);
        onUploadError?.(uploadError);
        return null;
      } finally {
        setIsUploading(false);
        abortControllerRef.current = null;
      }
    },
    [endpoint, validateFile, onUploadStart, onUploadProgress, onUploadComplete, onUploadError]
  );

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  const reset = useCallback(() => {
    setIsUploading(false);
    setProgress(null);
    setError(null);
    setUploadedFile(null);
  }, []);

  return {
    upload,
    cancel,
    reset,
    isUploading,
    progress,
    error,
    uploadedFile,
    validateFile,
  };
}

// Helper to create a preview URL for an image file
export function createImagePreview(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("File is not an image"));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

// Format file size for display
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
