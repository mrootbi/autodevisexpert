import { useEffect } from 'react';
import { useSettings } from '../lib/settingsContext';
import { isValidPublisherId, toAdClient } from '../lib/adsConfig';

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

const SCRIPT_ATTR = 'data-adsense-client';

/**
 * Injects the Google AdSense script once into `<head>` when a valid Publisher ID is configured.
 * Mount this once near the app root (e.g. Layout).
 */
export default function AdSenseScript() {
  const { adsConfig, loading } = useSettings();

  useEffect(() => {
    if (loading) return;

    const client = toAdClient(adsConfig.publisherId);
    if (!adsConfig.enabled || !isValidPublisherId(adsConfig.publisherId) || !client) {
      // Remove a previously injected script when ads are off or publisher cleared.
      document.querySelectorAll(`script[${SCRIPT_ATTR}]`).forEach((el) => el.remove());
      return;
    }

    if (document.querySelector(`script[${SCRIPT_ATTR}="${client}"]`)) return;

    // Drop stale scripts for a different publisher.
    document.querySelectorAll(`script[${SCRIPT_ATTR}]`).forEach((el) => el.remove());

    const script = document.createElement('script');
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`;
    script.setAttribute(SCRIPT_ATTR, client);
    document.head.appendChild(script);
  }, [adsConfig.enabled, adsConfig.publisherId, loading]);

  return null;
}

/** Push a new unit to the AdSense queue after the <ins> is in the DOM. */
export function pushAdSenseUnit(): void {
  try {
    (window.adsbygoogle = window.adsbygoogle || []).push({});
  } catch {
    /* AdSense may throw if the unit was already initialized */
  }
}
