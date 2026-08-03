import { useEffect, useState } from 'react';
import type { FilterState } from '../types';
import { useLang } from '../contexts/LangContext';
import { XIcon } from './icons';
import './FiltersSheet.scss';

interface Props {
  open: boolean;
  filters: FilterState;
  onApply: (filters: FilterState) => void;
  onClose: () => void;
}

export default function FiltersSheet({ open, filters, onApply, onClose }: Props) {
  const { t } = useLang();
  const [type, setType] = useState<FilterState['type']>(filters.type);
  const [minPrice, setMinPrice] = useState(filters.minPrice);
  const [maxPrice, setMaxPrice] = useState(filters.maxPrice);

  useEffect(() => {
    if (open) {
      setType(filters.type);
      setMinPrice(filters.minPrice);
      setMaxPrice(filters.maxPrice);
    }
  }, [open, filters]);

  if (!open) return null;

  const typeTabs: { value: FilterState['type']; label: string }[] = [
    { value: 'all', label: t('filterAll') },
    { value: 'digital', label: t('filterDigital') },
    { value: 'physical', label: t('filterPhysical') },
  ];

  const handleReset = () => {
    setType('all');
    setMinPrice(0);
    setMaxPrice(0);
  };

  const handleApply = () => {
    onApply({ type, minPrice: Number(minPrice) || 0, maxPrice: Number(maxPrice) || 0, search: filters.search });
    onClose();
  };

  return (
    <>
      <div className="sheet-overlay" onClick={onClose} />
      <div className="sheet">
        <div className="sheet__grab" />
        <div className="sheet__header">
          <h2 className="sheet__title">{t('filters')}</h2>
          <button className="sheet__close" onClick={onClose} aria-label={t('close')}>
            <XIcon />
          </button>
        </div>

        <div className="sheet__group">
          <span className="sheet__label">{t('filterAll')}</span>
          <div className="sheet__seg">
            {typeTabs.map((tab) => (
              <button
                key={tab.value}
                className={`sheet__seg-opt ${type === tab.value ? 'sheet__seg-opt--active' : ''}`}
                onClick={() => setType(tab.value)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="sheet__group">
          <span className="sheet__label">{t('balance')}</span>
          <div className="sheet__range">
            <label className="sheet__field">
              <span className="sheet__field-label">{t('filterMin')}</span>
              <input
                className="input"
                type="number"
                min="0"
                value={minPrice || ''}
                placeholder="0"
                onChange={(e) => setMinPrice(Number(e.target.value) || 0)}
              />
            </label>
            <span className="sheet__range-sep">—</span>
            <label className="sheet__field">
              <span className="sheet__field-label">{t('filterMax')}</span>
              <input
                className="input"
                type="number"
                min="0"
                value={maxPrice || ''}
                placeholder="∞"
                onChange={(e) => setMaxPrice(Number(e.target.value) || 0)}
              />
            </label>
          </div>
        </div>

        <div className="sheet__actions">
          <button className="btn btn-secondary sheet__reset" onClick={handleReset}>
            {t('clearFilters')}
          </button>
          <button className="btn btn-primary sheet__apply" onClick={handleApply}>
            {t('apply')}
          </button>
        </div>
      </div>
    </>
  );
}
