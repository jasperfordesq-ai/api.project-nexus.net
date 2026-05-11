// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/**
 * Resource Categories (Admin) — Knowledge Base category registry.
 *
 * READ: GET /api/knowledge/categories (KnowledgeBaseController).
 *
 * GAP: there is NO dedicated admin endpoint for category CRUD in V2.
 *      KnowledgeArticle.Category is a free-text string on each article;
 *      categories are derived from the distinct set used. To rename or
 *      delete a category today, edit/move the articles using it (this
 *      page links to the article editor for each row).
 *
 * Once a CategoriesAdmin endpoint family lands (e.g.
 * /api/admin/knowledge/categories), the create / edit / delete actions
 * here will wire to it. Until then the UI shows the registry with a
 * warning banner.
 */

import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button, Card, CardBody, CardHeader, Chip, Spinner, Table, TableBody,
  TableCell, TableColumn, TableHeader, TableRow,
} from '@heroui/react';
import { AlertTriangle, FolderTree, RefreshCw } from 'lucide-react';
import { usePageTitle } from '@/hooks';
import { useToast } from '@/contexts';
import { api } from '@/lib/api';
import { PageHeader } from '../../components';

interface CategoryRow {
  name: string;
  article_count: number;
}

interface ArticleRow {
  id: number;
  title: string;
  slug: string;
  category: string | null;
}

export default function ResourceCategoriesPage() {
  usePageTitle('Admin - Resource Categories');
  const toast = useToast();
  const navigate = useNavigate();

  const [rows, setRows] = useState<CategoryRow[]>([]);
  const [articles, setArticles] = useState<ArticleRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [catRes, artRes] = await Promise.all([
        api.get<{ data: CategoryRow[] }>('/knowledge/categories'),
        api.get<{ data: ArticleRow[] }>('/knowledge/articles'),
      ]);
      const catPayload = catRes.data as unknown as { data?: CategoryRow[] };
      const artPayload = artRes.data as unknown as { data?: ArticleRow[] };
      setRows(catPayload?.data ?? []);
      setArticles(artPayload?.data ?? []);
    } catch { toast.error('Failed to load categories'); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const articlesInCategory = (name: string) =>
    articles.filter((a) => (a.category ?? '') === name);

  return (
    <div>
      <PageHeader
        title="Resource Categories"
        description="Knowledge Base categories — derived from KnowledgeArticle.Category. Each value is a free-text label on the article."
        actions={
          <Button variant="flat" size="sm" startContent={<RefreshCw size={16} />}
            onPress={load} isLoading={loading}>Refresh</Button>
        }
      />

      <Card shadow="sm" className="mb-4 border-l-4 border-warning">
        <CardBody className="flex flex-row gap-3 items-start">
          <AlertTriangle size={20} className="text-warning shrink-0 mt-0.5" />
          <div className="text-sm">
            <strong>No dedicated category CRUD endpoint.</strong> KB categories
            are currently free-text strings stored on each article. To rename
            or delete a category, edit the articles using it (click an
            article below). A future endpoint family at
            <code className="mx-1">/api/admin/knowledge/categories</code>
            will enable rename / merge / delete from this page.
          </div>
        </CardBody>
      </Card>

      <Card shadow="sm">
        <CardHeader className="flex items-center gap-2">
          <FolderTree size={18} className="text-primary" />
          <h3 className="text-lg font-semibold">Categories ({rows.length})</h3>
        </CardHeader>
        <CardBody>
          <Table aria-label="KB categories" isStriped>
            <TableHeader>
              <TableColumn>Name</TableColumn>
              <TableColumn className="text-right">Articles</TableColumn>
              <TableColumn>Sample articles</TableColumn>
              <TableColumn>Actions</TableColumn>
            </TableHeader>
            <TableBody emptyContent="No categories yet — categories appear as articles are tagged."
              isLoading={loading} loadingContent={<Spinner />}>
              {rows.map((c) => {
                const inCat = articlesInCategory(c.name);
                return (
                  <TableRow key={c.name}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Chip size="sm" variant="flat">{c.name || '(uncategorised)'}</Chip>
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{c.article_count}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-md">
                        {inCat.slice(0, 3).map((a) => (
                          <Chip key={a.id} size="sm" variant="flat" color="primary"
                            className="cursor-pointer"
                            onClick={() => navigate(`/admin/resources/edit/${a.id}`)}>
                            {a.title}
                          </Chip>
                        ))}
                        {inCat.length > 3 && (
                          <span className="text-xs text-default-400">+{inCat.length - 3} more</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="flat"
                        onPress={() => navigate(`/admin/resources?category=${encodeURIComponent(c.name)}`)}>
                        Show articles
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
