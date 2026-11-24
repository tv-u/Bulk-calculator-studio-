import React from 'react';
import { Globe, Settings } from 'lucide-react';
import { useStudio } from '../context/StudioContext';
import type { NumberLocaleMode } from '../engine/formatters';
import { DocumentHead } from '../components/seo/DocumentHead';
import { CosmicEntrance, LiquidGlassReveal } from '../components/motion/MotionLibrary';
import { LightControlStudioPanel } from '../components/studio/LightControlStudioPanel';

export const SettingsPage: React.FC = () => {
  const { locale, setLocale, currency, setCurrency } = useStudio();

  return (
    <div className="space-y-6">
      <DocumentHead
        title="Settings & Light Control Studio – BULK CALCULATOR STUDIO"
        description="Configure Light Control Studio themes, glass effects, motion speed, India/Global formatting, and default currency."
      />

      <CosmicEntrance>
        <LiquidGlassReveal className="p-6">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Settings className="h-4 w-4 text-blue-500" />
            <span>Global Preferences · Stored Locally</span>
          </div>
          <h1 className="mt-1 font-display text-2xl font-bold sm:text-3xl">
            Settings &amp; Light Control Studio
          </h1>
        </LiquidGlassReveal>
      </CosmicEntrance>

      <LiquidGlassReveal className="p-6 space-y-4">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
          <Globe className="h-4 w-4 text-blue-500" /> Regional &amp; Currency Formatting (India-First &amp; Global)
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1.5 text-xs">
            <span className="font-medium">Number Grouping Format</span>
            <select
              value={locale}
              onChange={(e) => setLocale(e.target.value as NumberLocaleMode)}
              className="min-h-[42px] w-full rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900"
            >
              <option value="en-IN">India (en-IN · Lakhs &amp; Crores 12,34,567)</option>
              <option value="en-US">International (en-US · Millions 1,234,567)</option>
            </select>
          </label>
          <label className="space-y-1.5 text-xs">
            <span className="font-medium">Default Display Currency</span>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="min-h-[42px] w-full rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900"
            >
              <option value="INR">INR (₹ Indian Rupee)</option>
              <option value="USD">USD ($ US Dollar)</option>
              <option value="EUR">EUR (€ Euro)</option>
              <option value="GBP">GBP (£ British Pound)</option>
              <option value="AED">AED (UAE Dirham)</option>
            </select>
          </label>
        </div>
      </LiquidGlassReveal>

      <LiquidGlassReveal className="p-6">
        <h2 className="mb-4 font-display text-lg font-semibold">LIGHT CONTROL STUDIO</h2>
        <LightControlStudioPanel embedded />
      </LiquidGlassReveal>
    </div>
  );
};
