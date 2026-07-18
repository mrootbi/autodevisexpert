import { Quill } from 'react-quill';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const BaseImage: any = Quill.import('formats/image');

const ATTRS = ['alt', 'height', 'width', 'style', 'class'] as const;

/** Extend Quill's Image blot so width/style/class survive delta ↔ HTML round-trips. */
class ResizableImage extends BaseImage {
  static formats(domNode: HTMLElement): Record<string, string> {
    const formats: Record<string, string> = {};
    for (const attr of ATTRS) {
      if (domNode.hasAttribute(attr)) {
        formats[attr] = domNode.getAttribute(attr) || '';
      }
    }
    return formats;
  }

  format(name: string, value: unknown): void {
    if ((ATTRS as readonly string[]).includes(name)) {
      if (value) this.domNode.setAttribute(name, String(value));
      else this.domNode.removeAttribute(name);
      return;
    }
    super.format(name, value);
  }
}

let registered = false;

export function registerResizableImageFormat(): void {
  if (registered) return;
  Quill.register('formats/image', ResizableImage, true);
  registered = true;
}

export type ImageAlign = 'left' | 'center' | 'right';
export type ImageSizePreset = 25 | 50 | 75 | 100;

const ALIGN_CLASS: Record<ImageAlign, string> = {
  left: 'blog-img-align-left',
  center: 'blog-img-align-center',
  right: 'blog-img-align-right',
};

const SIZE_CLASS: Record<ImageSizePreset, string> = {
  25: 'blog-img-w-25',
  50: 'blog-img-w-50',
  75: 'blog-img-w-75',
  100: 'blog-img-w-100',
};

export function readImageAlign(img: HTMLImageElement): ImageAlign {
  if (img.classList.contains('blog-img-align-left')) return 'left';
  if (img.classList.contains('blog-img-align-right')) return 'right';
  const style = img.getAttribute('style') || '';
  if (/float\s*:\s*left/i.test(style)) return 'left';
  if (/float\s*:\s*right/i.test(style)) return 'right';
  return 'center';
}

export function readImageSizePercent(img: HTMLImageElement): ImageSizePreset {
  for (const pct of [25, 50, 75, 100] as const) {
    if (img.classList.contains(SIZE_CLASS[pct])) return pct;
  }
  const style = img.getAttribute('style') || '';
  const m = /width\s*:\s*(\d+(?:\.\d+)?)%/i.exec(style);
  if (m) {
    const n = Math.round(Number(m[1]));
    if (n <= 30) return 25;
    if (n <= 60) return 50;
    if (n <= 85) return 75;
    return 100;
  }
  const widthAttr = img.getAttribute('width');
  if (widthAttr?.endsWith('%')) {
    const n = Math.round(Number(widthAttr.replace('%', '')));
    if (n <= 30) return 25;
    if (n <= 60) return 50;
    if (n <= 85) return 75;
    return 100;
  }
  return 100;
}

function nearestPreset(size: number): ImageSizePreset {
  if (size <= 30) return 25;
  if (size <= 60) return 50;
  if (size <= 85) return 75;
  return 100;
}

function buildImageStyle(size: number, align: ImageAlign): string {
  const width = `${Math.round(size)}%`;
  if (align === 'left') {
    return `width: ${width}; height: auto; float: left; margin: 0.5rem 1rem 0.75rem 0; display: inline;`;
  }
  if (align === 'right') {
    return `width: ${width}; height: auto; float: right; margin: 0.5rem 0 0.75rem 1rem; display: inline;`;
  }
  return `width: ${width}; height: auto; display: block; margin: 0.75rem auto; float: none;`;
}

function buildImageClass(size: ImageSizePreset, align: ImageAlign): string {
  return ['blog-img', SIZE_CLASS[size], ALIGN_CLASS[align]].join(' ');
}

/** Apply size + alignment onto an <img> and sync Quill blot formats. */
export function applyImageLayout(img: HTMLImageElement, size: number, align: ImageAlign): void {
  const preset = nearestPreset(size);
  const style = buildImageStyle(size, align);
  const className = buildImageClass(preset, align);

  img.setAttribute('style', style);
  img.setAttribute('width', `${Math.round(size)}%`);
  img.removeAttribute('height');
  img.className = className;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const blot: any = Quill.find(img);
  if (!blot?.format) return;
  blot.format('style', style);
  blot.format('width', `${Math.round(size)}%`);
  blot.format('class', className);
}
