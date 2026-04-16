import { useLocation } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';

interface PageTransitionProps {
  children: React.ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
  const location = useLocation();
  const [displayLocation, setDisplayLocation] = useState(location);
  const [transitionStage, setTransitionStage] = useState<'enter' | 'exit'>('enter');

  useEffect(() => {
    if (location.pathname !== displayLocation.pathname) {
      setTransitionStage('exit');
    }
  }, [location, displayLocation]);

  return (
    <div
      className={`page-transition-${transitionStage} h-full`}
      onAnimationEnd={() => {
        if (transitionStage === 'exit') {
          setDisplayLocation(location);
          setTransitionStage('enter');
        }
      }}
    >
      {children}
    </div>
  );
}
