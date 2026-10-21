import type { Product, ProductVariant } from '../types';

// Match checkout: a variant's own stock overrides the shared product stock.
export function getVariantStock(product: Product, variant: ProductVariant): number | null {
  if (product.active === false || variant.active === false) return 0;
  return variant.stock ?? product.stock ?? null;
}

export function getProductStock(product: Product): number | null {
  if (!product.variants?.length) return product.stock ?? null;
  const variants = product.variants.filter((variant) => variant.active !== false);
  let total = 0;
  let usesSharedStock = false;
  for (const variant of variants) {
    if (variant.stock == null) {
      if (product.stock == null) return null;
      usesSharedStock = true;
    } else {
      total += variant.stock;
    }
  }
  return total + (usesSharedStock ? product.stock ?? 0 : 0);
}
