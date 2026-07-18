import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useSettings } from '../lib/settingsContext';
import {
  AdSlotKey,
  ADSENSE_DB_KEYS,
  AD_SLOT_TO_DB_KEY,
  canRenderAdSlot,
  getSlotId,
  toAdClient,
} from '../lib/adsConfig';
import { pushAdSenseUnit } from './AdSenseScript';

export type AdPlacement =
  | 'header'
  | 'loading'
  | 'formBanner'
  | 'results'
  | 'preVerdict'
  | 'sidebar'
  | 'inArticle';

interface AdSenseUnitProps {
  /** Which DB slot ID to use: header | inArticle | sidebar */
  slot: AdSlotKey;
  /** Optional layout label for DOM debugging (`data-ad-placement`) */
  placement?: AdPlacement;
  className?: string;
}

const SLOT_FORMAT: Record<AdSlotKey, string> = {
  header: 'horizontal',
  inArticle: 'fluid',
  sidebar: 'vertical',
};

const SLOT_MIN_HEIGHT: Record<AdSlotKey, string> = {
  header: 'min-h-[90px] sm:min-h-[100px]',
  /** Reserve space on mobile to avoid CLS when the creative paints. */
  inArticle: 'min-h-[250px]',
  sidebar: 'min-h-[280px]',
};

/**
 * Single AdSense unit for the whole app.
 *
 * - `adsense_enabled === false` → `null` (no wrapper, margin, or reserved height)
 * - enabled + valid publisher + valid slot ID → live `<ins class="adsbygoogle">`
 * - unfilled units collapse to `null` so blank boxes never linger
 */
export default function AdSenseUnit({ slot, placement, className = '' }: AdSenseUnitProps) {
  const { adsConfig, loading } = useSettings();
  const { pathname } = useLocation();
  const [unfilled, setUnfilled] = useState(false);
  const slotId = getSlotId(adsConfig, slot);
  const client = toAdClient(adsConfig.publisherId);

  // Re-arm the unit when admin toggles ads or updates slot/publisher IDs.
  useEffect(() => {
    setUnfilled(false);
  }, [adsConfig.enabled, adsConfig.publisherId, slotId, slot]);

  if (loading || pathname.startsWith('/mouadbi')) {
    return null;
  }

  // Master toggle: off = zero DOM impact on the public site.
  if (!adsConfig.enabled) {
    return null;
  }

  if (!canRenderAdSlot(adsConfig, slot) || unfilled) {
    return null;
  }

  return (
    <AdSenseUnitLive
      key={`${slot}-${slotId}-${client}`}
      slot={slot}
      slotId={slotId}
      client={client}
      placement={placement ?? slot}
      className={className}
      onUnfilled={() => setUnfilled(true)}
    />
  );
}

function AdSenseUnitLive({
  slot,
  slotId,
  client,
  placement,
  className,
  onUnfilled,
}: {
  slot: AdSlotKey;
  slotId: string;
  client: string;
  placement: string;
  className: string;
  onUnfilled: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pushedRef = useRef(false);

  useEffect(() => {
    pushedRef.current = false;
  }, [slot, slotId, client]);

  useEffect(() => {
    const container = containerRef.current;
    const ins = container?.querySelector<HTMLElement>('ins.adsbygoogle');
    if (!ins) return;

    if (!pushedRef.current && !ins.dataset.adsbygoogleStatus) {
      pushedRef.current = true;
      ins.dataset.adsbygoogleStatus = 'pending';
      pushAdSenseUnit();
    }

    const collapseIfUnfilled = () => {
      if (ins.getAttribute('data-ad-status') === 'unfilled') {
        onUnfilled();
      }
    };

    collapseIfUnfilled();
    const observer = new MutationObserver(collapseIfUnfilled);
    observer.observe(ins, { attributes: true, attributeFilter: ['data-ad-status'] });
    const timer = window.setTimeout(collapseIfUnfilled, 8000);

    return () => {
      observer.disconnect();
      window.clearTimeout(timer);
    };
  }, [slot, slotId, client, onUnfilled]);

  return (
    <div
      ref={containerRef}
      className={`adsense-unit box-border w-full max-w-full overflow-hidden ${SLOT_MIN_HEIGHT[slot]} ${className}`}
      data-ad-placement={placement}
      data-adsense-enabled-key={ADSENSE_DB_KEYS.enabled}
      data-adsense-slot-key={AD_SLOT_TO_DB_KEY[slot]}
      aria-label="Publicité"
    >
      <ins
        className="adsbygoogle block w-full max-w-full overflow-hidden"
        style={{ display: 'block', width: '100%', maxWidth: '100%', overflow: 'hidden' }}
        data-ad-client={client}
        data-ad-slot={slotId}
        data-ad-format={SLOT_FORMAT[slot]}
        data-full-width-responsive="true"
      />
    </div>
  );
}
