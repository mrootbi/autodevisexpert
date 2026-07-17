const MAX_FILE_BYTES = 2 * 1024 * 1024;
const MAX_WIDTH = 1200;
const TARGET_MAX_BYTES = 400 * 1024;

export async function readCoverImageFile(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Veuillez sélectionner une image (JPG, PNG ou WebP).');
  }

  if (file.size > MAX_FILE_BYTES) {
    throw new Error('Image trop lourde (max 2 Mo). Choisissez une image plus légère.');
  }

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_WIDTH / bitmap.width);
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    throw new Error('Impossible de traiter l\'image.');
  }

  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  let quality = 0.88;
  let dataUrl = canvas.toDataURL('image/jpeg', quality);

  while (dataUrl.length > TARGET_MAX_BYTES * 1.37 && quality > 0.45) {
    quality -= 0.08;
    dataUrl = canvas.toDataURL('image/jpeg', quality);
  }

  return dataUrl;
}
