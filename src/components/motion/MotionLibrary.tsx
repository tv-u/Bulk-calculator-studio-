import React from 'react';
import { motion } from 'motion/react';
import { useStudio } from '../../context/StudioContext';

// Reusable 10-Template Motion Graphics Library (transform & opacity only)

export const CosmicEntrance: React.FC<{ children: React.ReactNode; delay?: number; className?: string }> = ({
  children,
  delay = 0,
  className = '',
}) => {
  const { light } = useStudio();
  if (light.reducedEffects || light.animationIntensity === 0) {
    return <div className={className}>{children}</div>;
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

export const LiquidGlassReveal: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => {
  const { light } = useStudio();
  if (light.reducedEffects || light.animationIntensity === 0) {
    return <div className={`liquid-glass rounded-2xl ${className}`}>{children}</div>;
  }
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.985 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
      className={`liquid-glass rounded-2xl ${className}`}
    >
      {children}
    </motion.div>
  );
};

export const AuroraFlow: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <div
    className={`relative overflow-hidden rounded-2xl ${className}`}
    style={{
      backgroundImage:
        'radial-gradient(circle at 12% 18%, color-mix(in srgb, var(--page-accent) 18%, transparent), transparent 52%), radial-gradient(circle at 88% 82%, color-mix(in srgb, var(--page-accent-2) 16%, transparent), transparent 52%)',
    }}
  >
    {children}
  </div>
);

export const NeonBorder: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <div
    className={`rounded-2xl border transition-shadow ${className}`}
    style={{
      borderColor: 'color-mix(in srgb, var(--page-accent) 42%, var(--surface-border))',
      boxShadow: '0 0 calc(20px * var(--glow-intensity)) color-mix(in srgb, var(--page-accent) 18%, transparent)',
    }}
  >
    {children}
  </div>
);

export const FloatingDashboard: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => {
  const { light } = useStudio();
  if (light.reducedEffects || light.animationIntensity === 0) {
    return <div className={className}>{children}</div>;
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

export const MagneticButton: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' }
> = ({ children, className = '', variant = 'primary', ...props }) => {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium whitespace-nowrap shrink-0 min-h-[42px] transition-transform active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500';
  const variants: Record<string, string> = {
    primary: 'text-white shadow-md hover:opacity-95',
    secondary: 'liquid-glass text-slate-900 dark:text-slate-100 hover:brightness-110',
    outline: 'border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-200/40 dark:hover:bg-slate-800/60',
    ghost: 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/40 dark:hover:bg-slate-800/60',
    danger: 'bg-rose-600 text-white hover:bg-rose-700',
  };
  return (
    <button
      {...props}
      className={`${base} ${variants[variant]} ${className}`}
      style={variant === 'primary' ? { background: 'var(--page-gradient)' } : undefined}
    >
      {children}
    </button>
  );
};

export const CalculatorResultReveal: React.FC<{ children: React.ReactNode; keyTrigger: string; className?: string }> = ({
  children,
  keyTrigger,
  className = '',
}) => {
  const { light } = useStudio();
  if (light.reducedEffects) {
    return <div className={className}>{children}</div>;
  }
  return (
    <motion.div
      key={keyTrigger}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

export const WorkflowDataFlow: React.FC<{ active?: boolean; className?: string }> = ({
  active = false,
  className = '',
}) => (
  <div
    className={`h-0.5 w-full rounded-full ${active ? 'opacity-100' : 'opacity-40'} ${className}`}
    style={{ background: 'var(--page-gradient)' }}
  />
);

export const CrystalModal: React.FC<{
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
}> = ({ open, onClose, title, children, maxWidth = 'max-w-2xl' }) => {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.18 }}
        className={`liquid-glass w-full ${maxWidth} max-h-[90vh] overflow-y-auto rounded-2xl p-6 text-slate-900 dark:text-slate-100`}
      >
        <div className="mb-4 flex items-center justify-between gap-4 border-b border-slate-200/60 pb-3 dark:border-slate-700/60">
          <h2 className="font-display text-lg font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-200/50 dark:text-slate-400 dark:hover:bg-slate-800"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>
        {children}
      </motion.div>
    </div>
  );
};

export const PremiumSearchReveal: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <motion.div
    initial={{ opacity: 0, y: 6 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.16 }}
    className={className}
  >
    {children}
  </motion.div>
);
