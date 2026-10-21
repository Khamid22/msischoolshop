import { useLang } from '../contexts/LangContext';
import './ProductAvailability.scss';

export default function ProductAvailability({ stock }: { stock: number | null }) {
  const { t } = useLang();
  return (
    <span className="product-availability">
      {stock === 0 ? t('outOfStock') : stock === null
        ? t('inStockLabel')
        : t('stockAvailable').replace('{count}', String(stock))}
    </span>
  );
}
