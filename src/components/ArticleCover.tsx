import { BlogArticle } from '../lib/types';

interface ArticleCoverProps {
  article: Pick<BlogArticle, 'title' | 'cover' | 'coverImage'>;
  className?: string;
  /** Override default French SEO alt text. */
  alt?: string;
}

export default function ArticleCover({ article, className = '', alt }: ArticleCoverProps) {
  if (article.coverImage) {
    return (
      <img
        src={article.coverImage}
        alt={alt ?? `Analyse de devis garage gratuit — ${article.title}`}
        className={`h-full w-full object-cover object-center ${className}`}
        width={1200}
        height={630}
        sizes="(max-width: 768px) 100vw, 768px"
        loading="lazy"
        decoding="async"
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
