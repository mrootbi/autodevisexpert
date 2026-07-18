import AdSenseUnit from './AdSenseUnit';
import { useSettings } from '../lib/settingsContext';
import { canRenderAdSlot } from '../lib/adsConfig';

interface NativeAdCardProps {
  variant?: 'default' | 'compact';
  className?: string;
}

/**
 * Mobile-first in-article AdSense shell.
 * Fully gated by live Supabase settings (`adsense_enabled` + publisher + in-article slot).
 * Returns null when the toggle is off or the slot is empty — zero layout impact.
 */
export default function NativeAdCard({ variant = 'default', className }: NativeAdCardProps) {
  const { adsConfig, loading } = useSettings();

  if (loading || !canRenderAdSlot(adsConfig, 'inArticle')) {
    return null;
  }

  const spacing =
    variant === 'compact'
      ? 'my-3 px-3 md:my-6 md:px-4'
      : 'my-4 px-4 md:my-8';

  return (
    <div
      className={
        className ??
        `adsense-in-article w-full max-w-full overflow-hidden mx-auto ${spacing}`
      }
      data-adsense-enabled={adsConfig.enabled ? 'true' : 'false'}
      data-ad-client={adsConfig.publisherId}
      data-ad-slot={adsConfig.slots.inArticle}
    >
      <AdSenseUnit
        slot="inArticle"
        placement="inArticle"
        className="w-full max-w-full min-h-[250px] overflow-hidden rounded-xl"
      />
    </div>
  );
}
