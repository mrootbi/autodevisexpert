import { useEffect, useState } from 'react';
import { BlogArticle } from './types';
import { ARTICLES as SEED_ARTICLES } from './articles';
import { supabase } from './supabase';
import { rebuildAndPersistSitemap } from './sitemap';

const BLOG_KEY = 'autodevis_blog_articles';
const SUPABASE_BLOG_KEY = 'blog_articles';

function isValidArticleList(value: unknown): value is BlogArticle[] {
  return Array.isArray(value) && value.length > 0 && value.every((a) => a && typeof a.slug === 'string');
}

/** Reactive hook: returns the current blog articles and re-renders when the CMS updates them. */
export function useBlogArticles(): [BlogArticle[], boolean] {
  // Seed synchronously so the first paint already has titles/H1 (SEO auditors & crawlers).
  const [articles, setArticles] = useState<BlogArticle[]>(() => getBlogArticles());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadLocal = () => {
      const list = getBlogArticles();
      if (mounted) {
        setArticles(list);
        setLoading(false);
      }
    };

    const load = async () => {
      loadLocal();
      try {
        const remote = await fetchBlogArticlesFromSupabase();
        if (!mounted || !remote) return;
        localStorage.setItem(BLOG_KEY, JSON.stringify(remote));
        setArticles(remote);
      } catch {
        /* keep local */
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void load();
    window.addEventListener('autodevis:blog-updated', loadLocal);
    window.addEventListener('storage', loadLocal);
    return () => {
      mounted = false;
      window.removeEventListener('autodevis:blog-updated', loadLocal);
      window.removeEventListener('storage', loadLocal);
    };
  }, []);

  return [articles, loading];
}

export function getBlogArticles(): BlogArticle[] {
  const raw = localStorage.getItem(BLOG_KEY);
  if (!raw) {
    localStorage.setItem(BLOG_KEY, JSON.stringify(SEED_ARTICLES));
    return [...SEED_ARTICLES];
  }
  try {
    const parsed = JSON.parse(raw) as BlogArticle[];
    if (!isValidArticleList(parsed)) {
      localStorage.setItem(BLOG_KEY, JSON.stringify(SEED_ARTICLES));
      return [...SEED_ARTICLES];
    }
    return parsed;
  } catch {
    return [...SEED_ARTICLES];
  }
}

export async function fetchBlogArticlesFromSupabase(): Promise<BlogArticle[] | null> {
  const { data, error } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', SUPABASE_BLOG_KEY)
    .maybeSingle();

  if (error || !data?.value) return null;

  try {
    const parsed = JSON.parse(data.value) as BlogArticle[];
    return isValidArticleList(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

async function persistBlogRemote(articles: BlogArticle[]): Promise<void> {
  const now = new Date().toISOString();
  await supabase.from('app_settings').upsert(
    { key: SUPABASE_BLOG_KEY, value: JSON.stringify(articles), updated_at: now },
    { onConflict: 'key' },
  );
  await rebuildAndPersistSitemap();
}

export function saveBlogArticles(articles: BlogArticle[]): void {
  localStorage.setItem(BLOG_KEY, JSON.stringify(articles));
  window.dispatchEvent(new CustomEvent('autodevis:blog-updated'));
  // Fire-and-forget sync so Googlebots can see new posts via the dynamic sitemap.
  void persistBlogRemote(articles).catch((err) => {
    console.warn('Failed to sync blog articles / sitemap to Supabase', err);
  });
}

export function createArticle(article: Omit<BlogArticle, 'slug' | 'date'> & { slug?: string; date?: string }): BlogArticle {
  const articles = getBlogArticles();
  const slug = article.slug || slugify(article.title);
  const date = article.date || new Date().toISOString().slice(0, 10);
  const newArticle: BlogArticle = { ...article, slug, date };
  saveBlogArticles([newArticle, ...articles]);
  return newArticle;
}

export function updateArticle(slug: string, patch: Partial<BlogArticle>): BlogArticle | null {
  const articles = getBlogArticles();
  const idx = articles.findIndex((a) => a.slug === slug);
  if (idx === -1) return null;
  const updated = { ...articles[idx], ...patch };
  articles[idx] = updated;
  saveBlogArticles(articles);
  return updated;
}

export function deleteArticle(slug: string): void {
  const articles = getBlogArticles().filter((a) => a.slug !== slug);
  saveBlogArticles(articles);
}

export function getArticleBySlug(slug: string): BlogArticle | undefined {
  return getBlogArticles().find((a) => a.slug === slug);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/** One-shot: push local/seed articles to Supabase if remote is empty (call from admin). */
export async function ensureBlogRemoteSeeded(): Promise<void> {
  const remote = await fetchBlogArticlesFromSupabase();
  if (remote) return;
  await persistBlogRemote(getBlogArticles());
}
