// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/**
 * Log File Viewer (Admin) — tail + regex filter for a single log file.
 *
 * Source: GET /api/v2/admin/enterprise/monitoring/log-files/{filename}
 *   ?lines=500 (returns either a string body or { data: { lines: string[] }})
 *
 * Persisted-write path stubs this for unknown tenants; the viewer renders
 * whatever the backend returns and degrades to an empty state.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Button, Card, CardBody, CardHeader, Chip, Input, Spinner, Switch,
} from '@heroui/react';
import { ArrowLeft, Download, RefreshCw, ScrollText, Search } from 'lucide-react';
import { usePageTitle } from '@/hooks';
import { useToast } from '@/contexts';
import { api, API_BASE } from '@/lib/api';
import { PageHeader } from '../../components';

interface LinesEnvelope {
  lines?: string[];
  content?: string;
  raw?: string;
}

function splitLines(input: unknown): string[] {
  if (Array.isArray(input)) return input.map((v) => String(v));
  if (typeof input === 'string') return input.split(/\r?\n/);
  if (input && typeof input === 'object') {
    const env = input as LinesEnvelope & { data?: LinesEnvelope };
    if (Array.isArray(env.lines)) return env.lines;
    if (typeof env.content === 'string') return env.content.split(/\r?\n/);
    if (typeof env.raw === 'string') return env.raw.split(/\r?\n/);
    if (env.data) return splitLines(env.data);
  }
  return [];
}

export default function LogFileViewerPage() {
  const { filename: rawFilename } = useParams<{ filename: string }>();
  const filename = rawFilename ? decodeURIComponent(rawFilename) : '';
  usePageTitle(`Admin - Log: ${filename}`);

  const navigate = useNavigate();
  const toast = useToast();
  const [lines, setLines] = useState<string[]>([]);
  const [lineCount, setLineCount] = useState(500);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const intervalRef = useRef<number | null>(null);

  const load = useCallback(async () => {
    if (!filename) return;
    setLoading(true);
    try {
      const url = `/v2/admin/enterprise/monitoring/log-files/${encodeURIComponent(filename)}?lines=${lineCount}`;
      const res = await api.get<unknown>(url);
      if (res.success) {
        setLines(splitLines(res.data));
      }
    } catch {
      toast.error('Failed to load log file');
    } finally {
      setLoading(false);
    }
  }, [filename, lineCount, toast]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!autoRefresh) {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }
    intervalRef.current = window.setInterval(() => { load(); }, 10000);
    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [autoRefresh, load]);

  const filterRegex = useMemo(() => {
    if (!filter.trim()) return null;
    try { return new RegExp(filter, 'i'); }
    catch { return null; }
  }, [filter]);

  const filteredLines = useMemo(() => {
    if (!filterRegex) return lines;
    return lines.filter((l) => filterRegex.test(l));
  }, [lines, filterRegex]);

  const downloadFull = useCallback(() => {
    const url = `${API_BASE}/v2/admin/enterprise/monitoring/log-files/${encodeURIComponent(filename)}?full=1`;
    window.open(url, '_blank');
  }, [filename]);

  if (!filename) {
    return <div className="p-6 text-sm text-danger">No filename specified.</div>;
  }

  return (
    <div>
      <PageHeader
        title={`Log: ${filename}`}
        description={`Showing last ${lineCount} lines${filterRegex ? ` (filtered: ${filteredLines.length} of ${lines.length})` : ` (${lines.length} lines)`}`}
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="flat" startContent={<ArrowLeft size={16} />}
              onPress={() => navigate('/admin/enterprise/monitoring/log-files')}>Back</Button>
            <Button size="sm" variant="flat" startContent={<Download size={16} />}
              onPress={downloadFull}>Download full</Button>
            <Button size="sm" variant="flat" startContent={<RefreshCw size={16} />}
              onPress={load} isLoading={loading}>Refresh</Button>
          </div>
        }
      />
      <Card shadow="sm">
        <CardHeader className="flex items-center gap-2">
          <ScrollText size={18} className="text-primary" />
          <h3 className="text-lg font-semibold">Tail</h3>
          <div className="ml-auto flex items-center gap-2">
            <Input
              size="sm" variant="bordered" className="w-64"
              placeholder="Filter (regex, case-insensitive)"
              value={filter} onValueChange={setFilter}
              startContent={<Search size={14} />}
            />
            <Input
              size="sm" variant="bordered" className="w-24" type="number"
              value={String(lineCount)}
              onValueChange={(v) => {
                const n = Number(v);
                if (Number.isFinite(n) && n > 0) setLineCount(Math.min(5000, Math.max(50, Math.round(n))));
              }}
              aria-label="Lines"
            />
            <div className="flex items-center gap-1 text-xs">
              <Switch size="sm" isSelected={autoRefresh} onValueChange={setAutoRefresh} />
              <span>auto-refresh 10s</span>
            </div>
          </div>
        </CardHeader>
        <CardBody>
          {loading ? (
            <div className="flex h-64 items-center justify-center"><Spinner /></div>
          ) : (
            <pre className="max-h-[60vh] overflow-auto rounded bg-default-50 p-3 text-xs font-mono leading-5">
              {filteredLines.length === 0 ? (
                <span className="text-default-500">{lines.length === 0 ? 'No content' : 'No lines match the filter'}</span>
              ) : (
                filteredLines.map((l, i) => (
                  <div key={i} className="flex">
                    <span className="mr-3 inline-block w-12 select-none text-right text-default-400">{i + 1}</span>
                    <span className="whitespace-pre-wrap break-all">{l}</span>
                  </div>
                ))
              )}
            </pre>
          )}
          {filter && !filterRegex && (
            <Chip color="warning" variant="flat" size="sm" className="mt-2">Invalid regex</Chip>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
