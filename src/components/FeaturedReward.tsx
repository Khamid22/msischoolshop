import type { Product } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useLang } from '../contexts/LangContext';
import { formatCoins, getProductPrice, getUnitPrice } from '../utils/currency';
import Coin from './Coin';

interface Props {
  product: Product;
  onOpen: (product: Product) => void;
}

export default function FeaturedReward({ product, onOpen }: Props) {
  const { user } = useAuth();
  const { t } = useLang();
  const price = getProductPrice(product);
  const studentPrice = getUnitPrice(product, user);
  const displayName = t(product.nameKey) || product.name;

  return (
    <section className="featured-reward" aria-labelledby="featured-reward-title">
      <div className="featured-reward__glow" aria-hidden="true" />
      <div className="featured-reward__copy">
        <span className="featured-reward__eyebrow">{t('heroEyebrow')}</span>
        <h2 className="featured-reward__headline" id="featured-reward-title">
          {t('heroTitle')}
        </h2>
        <p className="featured-reward__body">{t('heroBody')}</p>
        <div className="featured-reward__meta">
          <span className="featured-reward__price">
            {formatCoins(studentPrice)} <Coin />
          </span>
          {studentPrice < price ? (
            <span className="featured-reward__saving">−{user?.discount}% {t('studentDiscount')}</span>
          ) : null}
        </div>
        <button className="btn btn-primary featured-reward__cta" type="button" onClick={() => onOpen(product)}>
          {t('explore')} <span aria-hidden="true">→</span>
        </button>
      </div>

      <button
        className="featured-reward__visual"
        type="button"
        onClick={() => onOpen(product)}
        aria-label={`${t('explore')}: ${displayName}`}
      >
        <span className="featured-reward__orbit featured-reward__orbit--one" aria-hidden="true" />
        <span className="featured-reward__orbit featured-reward__orbit--two" aria-hidden="true" />
        <img src={product.image} alt={displayName} className="featured-reward__image" />
        <span className="featured-reward__product-label">{displayName}</span>
      </button>
    </section>
  );
}
