import AdSenseUnit from './AdSenseUnit';

interface NativeAdCardProps {
  variant?: 'default' | 'compact';
  className?: string;
}

/** Thin alias for in-article AdSense — returns null when ads are off. */
export default function NativeAdCard({ className }: NativeAdCardProps) {
  return (
    <AdSenseUnit
      slot="inArticle"
      placement="inArticle"
      className={className ?? 'my-6 w-full overflow-hidden rounded-xl'}
    />
  );
}
