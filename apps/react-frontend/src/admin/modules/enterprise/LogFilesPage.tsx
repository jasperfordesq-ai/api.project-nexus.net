// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/**
 * Log Files (Admin) — listing of server log files.
 *
 * Source: GET /api/v2/admin/enterprise/monitoring/log-files
 *   (route registered on AdminExplicitParityController; falls through to
 *   GetPersistedCompatibilityRead which returns a TenantConfig-backed stub
 *   payload until a typed log-directory scanner is wired in a follow-up).
 *
 * The page is built to render whatever the endpoint returns as best-effort
 * (filename, size, last_modified) and to degrade to an empty state when
 * the backend has nothing for the tenant yet.
 */

import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button, Card, CardBody, CardHeader, Chip, Spinner,
  Table, TableBody, TableCell, TableColumn, TableHeader, TableRow,
} from '@heroui/react';
import { FileText, RefreshCw, ScrollText } from 'lucide-react';
import { usePageTitle } from '@/hooks';
import { useToast } from '@/contexts';
import { api } from '@/lib/api';
import { PageHeader } from '../../components';

interface LogFile {
  filename: string;
  size?: number | null;
  size_bytes?: number | null;
  last_modified?: string | null;
  modified_at?: string | null;
  modifiedAt?: string | null;
}

function formatBytes(n: number | null | undefined): string {
  if (n == null) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export default function LogFilesPage() {
  usePageTitle('Admin - Log Files');
  const navigate = useNavigate();
  const toast = useToast();
  const [files, setFiles] = useState<LogFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [backendAvailable, setBackendAvailable] = useState<boolean>(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<LogFile[]>('/v2/admin/enterprise/monitoring/log-files');
      if (res.success) {
        const payload = (res.data as unknown) as LogFile[] | { data?: LogFile[] } | null;
        let rows: LogFile[];
        if (Array.isArray(payload)) rows = payload;
        else if (payload && Array.isArray((payload as { data?: unknown }).data)) {
          rows = (payload as { data: LogFile[] }).data;
        } else {
          rows = [];
        }
        // Filter to entries that at least have a filename string
        rows = rows.filter((r) => typeof r?.filename === 'string' && r.filename.length > 0);
        setFiles(rows);
        setBackendAvailable(true);
      } else {
        setBackendAvailable(false);
      }
    } catch {
      toast.error('Failed to load log files');
      setBackendAvailable(false);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <PageHeader
        title="Log Files"
        description="Server log directory listing. Click a filename to view its tail in a viewer with regex search + auto-refresh."
        actions={
          <Button variant="flat" size="sm" startContent={<RefreshCw size={16} />}
            onPress={load} isLoading={loading}>Refresh</Button>
        }
      />
      <Card shadow="sm">
        <CardHeader className="flex items-center gap-2">
          <ScrollText size={18} className="text-primary" />
          <h3 className="text-lg font-semibold">Log Files ({files.length})</h3>
        </CardHeader>
        <CardBody>
          {!backendAvailable && (
            <p className="mb-3 rounded border border-warning-200 bg-warning-50 p-2 text-xs text-warning-700">
              Backend log-files endpoint not yet wired (returns stub). The page
              renders empty until a typed log-directory scanner replaces the
              persisted-write fallback in AdminExplicitParityController.
            </p>
          )}
          <Table aria-label="Log files" isStriped>
            <TableHeader>
              <TableColumn>Filename</TableColumn>
              <TableColumn>Size</TableColumn>
              <TableColumn>Last Modified</TableColumn>
              <TableColumn className="text-right">Actions</TableColumn>
            </TableHeader>
            <TableBody emptyContent="No log files" isLoading={loading} loadingContent={<Spinner />}>
              {files.map((f) => {
                const ts = f.last_modified ?? f.modified_at ?? f.modifiedAt;
                const sz = f.size ?? f.size_bytes;
                return (
                  <TableRow key={f.filename}>
                    <TableCell>
                      <button
                        type="button"
                        className="flex items-center gap-2 text-left text-sm text-primary hover:underline"
                        onClick={() => navigate(`/admin/enterprise/monitoring/log-files/${encodeURIComponent(f.filename)}`)}
                      >
                        <FileText size={14} />
                        <code>{f.filename}</code>
                      </button>
                    </TableCell>
                    <TableCell><Chip size="sm" variant="flat">{formatBytes(sz)}</Chip></TableCell>
                    <TableCell className="text-xs text-default-500">
                      {ts ? new Date(ts).toLocaleString() : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="flat"
                        onPress={() => navigate(`/admin/enterprise/monitoring/log-files/${encodeURIComponent(f.filename)}`)}>
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardBody>
      </Card>
    </div>
  );
}
