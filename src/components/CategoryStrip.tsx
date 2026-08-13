import type { ProductCollection } from '../types';
import { useLang } from '../contexts/LangContext';

interface Props {
  onSelect: (collection: ProductCollection) => void;
}

const CATEGORIES: Array<{ collection: ProductCollection; labelKey: string; image: string }> = [
  { collection: 'study', labelKey: 'categoryStudy', image: './images/canculator.jpg' },
  { collection: 'merch', labelKey: 'categoryMerch', image: './images/hoodie.svg' },
  { collection: 'digital', labelKey: 'categoryDigital', image: './images/telegram-premium.svg' },
  { collection: 'rewards', labelKey: 'categoryRewards', image: './images/telegram-gift-stars.svg' },
];

export default function CategoryStrip({ onSelect }: Props) {
  const { t } = useLang();

  return (
    <section className="shop-section" aria-labelledby="shop-categories-title">
      <div className="shop-section__head">
        <div>
          <span className="shop-section__kicker">{t('learnEarnSpend')}</span>
          <h2 className="shop-section__title" id="shop-categories-title">{t('categories')}</h2>
        </div>
      </div>
      <div className="category-strip">
        {CATEGORIES.map((category, index) => (
          <button
            key={category.collection}
            className={`category-card category-card--${category.collection}`}
            style={{ '--category-delay': `${index * 55}ms` } as React.CSSProperties}
            type="button"
            onClick={() => onSelect(category.collection)}
          >
            <span className="category-card__visual">
              <img src={category.image} alt="" />
            </span>
            <span className="category-card__label">{t(category.labelKey)}</span>
            <span className="category-card__arrow" aria-hidden="true">↗</span>
          </button>
        ))}
      </div>
    </section>
  );
}
