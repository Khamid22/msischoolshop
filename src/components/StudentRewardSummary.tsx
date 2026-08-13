import type { Product } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useLang } from '../contexts/LangContext';
import { formatCoins, getUnitPrice } from '../utils/currency';
import Coin from './Coin';

interface Props {
  products: Product[];
}

export default function StudentRewardSummary({ products }: Props) {
  const { user } = useAuth();
  const { t } = useLang();
  if (!user) return null;

  const available = products.reduce((count, product) => (
    getUnitPrice(product, user) <= user.balance ? count + 1 : count
  ), 0);
  const progress = Math.min(100, Math.round((user.balance / 1200) * 100));

  return (
    <section className="student-reward" aria-labelledby="student-reward-title">
      <div className="student-reward__copy">
        <span className="student-reward__eyebrow">{t('studentRewardEyebrow')}</span>
        <h2 className="student-reward__title" id="student-reward-title">{t('studentRewardTitle')}</h2>
        <p className="student-reward__body">{t('studentRewardBody')}</p>
      </div>
      <div className="student-reward__wallet">
        <div className="student-reward__wallet-head">
          <span>{t('balance')}</span>
          <span className="student-reward__discount">−{user.discount || 0}%</span>
        </div>
        <strong className="student-reward__balance">{formatCoins(user.balance)} <Coin /></strong>
        <div className="student-reward__track" aria-hidden="true">
          <span style={{ width: `${progress}%` }} />
        </div>
        <span className="student-reward__available">{available} {t('rewardsAvailable')}</span>
      </div>
    </section>
  );
}
