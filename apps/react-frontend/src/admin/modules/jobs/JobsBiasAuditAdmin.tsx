// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/**
 * Jobs Bias Audit (Admin) — replaces the JobBiasAuditPage parity stub with
 * a real fairness audit wired to GET /api/admin/jobs/bias-audit.
 *
 * Implements the "four-fifths rule": flag any subgroup whose advancement
 * rate is < 80% of the highest subgroup's rate. Defaults to the last 90
 * days; can scope to a single job.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Input,
  Select,
  SelectItem,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from '@heroui/react';
import { BarChart3, AlertTriangle, RefreshCw } from 'lucide-react';
import { usePageTitle } from '@/hooks';
import { useToast } from '@/contexts';
import { api } from '@/lib/api';
import { PageHeader } from '../../components';

interface GroupBreakdown {
  group: string;
  totalApplicants: number;
  advancedCount: number;
  advancementRate: number;
  fourFifthsFlag: boolean;
}

interface AttributeBreakdown {
  attribute: string;
  groups: GroupBreakdown[];
}

interface BiasAuditReport {
  jobId: number | null;
  since: string;
  generatedAt: string;
  totalApplications: number;
  attributes: AttributeBreakdown[];
  message: string | null;
}

interface JobOption {
  id: number;
  title: string;
}

function defaultSinceIso(): string {
  const d = new Date();
  d.setDate(d.getDate() - 90);
  return d.toISOString().slice(0, 10);
}

export default function JobsBiasAuditAdmin() {
  usePageTitle('Admin - Job Bias Audit');
  const toast = useToast();

  const [jobId, setJobId] = useState<string>('all');
  const [since, setSince] = useState<string>(defaultSinceIso());
  const [report, setReport] = useState<BiasAuditReport | null>(null);
  const [jobs, setJobs] = useState<JobOption[]>([]);
  const [loading, setLoading] = useState(true);

  const loadJobs = useCallback(async () => {
    try {
      const res = await api.get<{ data: Array<{ id: number; title: string }> }>(
        '/v2/admin/jobs?limit=100',
      );
      if (res.success && res.data) {
        const payload = (res.data as unknown) as { data?: Array<{ id: number; title: string }> };
        setJobs((payload.data ?? []).map((j) => ({ id: j.id, title: j.title })));
      }
    } catch {
      // non-fatal — picker just stays empty (still works as "all jobs")
    }
  }, []);

  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (jobId !== 'all') params.set('jobId', jobId);
      // ISO 8601 — backend parses as UTC.
      params.set('since', new Date(since).toISOString());
      const res = await api.get<BiasAuditReport>(
        `/v2/admin/jobs/bias-audit?${params.toString()}`,
      );
      if (res.success && res.data) {
        setReport(res.data as BiasAuditReport);
      } else {
        toast.error('Failed to load bias audit');
      }
    } catch {
      toast.error('Failed to load bias audit');
    } finally {
      setLoading(false);
    }
  }, [jobId, since, toast]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const flaggedCount = useMemo(() => {
    if (!report) return 0;
    return report.attributes.reduce(
      (acc, attr) => acc + attr.groups.filter((g) => g.fourFifthsFlag).length,
      0,
    );
  }, [report]);

  return (
    <div>
      <PageHeader
        title="Job Bias Audit"
        description="Four-fifths rule fairness audit across job applications. Flags subgroups whose advancement rate is below 80% of the top group."
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Select
              size="sm"
              variant="bordered"
              className="w-56"
              selectedKeys={new Set([jobId])}
              onSelectionChange={(keys) => {
                const v = Array.from(keys)[0] as string | undefined;
                if (v) setJobId(v);
              }}
              aria-label="Job filter"
            >
              <SelectItem key="all" textValue="All jobs">All jobs</SelectItem>
              <>
                {jobs.map((j) => (
                  <SelectItem key={String(j.id)} textValue={j.title}>
                    {`#${j.id} ${j.title}`}
                  </SelectItem>
                ))}
              </>
            </Select>
            <Input
              type="date"
              size="sm"
              variant="bordered"
              className="w-44"
              value={since}
              onValueChange={setSince}
              aria-label="Since date"
            />
            <Button
              variant="flat"
              size="sm"
              startContent={<RefreshCw size={16} />}
              onPress={loadReport}
              isLoading={loading}
            >
              Refresh
            </Button>
          </div>
        }
      />

      <Card shadow="sm" className="mb-4">
        <CardBody>
          {loading && !report ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : report ? (
            <div className="flex items-center gap-6 flex-wrap">
              <div>
                <div className="text-xs text-default-500">Total applications</div>
                <div className="text-2xl font-semibold">{report.totalApplications}</div>
              </div>
              <div>
                <div className="text-xs text-default-500">Attributes audited</div>
                <div className="text-2xl font-semibold">{report.attributes.length}</div>
              </div>
              <div>
                <div className="text-xs text-default-500">Flagged groups</div>
                <div className="text-2xl font-semibold flex items-center gap-2">
                  {flaggedCount}
                  {flaggedCount > 0 && <AlertTriangle size={20} className="text-warning" />}
                </div>
              </div>
              <div>
                <div className="text-xs text-default-500">Generated</div>
                <div className="text-sm">{new Date(report.generatedAt).toLocaleString()}</div>
              </div>
            </div>
          ) : null}
        </CardBody>
      </Card>

      {report?.message && (
        <Card shadow="sm" className="mb-4 bg-warning-50">
          <CardBody className="flex flex-row items-start gap-3">
            <AlertTriangle size={20} className="text-warning mt-0.5" />
            <div>
              <div className="font-semibold text-sm">Audit notice</div>
              <div className="text-sm text-default-700">{report.message}</div>
            </div>
          </CardBody>
        </Card>
      )}

      {report && report.attributes.length === 0 && !report.message && (
        <Card shadow="sm">
          <CardBody className="text-center py-8 text-default-500">
            No data to audit in the selected window.
          </CardBody>
        </Card>
      )}

      {report?.attributes.map((attr) => (
        <Card shadow="sm" className="mb-4" key={attr.attribute}>
          <CardHeader className="flex items-center gap-2">
            <BarChart3 size={18} className="text-primary" />
            <h3 className="text-lg font-semibold">{attr.attribute}</h3>
          </CardHeader>
          <CardBody>
            <Table aria-label={`Bias audit by ${attr.attribute}`} isStriped>
              <TableHeader>
                <TableColumn>Group</TableColumn>
                <TableColumn className="text-right">Applicants</TableColumn>
                <TableColumn className="text-right">Advanced</TableColumn>
                <TableColumn className="text-right">Rate</TableColumn>
                <TableColumn>Four-fifths flag</TableColumn>
              </TableHeader>
              <TableBody emptyContent="No groups in this attribute">
                {attr.groups.map((g) => (
                  <TableRow key={`${attr.attribute}-${g.group}`}>
                    <TableCell className="font-medium">{g.group}</TableCell>
                    <TableCell className="text-right">{g.totalApplicants}</TableCell>
                    <TableCell className="text-right">{g.advancedCount}</TableCell>
                    <TableCell className="text-right">
                      {(g.advancementRate * 100).toFixed(1)}%
                    </TableCell>
                    <TableCell>
                      {g.fourFifthsFlag ? (
                        <Chip color="warning" variant="flat" size="sm" startContent={<AlertTriangle size={12} />}>
                          Below 80%
                        </Chip>
                      ) : (
                        <Chip color="success" variant="flat" size="sm">OK</Chip>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}
