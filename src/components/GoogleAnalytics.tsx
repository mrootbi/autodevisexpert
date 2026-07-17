import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/** GA4 Measurement ID — public by design (same as AdSense client IDs). */
export const GA_MEASUREMENT_ID = 'G-VJHYYKV4F7';

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * Sends a GA4 `page_view` on every client-side route change.
 * The base gtag.js snippet lives in `index.html` for first-paint tracking.
 */
export default function GoogleAnalytics() {
  const location = useLocation();

  useEffect(() => {
    if (typeof window.gtag !== 'function') return;
    const pagePath = `${location.pathname}${location.search}${location.hash}`;
    window.gtag('config', GA_MEASUREMENT_ID, {
      page_path: pagePath,
      page_title: document.title,
    });
  }, [location.pathname, location.search, location.hash]);

  return null;
}
