import { useEffect, useState } from 'react';
import { Check, Link2 } from 'lucide-react';
import { SITE_BASE_URL } from '../lib/siteUrl';

interface ArticleShareButtonsProps {
  /** Article title used in share text. */
  title: string;
  /** Canonical path (e.g. `/blog/my-slug`) or absolute URL. */
  path: string;
  className?: string;
  /** Visual density — `compact` for the footer row, `default` under the meta. */
  variant?: 'default' | 'compact';
}

function resolveUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${SITE_BASE_URL}${normalized}`;
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden xmlns="https://www.w3.org/2000/svg">
      <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047v-2.66c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.886v2.265h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden xmlns="https://www.w3.org/2000/svg">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.727-8.835L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
    </svg>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden xmlns="https://www.w3.org/2000/svg">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

const btnBase =
  'inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-all duration-300 ease-in-out hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-trust-100';

export default function ArticleShareButtons({
  title,
  path,
  className = '',
  variant = 'default',
}: ArticleShareButtonsProps) {
  const [copied, setCopied] = useState(false);

  // Prefer the live browser URL when available; fall back to the canonical SITE_BASE_URL
  // so SSR / build-time pre-renders never touch `window`.
  const [shareUrl, setShareUrl] = useState(() => resolveUrl(path));

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location?.href) {
      setShareUrl(window.location.href.split('#')[0] || resolveUrl(path));
    } else {
      setShareUrl(resolveUrl(path));
    }
  }, [path]);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const shareText = `${title} — AutoDevis Expert`;
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedText = encodeURIComponent(shareText);

  const facebookHref = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
  const twitterHref = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`;
  const whatsappHref = `https://api.whatsapp.com/send?text=${encodedText}%20${encodedUrl}`;

  const copyLink = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        // Fallback for older browsers
        const input = document.createElement('input');
        input.value = shareUrl;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
      }
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div
      className={`flex flex-col items-center gap-3 sm:flex-row sm:items-center sm:justify-between ${className}`}
      role="group"
      aria-label="Partager cet article"
    >
      {variant === 'default' && (
        <p className="text-sm font-medium text-slate-500">Partager cet article</p>
      )}
      <ul className="flex list-none items-center justify-center gap-2.5 p-0 m-0">
        <li>
          <a
            href={facebookHref}
            target="_blank"
            rel="noopener noreferrer"
            className={`${btnBase} hover:border-[#1877F2]/20 hover:bg-[#1877F2]/10 hover:text-[#1877F2]`}
            aria-label="Partager sur Facebook"
            title="Facebook"
          >
            <FacebookIcon className="h-5 w-5" />
          </a>
        </li>
        <li>
          <a
            href={twitterHref}
            target="_blank"
            rel="noopener noreferrer"
            className={`${btnBase} hover:border-slate-900/20 hover:bg-slate-900 hover:text-white`}
            aria-label="Partager sur X"
            title="X / Twitter"
          >
            <XIcon className="h-4 w-4" />
          </a>
        </li>
        <li>
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className={`${btnBase} hover:border-[#25D366]/30 hover:bg-[#25D366]/10 hover:text-[#25D366]`}
            aria-label="Partager sur WhatsApp"
            title="WhatsApp"
          >
            <WhatsAppIcon className="h-5 w-5" />
          </a>
        </li>
        <li className="relative">
          <button
            type="button"
            onClick={() => void copyLink()}
            className={`${btnBase} ${
              copied
                ? 'border-action-green/30 bg-action-green/10 text-action-greenDark'
                : 'hover:border-trust-300 hover:bg-trust-50 hover:text-trust-700'
            }`}
            aria-label={copied ? 'Lien copié' : 'Copier le lien'}
            title={copied ? 'Lien copié !' : 'Copier le lien'}
          >
            {copied ? <Check className="h-5 w-5" /> : <Link2 className="h-5 w-5" />}
          </button>
          {copied && (
            <span
              role="status"
              className="absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white shadow-md animate-fadeIn"
            >
              Lien copié !
            </span>
          )}
        </li>
      </ul>
    </div>
  );
}
