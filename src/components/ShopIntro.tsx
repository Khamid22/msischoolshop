import { useCallback, useEffect, useRef, useState } from 'react';
import { useLang } from '../contexts/LangContext';
import Coin from './Coin';
import { BoxIcon, UserIcon } from './icons';
import './ShopIntro.scss';

const INTRO_KEY = 'msi_shop_intro_seen';

type IntroVisual = 'identity' | 'coins' | 'products' | 'flow';

interface Slide {
  visual: IntroVisual;
  titleKey: string;
  textKey: string;
}

const SLIDES: Slide[] = [
  { visual: 'identity', titleKey: 'introShop1Title', textKey: 'introShop1Text' },
  { visual: 'coins', titleKey: 'introShop2Title', textKey: 'introShop2Text' },
  { visual: 'products', titleKey: 'introShop3Title', textKey: 'introShop3Text' },
  { visual: 'flow', titleKey: 'introShop4Title', textKey: 'introShop4Text' },
];

function IntroArtwork({ visual }: { visual: IntroVisual }) {
  const { t } = useLang();

  if (visual === 'identity') {
    return (
      <div className="shop-intro__identity" aria-hidden="true">
        <span className="shop-intro__identity-ring shop-intro__identity-ring--outer" />
        <span className="shop-intro__identity-ring shop-intro__identity-ring--inner" />
        <span className="shop-intro__identity-mark">MSI</span>
        <span className="shop-intro__identity-caption">SHOP</span>
      </div>
    );
  }

  if (visual === 'coins') {
    return (
      <div className="shop-intro__coins" aria-hidden="true">
        <span className="shop-intro__coin shop-intro__coin--back">M</span>
        <span className="shop-intro__coin shop-intro__coin--middle">M</span>
        <span className="shop-intro__coin shop-intro__coin--front">M</span>
        <span className="shop-intro__coin-line shop-intro__coin-line--one" />
        <span className="shop-intro__coin-line shop-intro__coin-line--two" />
      </div>
    );
  }

  if (visual === 'products') {
    return (
      <div className="shop-intro__products" aria-hidden="true">
        <span className="shop-intro__product shop-intro__product--calculator">
          <img src="./images/canculator.jpg" alt="" />
        </span>
        <span className="shop-intro__product shop-intro__product--hoodie">
          <img src="./images/hoodie.svg" alt="" />
        </span>
        <span className="shop-intro__product shop-intro__product--digital">
          <img src="./images/telegram-premium.svg" alt="" />
        </span>
      </div>
    );
  }

  return (
    <div className="shop-intro__flow" aria-hidden="true">
      <span className="shop-intro__flow-step">
        <span className="shop-intro__flow-icon"><UserIcon /></span>
        <span>{t('myProfile')}</span>
      </span>
      <span className="shop-intro__flow-arrow">→</span>
      <span className="shop-intro__flow-step">
        <span className="shop-intro__flow-icon"><Coin /></span>
        <span>{t('balance')}</span>
      </span>
      <span className="shop-intro__flow-arrow">→</span>
      <span className="shop-intro__flow-step">
        <span className="shop-intro__flow-icon shop-intro__flow-icon--product">
          <img src="./images/canculator.jpg" alt="" />
        </span>
        <span>{t('categoryRewards')}</span>
      </span>
      <span className="shop-intro__flow-arrow">→</span>
      <span className="shop-intro__flow-step">
        <span className="shop-intro__flow-icon"><BoxIcon /></span>
        <span>{t('myOrders')}</span>
      </span>
    </div>
  );
}

export default function ShopIntro() {
  const { t } = useLang();
  const [slide, setSlide] = useState(0);
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(INTRO_KEY) === '1');
  const touchStartX = useRef(0);
  const touchDelta = useRef(0);
  const isLast = slide === SLIDES.length - 1;

  const finish = useCallback(() => {
    localStorage.setItem(INTRO_KEY, '1');
    setDismissed(true);
  }, []);

  useEffect(() => {
    if (dismissed) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') setSlide((current) => Math.min(current + 1, SLIDES.length - 1));
      if (event.key === 'ArrowLeft') setSlide((current) => Math.max(current - 1, 0));
      if (event.key === 'Escape') finish();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dismissed, finish]);

  if (dismissed) return null;

  const onTouchStart = (event: React.TouchEvent) => {
    touchStartX.current = event.touches[0].clientX;
    touchDelta.current = 0;
  };

  const onTouchMove = (event: React.TouchEvent) => {
    touchDelta.current = event.touches[0].clientX - touchStartX.current;
  };

  const onTouchEnd = () => {
    if (Math.abs(touchDelta.current) < 40) return;
    if (touchDelta.current < 0) setSlide((current) => Math.min(current + 1, SLIDES.length - 1));
    else setSlide((current) => Math.max(current - 1, 0));
  };

  return (
    <section className="shop-intro" role="dialog" aria-modal="true" aria-label={t('introTitle')}>
      <div className="shop-intro__ambient" aria-hidden="true" />
      <header className="shop-intro__header">
        <span className="shop-intro__brand">MSI <b>SHOP</b></span>
        <button className="shop-intro__skip" type="button" onClick={finish}>{t('introSkip')}</button>
      </header>

      <div className="shop-intro__stage" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
        <div className="shop-intro__track" style={{ transform: `translateX(-${slide * 100}%)` }}>
          {SLIDES.map((item, index) => (
            <div className="shop-intro__slide" key={item.titleKey} aria-hidden={index !== slide}>
              <div className="shop-intro__artwork"><IntroArtwork visual={item.visual} /></div>
              <span className="shop-intro__step">0{index + 1} / 0{SLIDES.length}</span>
              <h2 className="shop-intro__title">{t(item.titleKey)}</h2>
              <p className="shop-intro__text">{t(item.textKey)}</p>
            </div>
          ))}
        </div>
      </div>

      <footer className="shop-intro__footer">
        <div className="shop-intro__dots">
          {SLIDES.map((_, index) => (
            <button
              key={index}
              className={`shop-intro__dot ${index === slide ? 'shop-intro__dot--active' : ''}`}
              type="button"
              onClick={() => setSlide(index)}
              aria-label={`${t('introNext')} ${index + 1}`}
              aria-current={index === slide ? 'step' : undefined}
            />
          ))}
        </div>

        <div className={`shop-intro__actions ${isLast ? 'shop-intro__actions--final' : ''}`}>
          {isLast ? (
            <button className="btn btn-primary shop-intro__cta" type="button" onClick={finish}>
              {t('introEnterShop')}
            </button>
          ) : (
            <>
              <button
                className="shop-intro__prev"
                type="button"
                onClick={() => setSlide((current) => Math.max(current - 1, 0))}
                disabled={slide === 0}
                aria-label={t('previous')}
              >
                ←
              </button>
              <button
                className="btn btn-primary shop-intro__next"
                type="button"
                onClick={() => setSlide((current) => Math.min(current + 1, SLIDES.length - 1))}
              >
                {t('introNext')} <span aria-hidden="true">→</span>
              </button>
            </>
          )}
        </div>
      </footer>
    </section>
  );
}
