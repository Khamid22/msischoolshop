import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';

import { createProduct, updateProduct } from '../api';
import { PlusIcon, TrashIcon, XIcon } from '../components/icons';
import type {
  CatalogCategory,
  FulfillmentType,
  Product,
  ProductVariant,
} from '../types';

const MAX_IMAGES = 6;
const MAX_IMAGE_BYTES = 2_000_000;

interface ProductDraft {
  name: string;
  description: string;
  categoryId: string;
  price: number;
  fulfillmentType: FulfillmentType;
  stock: number;
  discount: number;
  rating: number | '';
  active: boolean;
  carousel: boolean;
  variantLabel: string;
  variants: ProductVariant[];
  images: string[];
}

interface Props {
  categories: CatalogCategory[];
  product?: Product;
  close: () => void;
  saved: () => void;
}

function fulfillmentOf(product?: Product): FulfillmentType {
  return product?.fulfillmentType
    || (product?.type === 'physical' ? 'physical_pickup' : 'digital_activation');
}

function initialDraft(product: Product | undefined, categories: CatalogCategory[]): ProductDraft {
  const images = product?.images?.length
    ? product.images
    : product?.image ? [product.image] : [];
  return {
    name: product?.name || product?.nameKey || '',
    description: product?.description || product?.descKey || '',
    categoryId: product?.categoryId || categories.find((item) => item.active)?.id || '',
    price: product?.price || 0,
    fulfillmentType: fulfillmentOf(product),
    stock: product?.stock || 0,
    discount: product?.discount || 0,
    rating: product?.rating ?? '',
    active: product?.active !== false,
    carousel: Boolean(product?.carousel),
    variantLabel: product?.variantLabel || '',
    variants: (product?.variants || []).map((variant) => ({
      ...variant,
      active: variant.active !== false,
    })),
    images,
  };
}

function variantId(): string {
  return globalThis.crypto?.randomUUID?.().slice(0, 12)
    || `variant-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`;
}

async function filesToImages(files: FileList): Promise<string[]> {
  const selected = Array.from(files);
  const oversized = selected.find((file) => file.size > MAX_IMAGE_BYTES);
  if (oversized) throw new Error(`Файл «${oversized.name}» больше 2 МБ.`);
  return Promise.all(selected.map((file) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error(`Не удалось прочитать «${file.name}».`));
    reader.readAsDataURL(file);
  })));
}

export function ProductEditorModal({ categories, product, close, saved }: Props) {
  const [draft, setDraft] = useState(() => initialDraft(product, categories));
  const [imageUrl, setImageUrl] = useState('');
  const [selectedImage, setSelectedImage] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const isPhysical = draft.fulfillmentType === 'physical_pickup';
  const preview = draft.images[selectedImage] || draft.images[0] || '';
  const activeCategories = useMemo(
    () => categories.filter((category) => category.active || category.id === draft.categoryId),
    [categories, draft.categoryId],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  const addUploadedImages = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files?.length) return;
    setError('');
    try {
      const next = await filesToImages(event.target.files);
      if (draft.images.length + next.length > MAX_IMAGES) {
        throw new Error(`Можно добавить не больше ${MAX_IMAGES} изображений.`);
      }
      setDraft((current) => ({ ...current, images: [...current.images, ...next] }));
      setSelectedImage(draft.images.length);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Не удалось добавить изображение.');
    } finally {
      event.target.value = '';
    }
  };

  const addImageUrl = () => {
    const value = imageUrl.trim();
    if (!value) return;
    if (draft.images.length >= MAX_IMAGES) {
      setError(`Можно добавить не больше ${MAX_IMAGES} изображений.`);
      return;
    }
    setDraft((current) => ({ ...current, images: [...current.images, value] }));
    setSelectedImage(draft.images.length);
    setImageUrl('');
  };

  const makePrimary = (index: number) => {
    setDraft((current) => {
      const images = [...current.images];
      const [image] = images.splice(index, 1);
      images.unshift(image);
      return { ...current, images };
    });
    setSelectedImage(0);
  };

  const removeImage = (index: number) => {
    setDraft((current) => ({
      ...current,
      images: current.images.filter((_, imageIndex) => imageIndex !== index),
    }));
    setSelectedImage(0);
  };

  const addVariant = () => {
    setDraft((current) => ({
      ...current,
      variantLabel: current.variantLabel || (isPhysical ? 'Размер' : 'Вариант'),
      variants: [
        ...current.variants,
        { id: variantId(), label: '', price: current.price, stock: isPhysical ? 0 : undefined, active: true },
      ],
    }));
  };

  const updateVariant = (index: number, changes: Partial<ProductVariant>) => {
    setDraft((current) => ({
      ...current,
      variants: current.variants.map((variant, variantIndex) => (
        variantIndex === index ? { ...variant, ...changes } : variant
      )),
    }));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    if (!draft.images.length) {
      setError('Добавьте хотя бы одно изображение товара.');
      return;
    }
    if (draft.variants.some((variant) => !variant.label.trim())) {
      setError('У каждого варианта должно быть понятное название.');
      return;
    }
    const payload: Omit<Product, 'id'> = {
      nameKey: '',
      descKey: '',
      name: draft.name.trim(),
      description: draft.description.trim(),
      image: draft.images[0],
      images: draft.images,
      categoryId: draft.categoryId || undefined,
      price: draft.price,
      type: isPhysical ? 'physical' : 'digital',
      fulfillmentType: draft.fulfillmentType,
      stock: isPhysical && !draft.variants.length ? draft.stock : undefined,
      variantLabel: draft.variants.length ? draft.variantLabel.trim() : undefined,
      variants: draft.variants.map((variant) => ({
        ...variant,
        label: variant.label.trim(),
        stock: isPhysical ? variant.stock : undefined,
      })),
      discount: draft.discount || undefined,
      rating: draft.rating === '' ? undefined : Number(draft.rating),
      active: draft.active,
      carousel: draft.carousel,
    };
    setBusy(true);
    try {
      if (product) await updateProduct(product.id, payload);
      else await createProduct(payload);
      saved();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Не удалось сохранить товар.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && close()}>
      <section className="modal modal--product" role="dialog" aria-modal="true" aria-labelledby="product-editor-title">
        <header className="modal__header">
          <div>
            <h2 id="product-editor-title">{product ? 'Изменить товар' : 'Новый товар'}</h2>
            <p>Карточка, варианты и выдача синхронизируются с магазином.</p>
          </div>
          <button className="icon-button" type="button" onClick={close} aria-label="Закрыть"><XIcon /></button>
        </header>
        <form onSubmit={submit}>
          <div className="modal__body product-editor">
            <div className="product-editor__form">
              <label className="field"><span>Название</span><input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} required /></label>
              <label className="field"><span>Категория</span><select value={draft.categoryId} onChange={(event) => setDraft({ ...draft, categoryId: event.target.value })} required><option value="">Выберите категорию</option>{activeCategories.map((category) => <option key={category.id} value={category.id}>{category.nameRu}</option>)}</select></label>
              <label className="field"><span>Цена, коины</span><input type="number" min="0" value={draft.price} onChange={(event) => setDraft({ ...draft, price: Number(event.target.value) })} required /></label>
              <label className="field"><span>После покупки</span><select value={draft.fulfillmentType} onChange={(event) => setDraft({ ...draft, fulfillmentType: event.target.value as FulfillmentType })}><option value="digital_activation">Подключить цифровой товар</option><option value="digital_delivery">Отправить цифровой товар</option><option value="physical_pickup">Подготовить и выдать</option></select></label>
              <label className="field field--wide"><span>Описание</span><textarea rows={3} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label>
              <label className="field"><span>Скидка, %</span><input type="number" min="0" max="100" value={draft.discount} onChange={(event) => setDraft({ ...draft, discount: Number(event.target.value) })} /></label>
              <label className="field"><span>Рейтинг</span><input type="number" min="0" max="5" step="0.1" value={draft.rating} onChange={(event) => setDraft({ ...draft, rating: event.target.value === '' ? '' : Number(event.target.value) })} placeholder="Не показывать" /></label>
              {isPhysical && !draft.variants.length ? <label className="field"><span>Остаток</span><input type="number" min="0" value={draft.stock} onChange={(event) => setDraft({ ...draft, stock: Number(event.target.value) })} /></label> : null}
              <div className="editor-switches field--wide">
                <label className="check-field"><input type="checkbox" checked={draft.active} onChange={(event) => setDraft({ ...draft, active: event.target.checked })} /><span>Показывать в магазине</span></label>
                <label className="check-field"><input type="checkbox" checked={draft.carousel} onChange={(event) => setDraft({ ...draft, carousel: event.target.checked })} /><span>Добавить в подборку</span></label>
              </div>
              <section className="variant-editor field--wide">
                <div className="variant-editor__heading"><div><strong>Варианты</strong><small>Размер, срок подписки или комплектация</small></div><button className="button button--small" type="button" onClick={addVariant}><PlusIcon /> Добавить</button></div>
                {draft.variants.length ? <label className="field"><span>Название выбора</span><input value={draft.variantLabel} onChange={(event) => setDraft({ ...draft, variantLabel: event.target.value })} placeholder="Например: Срок подписки" required /></label> : null}
                {draft.variants.map((variant, index) => <div className="variant-row" key={variant.id}>
                  <input value={variant.label} onChange={(event) => updateVariant(index, { label: event.target.value })} placeholder="Например: 6 месяцев" aria-label="Название варианта" />
                  <input type="number" min="0" value={variant.price} onChange={(event) => updateVariant(index, { price: Number(event.target.value) })} placeholder="Цена" aria-label="Цена варианта" />
                  {isPhysical ? <input type="number" min="0" value={variant.stock ?? 0} onChange={(event) => updateVariant(index, { stock: Number(event.target.value) })} placeholder="Остаток" aria-label="Остаток варианта" /> : null}
                  <button className="icon-button icon-button--danger" type="button" onClick={() => setDraft((current) => ({ ...current, variants: current.variants.filter((_, variantIndex) => variantIndex !== index) }))} aria-label={`Удалить вариант ${variant.label}`}><TrashIcon /></button>
                </div>)}
              </section>
            </div>

            <aside className="media-editor">
              <div className="media-editor__preview">{preview ? <img src={preview} alt="Предпросмотр товара" /> : <span>Предпросмотр изображения</span>}</div>
              <div className="media-editor__upload">
                <label className="button button--small"><PlusIcon /> Загрузить<input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" multiple onChange={(event) => void addUploadedImages(event)} /></label>
                <small>До {MAX_IMAGES} файлов, каждый до 2 МБ</small>
              </div>
              <div className="media-editor__url"><input value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="Или вставьте ссылку" /><button className="button button--small" type="button" onClick={addImageUrl}>Добавить</button></div>
              <div className="media-editor__thumbs">{draft.images.map((image, index) => <div className={index === 0 ? 'media-thumb is-primary' : 'media-thumb'} key={`${image.slice(0, 40)}-${index}`}><button type="button" onClick={() => { setSelectedImage(index); if (index > 0) makePrimary(index); }} aria-label="Сделать главным"><img src={image} alt="" /></button><button className="media-thumb__remove" type="button" onClick={() => removeImage(index)} aria-label="Удалить изображение"><XIcon /></button>{index === 0 ? <span>Главное</span> : null}</div>)}</div>
            </aside>
            {error ? <p className="form-error product-editor__error" role="alert">{error}</p> : null}
          </div>
          <footer className="modal__footer"><button className="button" type="button" onClick={close}>Отмена</button><button className="button button--primary" type="submit" disabled={busy}>{busy ? 'Сохраняем…' : 'Сохранить товар'}</button></footer>
        </form>
      </section>
    </div>
  );
}
