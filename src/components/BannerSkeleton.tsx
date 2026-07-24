import './BannerSkeleton.scss';

export default function BannerSkeleton() {
  return (
    <div className="banner-skeleton">
      <div className="banner-skeleton__track">
        <div className="banner-skeleton__slide">
          <div className="banner-skeleton__content">
            <div className="banner-skeleton__icon" />
            <div className="banner-skeleton__text">
              <div className="banner-skeleton__title" />
              <div className="banner-skeleton__subtitle" />
              <div className="banner-skeleton__desc" />
              <div className="banner-skeleton__desc banner-skeleton__desc--short" />
            </div>
          </div>
        </div>
      </div>
      <div className="banner-skeleton__dots">
        <div className="banner-skeleton__dot" />
        <div className="banner-skeleton__dot" />
        <div className="banner-skeleton__dot" />
      </div>
    </div>
  );
}
