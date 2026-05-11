// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/**
 * Admin Help Center — replaces lazyParityPage stub.
 *
 * Curated entry point for admin documentation. Static category links point
 * to in-repo docs (LEGACY_FEATURE_INVENTORY, MIGRATION_GAP_MAP, PHASE63_73_
 * DEPLOY_NOTES, etc.); recent-articles section pulls from the live
 * Knowledge Base endpoint:
 *
 *   GET /api/kb?q=<search>&limit=10  (CompatibilityController alias for
 *                                     /api/knowledge/articles)
 *
 * If KB returns no articles, the section degrades gracefully.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  Button, Card, CardBody, CardHeader, Chip, Input, Spinner,
} from '@heroui/react';
import {
  LifeBuoy, RefreshCw, Search, BookOpen, Rocket, Building2, Network,
  ShieldCheck, Wrench, ExternalLink,
} from 'lucide-react';
import { usePageTitle } from '@/hooks';
import { useToast } from '@/contexts';
import { api } from '@/lib/api';
import { PageHeader } from '../../components';

interface KbArticle {
  id: number;
  title: string;
  slug: string;
  category: string | null;
  tags: string | null;
  view_count: number;
  updated_at: string;
}

interface KbResponse { data: KbArticle[]; total: number }

interface DocLink { title: string; href: string; external?: boolean }
interface DocCategory { title: string; icon: typeof BookOpen; links: DocLink[] }

const CATEGORIES: DocCategory[] = [
  {
    title: 'Getting Started', icon: Rocket, links: [
      { title: 'Master deployment checklist', href: '/MASTER_DEPLOYMENT_CHECKLIST.md', external: true },
      { title: 'Docker contract', href: '/DOCKER_CONTRACT.md', external: true },
      { title: 'Plesk quickstart', href: '/PLESK_QUICKSTART.md', external: true },
      { title: 'Admin integration guide', href: '/ADMIN_INTEGRATION.md', external: true },
    ],
  },
  {
    title: 'Tenant Setup', icon: Building2, links: [
      { title: 'Tenant config (admin)', href: '/admin/system/tenant-config' },
      { title: 'Tenant features (flags)', href: '/admin/tenant-features' },
      { title: 'Registration policy', href: '/admin/settings/registration-policy' },
      { title: 'Module configuration', href: '/admin/module-configuration' },
    ],
  },
  {
    title: 'Federation', icon: Network, links: [
      { title: 'Federation partners', href: '/admin/federation/partners' },
      { title: 'Protocol transfers', href: '/admin/federation/protocols' },
      { title: 'Hour transfers', href: '/admin/federation/hour-transfers' },
      { title: 'Audit log', href: '/admin/federation/audit-log' },
    ],
  },
  {
    title: 'Compliance & Safety', icon: ShieldCheck, links: [
      { title: 'Safeguarding dashboard', href: '/admin/safeguarding' },
      { title: 'Safeguarding options', href: '/admin/safeguarding-options' },
      { title: 'GDPR deletions', href: '/admin/gdpr/deletions' },
      { title: 'Vetting queue', href: '/admin/vetting' },
      { title: 'Audit logs', href: '/admin/audit-logs' },
    ],
  },
  {
    title: 'Troubleshooting', icon: Wrench, links: [
      { title: 'Diagnostics dashboard', href: '/admin/system/diagnostics' },
      { title: 'Scheduled jobs', href: '/admin/scheduled-jobs' },
      { title: 'Health endpoint', href: '/health', external: true },
      { title: 'Recovery guide', href: '/RECOVERY_GUIDE.md', external: true },
    ],
  },
];

const EXTERNAL_LINKS: DocLink[] = [
  { title: 'GitHub repository', href: 'https://github.com/', external: true },
  { title: 'Project NEXUS website', href: 'https://project-nexus.net', external: true },
  { title: 'Hour Time Bank Ireland', href: 'https://hour-timebank.ie', external: true },
];

export default function AdminHelpCenterPage() {
  usePageTitle('Admin - Help Center');
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [articles, setArticles] = useState<KbArticle[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ limit: '10' });
      if (query.trim()) qs.append('q', query.trim());
      const res = await api.get<KbResponse>(`/v2/kb?${qs.toString()}`);
      if (res.success && res.data) {
        const payload = (res.data as unknown) as KbResponse;
        setArticles(payload.data ?? []);
      } else {
        setArticles([]);
      }
    } catch {
      // KB endpoint may not be wired — degrade silently.
      setArticles([]);
    } finally { setLoading(false); }
  }, [query]);

  useEffect(() => { load(); }, [load]);

  const onSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { load(); toast.success('Searching…'); }
  };

  return (
    <div>
      <PageHeader
        title="Admin Help Center"
        description="Curated documentation for tenant administrators, plus live links to the Knowledge Base."
        actions={
          <Button variant="flat" size="sm" startContent={<RefreshCw size={16} />} onPress={load} isLoading={loading}>Refresh</Button>
        }
      />

      <Card shadow="sm" className="mb-4">
        <CardBody>
          <Input size="md" variant="bordered" placeholder="Search admin documentation and KB articles…"
            value={query} onValueChange={setQuery} onKeyDown={onSearch}
            startContent={<Search size={16} className="text-default-400" />}
            endContent={<Button size="sm" variant="flat" onPress={load}>Search</Button>} />
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 mb-4">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          return (
            <Card key={cat.title} shadow="sm">
              <CardHeader className="flex items-center gap-2">
                <Icon size={18} className="text-primary" />
                <h3 className="text-lg font-semibold">{cat.title}</h3>
              </CardHeader>
              <CardBody>
                <ul className="space-y-1">
                  {cat.links.map((l) => (
                    <li key={l.href}>
                      <a href={l.href} target={l.external ? '_blank' : undefined} rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline inline-flex items-center gap-1">
                        {l.title}
                        {l.external && <ExternalLink size={12} />}
                      </a>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          );
        })}
      </div>

      <Card shadow="sm" className="mb-4">
        <CardHeader className="flex items-center gap-2">
          <BookOpen size={18} className="text-primary" />
          <h3 className="text-lg font-semibold">Knowledge Base — recent articles</h3>
        </CardHeader>
        <CardBody>
          {loading ? <Spinner /> : articles.length === 0 ? (
            <p className="text-sm text-default-500">No published articles found. Admins can publish KB articles via the Knowledge Base controller.</p>
          ) : (
            <ul className="space-y-2">
              {articles.map((a) => (
                <li key={a.id} className="flex items-center justify-between rounded-lg border border-divider p-2">
                  <a href={`/kb/${a.slug}`} className="text-sm text-primary hover:underline">{a.title}</a>
                  <div className="flex items-center gap-2">
                    {a.category && <Chip size="sm" variant="flat">{a.category}</Chip>}
                    <span className="text-xs text-default-400">{a.view_count} views</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <Card shadow="sm">
        <CardHeader className="flex items-center gap-2">
          <LifeBuoy size={18} className="text-primary" />
          <h3 className="text-lg font-semibold">External resources</h3>
        </CardHeader>
        <CardBody>
          <ul className="space-y-1">
            {EXTERNAL_LINKS.map((l) => (
              <li key={l.href}>
                <a href={l.href} target="_blank" rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline inline-flex items-center gap-1">
                  {l.title} <ExternalLink size={12} />
                </a>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}
