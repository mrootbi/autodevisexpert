import { SITE_BASE_URL } from './siteUrl';

/** Shared brand defaults for Open Graph / Twitter cards and footer social links. */
export const SITE_NAME = 'AutoDevis Expert';

export const DEFAULT_TWITTER = {
  card: 'summary_large_image' as const,
  title: SITE_NAME,
  description:
    "Comparateur de devis garage gratuit. Analysez votre devis gratuitement, comparez au prix réel et obtenez l'avis d'un expert mécanicien.",
  images: [`${SITE_BASE_URL}/og-default.png`] as const,
  /** X/Twitter handle for twitter:site (auditors flag incomplete cards without it). */
  site: '@autodevisexpert',
  imageAlt: 'AutoDevis Expert — comparateur de devis garage gratuit',
};

export const SOCIAL_PROFILES = {
  facebook: 'https://www.facebook.com/autodevisexpert',
  twitter: 'https://x.com/autodevisexpert',
} as const;

export const SOCIAL_SAME_AS = [SOCIAL_PROFILES.facebook, SOCIAL_PROFILES.twitter] as const;
