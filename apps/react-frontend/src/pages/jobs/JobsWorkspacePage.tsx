// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { useCallback, useEffect, useMemo, useState, type Dispatch, type FormEvent, type SetStateAction } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { Button, Chip, Input, Progress, Skeleton, Textarea, Switch } from '@heroui/react';
import {
  ArrowRight,
  BarChart3,
  Bot,
  Briefcase,
  CalendarClock,
  ClipboardList,
  FileCheck2,
  Gauge,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import { GlassCard } from '@/components/ui';
import { EmptyState } from '@/components/feedback';
import { useTenant, useToast } from '@/contexts';
import { usePageTitle } from '@/hooks';
import { api } from '@/lib/api';
import { logError } from '@/lib/logger';

type AnyRecord = Record<string, unknown>;
type JobsMode = 'kanban' | 'employer' | 'talent' | 'bias' | 'onboarding';

interface JobVacancy extends AnyRecord {
  id?: number;
  title?: string;
  description?: string;
  category?: string | null;
  jobType?: string;
  job_type?: string;
  location?: string | null;
  isRemote?: boolean;
  is_remote?: boolean;
  requiredSkills?: string | null;
  required_skills?: string | null;
  status?: string;
}

interface JobApplication extends AnyRecord {
  id?: number;
  status?: string;
  stage?: string;
  cover_letter?: string | null;
  coverLetter?: string | null;
  message?: string | null;
  applicant?: AnyRecord | null;
  vacancy?: JobVacancy | null;
  created_at?: string;
  createdAt?: string;
}

interface SavedProfile extends AnyRecord {
  id?: number;
  userId?: number;
  user_id?: number;
  headline?: string | null;
  summary?: string | null;
  skills?: string | null;
  resumeUrl?: string | null;
  resume_url?: string | null;
  visibleToEmployers?: boolean;
  visible_to_employers?: boolean;
}

interface JobTemplate extends AnyRecord {
  id?: number;
  title?: string;
  description?: string | null;
  category?: string;
  jobType?: string;
  job_type?: string;
  requiredSkills?: string | null;
  required_skills?: string | null;
}

interface JobInterview extends AnyRecord {
  id?: number;
  startsAt?: string;
  starts_at?: string;
  endsAt?: string;
  ends_at?: string;
  status?: string;
  location?: string;
}

interface JobPrediction extends AnyRecord {
  expected_applications?: number;
  expectedApplications?: number;
  fill_probability?: number;
  fillProbability?: number;
}

interface JobSalaryBenchmark extends AnyRecord {
  category?: string | null;
  sample_size?: number;
  sampleSize?: number;
  average_time_credits_per_hour?: number;
  averageTimeCreditsPerHour?: number;
}

interface JobsWorkspaceData {
  job: JobVacancy | null;
  applications: JobApplication[];
  predictions: JobPrediction | null;
  pipelineRules: AnyRecord[];
  interviews: JobInterview[];
  auditTrail: AnyRecord[];
  talent: SavedProfile[];
  profile: SavedProfile | null;
  templates: JobTemplate[];
  recommended: AnyRecord[];
  salary: JobSalaryBenchmark | null;
  employerReviews: AnyRecord[];
}

const emptyData: JobsWorkspaceData = {
  job: null,
  applications: [],
  predictions: null,
  pipelineRules: [],
  interviews: [],
  auditTrail: [],
  talent: [],
  profile: null,
  templates: [],
  recommended: [],
  salary: null,
  employerReviews: [],
};

const statusColumns = [
  { key: 'applied', title: 'Applied' },
  { key: 'screening', title: 'Screening' },
  { key: 'interview', title: 'Interview' },
  { key: 'offer', title: 'Offer' },
  { key: 'accepted', title: 'Accepted' },
];

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

function stringValue(record: AnyRecord | null | undefined, ...keys: string[]): string {
  if (!record) return '';
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return String(value);
  }
  return '';
}

function numberValue(record: AnyRecord | null | undefined, ...keys: string[]): number | null {
  if (!record) return null;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'number') return value;
    if (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))) return Number(value);
  }
  return null;
}

function boolValue(record: AnyRecord | null | undefined, ...keys: string[]): boolean {
  if (!record) return false;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'boolean') return value;
  }
  return false;
}

function modeFromPath(pathname: string): JobsMode {
  if (pathname.includes('/employers/')) return 'employer';
  if (pathname.includes('/talent-search')) return 'talent';
  if (pathname.includes('/bias-audit')) return 'bias';
  if (pathname.includes('/employer-onboarding')) return 'onboarding';
  return 'kanban';
}

function normalizeApplicationStatus(status: string) {
  if (status === 'pending' || status === 'reviewed') return 'screening';
  if (status === 'offered') return 'offer';
  return status || 'applied';
}

export function JobsWorkspacePage() {
  const { pathname } = useLocation();
  const { id, userId } = useParams();
  const mode = modeFromPath(pathname);
  const { tenantPath } = useTenant();
  const toast = useToast();
  const [data, setData] = useState<JobsWorkspaceData>(emptyData);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [talentQuery, setTalentQuery] = useState('');
  const [profileForm, setProfileForm] = useState({
    headline: '',
    summary: '',
    skills: '',
    resumeUrl: '',
    visibleToEmployers: true,
  });

  const pageTitle = mode === 'kanban'
    ? 'Job Pipeline'
    : mode === 'employer'
      ? 'Employer Profile'
      : mode === 'talent'
        ? 'Talent Search'
        : mode === 'bias'
          ? 'Job Bias Audit'
          : 'Employer Onboarding';

  usePageTitle(pageTitle);

  const jobId = id ? Number(id) : null;
  const employerUserId = userId ? Number(userId) : null;

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const next: JobsWorkspaceData = { ...emptyData };

      if (mode === 'kanban' && jobId) {
        const [jobRes, appsRes, predictionsRes, rulesRes, interviewsRes, auditRes] = await Promise.all([
          api.get<JobVacancy>(`/v2/jobs/${jobId}`),
          api.get<JobApplication[]>(`/v2/jobs/${jobId}/applications`),
          api.get<JobPrediction>(`/v2/jobs/${jobId}/predictions`).catch(() => null),
          api.get<AnyRecord[]>(`/v2/jobs/${jobId}/pipeline-rules`).catch(() => null),
          api.get<JobInterview[]>(`/v2/jobs/${jobId}/interviews`).catch(() => null),
          api.get<AnyRecord[]>(`/v2/jobs/${jobId}/audit-trail`).catch(() => null),
        ]);
        next.job = jobRes.data ?? null;
        next.applications = asArray(appsRes.data);
        next.predictions = predictionsRes?.data ?? null;
        next.pipelineRules = asArray(rulesRes?.data);
        next.interviews = asArray(interviewsRes?.data);
        next.auditTrail = asArray(auditRes?.data);
      } else if (mode === 'talent') {
        const [talentRes, profileRes, recommendedRes] = await Promise.all([
          api.get<SavedProfile[]>(`/v2/jobs/talent-search${talentQuery ? `?skills=${encodeURIComponent(talentQuery)}` : ''}`),
          api.get<SavedProfile | null>('/v2/jobs/saved-profile'),
          api.get<AnyRecord[]>('/v2/jobs/recommended?limit=6').catch(() => null),
        ]);
        next.talent = asArray(talentRes.data);
        next.profile = profileRes.data ?? null;
        next.recommended = asArray(recommendedRes?.data);
      } else if (mode === 'bias') {
        const [salaryRes, templatesRes, recommendedRes] = await Promise.all([
          api.get<JobSalaryBenchmark>('/v2/jobs/salary-benchmark'),
          api.get<JobTemplate[]>('/v2/jobs/templates'),
          api.get<AnyRecord[]>('/v2/jobs/recommended?limit=10').catch(() => null),
        ]);
        next.salary = salaryRes.data ?? null;
        next.templates = asArray(templatesRes.data);
        next.recommended = asArray(recommendedRes?.data);
      } else if (mode === 'employer' && employerUserId) {
        const reviewsRes = await api.get<AnyRecord[]>(`/v2/jobs/employer-reviews/${employerUserId}`);
        next.employerReviews = asArray(reviewsRes.data);
      } else if (mode === 'onboarding') {
        const [profileRes, templatesRes] = await Promise.all([
          api.get<SavedProfile | null>('/v2/jobs/saved-profile'),
          api.get<JobTemplate[]>('/v2/jobs/templates'),
        ]);
        next.profile = profileRes.data ?? null;
        next.templates = asArray(templatesRes.data);
      }

      setData(next);
    } catch (err) {
      logError('JobsWorkspacePage.loadData', err);
      setError('Job workspace data could not be loaded.');
    } finally {
      setIsLoading(false);
    }
  }, [employerUserId, jobId, mode, talentQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!data.profile) return;
    setProfileForm({
      headline: stringValue(data.profile, 'headline'),
      summary: stringValue(data.profile, 'summary'),
      skills: stringValue(data.profile, 'skills'),
      resumeUrl: stringValue(data.profile, 'resumeUrl', 'resume_url'),
      visibleToEmployers: boolValue(data.profile, 'visibleToEmployers', 'visible_to_employers'),
    });
  }, [data.profile]);

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      const res = await api.put('/v2/jobs/saved-profile', {
        headline: profileForm.headline,
        summary: profileForm.summary,
        skills: profileForm.skills,
        resumeUrl: profileForm.resumeUrl,
        visibleToEmployers: profileForm.visibleToEmployers,
      });
      if (res.success) {
        toast.success('Job profile saved');
        await loadData();
      } else {
        toast.error(res.error ?? 'Could not save profile');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const moveApplication = async (applicationId: number, status: string) => {
    if (!jobId) return;
    setIsSaving(true);
    try {
      const res = await api.post(`/v2/jobs/${jobId}/applications/bulk-status`, {
        applicationIds: [applicationId],
        status,
        notes: `Moved to ${status} from jobs pipeline workspace`,
      });
      if (res.success) {
        toast.success('Application stage updated');
        await loadData();
      } else {
        toast.error(res.error ?? 'Could not update application stage');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const groupedApplications = useMemo(() => {
    const groups = new Map<string, JobApplication[]>();
    for (const column of statusColumns) groups.set(column.key, []);
    for (const application of data.applications) {
      const status = normalizeApplicationStatus(stringValue(application, 'stage', 'status'));
      const key = groups.has(status) ? status : 'applied';
      groups.get(key)!.push(application);
    }
    return groups;
  }, [data.applications]);

  const fillProbability = numberValue(data.predictions, 'fill_probability', 'fillProbability');

  if (isLoading) {
    return (
      <section className="space-y-5">
        <JobsHeader mode={mode} title={pageTitle} onRefresh={loadData} />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((item) => (
            <GlassCard key={item} className="p-5 space-y-3">
              <Skeleton className="rounded-lg"><div className="h-6 w-2/3 rounded-lg bg-default-300" /></Skeleton>
              <Skeleton className="rounded-lg"><div className="h-4 w-full rounded-lg bg-default-200" /></Skeleton>
              <Skeleton className="rounded-lg"><div className="h-24 w-full rounded-lg bg-default-200" /></Skeleton>
            </GlassCard>
          ))}
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="space-y-5">
        <JobsHeader mode={mode} title={pageTitle} onRefresh={loadData} />
        <GlassCard className="p-8 text-center">
          <p className="text-danger mb-4">{error}</p>
          <Button color="primary" variant="flat" onPress={loadData}>Try again</Button>
        </GlassCard>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <JobsHeader mode={mode} title={pageTitle} onRefresh={loadData} />

      {mode === 'kanban' && (
        <>
          <MetricStrip
            items={[
              { label: 'Applications', value: String(data.applications.length) },
              { label: 'Pipeline rules', value: String(data.pipelineRules.length) },
              { label: 'Interviews', value: String(data.interviews.length) },
              { label: 'Fill probability', value: fillProbability === null ? 'n/a' : `${Math.round(fillProbability * 100)}%` },
            ]}
          />
          {data.job && (
            <GlassCard className="p-5">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-theme-primary">{data.job.title}</h2>
                  <p className="text-sm text-theme-muted mt-1">{data.job.description}</p>
                </div>
                <Link to={tenantPath(`/jobs/${data.job.id}/analytics`)}>
                  <Button variant="flat" endContent={<ArrowRight className="w-4 h-4" />}>Analytics</Button>
                </Link>
              </div>
            </GlassCard>
          )}
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-3">
            {statusColumns.map((column) => (
              <GlassCard key={column.key} className="p-3">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <h3 className="font-semibold text-theme-primary text-sm">{column.title}</h3>
                  <Chip size="sm" variant="flat">{groupedApplications.get(column.key)?.length ?? 0}</Chip>
                </div>
                <div className="space-y-2">
                  {(groupedApplications.get(column.key) ?? []).map((application) => (
                    <ApplicationCard key={application.id} application={application} onMove={moveApplication} isSaving={isSaving} />
                  ))}
                </div>
              </GlassCard>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <SidePanel title="Pipeline rules" icon={<Bot className="w-5 h-5" />} rows={data.pipelineRules} empty="No automation rules" />
            <SidePanel title="Interviews" icon={<CalendarClock className="w-5 h-5" />} rows={data.interviews} empty="No interviews scheduled" />
            <SidePanel title="Audit trail" icon={<ClipboardList className="w-5 h-5" />} rows={data.auditTrail} empty="No audit entries" />
          </div>
        </>
      )}

      {mode === 'talent' && (
        <div className="grid grid-cols-1 xl:grid-cols-[360px_minmax(0,1fr)] gap-4">
          <ProfileForm form={profileForm} setForm={setProfileForm} onSubmit={saveProfile} isSaving={isSaving} />
          <div className="space-y-4">
            <GlassCard className="p-4">
              <div className="flex flex-col md:flex-row gap-3">
                <Input
                  value={talentQuery}
                  onChange={(event) => setTalentQuery(event.target.value)}
                  placeholder="Search by skills"
                  startContent={<Search className="w-4 h-4 text-theme-subtle" />}
                />
                <Button color="primary" onPress={loadData} startContent={<Search className="w-4 h-4" />}>Search</Button>
              </div>
            </GlassCard>
            <TalentList profiles={data.talent} />
            <RecommendedJobs rows={data.recommended} />
          </div>
        </div>
      )}

      {mode === 'bias' && (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-4">
          <div className="space-y-4">
            <GlassCard className="p-5">
              <h2 className="text-lg font-semibold text-theme-primary flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-500" />
                Bias audit signals
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                <SignalCard label="Template coverage" value={`${data.templates.length}`} />
                <SignalCard label="Benchmark sample" value={`${numberValue(data.salary, 'sample_size', 'sampleSize') ?? 0}`} />
                <SignalCard label="Avg credits/hour" value={`${numberValue(data.salary, 'average_time_credits_per_hour', 'averageTimeCreditsPerHour') ?? 0}`} />
              </div>
            </GlassCard>
            <RecommendedJobs rows={data.recommended} />
          </div>
          <SidePanel title="Reusable templates" icon={<FileCheck2 className="w-5 h-5" />} rows={data.templates} empty="No templates yet" />
        </div>
      )}

      {mode === 'employer' && (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-4">
          <GlassCard className="p-5">
            <h2 className="text-lg font-semibold text-theme-primary">Employer #{employerUserId}</h2>
            <p className="text-theme-muted mt-1">Reviews and reputation summaries are loaded from the member jobs API.</p>
            <div className="space-y-3 mt-5">
              {data.employerReviews.length === 0 ? (
                <EmptyState icon={<Users className="w-12 h-12" />} title="No employer reviews" description="Reviews will appear here when members submit them." />
              ) : (
                data.employerReviews.map((review, index) => (
                  <GlassCard key={numberValue(review, 'id') ?? index} className="p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-theme-primary">Rating {numberValue(review, 'rating') ?? '-'}/5</p>
                      <Chip variant="flat">{stringValue(review, 'createdAt', 'created_at') || 'review'}</Chip>
                    </div>
                    <p className="text-sm text-theme-muted mt-2">{stringValue(review, 'comment') || 'No comment'}</p>
                  </GlassCard>
                ))
              )}
            </div>
          </GlassCard>
          <GlassCard className="p-5">
            <h2 className="text-lg font-semibold text-theme-primary">Actions</h2>
            <div className="space-y-2 mt-4">
              <Link to={tenantPath('/jobs')}>
                <Button className="w-full justify-between" variant="flat" endContent={<ArrowRight className="w-4 h-4" />}>Open jobs</Button>
              </Link>
              <Link to={tenantPath('/jobs/talent-search')}>
                <Button className="w-full justify-between" variant="flat" endContent={<ArrowRight className="w-4 h-4" />}>Talent search</Button>
              </Link>
            </div>
          </GlassCard>
        </div>
      )}

      {mode === 'onboarding' && (
        <div className="grid grid-cols-1 xl:grid-cols-[360px_minmax(0,1fr)] gap-4">
          <ProfileForm form={profileForm} setForm={setProfileForm} onSubmit={saveProfile} isSaving={isSaving} />
          <div className="space-y-4">
            <MetricStrip
              items={[
                { label: 'Profile visible', value: profileForm.visibleToEmployers ? 'Yes' : 'No' },
                { label: 'Templates', value: String(data.templates.length) },
                { label: 'Skills', value: String(profileForm.skills.split(',').filter(Boolean).length) },
              ]}
            />
            <SidePanel title="Starter templates" icon={<Sparkles className="w-5 h-5" />} rows={data.templates} empty="No templates available" />
          </div>
        </div>
      )}
    </section>
  );
}

function JobsHeader({ mode, title, onRefresh }: { mode: JobsMode; title: string; onRefresh: () => void }) {
  const { tenantPath } = useTenant();
  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-white" aria-hidden="true" />
            </div>
            <Chip variant="flat" color="primary">Jobs</Chip>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-theme-primary tracking-normal">{title}</h1>
          <p className="text-theme-muted mt-1 max-w-3xl">
            Advanced jobs routes now use the employer, candidate, and parity API workflows behind V1 deep links.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="flat" className="bg-theme-elevated text-theme-primary" startContent={<RefreshCw className="w-4 h-4" />} onPress={onRefresh}>
            Refresh
          </Button>
          <Link to={tenantPath('/jobs')}>
            <Button className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white" startContent={<Briefcase className="w-4 h-4" />}>Browse jobs</Button>
          </Link>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <JobsNavButton to="/jobs/talent-search" active={mode === 'talent'} label="Talent" />
        <JobsNavButton to="/jobs/bias-audit" active={mode === 'bias'} label="Bias audit" />
        <JobsNavButton to="/jobs/employer-onboarding" active={mode === 'onboarding'} label="Onboarding" />
      </div>
    </div>
  );
}

function JobsNavButton({ to, active, label }: { to: string; active: boolean; label: string }) {
  const { tenantPath } = useTenant();
  return (
    <Link to={tenantPath(to)}>
      <Button variant={active ? 'solid' : 'flat'} color={active ? 'primary' : 'default'} className={active ? undefined : 'bg-theme-elevated text-theme-primary'}>
        {label}
      </Button>
    </Link>
  );
}

function MetricStrip({ items }: { items: Array<{ label: string; value: string }> }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {items.map((item) => (
        <GlassCard key={item.label} className="p-4">
          <p className="text-xs uppercase tracking-wide text-theme-subtle">{item.label}</p>
          <p className="text-2xl font-bold text-theme-primary mt-1">{item.value}</p>
        </GlassCard>
      ))}
    </div>
  );
}

function ApplicationCard({ application, onMove, isSaving }: { application: JobApplication; onMove: (applicationId: number, status: string) => void; isSaving: boolean }) {
  const applicant = application.applicant;
  const name = [stringValue(applicant, 'firstName', 'first_name'), stringValue(applicant, 'lastName', 'last_name')].filter(Boolean).join(' ') || `Application #${application.id}`;
  const message = stringValue(application, 'coverLetter', 'cover_letter', 'message');
  const currentStatus = normalizeApplicationStatus(stringValue(application, 'stage', 'status'));
  const nextStages = statusColumns.filter((column) => column.key !== currentStatus);

  return (
    <div className="rounded-lg bg-theme-elevated p-3">
      <p className="text-sm font-semibold text-theme-primary truncate">{name}</p>
      <p className="text-xs text-theme-muted line-clamp-2 mt-1">{message || 'No cover note'}</p>
      <div className="flex flex-wrap gap-1.5 mt-2">
        <Chip size="sm" variant="flat">{currentStatus}</Chip>
        {application.id && nextStages.slice(0, 3).map((stage) => (
          <Button
            key={stage.key}
            size="sm"
            variant="flat"
            isDisabled={isSaving}
            onPress={() => onMove(application.id!, stage.key)}
          >
            {stage.title}
          </Button>
        ))}
      </div>
    </div>
  );
}

function SidePanel({ title, icon, rows, empty }: { title: string; icon: React.ReactNode; rows: AnyRecord[]; empty: string }) {
  return (
    <GlassCard className="p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-9 h-9 rounded-lg bg-theme-elevated flex items-center justify-center text-primary">{icon}</div>
        <h2 className="text-lg font-semibold text-theme-primary">{title}</h2>
      </div>
      {rows.length === 0 ? (
        <EmptyState icon={<ClipboardList className="w-12 h-12" />} title={empty} description="Records will appear here when available." className="py-8" />
      ) : (
        <div className="space-y-2">
          {rows.slice(0, 8).map((row, index) => (
            <div key={numberValue(row, 'id') ?? index} className="rounded-lg bg-theme-elevated p-3">
              <p className="font-medium text-theme-primary text-sm truncate">
                {stringValue(row, 'title', 'name', 'type', 'status') || `Record ${index + 1}`}
              </p>
              <p className="text-xs text-theme-muted truncate mt-1">
                {stringValue(row, 'description', 'notes', 'category', 'trigger') || stringValue(row, 'createdAt', 'created_at') || 'No details'}
              </p>
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  );
}

function TalentList({ profiles }: { profiles: SavedProfile[] }) {
  return (
    <GlassCard className="p-5">
      <h2 className="text-lg font-semibold text-theme-primary flex items-center gap-2">
        <Users className="w-5 h-5 text-primary" />
        Visible talent
      </h2>
      {profiles.length === 0 ? (
        <EmptyState icon={<Users className="w-12 h-12" />} title="No visible profiles" description="Candidate profiles will appear when members opt in." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
          {profiles.map((profile) => (
            <GlassCard key={profile.id ?? profile.userId ?? profile.user_id} className="p-4">
              <p className="font-semibold text-theme-primary">{profile.headline || `Member #${profile.userId ?? profile.user_id}`}</p>
              <p className="text-sm text-theme-muted line-clamp-2 mt-1">{profile.summary || 'No summary'}</p>
              {profile.skills && <p className="text-xs text-theme-subtle mt-3">{profile.skills}</p>}
            </GlassCard>
          ))}
        </div>
      )}
    </GlassCard>
  );
}

function RecommendedJobs({ rows }: { rows: AnyRecord[] }) {
  return (
    <GlassCard className="p-5">
      <h2 className="text-lg font-semibold text-theme-primary flex items-center gap-2">
        <Gauge className="w-5 h-5 text-primary" />
        Recommended matches
      </h2>
      {rows.length === 0 ? (
        <EmptyState icon={<Gauge className="w-12 h-12" />} title="No recommendations" description="Recommendations will appear after profile and job data are available." />
      ) : (
        <div className="space-y-3 mt-4">
          {rows.map((row, index) => {
            const job = (row.job && typeof row.job === 'object' ? row.job : row) as AnyRecord;
            const score = numberValue(row, 'match_score', 'matchScore') ?? 0;
            return (
              <div key={numberValue(job, 'id') ?? index} className="rounded-lg bg-theme-elevated p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-theme-primary text-sm">{stringValue(job, 'title', 'Title') || `Match ${index + 1}`}</p>
                  <Chip size="sm" color="primary" variant="flat">{score}%</Chip>
                </div>
                <Progress value={score} size="sm" className="mt-2" aria-label="Match score" />
              </div>
            );
          })}
        </div>
      )}
    </GlassCard>
  );
}

function ProfileForm({
  form,
  setForm,
  onSubmit,
  isSaving,
}: {
  form: { headline: string; summary: string; skills: string; resumeUrl: string; visibleToEmployers: boolean };
  setForm: Dispatch<SetStateAction<{ headline: string; summary: string; skills: string; resumeUrl: string; visibleToEmployers: boolean }>>;
  onSubmit: (event: FormEvent) => void;
  isSaving: boolean;
}) {
  return (
    <GlassCard className="p-5">
      <h2 className="text-lg font-semibold text-theme-primary mb-4">Job profile</h2>
      <form className="space-y-4" onSubmit={onSubmit}>
        <Input label="Headline" value={form.headline} onChange={(event) => setForm((prev) => ({ ...prev, headline: event.target.value }))} />
        <Textarea label="Summary" value={form.summary} onChange={(event) => setForm((prev) => ({ ...prev, summary: event.target.value }))} />
        <Textarea label="Skills" value={form.skills} onChange={(event) => setForm((prev) => ({ ...prev, skills: event.target.value }))} />
        <Input label="Resume URL" value={form.resumeUrl} onChange={(event) => setForm((prev) => ({ ...prev, resumeUrl: event.target.value }))} />
        <Switch isSelected={form.visibleToEmployers} onValueChange={(value) => setForm((prev) => ({ ...prev, visibleToEmployers: value }))}>
          <span className="text-sm text-theme-primary">Visible to employers</span>
        </Switch>
        <Button type="submit" color="primary" isLoading={isSaving} startContent={<FileCheck2 className="w-4 h-4" />}>Save profile</Button>
      </form>
    </GlassCard>
  );
}

function SignalCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-theme-elevated p-4">
      <p className="text-xs uppercase tracking-wide text-theme-subtle">{label}</p>
      <p className="text-2xl font-bold text-theme-primary mt-2">{value}</p>
      <BarChart3 className="w-5 h-5 text-primary mt-3" aria-hidden="true" />
    </div>
  );
}

export default JobsWorkspacePage;
