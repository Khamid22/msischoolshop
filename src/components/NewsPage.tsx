import { useState, useEffect } from 'react';
import { fetchNews } from '../api';
import { useLang } from '../contexts/LangContext';
import type { News } from '../types';
import './NewsPage.scss';

export default function NewsPage() {
  const { t, lang } = useLang();
  const [news, setNews] = useState<News[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<News | null>(null);

  useEffect(() => {
    fetchNews().then((data) => {
      setNews(data.filter((n) => n.active).sort((a, b) => b.date.localeCompare(a.date)));
      setLoading(false);
    });
  }, []);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const locale = lang === 'ru' ? 'ru-RU' : lang === 'uz' ? 'uz-UZ' : 'en-US';
    return d.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
  };

  return (
    <section className="news-page">
      <h2 className="news-page__title">{t('tabNews')}</h2>

      {loading ? (
        <div className="news-page__empty">{t('noNews')}</div>
      ) : news.length === 0 ? (
        <div className="news-page__empty">{t('noNews')}</div>
      ) : (
        <div className="news-page__grid">
          {news.map((item, i) => (
            <article
              key={item.id}
              className="news-card news-card--enter"
              style={{ animationDelay: `${Math.min(i * 60, 480)}ms` }}
              onClick={() => setSelected(item)}
            >
              {item.image && (
                <div className="news-card__img-wrap">
                  <img className="news-card__img" src={item.image} alt={item.title} loading="lazy" />
                </div>
              )}
              <div className="news-card__body">
                <span className="news-card__date">{formatDate(item.date)}</span>
                <h3 className="news-card__title">{item.title}</h3>
                <p className="news-card__desc">{item.description}</p>
                <span className="news-card__more">{t('readMore')} →</span>
              </div>
            </article>
          ))}
        </div>
      )}

      {selected && (
        <>
          <div className="news-modal-overlay" onClick={() => setSelected(null)} />
          <div className="news-modal">
            <button className="news-modal__close" onClick={() => setSelected(null)}>✕</button>
            {selected.image && (
              <img className="news-modal__img" src={selected.image} alt={selected.title} />
            )}
            <span className="news-modal__date">{formatDate(selected.date)}</span>
            <h2 className="news-modal__title">{selected.title}</h2>
            <p className="news-modal__desc">{selected.description}</p>
          </div>
        </>
      )}
    </section>
  );
}
