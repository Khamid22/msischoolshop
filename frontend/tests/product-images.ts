import { prepareProductImages, validateProductImageUrl } from '../src/admin/productImages.ts';

const results: Array<{ name: string; passed: boolean; error?: string }> = [];
function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}
async function test(name: string, run: () => Promise<void>) {
  try { await run(); results.push({ name, passed: true }); } catch (error) {
    results.push({ name, passed: false, error: String(error) });
  }
  const item = document.createElement('li');
  const result = results.at(-1)!;
  item.textContent = `${result.passed ? 'PASS' : 'FAIL'}: ${name}${result.error ? ` — ${result.error}` : ''}`;
  document.querySelector('#results')!.append(item);
}
async function rejects(run: () => Promise<unknown>, message: RegExp) {
  try { await run(); } catch (error) {
    assert(message.test(String(error)), `Unexpected error: ${error}`);
    return;
  }
  throw new Error('Expected rejection');
}
async function fixture(width: number, height: number, type = 'image/png', noise = false) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const context = canvas.getContext('2d')!;
  if (noise) {
    const pixels = context.createImageData(width, height);
    let seed = 42;
    for (let i = 0; i < pixels.data.length; i += 1) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      pixels.data[i] = i % 4 === 3 ? 255 : seed >>> 24;
    }
    context.putImageData(pixels, 0, 0);
  } else {
    context.fillStyle = '#243474';
    context.fillRect(width / 4, height / 4, width / 2, height / 2);
  }
  const blob = await new Promise<Blob>((resolve) => canvas.toBlob((value) => resolve(value!), type, .98));
  return new File([blob], 'photo', { type: blob.type });
}
async function inspect(url: string) {
  const image = new Image(); image.src = url; await image.decode();
  const blob = await (await fetch(url)).blob();
  assert(blob.size <= 2_000_000, 'Saved image exceeds upload budget');
  assert(url.length < 2_800_000, 'Data URL exceeds API schema limit');
  return { image, blob };
}

await test('Small transparent logos remain byte-for-byte unchanged and are not enlarged', async () => {
  const file = await fixture(80, 40);
  const [url] = await prepareProductImages([file], 6);
  const { image, blob } = await inspect(url);
  assert(image.naturalWidth === 80 && image.naturalHeight === 40, 'Logo dimensions changed');
  const original = new Uint8Array(await file.arrayBuffer());
  const saved = new Uint8Array(await blob.arrayBuffer());
  assert(saved.length === original.length && saved.every((byte, index) => byte === original[index]), 'Small original was re-encoded');
});
await test('Large PNG over 2 MB is resized to fit, preserving landscape proportions', async () => {
  const file = await fixture(2400, 1800, 'image/png', true);
  assert(file.size > 2_000_000 && file.size < 20_000_000, 'Fixture must exercise the old rejection');
  const [url] = await prepareProductImages([file], 6);
  const { image } = await inspect(url);
  assert(image.naturalWidth === 1600 && image.naturalHeight === 1200, 'Wrong landscape dimensions');
});
await test('Portrait JPEG retains its orientation and aspect ratio', async () => {
  const file = await fixture(1800, 2400, 'image/jpeg', true);
  assert(file.size > 2_000_000, 'JPEG must exercise the old rejection');
  const [url] = await prepareProductImages([file], 6);
  const { image } = await inspect(url);
  assert(image.naturalWidth === 1200 && image.naturalHeight === 1600, 'Wrong portrait dimensions');
});
await test('Resized PNG keeps its transparent background', async () => {
  const [url] = await prepareProductImages([await fixture(3200, 1600)], 6);
  const { image } = await inspect(url);
  const canvas = document.createElement('canvas'); canvas.width = 1600; canvas.height = 800;
  const context = canvas.getContext('2d')!; context.drawImage(image, 0, 0);
  assert(context.getImageData(0, 0, 1, 1).data[3] === 0, 'Transparency lost');
  assert(context.getImageData(800, 400, 1, 1).data[3] === 255, 'Logo content lost');
});
await test('PNG encoder fallback also stays below the server limit', async () => {
  const file = await fixture(1800, 1800, 'image/png', true);
  const encode = HTMLCanvasElement.prototype.toBlob;
  HTMLCanvasElement.prototype.toBlob = function (callback) { encode.call(this, callback, 'image/png'); };
  try {
    const [url] = await prepareProductImages([file], 6);
    const { image, blob } = await inspect(url);
    assert(blob.type === 'image/png', 'Did not exercise PNG fallback');
    assert(image.naturalWidth === image.naturalHeight && image.naturalWidth < 1600, 'Fallback must shrink further');
  } finally { HTMLCanvasElement.prototype.toBlob = encode; }
});
await test('SVG logos remain vector images', async () => {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="20"><rect width="40" height="20" fill="blue"/></svg>';
  const [url] = await prepareProductImages([new File([svg], 'logo.svg', { type: 'image/svg+xml' })], 6);
  const { blob } = await inspect(url);
  assert(blob.type === 'image/svg+xml' && await blob.text() === svg, 'Vector changed');
});
await test('Corrupt images produce a useful error', async () => {
  await rejects(() => prepareProductImages([new File(['broken'], 'broken.png', { type: 'image/png' })], 6), /Не удалось открыть/);
});
await test('Unsupported phone formats explain accepted formats', async () => {
  await rejects(() => prepareProductImages([new File(['heic'], 'phone.heic', { type: 'image/heic' })], 6), /JPG, PNG, WebP или SVG/);
});
await test('Files above 20 MB are rejected before decoding', async () => {
  await rejects(() => prepareProductImages([new File([new Uint8Array(20_000_001)], 'large.jpg', { type: 'image/jpeg' })], 6), /больше 20 МБ/);
});
await test('Seven files and adding to a full gallery respect the six-image limit', async () => {
  const file = await fixture(40, 40);
  await rejects(() => prepareProductImages(Array(7).fill(file), 6), /не больше 6/);
  await rejects(() => prepareProductImages([file], 0), /не больше 6/);
  assert((await prepareProductImages(Array(6).fill(file), 6)).length === 6, 'Six valid images should be accepted');
});
await test('Direct image links are accepted', async () => {
  const url = new URL('/favicon.svg', location.href).href;
  assert(await validateProductImageUrl(url) === url, 'Direct link rejected');
});
await test('Page links and unsafe/invalid URLs are rejected', async () => {
  await rejects(() => validateProductImageUrl(location.href), /прямая ссылка на изображение/);
  await rejects(() => validateProductImageUrl('not a url'), /полную прямую ссылку/);
  await rejects(() => validateProductImageUrl('javascript:alert(1)'), /https/);
});

document.querySelector('#summary')!.textContent = `${results.filter((item) => item.passed).length}/${results.length} passed`;
document.documentElement.dataset.tests = results.every((item) => item.passed) ? 'passed' : 'failed';
