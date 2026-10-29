import React, { useLayoutEffect, useRef, useState } from 'react';
import { COMBAT_STAGE_HEIGHT, COMBAT_STAGE_WIDTH, fitCombatStage } from '../utils/combatStageLayout';

interface CombatStageProps {
  children: React.ReactNode;
}

/**
 * Graphics and HUD share one 1000×500 surface and one CSS transform.
 * ResizeObserver responds to the actual container, not just window.resize.
 * The wrapper itself never remounts the Canvas during layout changes.
 */
const CombatStage: React.FC<CombatStageProps> = ({ children }) => {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState(() =>
    fitCombatStage(
      typeof window === 'undefined' ? COMBAT_STAGE_WIDTH : window.innerWidth,
      typeof window === 'undefined' ? COMBAT_STAGE_HEIGHT : window.innerHeight
    )
  );

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const updateLayout = () => {
      const { width, height } = viewport.getBoundingClientRect();
      const next = fitCombatStage(width, height);
      setLayout(prev => (
        prev.scale === next.scale && prev.left === next.left && prev.top === next.top
          ? prev : next
      ));
    };

    updateLayout();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateLayout);
      return () => window.removeEventListener('resize', updateLayout);
    }
    const observer = new ResizeObserver(updateLayout);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={viewportRef}
      className="relative h-screen w-full overflow-hidden bg-[#070b14]"
      style={{ height: '100dvh' }}
      data-combat-viewport
      aria-label="战斗场景"
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(67,73,87,0.34),transparent_70%)]" />
      <div
        className="absolute overflow-hidden bg-[#080d1a] shadow-[0_16px_85px_rgba(0,0,0,.75)] ring-1 ring-amber-100/20"
        style={{
          width: COMBAT_STAGE_WIDTH,
          height: COMBAT_STAGE_HEIGHT,
          left: layout.left,
          top: layout.top,
          transform: `scale(${layout.scale})`,
          transformOrigin: 'top left'
        }}
        data-combat-stage
        data-stage-scale={layout.scale.toFixed(4)}
      >
        {children}
      </div>
    </div>
  );
};

export default CombatStage;
