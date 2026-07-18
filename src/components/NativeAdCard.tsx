import AdSenseUnit from './AdSenseUnit';

interface NativeAdCardProps {
  variant?: 'default' | 'compact';
  className?: string;
}

/** Mobile-first in-article AdSense shell — returns null when ads are off. */
export default function NativeAdCard({ variant = 'default', className }: NativeAdCardProps) {
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
    >
      <AdSenseUnit
        slot="inArticle"
        placement="inArticle"
        className="w-full max-w-full min-h-[250px] overflow-hidden rounded-xl"
      />
    </div>
  );
}
