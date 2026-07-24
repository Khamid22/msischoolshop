import { useEffect, useState } from 'react';
import './SplashScreen.scss';

interface Props {
  onFinish: () => void;
}

export default function SplashScreen({ onFinish }: Props) {
  const [phase, setPhase] = useState<'enter' | 'hold' | 'exit'>('enter');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('hold'), 800);
    const t2 = setTimeout(() => setPhase('exit'), 1800);
    const t3 = setTimeout(onFinish, 2600);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onFinish]);

  return (
    <div className={`splash splash--${phase}`}>
      <div className="splash__back" />
      <div className="splash__content">
        <div className="splash__logo">
          <span className="splash__letter splash__letter--m">M</span>
          <span className="splash__letter splash__letter--s">S</span>
          <span className="splash__letter splash__letter--i">I</span>
        </div>
        <div className="splash__line" />
        <p className="splash__tagline">Bot Shop</p>
      </div>
    </div>
  );
}
