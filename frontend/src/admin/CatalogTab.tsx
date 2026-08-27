import { useMemo, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';

import {
  createBanner,
  createCategory,
  createNews,
  updateBanner,
  updateCategory,
  updateNews,
  updateProduct,
} from '../api';
import { PlusIcon, SearchIcon, XIcon } from '../components/icons';
import type {
  AdminBootstrap,
  Banner,
  CatalogCategory,
  FulfillmentType,
  News,
  Product,
} from '../types';
import { ProductEditorModal } from './ProductEditorModal';

type CatalogSection = 'products' | 'categories' | 'banners' | 'news';
type ContentKind = 'banner' | 'news';

const SECTION_LABELS: Record<CatalogSection, string> = {
  products: 'Товары',
  categories: 'Категории',
  banners: 'Баннеры',
  news: 'Новости',
};
const FULFILLMENT_LABELS: Record<FulfillmentType, string> = {
  physical_pickup: 'Выдать',
  digital_activation: 'Подключить',
  digital_delivery: 'Отправить',
};

const formatCoins = (value: number) => new Intl.NumberFormat('ru-RU').format(value);
const productTitle = (product: Product) => product.name || product.nameKey || 'Товар';
const fulfillmentOf = (product: Product): FulfillmentType => product.fulfillmentType
  || (product.type === 'physical' ? 'physical_pickup' : 'digital_activation');

interface Props {
  data: AdminBootstrap;
  refresh: () => Promise<void>;
}

interface CategoryModalProps {
  category?: CatalogCategory;
  close: () => void;
  saved: () => void;
}

function CategoryModal({ category, close, saved }: CategoryModalProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = {
      nameRu: String(form.get('nameRu') || '').trim(),
      nameUz: String(form.get('nameUz') || '').trim(),
      nameEn: String(form.get('nameEn') || '').trim(),
      active: form.get('active') === 'on',
    };
    setBusy(true);
    setError('');
    try {
      if (category) await updateCategory(category.id, payload);
      else await createCategory({
        ...payload,
        id: String(form.get('id') || '').trim() || undefined,
      });
      saved();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Не удалось сохранить категорию.');
    } finally {
      setBusy(false);
    }
  };
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && close()}><section className="modal modal--small" role="dialog" aria-modal="true" aria-labelledby="category-modal-title"><header className="modal__header"><div><h2 id="category-modal-title">{category ? 'Изменить категорию' : 'Новая категория'}</h2><p>Название сразу появится в каталоге магазина.</p></div><button className="icon-button" type="button" onClick={close} aria-label="Закрыть"><XIcon /></button></header><form onSubmit={submit}><div className="modal__body form-grid">{!category ? <label className="field field--wide"><span>Код категории</span><input name="id" pattern="[a-z0-9][a-z0-9-]*" placeholder="Например: books" /><small>Латинские буквы, цифры и дефис</small></label> : null}<label className="field field--wide"><span>Название на русском</span><input name="nameRu" defaultValue={category?.nameRu} required /></label><label className="field"><span>На узбекском</span><input name="nameUz" defaultValue={category?.nameUz} required /></label><label className="field"><span>На английском</span><input name="nameEn" defaultValue={category?.nameEn} required /></label><label className="check-field field--wide"><input name="active" type="checkbox" defaultChecked={category?.active !== false} /><span>Показывать в каталоге</span></label>{error ? <p className="form-error field--wide" role="alert">{error}</p> : null}</div><footer className="modal__footer"><button className="button" type="button" onClick={close}>Отмена</button><button className="button button--primary" type="submit" disabled={busy}>{busy ? 'Сохраняем…' : 'Сохранить'}</button></footer></form></section></div>;
}

interface ContentModalProps {
  kind: ContentKind;
  item?: Banner | News;
  close: () => void;
  saved: () => void;
}

async function readSingleImage(event: ChangeEvent<HTMLInputElement>): Promise<string> {
  const file = event.target.files?.[0];
  if (!file) return '';
  if (file.size > 2_000_000) throw new Error('Изображение должно быть меньше 2 МБ.');
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Не удалось прочитать изображение.'));
    reader.readAsDataURL(file);
  });
}

function ContentModal({ kind, item, close, saved }: ContentModalProps) {
  const banner = kind === 'banner' ? item as Banner | undefined : undefined;
  const news = kind === 'news' ? item as News | undefined : undefined;
  const [image, setImage] = useState(item?.image || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError('');
    try {
      if (kind === 'banner') {
        const payload: Omit<Banner, 'id'> = {
          title: String(form.get('title') || '').trim(),
          subtitle: String(form.get('subtitle') || '').trim(),
          description: String(form.get('description') || '').trim(),
          image,
          accent: String(form.get('accent') || '#243474'),
          icon: String(form.get('icon') || '').trim(),
          active: form.get('active') === 'on',
          productIds: String(form.get('productIds') || '').split(',').map((value) => value.trim()).filter(Boolean),
        };
        if (banner) await updateBanner(banner.id, payload);
        else await createBanner(payload);
      } else {
        const payload: Omit<News, 'id'> = {
          title: String(form.get('title') || '').trim(),
          description: String(form.get('description') || '').trim(),
          image: image || undefined,
          date: String(form.get('date') || new Date().toISOString()),
          active: form.get('active') === 'on',
        };
        if (news) await updateNews(news.id, payload);
        else await createNews(payload);
      }
      saved();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Не удалось сохранить.');
    } finally {
      setBusy(false);
    }
  };
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && close()}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="content-modal-title"><header className="modal__header"><div><h2 id="content-modal-title">{item ? 'Изменить' : 'Добавить'} {kind === 'banner' ? 'баннер' : 'новость'}</h2><p>{kind === 'banner' ? 'Баннер ведёт к выбранным товарам.' : 'Новость появится в разделе магазина.'}</p></div><button className="icon-button" type="button" onClick={close} aria-label="Закрыть"><XIcon /></button></header><form onSubmit={submit}><div className="modal__body content-editor"><div className="form-grid"><label className="field field--wide"><span>Заголовок</span><input name="title" defaultValue={item?.title} required /></label>{kind === 'banner' ? <label className="field field--wide"><span>Подзаголовок</span><input name="subtitle" defaultValue={banner?.subtitle} /></label> : null}<label className="field field--wide"><span>Описание</span><textarea name="description" rows={3} defaultValue={item?.description} required /></label>{kind === 'banner' ? <><label className="field"><span>Акцент</span><input name="accent" type="color" defaultValue={banner?.accent || '#243474'} /></label><label className="field"><span>Иконка</span><input name="icon" defaultValue={banner?.icon} placeholder="Например: 💎" /></label><label className="field field--wide"><span>ID товаров через запятую</span><input name="productIds" defaultValue={banner?.productIds?.join(', ')} placeholder="tg-premium-6m, tg-premium-12m" /></label></> : <label className="field field--wide"><span>Дата</span><input name="date" type="date" defaultValue={news?.date?.slice(0, 10) || new Date().toISOString().slice(0, 10)} /></label>}<label className="check-field field--wide"><input name="active" type="checkbox" defaultChecked={item?.active !== false} /><span>Опубликовано</span></label></div><aside className="content-editor__media"><div>{image ? <img src={image} alt="Предпросмотр" /> : <span>Предпросмотр</span>}</div><label className="button button--small"><PlusIcon /> Загрузить изображение<input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={(event) => { void readSingleImage(event).then(setImage).catch((uploadError) => setError(uploadError.message)); }} /></label><label className="field"><span>Или ссылка</span><input value={image.startsWith('data:') ? '' : image} onChange={(event) => setImage(event.target.value)} placeholder="https://…" /></label></aside>{error ? <p className="form-error content-editor__error" role="alert">{error}</p> : null}</div><footer className="modal__footer"><button className="button" type="button" onClick={close}>Отмена</button><button className="button button--primary" type="submit" disabled={busy}>{busy ? 'Сохраняем…' : 'Сохранить'}</button></footer></form></section></div>;
}

export function CatalogTab({ data, refresh }: Props) {
  const [section, setSection] = useState<CatalogSection>('products');
  const [search, setSearch] = useState('');
  const [editingProduct, setEditingProduct] = useState<Product | 'new' | null>(null);
  const [editingCategory, setEditingCategory] = useState<CatalogCategory | 'new' | null>(null);
  const [editingContent, setEditingContent] = useState<{ kind: ContentKind; item?: Banner | News } | null>(null);
  const [busyId, setBusyId] = useState('');
  const categoriesById = useMemo(() => new Map(data.categories.map((category) => [category.id, category.nameRu])), [data.categories]);
  const filteredProducts = data.products.filter((product) => `${productTitle(product)} ${product.description || ''} ${categoriesById.get(product.categoryId || '') || ''}`.toLowerCase().includes(search.toLowerCase()));

  const toggleProduct = async (product: Product) => {
    setBusyId(product.id);
    try { await updateProduct(product.id, { active: product.active === false }); await refresh(); }
    finally { setBusyId(''); }
  };
  const toggleCategory = async (category: CatalogCategory) => {
    setBusyId(category.id);
    try { await updateCategory(category.id, { active: !category.active }); await refresh(); }
    finally { setBusyId(''); }
  };
  const toggleBanner = async (banner: Banner) => {
    setBusyId(banner.id);
    try { await updateBanner(banner.id, { active: !banner.active }); await refresh(); }
    finally { setBusyId(''); }
  };
  const toggleNews = async (news: News) => {
    setBusyId(news.id);
    try { await updateNews(news.id, { active: !news.active }); await refresh(); }
    finally { setBusyId(''); }
  };

  const primaryAction = () => {
    if (section === 'products') setEditingProduct('new');
    if (section === 'categories') setEditingCategory('new');
    if (section === 'banners') setEditingContent({ kind: 'banner' });
    if (section === 'news') setEditingContent({ kind: 'news' });
  };

  return <div className="page-stack"><header className="section-heading"><div><h1>Каталог магазина</h1><p>Товары, категории и публикации в одном месте.</p></div><button className="button button--primary" type="button" onClick={primaryAction}><PlusIcon /> {section === 'products' ? 'Новый товар' : section === 'categories' ? 'Новая категория' : section === 'banners' ? 'Новый баннер' : 'Новая новость'}</button></header><nav className="catalog-tabs" aria-label="Разделы каталога">{(Object.keys(SECTION_LABELS) as CatalogSection[]).map((item) => <button key={item} className={section === item ? 'is-active' : ''} type="button" onClick={() => setSection(item)}>{SECTION_LABELS[item]}<span>{item === 'products' ? data.products.length : item === 'categories' ? data.categories.length : item === 'banners' ? data.banners.length : data.news.length}</span></button>)}</nav>
    {section === 'products' ? <section className="panel"><div className="table-toolbar"><label className="search-field"><SearchIcon /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Название или категория" /></label><span>{filteredProducts.length} товаров</span></div><div className="table-scroll"><table><thead><tr><th>Товар</th><th>Категория</th><th>Цена</th><th>После покупки</th><th>Варианты / остаток</th><th>Статус</th><th /></tr></thead><tbody>{filteredProducts.map((product) => <tr key={product.id}><td><div className="product-cell"><img src={product.image} alt="" /><div><strong>{productTitle(product)}</strong><small>{product.description || 'Без описания'}</small></div></div></td><td>{categoriesById.get(product.categoryId || '') || 'Без категории'}</td><td><strong>{formatCoins(product.price)}</strong> <small>коинов</small></td><td><span className={`type-badge type-badge--${fulfillmentOf(product)}`}>{FULFILLMENT_LABELS[fulfillmentOf(product)]}</span></td><td>{product.variants?.length ? `${product.variants.length} вариантов` : fulfillmentOf(product) === 'physical_pickup' ? `${product.stock ?? 0} шт.` : '—'}</td><td><button className={`status-toggle ${product.active === false ? '' : 'is-active'}`} type="button" disabled={busyId === product.id} onClick={() => void toggleProduct(product)}>{product.active === false ? 'Скрыт' : 'Активен'}</button></td><td><button className="button button--small" type="button" onClick={() => setEditingProduct(product)}>Изменить</button></td></tr>)}{!filteredProducts.length ? <tr><td colSpan={7}><div className="empty-row">Товары не найдены</div></td></tr> : null}</tbody></table></div></section> : null}
    {section === 'categories' ? <section className="panel"><div className="panel__heading"><div><h2>Категории витрины</h2><p>Порядок совпадает с навигацией в магазине.</p></div></div><div className="table-scroll"><table><thead><tr><th>Категория</th><th>Код</th><th>Товаров</th><th>Статус</th><th /></tr></thead><tbody>{data.categories.map((category) => <tr key={category.id}><td><strong>{category.nameRu}</strong><small className="cell-subline">{category.nameUz} · {category.nameEn}</small></td><td>{category.id}</td><td>{data.products.filter((product) => product.categoryId === category.id).length}</td><td><button className={`status-toggle ${category.active ? 'is-active' : ''}`} type="button" disabled={busyId === category.id} onClick={() => void toggleCategory(category)}>{category.active ? 'Активна' : 'Скрыта'}</button></td><td><button className="button button--small" type="button" onClick={() => setEditingCategory(category)}>Изменить</button></td></tr>)}</tbody></table></div></section> : null}
    {section === 'banners' ? <section className="panel"><div className="panel__heading"><div><h2>Баннеры на главной</h2><p>Изображение, текст и связанные товары.</p></div></div><div className="table-scroll"><table><thead><tr><th>Баннер</th><th>Связанные товары</th><th>Статус</th><th /></tr></thead><tbody>{data.banners.map((banner) => <tr key={banner.id}><td><div className="product-cell"><img src={banner.image} alt="" /><div><strong>{banner.title}</strong><small>{banner.subtitle || banner.description}</small></div></div></td><td>{banner.productIds?.length || 0}</td><td><button className={`status-toggle ${banner.active ? 'is-active' : ''}`} type="button" disabled={busyId === banner.id} onClick={() => void toggleBanner(banner)}>{banner.active ? 'Опубликован' : 'Скрыт'}</button></td><td><button className="button button--small" type="button" onClick={() => setEditingContent({ kind: 'banner', item: banner })}>Изменить</button></td></tr>)}</tbody></table></div></section> : null}
    {section === 'news' ? <section className="panel"><div className="panel__heading"><div><h2>Новости магазина</h2><p>Публикации для учеников.</p></div></div><div className="table-scroll"><table><thead><tr><th>Новость</th><th>Дата</th><th>Статус</th><th /></tr></thead><tbody>{data.news.map((news) => <tr key={news.id}><td><div className="product-cell">{news.image ? <img src={news.image} alt="" /> : <span className="product-placeholder" />}<div><strong>{news.title}</strong><small>{news.description}</small></div></div></td><td>{news.date.slice(0, 10)}</td><td><button className={`status-toggle ${news.active ? 'is-active' : ''}`} type="button" disabled={busyId === news.id} onClick={() => void toggleNews(news)}>{news.active ? 'Опубликована' : 'Скрыта'}</button></td><td><button className="button button--small" type="button" onClick={() => setEditingContent({ kind: 'news', item: news })}>Изменить</button></td></tr>)}</tbody></table></div></section> : null}
    {editingProduct ? <ProductEditorModal categories={data.categories} product={editingProduct === 'new' ? undefined : editingProduct} close={() => setEditingProduct(null)} saved={() => { setEditingProduct(null); void refresh(); }} /> : null}
    {editingCategory ? <CategoryModal category={editingCategory === 'new' ? undefined : editingCategory} close={() => setEditingCategory(null)} saved={() => { setEditingCategory(null); void refresh(); }} /> : null}
    {editingContent ? <ContentModal kind={editingContent.kind} item={editingContent.item} close={() => setEditingContent(null)} saved={() => { setEditingContent(null); void refresh(); }} /> : null}
  </div>;
}
