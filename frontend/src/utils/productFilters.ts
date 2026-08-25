import type { FilterState, Product, ProductCollection } from '../types';
import { getProductPrice } from './currency';

const STUDY_PRODUCT_IDS = new Set([
  'calc-2in1',
  'calc-notebook',
  'la2-bundle',
  'physics-bundle',
  'chem-bundle',
  'ielts-bundle',
]);

const REWARD_PRODUCT_IDS = new Set([
  'tg-gift-25',
  'tg-gift-50',
  'tg-gift-150',
  'tg-premium-3m',
  'tg-premium-6m',
  'tg-premium-12m',
]);

export function matchesCollection(product: Product, collection: ProductCollection = 'all'): boolean {
  if (collection === 'all') return true;
  if (collection === 'study') return STUDY_PRODUCT_IDS.has(product.id) || Boolean(product.course);
  if (collection === 'digital') return product.type === 'digital';
  if (collection === 'rewards') return REWARD_PRODUCT_IDS.has(product.id);
  return product.type === 'physical' && !STUDY_PRODUCT_IDS.has(product.id);
}

export function filterProducts(
  products: Product[],
  filters: FilterState,
  translate?: (key: string) => string,
): Product[] {
  const query = filters.search.trim().toLowerCase();

  const filtered = products.filter((product) => {
    if (!matchesCollection(product, filters.collection)) return false;
    if (filters.type !== 'all' && product.type !== filters.type) return false;

    const price = getProductPrice(product);
    if (filters.minPrice > 0 && price < filters.minPrice) return false;
    if (filters.maxPrice > 0 && price > filters.maxPrice) return false;
    if (filters.inStock && product.type === 'physical' && (product.stock ?? 0) <= 0) return false;
    if (filters.courseLinked && !product.course) return false;

    if (query) {
      const translatedName = translate?.(product.nameKey) || '';
      const translatedDescription = translate?.(product.descKey) || '';
      const searchable = [translatedName, translatedDescription, product.name, product.description]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!searchable.includes(query)) return false;
    }

    return true;
  });

  return filtered.sort((a, b) => {
    if (filters.sort === 'price') return getProductPrice(a) - getProductPrice(b);
    if (filters.sort === 'newest') return products.indexOf(b) - products.indexOf(a);
    return (b.ratingCount ?? 0) - (a.ratingCount ?? 0) || (b.rating ?? 0) - (a.rating ?? 0);
  });
}
