interface Props {
  className?: string;
}

export default function Coin({ className }: Props) {
  return <span className={`coin${className ? ' ' + className : ''}`}>M</span>;
}
