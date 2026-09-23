import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { createBanner, createCategory, createNews, updateBanner, updateCategory, updateNews } from '../api';
import { PlusIcon, XIcon } from '../components/icons';
import type { Banner, CatalogCategory, News, Product } from '../types';
import { AdminDialog } from './AdminDialog';
import { prepareProductImages } from './productImages';
type ContentKind = 'banner' | 'news';

interface CategoryModalProps {
  category?: CatalogCategory;
  close: () => void;
  saved: () => Promise<void>;
}

export function CategoryModal({ category, close, saved }: CategoryModalProps) {
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
      close();
      await saved().catch(() => {});
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Не удалось сохранить категорию.');
    } finally {
      setBusy(false);
    }
  };
  return <AdminDialog titleId="category-modal-title" close={close} busy={busy} className="modal--small"><header className="modal__header"><div><h2 id="category-modal-title">{category ? 'Изменить категорию' : 'Новая категория'}</h2><p>Название сразу появится в каталоге магазина.</p></div><button className="icon-button" type="button" disabled={busy} onClick={close} aria-label="Закрыть"><XIcon /></button></header><form onSubmit={submit}><div className="modal__body form-grid">{!category ? <label className="field field--wide"><span>Код категории</span><input name="id" pattern="[a-z0-9][a-z0-9-]*" placeholder="Например: books" /><small>Латинские буквы, цифры и дефис</small></label> : null}<label className="field field--wide"><span>Название на русском</span><input name="nameRu" defaultValue={category?.nameRu} required /></label><label className="field"><span>На узбекском</span><input name="nameUz" defaultValue={category?.nameUz} required /></label><label className="field"><span>На английском</span><input name="nameEn" defaultValue={category?.nameEn} required /></label><label className="check-field field--wide"><input name="active" type="checkbox" defaultChecked={category?.active !== false} /><span>Показывать в каталоге</span></label>{error ? <p className="form-error field--wide" role="alert">{error}</p> : null}</div><footer className="modal__footer"><button className="button" type="button" disabled={busy} onClick={close}>Отмена</button><button className="button button--primary" type="submit" disabled={busy}>{busy ? 'Сохраняем…' : 'Сохранить'}</button></footer></form></AdminDialog>;
}

interface ContentModalProps {
  kind: ContentKind;
  products: Product[];
  item?: Banner | News;
  close: () => void;
  saved: () => Promise<void>;
}

async function readSingleImage(event: ChangeEvent<HTMLInputElement>): Promise<string> {
  const file = event.target.files?.[0];
  if (!file) return '';
  return (await prepareProductImages([file], 1))[0];
}

export function ContentModal({ kind, products, item, close, saved }: ContentModalProps) {
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
          productIds: form.getAll('productIds').map(String),
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
      close();
      await saved().catch(() => {});
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Не удалось сохранить.');
    } finally {
      setBusy(false);
    }
  };
  return <AdminDialog titleId="content-modal-title" close={close} busy={busy}><header className="modal__header"><div><h2 id="content-modal-title">{item ? 'Изменить' : 'Добавить'} {kind === 'banner' ? 'баннер' : 'новость'}</h2><p>{kind === 'banner' ? 'Баннер ведёт к выбранным товарам.' : 'Новость появится в разделе магазина.'}</p></div><button className="icon-button" type="button" disabled={busy} onClick={close} aria-label="Закрыть"><XIcon /></button></header><form onSubmit={submit}><div className="modal__body content-editor"><div className="form-grid"><label className="field field--wide"><span>Заголовок</span><input name="title" defaultValue={item?.title} required /></label>{kind === 'banner' ? <label className="field field--wide"><span>Подзаголовок</span><input name="subtitle" defaultValue={banner?.subtitle} /></label> : null}<label className="field field--wide"><span>Описание</span><textarea name="description" rows={3} defaultValue={item?.description} required /></label>{kind === 'banner' ? <><label className="field"><span>Акцент</span><input name="accent" type="color" defaultValue={banner?.accent || '#243474'} /></label><label className="field"><span>Иконка</span><input name="icon" defaultValue={banner?.icon} placeholder="Например: 💎" /></label><label className="field field--wide"><span>Связанные товары</span><select multiple name="productIds" defaultValue={banner?.productIds || []}>{products.map((product) => <option value={product.id} key={product.id}>{product.name || product.nameKey}</option>)}</select></label></> : <label className="field field--wide"><span>Дата</span><input name="date" type="date" defaultValue={news?.date?.slice(0, 10) || new Date().toISOString().slice(0, 10)} /></label>}<label className="check-field field--wide"><input name="active" type="checkbox" defaultChecked={item?.active !== false} /><span>Опубликовано</span></label></div><aside className="content-editor__media"><div>{image ? <img src={image} alt="Предпросмотр" /> : <span>Предпросмотр</span>}</div><label className="button button--small"><PlusIcon /> Загрузить изображение<input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={(event) => { void readSingleImage(event).then(setImage).catch((uploadError) => setError(uploadError.message)); }} /></label><label className="field"><span>Или ссылка</span><input value={image.startsWith('data:') ? '' : image} onChange={(event) => setImage(event.target.value)} placeholder="https://…" /></label></aside>{error ? <p className="form-error content-editor__error" role="alert">{error}</p> : null}</div><footer className="modal__footer"><button className="button" type="button" disabled={busy} onClick={close}>Отмена</button><button className="button button--primary" type="submit" disabled={busy}>{busy ? 'Сохраняем…' : 'Сохранить'}</button></footer></form></AdminDialog>;
}
