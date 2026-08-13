import type { Product } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useLang } from '../contexts/LangContext';
import { formatCoins, getUnitPrice } from '../utils/currency';
import Coin from './Coin';

interface Props {
  products: Product[];
  onOpen: (product: Product) => void;
  onViewAll: () => void;
}

const SHOWCASE_IDS = ['calc-2in1', 'tg-premium-6m', 'msi-hoodie', 'la2-bundle'];

export default function RewardsShowcase({ products, onOpen, onViewAll }: Props) {
  const { user } = useAuth();
  const { t } = useLang();
  const showcase = SHOWCASE_IDS
    .map((id) => products.find((product) => product.id === id))
    .filter((product): product is Product => Boolean(product));

  if (showcase.length === 0) return null;

  return (
    <section className="shop-section rewards-showcase" aria-labelledby="rewards-showcase-title">
      <div className="shop-section__head">
        <div>
          <span className="shop-section__kicker">{t('rewardsSubtitle')}</span>
          <h2 className="shop-section__title" id="rewards-showcase-title">{t('rewardsTitle')}</h2>
        </div>
        <button className="shop-section__link" type="button" onClick={onViewAll}>
          {t('viewCatalog')} <span aria-hidden="true">→</span>
        </button>
      </div>

      <div className="reward-rail">
        {showcase.map((product, index) => {
          const displayName = t(product.nameKey) || product.name;
          return (
            <button
              key={product.id}
              className="reward-tile"
              style={{ '--reward-delay': `${index * 70}ms` } as React.CSSProperties}
              type="button"
              onClick={() => onOpen(product)}
            >
              <span className="reward-tile__index">0{index + 1}</span>
              <span className="reward-tile__image-wrap">
                <img className="reward-tile__image" src={product.image} alt="" />
              </span>
              <span className="reward-tile__name">{displayName}</span>
              <span className="reward-tile__price">
                {formatCoins(getUnitPrice(product, user))} <Coin />
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
