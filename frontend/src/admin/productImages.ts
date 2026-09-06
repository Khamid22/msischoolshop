export const MAX_PRODUCT_IMAGES = 6;
const MAX_SOURCE_BYTES = 20_000_000;
const MAX_SAVED_BYTES = 2_000_000;
const MAX_EDGE = 1600;
const SUPPORTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']);

function readDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Не удалось прочитать изображение. Попробуйте ещё раз.'));
    reader.readAsDataURL(blob);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const timer = window.setTimeout(() => {
      image.src = '';
      reject(new Error('Изображение не загрузилось. Попробуйте другой файл или прямую ссылку на фото.'));
    }, 15_000);
    image.onload = () => { clearTimeout(timer); resolve(image); };
    image.onerror = () => {
      clearTimeout(timer);
      reject(new Error('Не удалось открыть изображение. Используйте JPG, PNG, WebP или SVG.'));
    };
    image.src = src;
  });
}

async function prepareImage(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const image = await loadImage(url);
    const longestEdge = Math.max(image.naturalWidth, image.naturalHeight);
    if (file.size <= MAX_SAVED_BYTES && (longestEdge <= MAX_EDGE || file.type === 'image/svg+xml')) {
      return await readDataUrl(file);
    }
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Браузер не смог обработать фото. Попробуйте другой браузер.');
    let scale = Math.min(1, MAX_EDGE / longestEdge);
    // WebP preserves transparent logos; browsers without an encoder fall back to PNG.
    // Reduce dimensions again if that fallback still exceeds the API's image limit.
    for (let attempt = 0; attempt < 6; attempt += 1) {
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', .88));
      if (blob && blob.size <= MAX_SAVED_BYTES) return await readDataUrl(blob);
      scale *= .75;
    }
    throw new Error('Не удалось уменьшить фото. Попробуйте другое изображение.');
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function prepareProductImages(files: File[], availableSlots: number): Promise<string[]> {
  if (files.length > availableSlots) throw new Error(`Можно добавить не больше ${MAX_PRODUCT_IMAGES} изображений.`);
  for (const file of files) {
    if (!SUPPORTED_TYPES.has(file.type)) throw new Error(`«${file.name}»: выберите JPG, PNG, WebP или SVG.`);
    if (file.size > MAX_SOURCE_BYTES) throw new Error(`«${file.name}» больше 20 МБ. Выберите файл меньшего размера.`);
  }
  const images: string[] = [];
  // Process one decoded image at a time to avoid holding six full-size photos in memory.
  for (const file of files) images.push(await prepareImage(file));
  return images;
}

export async function validateProductImageUrl(value: string): Promise<string> {
  let url: URL;
  try { url = new URL(value.trim()); } catch {
    throw new Error('Вставьте полную прямую ссылку на изображение: https://…');
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error('Ссылка на изображение должна начинаться с https:// или http://.');
  }
  try { await loadImage(url.href); } catch {
    throw new Error('По ссылке не удалось открыть фото. Нужна прямая ссылка на изображение, а не на страницу поиска.');
  }
  return url.href;
}
