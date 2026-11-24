import React, { useEffect, useRef } from 'react';
import { useStudio, THEME_PRESETS } from '../../context/StudioContext';

interface Star {
  x: number;
  y: number;
  z: number;
  size: number;
  speed: number;
}

export const CosmicBackground: React.FC<{ primaryAccent: string; secondaryAccent: string }> = ({
  primaryAccent,
  secondaryAccent,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { light } = useStudio();
  const isDark = THEME_PRESETS[light.theme]?.isDark ?? true;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (light.reducedEffects || light.backgroundMode === 'minimal-grid') return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const count = Math.min(75, Math.max(15, Math.round(60 * light.particleIntensity)));
    const stars: Star[] = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      z: Math.random() * 0.8 + 0.2,
      size: Math.random() * 1.8 + 0.6,
      speed: Math.random() * 0.45 + 0.15,
    }));

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const render = () => {
      if (document.hidden) {
        rafId = requestAnimationFrame(render);
        return;
      }
      ctx.clearRect(0, 0, width, height);
      const speedMult = light.starSpeed * light.animationIntensity;
      const starAlpha = isDark ? 0.55 * light.bgBrightness : 0.22 * light.bgBrightness;

      for (const s of stars) {
        s.y -= s.speed * s.z * speedMult;
        s.x += s.speed * 0.18 * s.z * speedMult;
        if (s.y < -4) {
          s.y = height + 4;
          s.x = Math.random() * width;
        }
        if (s.x > width + 4) s.x = -4;

        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size * s.z, 0, Math.PI * 2);
        ctx.fillStyle = s.z > 0.65 ? primaryAccent : isDark ? `rgba(226, 232, 240, ${starAlpha})` : `rgba(51, 65, 85, ${starAlpha})`;
        ctx.globalAlpha = Math.min(0.85, starAlpha);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      rafId = requestAnimationFrame(render);
    };

    rafId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleResize);
    };
  }, [
    light.animationIntensity,
    light.backgroundMode,
    light.bgBrightness,
    light.particleIntensity,
    light.reducedEffects,
    light.starSpeed,
    isDark,
    primaryAccent,
  ]);

  return (
    <div
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      style={{ filter: `brightness(${light.bgBrightness})` }}
      aria-hidden="true"
    >
      {/* Ambient Aurora Gradient Mesh */}
      <div
        className="absolute inset-0 transition-opacity duration-500"
        style={{
          opacity: light.gradientIntensity * (isDark ? 0.45 : 0.2),
          backgroundImage: `radial-gradient(circle at 15% 15%, ${primaryAccent}44 0%, transparent 45%), radial-gradient(circle at 85% 25%, ${secondaryAccent}38 0%, transparent 45%), radial-gradient(circle at 50% 90%, ${primaryAccent}28 0%, transparent 50%)`,
        }}
      />

      {/* Subtle architectural grid */}
      <div
        className="absolute inset-0"
        style={{
          opacity: isDark ? 0.06 : 0.045,
          backgroundImage: `linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)`,
          backgroundSize: '48px 48px',
        }}
      />

      {light.backgroundMode !== 'minimal-grid' && !light.reducedEffects && (
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      )}
    </div>
  );
};
