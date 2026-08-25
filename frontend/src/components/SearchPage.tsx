import { useEffect, useMemo, useRef, useState } from 'react';
import type { Product } from '../types';
import { useLang } from '../contexts/LangContext';
import { useAuth } from '../contexts/AuthContext';
import { formatCoins, getUnitPrice } from '../utils/currency';
import Coin from './Coin';
import { ArrowLeftIcon, SearchIcon, XIcon } from './icons';
import './SearchPage.scss';

const HISTORY_KEY = 'msi_recent_searches';
const MAX_HISTORY = 8;

interface Props {
  products: Product[];
  onBack: () => void;
  onOpenProduct: (product: Product) => void;
}

function getHistory(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    return Array.isArray(raw) ? raw.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function saveHistory(list: string[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, MAX_HISTORY)));
}

export default function SearchPage({ products, onBack, onOpenProduct }: Props) {
  const { t } = useLang();
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [history, setHistory] = useState<string[]>(getHistory);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return products.filter((p) => {
      const name = (t(p.nameKey) || p.name || '').toLowerCase();
      const desc = (t(p.descKey) || p.description || '').toLowerCase();
      return name.includes(q) || desc.includes(q);
    });
  }, [query, products, t]);

  const commit = (q: string) => {
    const value = q.trim();
    if (!value) return;
    setHistory((prev) => {
      const next = [value, ...prev.filter((x) => x.toLowerCase() !== value.toLowerCase())];
      saveHistory(next);
      return next;
    });
  };

  const clearHistory = () => {
    setHistory([]);
    saveHistory([]);
  };

  return (
    <div className="search-page">
      <div className="search-page__bar">
        <button className="search-page__back" onClick={onBack} aria-label={t('close')}>
          <ArrowLeftIcon />
        </button>
        <div className="search-page__field">
          <SearchIcon className="search-page__field-icon" />
          <input
            ref={inputRef}
            className="search-page__input"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit(query);
            }}
            placeholder={t('searchPlaceholder')}
          />
          {query && (
            <button className="search-page__clear" onClick={() => setQuery('')} aria-label={t('clearFilters')}>
              <XIcon />
            </button>
          )}
        </div>
      </div>

      {!query.trim() ? (
        <>
          <div className="search-page__recent">
            <div className="search-page__recent-head">
              <span className="search-page__recent-title">{t('recentSearches')}</span>
              {history.length > 0 && (
                <button className="search-page__recent-clear" onClick={clearHistory}>{t('clearHistory')}</button>
              )}
            </div>
            <div className="search-page__recent-list">
              {history.length === 0 ? (
                ['calculator', 'hoodie', 'Telegram Premium'].map((item) => (
                  <button key={item} className="chip" onClick={() => setQuery(item)}>{item}</button>
                ))
              ) : history.map((item) => (
                <button key={item} className="chip" onClick={() => { setQuery(item); commit(item); }}>{item}</button>
              ))}
            </div>
          </div>
          <div className="search-page__popular">
            <span className="search-page__recent-title">{t('popularThisWeek')}</span>
            <div className="search-page__list">
              {products.slice(0, 4).map((product) => (
                <button className="search-result" type="button" key={product.id} onClick={() => onOpenProduct(product)}>
                  <span className="search-result__image"><img src={product.image} alt="" /></span>
                  <span className="search-result__copy">
                    <strong>{t(product.nameKey) || product.name}</strong>
                    <small>★ {product.rating ?? '4.8'} · {product.type === 'digital' ? t('filterDigital') : t('filterPhysical')}</small>
                  </span>
                  <strong className="search-result__price">{formatCoins(getUnitPrice(product, user))} <Coin /></strong>
                </button>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="search-page__results">
          <div className="search-page__results-head"><strong>{t('searchResults')}</strong><span>{results.length}</span></div>
          <div className="search-page__list">
            {results.map((product) => (
              <button className="search-result" type="button" key={product.id} onClick={() => { commit(query); onOpenProduct(product); }}>
                <span className="search-result__image"><img src={product.image} alt="" /></span>
                <span className="search-result__copy">
                  <strong>{t(product.nameKey) || product.name}</strong>
                  <small>★ {product.rating ?? '4.8'} · {product.type === 'digital' ? t('filterDigital') : t('filterPhysical')}</small>
                </span>
                <strong className="search-result__price">{formatCoins(getUnitPrice(product, user))} <Coin /></strong>
              </button>
            ))}
          </div>
          {results.length === 0 && (
            <div className="search-page__empty">{t('noProducts')}</div>
          )}
        </div>
      )}
    </div>
  );
}
