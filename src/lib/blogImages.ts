import { supabase } from './supabase';

export const BLOG_IMAGES_BUCKET = 'blog-images';

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']);

function extForMime(mime: string): string {
  switch (mime.toLowerCase()) {
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/gif':
      return 'gif';
    default:
      return 'jpg';
  }
}

/** Upload a clipboard/file image to the public Supabase Storage bucket; returns its public URL. */
export async function uploadBlogImage(file: Blob, fileNameHint?: string): Promise<string> {
  const mime = (file.type || 'image/jpeg').toLowerCase();
  if (!ALLOWED.has(mime)) {
    throw new Error('Format image non supporté (JPG, PNG, WebP ou GIF).');
  }
  if (file.size > MAX_BYTES) {
    throw new Error('Image trop lourde (max 2 Mo).');
  }

  const ext = extForMime(mime);
  const safeHint = (fileNameHint || 'paste')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  const path = `inline/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeHint || 'img'}.${ext}`;

  const { error } = await supabase.storage.from(BLOG_IMAGES_BUCKET).upload(path, file, {
    cacheControl: '31536000',
    contentType: mime === 'image/jpg' ? 'image/jpeg' : mime,
    upsert: false,
  });

  if (error) {
    throw new Error(error.message || 'Échec du téléversement de l’image.');
  }

  const { data } = supabase.storage.from(BLOG_IMAGES_BUCKET).getPublicUrl(path);
  if (!data?.publicUrl) {
    throw new Error('URL publique introuvable après téléversement.');
  }
  return data.publicUrl;
}
