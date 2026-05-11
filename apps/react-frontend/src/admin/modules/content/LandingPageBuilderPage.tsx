// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/**
 * Landing Page Builder (Admin) — tenant-scoped landing-page CMS.
 *
 * Wires to AdminPagesController:
 *   GET    /api/admin/pages          — find landing page row by slug
 *   GET    /api/admin/pages/{id}     — load full content
 *   POST   /api/admin/pages          — create the landing page if missing
 *   PUT    /api/admin/pages/{id}     — save edits
 *
 * The landing page is a single CMS Page row with slug "landing". Its
 * `content` column stores a JSON document describing the section list
 * (hero / features / testimonials / footer-cta). On save we serialise
 * the section list back into the page's content field.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button, Card, CardBody, CardHeader, Input, Modal, ModalBody, ModalContent,
  ModalFooter, ModalHeader, Spinner, Textarea,
} from '@heroui/react';
import {
  ArrowDown, ArrowUp, ExternalLink, Layout, Plus, RefreshCw, Save, Trash2,
} from 'lucide-react';
import { usePageTitle } from '@/hooks';
import { useToast } from '@/contexts';
import { api } from '@/lib/api';
import { PageHeader } from '../../components';

type SectionType = 'hero' | 'features' | 'testimonials' | 'footer-cta';

interface BaseSection { id: string; type: SectionType; }
interface HeroSection extends BaseSection {
  type: 'hero';
  title: string; subtitle: string; image: string; ctaText: string; ctaUrl: string;
}
interface FeatureItem { title: string; description: string; icon?: string; }
interface FeaturesSection extends BaseSection { type: 'features'; heading: string; items: FeatureItem[]; }
interface TestimonialItem { quote: string; author: string; role?: string; }
interface TestimonialsSection extends BaseSection { type: 'testimonials'; heading: string; items: TestimonialItem[]; }
interface FooterCtaSection extends BaseSection {
  type: 'footer-cta'; title: string; subtitle: string; ctaText: string; ctaUrl: string;
}
type Section = HeroSection | FeaturesSection | TestimonialsSection | FooterCtaSection;

interface AdminPage { id: number; title: string; slug: string; content: string; status: string; }

const LANDING_SLUG = 'landing';

const NEW_SECTION_DEFAULTS: Record<SectionType, () => Section> = {
  hero: () => ({ id: crypto.randomUUID(), type: 'hero', title: 'Welcome', subtitle: '', image: '', ctaText: 'Get started', ctaUrl: '/register' }),
  features: () => ({ id: crypto.randomUUID(), type: 'features', heading: 'Features', items: [] }),
  testimonials: () => ({ id: crypto.randomUUID(), type: 'testimonials', heading: 'What members say', items: [] }),
  'footer-cta': () => ({ id: crypto.randomUUID(), type: 'footer-cta', title: 'Ready to join?', subtitle: '', ctaText: 'Sign up', ctaUrl: '/register' }),
};

function parseSections(content: string): Section[] {
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed?.sections)) return parsed.sections as Section[];
  } catch { /* fall through */ }
  return [];
}

export default function LandingPageBuilderPage() {
  usePageTitle('Admin - Landing Page Builder');
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pageId, setPageId] = useState<number | null>(null);
  const [pageTitle, setPageTitle] = useState('Landing');
  const [sections, setSections] = useState<Section[]>([]);
  const [addOpen, setAddOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const listRes = await api.get<{ data: AdminPage[] }>('/v2/admin/pages');
      const payload = listRes.data as unknown as { data?: AdminPage[] } | AdminPage[];
      const items: AdminPage[] = Array.isArray(payload) ? payload : (payload?.data ?? []);
      const landing = items.find((p) => p.slug === LANDING_SLUG);
      if (landing) {
        const full = await api.get<AdminPage>(`/v2/admin/pages/${landing.id}`);
        const page = (full.data as AdminPage) ?? landing;
        setPageId(page.id);
        setPageTitle(page.title);
        setSections(parseSections(page.content ?? ''));
      } else {
        setPageId(null);
        setSections([]);
      }
    } catch { toast.error('Failed to load landing page'); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const save = useCallback(async () => {
    setSaving(true);
    const content = JSON.stringify({ schema: 'landing-v1', sections }, null, 2);
    try {
      if (pageId == null) {
        const res = await api.post('/v2/admin/pages',
          { title: pageTitle, slug: LANDING_SLUG, content, status: 'published' });
        if (res.success) { toast.success('Landing page created'); await load(); }
        else { toast.error('Save failed'); }
      } else {
        const res = await api.put(`/v2/admin/pages/${pageId}`,
          { title: pageTitle, content, status: 'published' });
        if (res.success) toast.success('Landing page saved');
        else toast.error('Save failed');
      }
    } catch { toast.error('Save failed'); }
    finally { setSaving(false); }
  }, [pageId, pageTitle, sections, load, toast]);

  const move = (idx: number, dir: -1 | 1) => {
    const next = [...sections];
    const t = idx + dir;
    if (t < 0 || t >= next.length) return;
    [next[idx], next[t]] = [next[t], next[idx]];
    setSections(next);
  };
  const remove = (idx: number) => setSections(sections.filter((_, i) => i !== idx));
  const addSection = (type: SectionType) => {
    setSections([...sections, NEW_SECTION_DEFAULTS[type]()]);
    setAddOpen(false);
  };
  const update = (idx: number, patch: Partial<Section>) => {
    const next = [...sections];
    next[idx] = { ...next[idx], ...patch } as Section;
    setSections(next);
  };

  const previewUrl = useMemo(() => '/landing', []);

  return (
    <div>
      <PageHeader
        title="Landing Page Builder"
        description="Tenant-scoped landing page. Sections are persisted as JSON in the CMS page content field."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="flat" size="sm" startContent={<RefreshCw size={16} />}
              onPress={load} isLoading={loading}>Refresh</Button>
            <Button variant="flat" size="sm" startContent={<ExternalLink size={16} />}
              onPress={() => window.open(previewUrl, '_blank')}>Preview</Button>
            <Button variant="flat" size="sm" startContent={<Plus size={16} />}
              onPress={() => setAddOpen(true)}>Add section</Button>
            <Button color="primary" size="sm" startContent={<Save size={16} />}
              onPress={save} isLoading={saving}>Save</Button>
          </div>
        }
      />

      {loading ? <Spinner /> : (
        <>
          <Card shadow="sm" className="mb-4">
            <CardHeader className="flex items-center gap-2">
              <Layout size={18} className="text-primary" />
              <h3 className="text-lg font-semibold">Page meta</h3>
            </CardHeader>
            <CardBody>
              <Input label="Page title" value={pageTitle} onValueChange={setPageTitle} />
              <p className="text-xs text-default-500 mt-2">
                Slug: <code>{LANDING_SLUG}</code>
                {pageId == null
                  ? ' — (will be created on first save)'
                  : ` — page #${pageId}`}
              </p>
            </CardBody>
          </Card>

          <div className="space-y-3">
            {sections.length === 0 && (
              <Card shadow="sm"><CardBody className="text-center text-default-400 py-12">
                No sections yet. Click "Add section" to start building.
              </CardBody></Card>
            )}
            {sections.map((s, idx) => (
              <Card key={s.id} shadow="sm">
                <CardHeader className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold uppercase tracking-wide">{s.type}</h4>
                  <div className="flex gap-1">
                    <Button size="sm" variant="flat" isIconOnly
                      onPress={() => move(idx, -1)} isDisabled={idx === 0}><ArrowUp size={14} /></Button>
                    <Button size="sm" variant="flat" isIconOnly
                      onPress={() => move(idx, 1)} isDisabled={idx === sections.length - 1}><ArrowDown size={14} /></Button>
                    <Button size="sm" variant="flat" color="danger" isIconOnly
                      onPress={() => remove(idx)}><Trash2 size={14} /></Button>
                  </div>
                </CardHeader>
                <CardBody className="space-y-2">
                  {s.type === 'hero' && (
                    <>
                      <Input size="sm" label="Title" value={s.title}
                        onValueChange={(v) => update(idx, { title: v } as Partial<HeroSection>)} />
                      <Input size="sm" label="Subtitle" value={s.subtitle}
                        onValueChange={(v) => update(idx, { subtitle: v } as Partial<HeroSection>)} />
                      <Input size="sm" label="Image URL" value={s.image}
                        onValueChange={(v) => update(idx, { image: v } as Partial<HeroSection>)} />
                      <div className="grid grid-cols-2 gap-2">
                        <Input size="sm" label="CTA text" value={s.ctaText}
                          onValueChange={(v) => update(idx, { ctaText: v } as Partial<HeroSection>)} />
                        <Input size="sm" label="CTA URL" value={s.ctaUrl}
                          onValueChange={(v) => update(idx, { ctaUrl: v } as Partial<HeroSection>)} />
                      </div>
                    </>
                  )}
                  {s.type === 'features' && (
                    <>
                      <Input size="sm" label="Heading" value={s.heading}
                        onValueChange={(v) => update(idx, { heading: v } as Partial<FeaturesSection>)} />
                      <Textarea size="sm" label="Items (one per line: title | description)"
                        value={s.items.map((i) => `${i.title} | ${i.description}`).join('\n')}
                        onValueChange={(v) => update(idx, {
                          items: v.split('\n').filter(Boolean).map((line) => {
                            const [title, ...rest] = line.split('|');
                            return { title: title.trim(), description: rest.join('|').trim() };
                          }),
                        } as Partial<FeaturesSection>)}
                        minRows={3} />
                    </>
                  )}
                  {s.type === 'testimonials' && (
                    <>
                      <Input size="sm" label="Heading" value={s.heading}
                        onValueChange={(v) => update(idx, { heading: v } as Partial<TestimonialsSection>)} />
                      <Textarea size="sm" label="Quotes (one per line: quote | author | role)"
                        value={s.items.map((i) => `${i.quote} | ${i.author} | ${i.role ?? ''}`).join('\n')}
                        onValueChange={(v) => update(idx, {
                          items: v.split('\n').filter(Boolean).map((line) => {
                            const [quote, author, role] = line.split('|').map((x) => x.trim());
                            return { quote, author, role: role || undefined };
                          }),
                        } as Partial<TestimonialsSection>)}
                        minRows={3} />
                    </>
                  )}
                  {s.type === 'footer-cta' && (
                    <>
                      <Input size="sm" label="Title" value={s.title}
                        onValueChange={(v) => update(idx, { title: v } as Partial<FooterCtaSection>)} />
                      <Input size="sm" label="Subtitle" value={s.subtitle}
                        onValueChange={(v) => update(idx, { subtitle: v } as Partial<FooterCtaSection>)} />
                      <div className="grid grid-cols-2 gap-2">
                        <Input size="sm" label="CTA text" value={s.ctaText}
                          onValueChange={(v) => update(idx, { ctaText: v } as Partial<FooterCtaSection>)} />
                        <Input size="sm" label="CTA URL" value={s.ctaUrl}
                          onValueChange={(v) => update(idx, { ctaUrl: v } as Partial<FooterCtaSection>)} />
                      </div>
                    </>
                  )}
                </CardBody>
              </Card>
            ))}
          </div>
        </>
      )}

      <Modal isOpen={addOpen} onClose={() => setAddOpen(false)}>
        <ModalContent>
          <ModalHeader>Add section</ModalHeader>
          <ModalBody className="space-y-2 pb-4">
            {(Object.keys(NEW_SECTION_DEFAULTS) as SectionType[]).map((t) => (
              <Button key={t} variant="flat" className="w-full justify-start"
                onPress={() => addSection(t)}>{t}</Button>
            ))}
          </ModalBody>
          <ModalFooter><Button variant="flat" onPress={() => setAddOpen(false)}>Cancel</Button></ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
