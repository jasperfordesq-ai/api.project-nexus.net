// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/**
 * Resource Editor (Admin) — create / edit a Knowledge Base article.
 *
 * Wires to KnowledgeBaseAdminController:
 *   POST   /api/admin/knowledge/articles
 *   PUT    /api/admin/knowledge/articles/{id}
 * Plus the public read endpoints used for hydration / categories:
 *   GET    /api/knowledge/articles?search=...
 *   GET    /api/knowledge/articles/{slug}
 *   GET    /api/knowledge/categories
 *
 * The :id route param distinguishes create vs edit. In edit mode the
 * existing article is loaded via /api/knowledge/articles?search= filter
 * (the slug-based fetch endpoint requires slug, not id, so we hydrate
 * from the admin list when present and fall back to the slug lookup).
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Button, Card, CardBody, CardHeader, Chip, Input, Select, SelectItem,
  Spinner, Textarea,
} from '@heroui/react';
import { ArrowLeft, BookOpen, Eye, EyeOff, Save, Send } from 'lucide-react';
import { usePageTitle } from '@/hooks';
import { useToast } from '@/contexts';
import { api } from '@/lib/api';
import { PageHeader } from '../../components';

interface Article {
  id: number;
  title: string;
  slug: string;
  content?: string;
  category: string | null;
  tags: string[] | null;
  is_published?: boolean;
  sort_order?: number;
  view_count?: number;
  created_at?: string;
  updated_at?: string;
}

interface CategoryRow { name: string; article_count: number }

const STATUS_OPTIONS = [
  { key: 'draft', label: 'Draft' },
  { key: 'published', label: 'Published' },
  { key: 'archived', label: 'Archived' },
];

const VISIBILITY_OPTIONS = [
  { key: 'public', label: 'Public (anyone)' },
  { key: 'members', label: 'Members only' },
  { key: 'admin', label: 'Admins only' },
];

function slugify(input: string): string {
  return input.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 200);
}

// Minimal inline markdown renderer (headings, bold, italic, code, lists, links).
function renderMarkdown(src: string): string {
  let html = src
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  html = html.replace(/^### (.*)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.*)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.*)$/gm, '<h1>$1</h1>');
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" rel="noreferrer noopener" target="_blank">$1</a>');
  html = html.replace(/^- (.*)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, (m) => `<ul>${m}</ul>`);
  html = html.split(/\n\n+/).map((p) =>
    /^<(h\d|ul|ol|pre|blockquote)/.test(p.trim()) ? p : `<p>${p.replace(/\n/g, '<br/>')}</p>`).join('\n');
  return html;
}

export default function ResourceEditorPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  usePageTitle(isEdit ? `Admin - Edit Article #${id}` : 'Admin - New Article');
  const toast = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState<boolean>(isEdit);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [tagInput, setTagInput] = useState('');

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [body, setBody] = useState('');
  const [category, setCategory] = useState<string>('');
  const [tags, setTags] = useState<string[]>([]);
  const [status, setStatus] = useState('draft');
  const [visibility, setVisibility] = useState('public');
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [meta, setMeta] = useState<{ created_at?: string; updated_at?: string; view_count?: number }>({});

  const loadCategories = useCallback(async () => {
    try {
      const res = await api.get<{ data: CategoryRow[] }>('/knowledge/categories');
      if (res.success && res.data) {
        const payload = res.data as unknown as { data?: CategoryRow[] };
        setCategories(payload.data ?? []);
      }
    } catch { /* non-fatal */ }
  }, []);

  const loadArticle = useCallback(async () => {
    if (!isEdit) { setLoading(false); return; }
    setLoading(true);
    try {
      const listRes = await api.get<{ data: Article[] }>('/knowledge/articles');
      const payload = listRes.data as unknown as { data?: Article[] };
      const row = (payload?.data ?? []).find((a) => a.id === Number(id));
      if (!row) {
        toast.error('Article not found');
        setLoading(false);
        return;
      }
      const full = await api.get<Article>(`/knowledge/articles/${row.slug}`);
      const a = (full.data ?? row) as Article;
      setTitle(a.title);
      setSlug(a.slug);
      setSlugTouched(true);
      setBody(a.content ?? '');
      setCategory(a.category ?? '');
      setTags(a.tags ?? []);
      setStatus(a.is_published ? 'published' : 'draft');
      setMeta({ created_at: a.created_at, updated_at: a.updated_at, view_count: a.view_count });
    } catch {
      toast.error('Failed to load article');
    } finally { setLoading(false); }
  }, [id, isEdit, toast]);

  useEffect(() => { loadCategories(); loadArticle(); }, [loadCategories, loadArticle]);

  useEffect(() => {
    if (!slugTouched) setSlug(slugify(title));
  }, [title, slugTouched]);

  const addTag = () => {
    const t = tagInput.trim();
    if (!t || tags.includes(t)) return;
    setTags([...tags, t]);
    setTagInput('');
  };
  const removeTag = (t: string) => setTags(tags.filter((x) => x !== t));

  const save = useCallback(async (publish: boolean) => {
    if (!title.trim()) { toast.error('Title required'); return; }
    if (!slug.trim()) { toast.error('Slug required'); return; }
    if (!body.trim()) { toast.error('Body required'); return; }
    setSaving(true);
    const payload: Record<string, unknown> = {
      title, slug, content: body,
      category: category || null,
      tags,
      is_published: publish || status === 'published',
      seo_title: seoTitle || null,
      seo_description: seoDescription || null,
      visibility,
    };
    try {
      const res = isEdit
        ? await api.put(`/admin/knowledge/articles/${id}`, payload)
        : await api.post('/admin/knowledge/articles', payload);
      if (res.success) {
        toast.success(publish ? 'Published' : 'Saved');
        if (!isEdit) navigate('/admin/resources');
      } else { toast.error('Save failed'); }
    } catch { toast.error('Save failed'); }
    finally { setSaving(false); }
  }, [title, slug, body, category, tags, status, seoTitle, seoDescription, visibility, isEdit, id, navigate, toast]);

  const previewHtml = useMemo(() => renderMarkdown(body), [body]);

  if (loading) {
    return <div className="flex justify-center py-12"><Spinner /></div>;
  }

  return (
    <div>
      <PageHeader
        title={isEdit ? `Edit article #${id}` : 'New knowledge article'}
        description="Markdown-style body. Slug auto-generates from title — edit to override."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="flat" size="sm" startContent={<ArrowLeft size={16} />}
              onPress={() => navigate('/admin/resources')}>Back</Button>
            <Button variant="flat" size="sm"
              startContent={preview ? <EyeOff size={16} /> : <Eye size={16} />}
              onPress={() => setPreview(!preview)}>{preview ? 'Edit' : 'Preview'}</Button>
            <Button variant="flat" size="sm" startContent={<Save size={16} />}
              onPress={() => save(false)} isLoading={saving}>Save draft</Button>
            <Button color="primary" size="sm" startContent={<Send size={16} />}
              onPress={() => save(true)} isLoading={saving}>Publish</Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card shadow="sm" className="lg:col-span-2">
          <CardHeader className="flex items-center gap-2">
            <BookOpen size={18} className="text-primary" />
            <h3 className="text-lg font-semibold">Content</h3>
          </CardHeader>
          <CardBody className="space-y-3">
            <Input label="Title" value={title} onValueChange={setTitle} isRequired />
            <Input label="Slug" value={slug}
              onValueChange={(v) => { setSlug(v); setSlugTouched(true); }}
              description="URL identifier. Lowercase, hyphens only." />
            {preview ? (
              <div className="prose prose-sm max-w-none border rounded p-3 min-h-[300px]"
                dangerouslySetInnerHTML={{ __html: previewHtml }} />
            ) : (
              <Textarea label="Body (markdown)" value={body} onValueChange={setBody}
                minRows={14} placeholder="# Heading&#10;&#10;Paragraph text. **Bold** and *italic* and `code`.&#10;&#10;- bullet&#10;- bullet" />
            )}
          </CardBody>
        </Card>

        <div className="space-y-4">
          <Card shadow="sm">
            <CardHeader><h3 className="text-base font-semibold">Publishing</h3></CardHeader>
            <CardBody className="space-y-3">
              <Select label="Status" selectedKeys={[status]}
                onChange={(e) => setStatus(e.target.value)}>
                {STATUS_OPTIONS.map((o) => <SelectItem key={o.key}>{o.label}</SelectItem>)}
              </Select>
              <Select label="Visibility" selectedKeys={[visibility]}
                onChange={(e) => setVisibility(e.target.value)}>
                {VISIBILITY_OPTIONS.map((o) => <SelectItem key={o.key}>{o.label}</SelectItem>)}
              </Select>
              <Select label="Category" selectedKeys={category ? [category] : []}
                onChange={(e) => setCategory(e.target.value)}>
                {categories.map((c) => <SelectItem key={c.name}>{`${c.name} (${c.article_count})`}</SelectItem>)}
              </Select>
            </CardBody>
          </Card>

          <Card shadow="sm">
            <CardHeader><h3 className="text-base font-semibold">Tags</h3></CardHeader>
            <CardBody className="space-y-2">
              <div className="flex gap-2">
                <Input size="sm" placeholder="Add tag" value={tagInput}
                  onValueChange={setTagInput}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }} />
                <Button size="sm" onPress={addTag}>Add</Button>
              </div>
              <div className="flex flex-wrap gap-1">
                {tags.map((t) => (
                  <Chip key={t} onClose={() => removeTag(t)} size="sm" variant="flat">{t}</Chip>
                ))}
                {tags.length === 0 && <span className="text-xs text-default-400">No tags</span>}
              </div>
            </CardBody>
          </Card>

          <Card shadow="sm">
            <CardHeader><h3 className="text-base font-semibold">SEO</h3></CardHeader>
            <CardBody className="space-y-2">
              <Input size="sm" label="SEO title" value={seoTitle} onValueChange={setSeoTitle} />
              <Textarea size="sm" label="SEO description" value={seoDescription}
                onValueChange={setSeoDescription} minRows={2} maxRows={3} />
            </CardBody>
          </Card>

          {isEdit && (
            <Card shadow="sm">
              <CardHeader><h3 className="text-base font-semibold">Metadata</h3></CardHeader>
              <CardBody className="space-y-1 text-xs text-default-500">
                {meta.created_at && <div>Created: {new Date(meta.created_at).toLocaleString()}</div>}
                {meta.updated_at && <div>Updated: {new Date(meta.updated_at).toLocaleString()}</div>}
                {typeof meta.view_count === 'number' && <div>Views: {meta.view_count}</div>}
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
