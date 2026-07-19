import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

/** GA4 Measurement ID — public by design (same as AdSense client IDs). */
export const GA_MEASUREMENT_ID = 'G-VJHYYKV4F7';

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

function ensureGtagLoaded(): void {
  if (typeof window === 'undefined') return;

  window.dataLayer = window.dataLayer || [];
  if (typeof window.gtag !== 'function') {
    window.gtag = function gtag(...args: unknown[]) {
      window.dataLayer?.push(args);
    };
    window.gtag('js', new Date());
    window.gtag('config', GA_MEASUREMENT_ID);
  }

  const src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  const already = Array.from(document.scripts).some((s) =>
    (s.src || '').includes('googletagmanager.com/gtag/js'),
  );
  if (!already) {
    const script = document.createElement('script');
    script.async = true;
    script.src = src;
    script.dataset.adeAnalytics = 'ga4';
    document.head.appendChild(script);
  }
}

/**
 * Ensures Google Tag Manager / gtag (GA4) is present on every route — including
 * `/blog/:slug` — and sends a page view on client-side navigations.
 * Base snippet also lives in `index.html` for first paint.
 */
export default function GoogleAnalytics() {
  const location = useLocation();
  const isFirstPath = useRef(true);

  useEffect(() => {
    ensureGtagLoaded();
  }, []);

  useEffect(() => {
    ensureGtagLoaded();
    if (typeof window.gtag !== 'function') return;

    // First paint is already tracked by the `index.html` gtag config.
    if (isFirstPath.current) {
      isFirstPath.current = false;
      return;
    }

    const pagePath = `${location.pathname}${location.search}${location.hash}`;
    window.gtag('config', GA_MEASUREMENT_ID, {
      page_path: pagePath,
      page_title: document.title,
    });
  }, [location.pathname, location.search, location.hash]);

  return null;
}
