interface Props {
  value?: number;
  count?: number;
}

const MAX_STARS = 5;

export default function Rating({ value, count }: Props) {
  if (value === undefined) return null;
  const filled = Math.max(0, Math.min(MAX_STARS, Math.round(value)));
  const stars = Array.from({ length: MAX_STARS }, (_, i) => (i < filled ? '★' : '☆'));

  return (
    <span className="rating">
      <span className="rating__stars" aria-hidden="true">
        {stars.join('')}
      </span>
      <span className="rating__value">{value}</span>
      {count !== undefined && <span className="rating__count">({count})</span>}
    </span>
  );
}
