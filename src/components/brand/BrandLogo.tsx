import React from 'react';

export const BrandLogoMark: React.FC<{ className?: string }> = ({ className = 'h-8 w-8' }) => (
  <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
    <defs>
      <linearGradient id="bcs-mark-grad" x1="8" y1="8" x2="56" y2="56" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#38bdf8" />
        <stop offset="50%" stopColor="#6366f1" />
        <stop offset="100%" stopColor="#a855f7" />
      </linearGradient>
    </defs>
    <path
      d="M32 4L56 18V46L32 60L8 46V18L32 4Z"
      fill="#0f172a"
      fillOpacity="0.85"
      stroke="url(#bcs-mark-grad)"
      strokeWidth="3.2"
      strokeLinejoin="round"
    />
    <rect x="18" y="18" width="12" height="12" rx="3" fill="#38bdf8" fillOpacity="0.22" stroke="#38bdf8" strokeWidth="2" />
    <rect x="34" y="18" width="12" height="12" rx="3" fill="#818cf8" fillOpacity="0.22" stroke="#818cf8" strokeWidth="2" />
    <rect x="18" y="34" width="12" height="12" rx="3" fill="#818cf8" fillOpacity="0.22" stroke="#818cf8" strokeWidth="2" />
    <rect x="34" y="34" width="12" height="12" rx="3" fill="url(#bcs-mark-grad)" />
    <path d="M24 21.5V26.5M21.5 24H26.5" stroke="#e0f2fe" strokeWidth="2" strokeLinecap="round" />
    <path d="M37.5 24H42.5" stroke="#e0e7ff" strokeWidth="2" strokeLinecap="round" />
    <path d="M21.8 37.8L26.2 42.2M26.2 37.8L21.8 42.2" stroke="#e0e7ff" strokeWidth="1.9" strokeLinecap="round" />
    <path d="M37.5 38.5H42.5M37.5 41.5H42.5" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
  </svg>
);
