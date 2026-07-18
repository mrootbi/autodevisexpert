import { useMemo } from 'react';
import { sanitizeHtml } from '../lib/sanitize';
import { splitHtmlForInArticleAd } from '../lib/inArticleAd';
import { useSettings } from '../lib/settingsContext';
import { canRenderAdSlot } from '../lib/adsConfig';
import NativeAdCard from './NativeAdCard';

interface ArticleBodyWithAdProps {
  content: string;
}

/**
 * Public article body: sanitizes CMS HTML and injects the live In-Article AdSense
 * unit after the 2nd/3rd paragraph when adsense_enabled + slot are configured.
 */
export default function ArticleBodyWithAd({ content }: ArticleBodyWithAdProps) {
  const { adsConfig, loading } = useSettings();
  const html = useMemo(() => sanitizeHtml(content), [content]);
  const parts = useMemo(() => splitHtmlForInArticleAd(html), [html]);
  const showInArticle = !loading && canRenderAdSlot(adsConfig, 'inArticle');

  if (!showInArticle || !parts) {
    return (
      <>
        <div
          className="prose-article min-w-0 max-w-full overflow-x-clip"
          dangerouslySetInnerHTML={{ __html: html }}
        />
        {/* Fallback: short articles (<2 paragraphs) still get a post-body unit when ads are on */}
        {showInArticle && <NativeAdCard />}
      </>
    );
  }

  return (
    <>
      <div
        className="prose-article min-w-0 max-w-full overflow-x-clip"
        dangerouslySetInnerHTML={{ __html: parts.before }}
      />
      <NativeAdCard />
      <div
        className="prose-article min-w-0 max-w-full overflow-x-clip"
        dangerouslySetInnerHTML={{ __html: parts.after }}
      />
    </>
  );
}
