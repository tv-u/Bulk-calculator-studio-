import React, { useState } from 'react';
import { Download, WifiOff } from 'lucide-react';
import { useOnlineStatus, usePWAInstall } from './usePWAInstall';
import { CrystalModal } from '../motion/MotionLibrary';

export const PWAInstallButton: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) return null;

  if (isInstallable) {
    return (
      <button
        onClick={() => void install()}
        className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-white whitespace-nowrap shrink-0 transition hover:opacity-90"
        style={{ background: 'var(--page-gradient)' }}
        title="Install BULK CALCULATOR STUDIO App"
      >
        <Download className="h-3.5 w-3.5" />
        {!compact && <span>Install App</span>}
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 whitespace-nowrap shrink-0 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <Download className="h-3.5 w-3.5" />
          {!compact && <span>Install iOS</span>}
        </button>
        <CrystalModal
          open={showIOSGuide}
          onClose={() => setShowIOSGuide(false)}
          title="Install on iPhone / iPad"
          maxWidth="max-w-sm"
        >
          <ol className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
            <li>1. Tap the <strong>Share</strong> icon in the Safari toolbar.</li>
            <li>2. Scroll down and select <strong>Add to Home Screen</strong>.</li>
            <li>3. Tap <strong>Add</strong> to launch BulkCalc like a native app.</li>
          </ol>
        </CrystalModal>
      </>
    );
  }

  return null;
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div
      role="status"
      className="fixed bottom-20 left-4 z-50 flex items-center gap-2 rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-medium text-white shadow-lg md:bottom-4"
    >
      <WifiOff className="h-3.5 w-3.5 shrink-0" />
      <span>Offline Mode — Deterministic calculators &amp; local tools remain active.</span>
    </div>
  );
};
