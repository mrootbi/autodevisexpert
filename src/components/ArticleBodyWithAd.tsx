import { useMemo } from 'react';
import { prepareArticleHtml } from '../lib/articleHtml';
import { splitHtmlForInArticleAd } from '../lib/inArticleAd';
import { useSettings } from '../lib/settingsContext';
import { canRenderAdSlot } from '../lib/adsConfig';
import NativeAdCard from './NativeAdCard';

interface ArticleBodyWithAdProps {
  content: string;
  /** Used as fallback alt text for body images missing alt. */
  title?: string;
}

/**
 * Public article body: sanitizes CMS HTML, demotes body H1s, hardens images,
 * and injects the live In-Article AdSense unit when configured.
 */
export default function ArticleBodyWithAd({ content, title }: ArticleBodyWithAdProps) {
  const { adsConfig, loading } = useSettings();
  const fallbackAlt = title
    ? `Illustration — ${title}`
    : 'Illustration article AutoDevis Expert';
  const html = useMemo(() => prepareArticleHtml(content, fallbackAlt), [content, fallbackAlt]);
  const parts = useMemo(() => splitHtmlForInArticleAd(html), [html]);
  const showInArticle = !loading && canRenderAdSlot(adsConfig, 'inArticle');

  if (!showInArticle || !parts) {
    return (
      <>
        <div
          className="prose-article min-w-0 max-w-full overflow-x-clip"
          dangerouslySetInnerHTML={{ __html: html }}
        />
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
