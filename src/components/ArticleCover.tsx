import { BlogArticle } from '../lib/types';

interface ArticleCoverProps {
  article: Pick<BlogArticle, 'title' | 'cover' | 'coverImage'>;
  className?: string;
  /** Override default French SEO alt text. */
  alt?: string;
  /**
   * Set for the single above-the-fold hero image on a page (article header,
   * blog featured card) so it loads eagerly with high priority instead of
   * lazily — avoids competing with the LCP element. Defaults to lazy.
   */
  priority?: boolean;
}

export default function ArticleCover({ article, className = '', alt, priority = false }: ArticleCoverProps) {
  if (article.coverImage) {
    return (
      <img
        src={article.coverImage}
        alt={alt ?? `Analyse de devis garage gratuit — ${article.title}`}
        className={`h-full w-full object-cover object-center ${className}`}
        width={1200}
        height={630}
        sizes="(max-width: 768px) 100vw, 768px"
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={priority ? 'high' : 'auto'}
      />
    );
  }

  return (
    <div
      className={`bg-gradient-to-br ${article.cover} ${className}`}
      role="img"
      aria-label={alt ?? `Illustration article : ${article.title}`}
    />
  );
}
