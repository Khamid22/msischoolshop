import { useEffect, useRef, useState } from 'react';
import { useLang } from '../contexts/LangContext';
import { useAuth } from '../contexts/AuthContext';
import './ShopIntro.scss';

interface Slide {
  logo?: boolean;
  icon?: string;
  titleKey: string;
  textKey: string;
}

export default function ShopIntro() {
  const { t } = useLang();
  const { openAuth } = useAuth();
  const [slide, setSlide] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  const touchStartX = useRef(0);
  const touchDelta = useRef(0);

  const slides: Slide[] = [
    { logo: true, titleKey: 'introShop1Title', textKey: 'introShop1Text' },
    { icon: '💰', titleKey: 'introShop2Title', textKey: 'introShop2Text' },
    { icon: '🛍️', titleKey: 'introShop3Title', textKey: 'introShop3Text' },
    { icon: '⚡', titleKey: 'introShop4Title', textKey: 'introShop4Text' },
  ];

  const isLast = slide === slides.length - 1;

  const finish = () => {
    setDismissed(true);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setSlide((s) => Math.min(s + 1, slides.length - 1));
      if (e.key === 'ArrowLeft') setSlide((s) => Math.max(s - 1, 0));
    };
    window.addEventListener('keydown', onKey);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [slides.length]);

  useEffect(() => {
    if (slide >= slides.length - 1) return;
    const timer = setTimeout(() => setSlide((s) => s + 1), 4000);
    return () => clearTimeout(timer);
  }, [slide, slides.length]);

  if (dismissed) return null;

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchDelta.current = 0;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    touchDelta.current = e.touches[0].clientX - touchStartX.current;
  };

  const onTouchEnd = () => {
    if (Math.abs(touchDelta.current) < 40) return;
    if (touchDelta.current < 0) setSlide((s) => Math.min(s + 1, slides.length - 1));
    else setSlide((s) => Math.max(s - 1, 0));
  };

  return (
    <div className="shop-intro">
      <button className="shop-intro__skip" onClick={finish}>
        {t('introSkip')}
      </button>

      <div
        className="shop-intro__stage"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div
          className="shop-intro__track"
          style={{ transform: `translateX(-${slide * 100}%)` }}
        >
          {slides.map((s) => (
            <div className="shop-intro__slide" key={s.titleKey}>
              {s.logo ? (
                <div className="shop-intro__logo">
                  <span className="shop-intro__letter shop-intro__letter--m">M</span>
                  <span className="shop-intro__letter shop-intro__letter--s">S</span>
                  <span className="shop-intro__letter shop-intro__letter--i">I</span>
                </div>
              ) : (
                <div className="shop-intro__icon">{s.icon}</div>
              )}
              <h2 className="shop-intro__title">{t(s.titleKey)}</h2>
              <p className="shop-intro__text">{t(s.textKey)}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="shop-intro__dots">
        {slides.map((_, i) => (
          <button
            key={i}
            className={`shop-intro__dot ${i === slide ? 'shop-intro__dot--active' : ''}`}
            onClick={() => setSlide(i)}
            aria-label={`slide ${i + 1}`}
          />
        ))}
      </div>

      <div className="shop-intro__actions">
        {isLast && (
          <button
            className="btn btn-primary shop-intro__cta"
            onClick={() => { openAuth(); finish(); }}
          >
            {t('introStart')}
          </button>
        )}
      </div>
    </div>
  );
}
