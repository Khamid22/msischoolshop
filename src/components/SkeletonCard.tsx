import './SkeletonCard.scss';

export default function SkeletonCard() {
  return (
    <div className="skeleton">
      <div className="skeleton__image" />
      <div className="skeleton__body">
        <div className="skeleton__title" />
        <div className="skeleton__desc" />
        <div className="skeleton__desc skeleton__desc--short" />
        <div className="skeleton__footer">
          <div className="skeleton__price" />
          <div className="skeleton__btn" />
        </div>
      </div>
    </div>
  );
}
