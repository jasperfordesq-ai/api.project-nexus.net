// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.
import apiClient from './client'

export interface UploadedFile {
  id: number; fileName: string; fileUrl: string; fileType: string;
  fileSize: number; uploadedAt: string
}

export const uploadApi = {
  upload: (file: File, context?: string) => {
    const form = new FormData()
    form.append('file', file)
    if (context) form.append('context', context)
    return apiClient.post<UploadedFile>('/api/files/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(r => r.data)
  },
  myFiles: () => apiClient.get<UploadedFile[]>('/api/files').then(r => r.data),
  delete: (id: number) => apiClient.delete(`/api/files/${id}`).then(r => r.data),
}
