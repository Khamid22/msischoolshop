import { useState, useEffect, useCallback } from 'react';
import { fetchBanners } from '../api';
import type { Banner as BannerType } from '../types';
import BannerSkeleton from './BannerSkeleton';
import './Banner.scss';

const INTERVAL = 4000;

interface Props {
  onBannerClick?: (banner: BannerType) => void;
}

export default function Banner({ onBannerClick }: Props) {
  const [banners, setBanners] = useState<BannerType[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    fetchBanners().then((data) => {
      setBanners(data.filter((b) => b.active));
      setLoading(false);
    });
  }, []);

  const slides = banners;

  const next = useCallback(() => {
    setActive((i) => (i + 1) % slides.length);
  }, [slides.length]);

  const prev = useCallback(() => {
    setActive((i) => (i - 1 + slides.length) % slides.length);
  }, [slides.length]);

  useEffect(() => {
    if (paused || slides.length === 0) return;
    const timer = setInterval(next, INTERVAL);
    return () => clearInterval(timer);
  }, [paused, next, slides.length]);

  useEffect(() => {
    if (active >= slides.length) setActive(0);
  }, [active, slides.length]);

  if (loading) return <BannerSkeleton />;

  if (slides.length === 0) return null;

  const hasText = (s: BannerType) => !!(s.title || s.subtitle || s.description);

  return (
    <div
      className="banner"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="banner__track">
        {slides.map((slide, i) => (
          <div
            key={slide.id}
            className={`banner__slide ${i === active ? 'banner__slide--active' : ''}`}
            style={{ '--slide-accent': slide.accent } as React.CSSProperties}
            onClick={() => onBannerClick?.(slide)}
          >
            <div
              className={`banner__content ${hasText(slide) ? 'banner__content--text' : 'banner__content--image-only'} ${slide.image ? 'banner__content--with-image' : ''}`}
            >
              {slide.image ? (
                <img className="banner__bg-image" src={slide.image} alt="" />
              ) : null}
              {slide.icon && <span className="banner__icon">{slide.icon}</span>}
              {hasText(slide) && (
                <div className="banner__text">
                  {slide.title && <h2 className="banner__title">{slide.title}</h2>}
                  {slide.subtitle && <p className="banner__subtitle">{slide.subtitle}</p>}
                  {slide.description && <p className="banner__description">{slide.description}</p>}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <button className="banner__arrow banner__arrow--left" onClick={prev}>
        ‹
      </button>
      <button className="banner__arrow banner__arrow--right" onClick={next}>
        ›
      </button>

      <div className="banner__dots">
        {slides.map((slide, i) => (
          <button
            key={slide.id}
            className={`banner__dot ${i === active ? 'banner__dot--active' : ''}`}
            onClick={() => setActive(i)}
          />
        ))}
      </div>
    </div>
  );
}
