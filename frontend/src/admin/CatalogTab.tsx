import { useMemo, useState } from 'react';
import { deleteBanner, deleteNews, deleteProduct, updateBanner, updateCategory, updateNews } from '../api';
import { PlusIcon, SearchIcon, TrashIcon } from '../components/icons';
import type { AdminBootstrap, Banner, CatalogCategory, News, Product } from '../types';
import { formatCoins, getBasePrice, getProductPrice } from '../utils/currency';
import { CategoryModal, ContentModal } from './ContentEditors';
import { ProductEditorModal } from './ProductEditorModal';
import { productTitle } from './presentation';

type Section = 'products' | 'categories' | 'banners' | 'news';
interface Props { data: AdminBootstrap; refresh: () => Promise<void>; section: Section }

export function CatalogTab({ data, refresh, section: initialSection }: Props) {
  const [section, setSection] = useState(initialSection);
  const [search, setSearch] = useState('');
  const [type, setType] = useState('all');
  const [min, setMin] = useState('');
  const [max, setMax] = useState('');
  const [special, setSpecial] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | 'new' | null>(null);
  const [editingCategory, setEditingCategory] = useState<CatalogCategory | 'new' | null>(null);
  const [editingContent, setEditingContent] = useState<{ kind: 'banner' | 'news'; item?: Banner | News } | null>(null);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const categories = useMemo(() => new Map(data.categories.map((item) => [item.id, item.nameRu])), [data.categories]);
  const filtered = data.products.filter((product) => {
    const price = getProductPrice(product);
    return `${productTitle(product)} ${categories.get(product.categoryId || '') || ''}`.toLowerCase().includes(search.toLowerCase())
      && (type === 'all' || product.type === type) && (!min || price >= Number(min)) && (!max || price <= Number(max))
      && (special === 'hidden' ? product.active === false : product.active !== false)
      && (special === 'all' || special === 'hidden' || (special === 'discount' && (product.discount || 0) > 0));
  });
  async function mutate(id: string, action: () => Promise<unknown>) {
    if (busyId) return;
    setBusyId(id); setError('');
    try { await action(); await refresh(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Не удалось сохранить изменения.'); }
    finally { setBusyId(''); }
  }
  function remove(id: string, title: string, action: () => Promise<unknown>) {
    if (window.confirm(`Удалить «${title}»? Товар или публикация исчезнет из магазина. История покупок сохранится.`)) void mutate(id, action);
  }
  function add() {
    if (section === 'products') setEditingProduct('new');
    else if (section === 'categories') setEditingCategory('new');
    else setEditingContent({ kind: section === 'banners' ? 'banner' : 'news' });
  }
  const buttonLabel = { products: 'Добавить товар', categories: 'Добавить категорию', banners: 'Добавить баннер', news: 'Добавить новость' }[section];
  return <div className="page-stack">
    <div className="section-actions">{initialSection === 'products' ? <div className="segmented" aria-label="Каталог"><button type="button" className={section === 'products' ? 'is-active' : ''} aria-pressed={section === 'products'} onClick={() => setSection('products')}>Товары</button><button type="button" className={section === 'categories' ? 'is-active' : ''} aria-pressed={section === 'categories'} onClick={() => setSection('categories')}>Категории</button></div> : <span className="muted">{section === 'banners' ? `${data.banners.length} баннеров` : `${data.news.length} публикаций`}</span>}<button type="button" className="button button--primary" onClick={add}><PlusIcon />{buttonLabel}</button></div>
    {error ? <p className="inline-error" role="alert">{error}</p> : null}
    {section === 'products' ? <>
      <div className={`panel catalog-filters ${showFilters ? "filters-open" : ""}`}><label className="filter-field filter-field--search"><span>Поиск по названию</span><div className="search-field"><SearchIcon /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Например: Hoodie, Premium…" /></div></label><button type="button" className="button mobile-filter-toggle" aria-expanded={showFilters} onClick={() => setShowFilters(!showFilters)}>Фильтры {showFilters ? "−" : "+"}</button><label className="filter-field"><span>Тип</span><select value={type} onChange={(event) => setType(event.target.value)}><option value="all">Все типы</option><option value="digital">Digital</option><option value="physical">Physical</option></select></label><label className="filter-field"><span>Мин. цена</span><input type="number" min="0" value={min} onChange={(event) => setMin(event.target.value)} placeholder="0" /></label><label className="filter-field"><span>Макс. цена</span><input type="number" min="0" value={max} onChange={(event) => setMax(event.target.value)} placeholder="Любая" /></label></div>
      <div className="filter-chips" aria-label="Подборки">{[['all', 'Все товары'], ['discount', 'Со скидкой'], ['hidden', 'Скрытые']].map(([value, label]) => <button type="button" key={value} className={special === value ? 'is-active' : ''} aria-pressed={special === value} onClick={() => setSpecial(value)}>{label}</button>)}</div>
      <section className="panel"><div className="table-scroll"><table className="responsive-table products-table"><thead><tr><th>Товар</th><th>Тип</th><th className="numeric">Цена</th><th>Скидка</th><th>Действия</th></tr></thead><tbody>{filtered.map((product) => <tr key={product.id}>
        <td className="product-name"><div className="product-cell">{product.image ? <img src={product.image} alt="" /> : <span className="product-placeholder" />}<div><strong>{productTitle(product)}</strong><small>{product.variants?.length ? `Вариантов: ${product.variants.length}` : product.type === 'physical' ? `На складе: ${product.stock ?? '∞'} шт.` : 'Цифровой товар'}{product.active === false ? ' · Скрыт' : ''}</small></div></div></td>
        <td data-label="Тип"><span className={`type-badge type-badge--${product.type}`}>{product.type === 'physical' ? 'Physical' : 'Digital'}</span></td>
        <td data-label="Цена" className="numeric">{(product.discount || 0) > 0 ? <del className="muted">Ⓒ {formatCoins(getBasePrice(product))} </del> : null}<strong>{(product.variants?.length || 0) > 1 ? "от " : ""}Ⓒ {formatCoins(getProductPrice(product))}</strong></td>
        <td data-label="Скидка">{product.discount ? `−${product.discount}%` : '—'}</td>
        <td className="actions-cell"><div className="row-actions"><button className="button button--small" type="button" onClick={() => setEditingProduct(product)}>Редактировать</button><button className="icon-button icon-button--danger" aria-label={`Удалить ${productTitle(product)}`} disabled={Boolean(busyId)} onClick={() => remove(product.id, productTitle(product), () => deleteProduct(product.id))}><TrashIcon /></button></div></td>
      </tr>)}</tbody></table></div>{!filtered.length ? <div className="empty-row">Товары не найдены</div> : null}<footer className="table-footer">Показано {filtered.length} из {data.products.length} товаров</footer></section>
    </> : null}
    {section === 'categories' ? <section className="panel"><div className="table-scroll"><table className="responsive-table"><thead><tr><th>Категория</th><th>Товаров</th><th>Статус</th><th>Действия</th></tr></thead><tbody>{data.categories.map((category) => <tr key={category.id}><td data-label="Категория"><strong>{category.nameRu}</strong><small className="cell-subline">{category.nameUz} · {category.nameEn}</small></td><td data-label="Товаров">{data.products.filter((product) => product.categoryId === category.id).length}</td><td data-label="Статус"><button className="status-toggle" disabled={Boolean(busyId)} onClick={() => void mutate(category.id, () => updateCategory(category.id, { active: !category.active }))}>{category.active ? 'Активна' : 'Скрыта'}</button></td><td className="actions-cell"><button className="button button--small" onClick={() => setEditingCategory(category)}>Редактировать</button></td></tr>)}</tbody></table></div>{!data.categories.length ? <div className="empty-row">Категорий пока нет</div> : null}</section> : null}
    {section === 'banners' || section === 'news' ? <section className="panel"><div className="table-scroll"><table className="responsive-table content-table"><thead><tr><th>{section === 'banners' ? 'Баннер' : 'Новость'}</th><th>{section === 'banners' ? 'Связанные товары' : 'Дата'}</th><th>Статус</th><th>Действия</th></tr></thead><tbody>{(section === 'banners' ? data.banners : data.news).map((item) => <tr key={item.id}><td><div className="product-cell">{item.image ? <img src={item.image} alt="" /> : <span className="product-placeholder" />}<div><strong>{item.title}</strong><small>{item.description}</small></div></div></td><td data-label={section === 'banners' ? 'Связанные товары' : 'Дата'}>{section === 'banners' ? (item as Banner).productIds?.length || 0 : (item as News).date.slice(0, 10)}</td><td data-label="Статус"><button className="status-toggle" disabled={Boolean(busyId)} onClick={() => void mutate(item.id, () => section === 'banners' ? updateBanner(item.id, { active: !item.active }) : updateNews(item.id, { active: !item.active }))}>{item.active ? 'Опубликовано' : 'Скрыто'}</button></td><td className="actions-cell"><div className="row-actions"><button className="button button--small" onClick={() => setEditingContent({ kind: section === 'banners' ? 'banner' : 'news', item })}>Редактировать</button><button className="icon-button icon-button--danger" aria-label={`Удалить ${item.title}`} disabled={Boolean(busyId)} onClick={() => remove(item.id, item.title, () => section === 'banners' ? deleteBanner(item.id) : deleteNews(item.id))}><TrashIcon /></button></div></td></tr>)}</tbody></table></div>{!(section === 'banners' ? data.banners : data.news).length ? <div className="empty-row">{section === 'banners' ? 'Баннеров пока нет' : 'Новостей пока нет'}</div> : null}</section> : null}
    {editingProduct ? <ProductEditorModal categories={data.categories} product={editingProduct === 'new' ? undefined : editingProduct} close={() => setEditingProduct(null)} saved={refresh} /> : null}
    {editingCategory ? <CategoryModal category={editingCategory === 'new' ? undefined : editingCategory} close={() => setEditingCategory(null)} saved={refresh} /> : null}
    {editingContent ? <ContentModal products={data.products} kind={editingContent.kind} item={editingContent.item} close={() => setEditingContent(null)} saved={refresh} /> : null}
  </div>;
}
