import React from 'react';
import { RotateCcw, Save, Sliders, Sparkles } from 'lucide-react';
import {
  THEME_PRESETS,
  useStudio,
  type DisplayDensity,
  type GlassStyle,
  type ThemePreset,
} from '../../context/StudioContext';
import { MagneticButton } from '../motion/MotionLibrary';

const GLASS_STYLES: Array<{ id: GlassStyle; label: string }> = [
  { id: 'crystal', label: 'Crystal Glass' },
  { id: 'frosted', label: 'Frosted Glass' },
  { id: 'aurora', label: 'Aurora Glass' },
  { id: 'neon', label: 'Neon Glass' },
  { id: 'midnight', label: 'Midnight Glass' },
  { id: 'softlight', label: 'Soft Light Glass' },
  { id: 'transparent', label: 'Premium Transparent' },
];

const SliderRow: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (v: number) => void;
}> = ({ label, value, min, max, step, unit = '', onChange }) => (
  <label className="block space-y-1.5">
    <div className="flex items-center justify-between text-xs">
      <span className="font-medium text-slate-700 dark:text-slate-300">{label}</span>
      <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400">
        {Number(value).toFixed(step < 1 ? 2 : 0)}
        {unit}
      </span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="h-2 w-full cursor-pointer accent-blue-500"
    />
  </label>
);

export const LightControlStudioPanel: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const {
    light,
    updateLight,
    applyThemePreset,
    resetLightSettings,
    saveLightSettings,
  } = useStudio();

  return (
    <div className={embedded ? 'space-y-6' : 'space-y-5'}>
      {!embedded && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Every slider and toggle updates live across the entire interface and persists locally.
        </p>
      )}

      {/* Themes */}
      <div>
        <h3 className="mb-2.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          <Sparkles className="h-3.5 w-3.5" /> Themes
        </h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(Object.keys(THEME_PRESETS) as ThemePreset[]).map((preset) => {
            const active = light.theme === preset;
            return (
              <button
                key={preset}
                type="button"
                onClick={() => applyThemePreset(preset)}
                className={`min-h-[40px] rounded-xl border px-3 py-2 text-xs font-medium transition ${
                  active
                    ? 'border-blue-500 bg-blue-500/15 text-blue-600 dark:text-blue-300'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                {THEME_PRESETS[preset].label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 7 Liquid Glass Styles */}
      <div>
        <h3 className="mb-2.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          <Sliders className="h-3.5 w-3.5" /> Liquid Glass Style
        </h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {GLASS_STYLES.map((gs) => {
            const active = light.glassStyle === gs.id;
            return (
              <button
                key={gs.id}
                type="button"
                onClick={() => updateLight({ glassStyle: gs.id })}
                className={`min-h-[40px] rounded-xl border px-3 py-2 text-xs font-medium transition ${
                  active
                    ? 'border-violet-500 bg-violet-500/15 text-violet-700 dark:text-violet-300'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                {gs.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Lighting, Colors, Motion Grid */}
      <div className="grid gap-5 md:grid-cols-3">
        <div className="space-y-3 rounded-xl border border-slate-200/70 p-4 dark:border-slate-800">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Lighting
          </h4>
          <SliderRow label="Ambient Brightness" value={light.ambientBrightness} min={0.6} max={1.25} step={0.05} onChange={(v) => updateLight({ ambientBrightness: v })} />
          <SliderRow label="Panel Brightness" value={light.panelBrightness} min={0.7} max={1.25} step={0.05} onChange={(v) => updateLight({ panelBrightness: v })} />
          <SliderRow label="Background Brightness" value={light.bgBrightness} min={0.4} max={1.3} step={0.05} onChange={(v) => updateLight({ bgBrightness: v })} />
          <SliderRow label="Glass Transparency" value={light.glassTransparency} min={0.35} max={0.95} step={0.05} onChange={(v) => updateLight({ glassTransparency: v })} />
          <SliderRow label="Blur Intensity" value={light.blurIntensity} min={0} max={28} step={1} unit="px" onChange={(v) => updateLight({ blurIntensity: v })} />
          <SliderRow label="Glow Intensity" value={light.glowIntensity} min={0} max={1} step={0.05} onChange={(v) => updateLight({ glowIntensity: v })} />
          <SliderRow label="Border Lighting" value={light.borderLighting} min={0.05} max={0.45} step={0.02} onChange={(v) => updateLight({ borderLighting: v })} />
        </div>

        <div className="space-y-3 rounded-xl border border-slate-200/70 p-4 dark:border-slate-800">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Colors &amp; Surface
          </h4>
          <SliderRow label="Accent Intensity" value={light.accentIntensity} min={0.5} max={1.4} step={0.05} onChange={(v) => updateLight({ accentIntensity: v })} />
          <SliderRow label="Gradient Intensity" value={light.gradientIntensity} min={0} max={1} step={0.05} onChange={(v) => updateLight({ gradientIntensity: v })} />
          <SliderRow label="Neon Intensity" value={light.neonIntensity} min={0} max={1} step={0.05} onChange={(v) => updateLight({ neonIntensity: v })} />
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Background Mode</span>
            <select
              value={light.backgroundMode}
              onChange={(e) => updateLight({ backgroundMode: e.target.value as typeof light.backgroundMode })}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              <option value="cosmic-stars">Cosmic Starfield + Aurora</option>
              <option value="aurora-mesh">Aurora Gradients Only</option>
              <option value="minimal-grid">Minimal Architectural Grid</option>
            </select>
          </label>
          <div className="pt-1">
            <span className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">Display Density</span>
            <div className="grid grid-cols-3 gap-1.5">
              {(['compact', 'comfortable', 'spacious'] as DisplayDensity[]).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => updateLight({ density: d })}
                  className={`rounded-lg border px-2 py-1.5 text-xs capitalize ${
                    light.density === d
                      ? 'border-blue-500 bg-blue-500/15 text-blue-600 dark:text-blue-300 font-semibold'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-3 rounded-xl border border-slate-200/70 p-4 dark:border-slate-800">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Motion &amp; Accessibility
          </h4>
          <SliderRow label="Animation Intensity" value={light.animationIntensity} min={0} max={1} step={0.1} onChange={(v) => updateLight({ animationIntensity: v })} />
          <SliderRow label="Particle Intensity" value={light.particleIntensity} min={0} max={1} step={0.05} onChange={(v) => updateLight({ particleIntensity: v })} />
          <SliderRow label="Star Speed" value={light.starSpeed} min={0} max={2} step={0.1} onChange={(v) => updateLight({ starSpeed: v })} />
          <SliderRow label="Parallax Intensity" value={light.parallaxIntensity} min={0} max={1} step={0.1} onChange={(v) => updateLight({ parallaxIntensity: v })} />
          <SliderRow label="Transition Speed" value={light.transitionSpeed} min={80} max={400} step={20} unit="ms" onChange={(v) => updateLight({ transitionSpeed: v })} />

          <label className="flex items-center justify-between pt-2 text-xs">
            <span className="font-medium text-slate-700 dark:text-slate-300">High Contrast Mode</span>
            <input
              type="checkbox"
              checked={light.highContrast}
              onChange={(e) => updateLight({ highContrast: e.target.checked })}
              className="h-4 w-4 accent-blue-500"
            />
          </label>
          <label className="flex items-center justify-between text-xs">
            <span className="font-medium text-slate-700 dark:text-slate-300">Reduced Visual Effects</span>
            <input
              type="checkbox"
              checked={light.reducedEffects}
              onChange={(e) => updateLight({ reducedEffects: e.target.checked })}
              className="h-4 w-4 accent-blue-500"
            />
          </label>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2">
        <MagneticButton variant="outline" onClick={resetLightSettings}>
          <RotateCcw className="h-4 w-4" />
          Restore Defaults
        </MagneticButton>
        <MagneticButton variant="primary" onClick={saveLightSettings}>
          <Save className="h-4 w-4" />
          Save Settings
        </MagneticButton>
      </div>
    </div>
  );
};
