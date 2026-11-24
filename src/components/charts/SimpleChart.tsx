import React from 'react';

export interface ChartDatum {
  label: string;
  value: number;
  secondary?: number;
}

export const SimpleBarChart: React.FC<{
  data: ChartDatum[];
  primaryLabel?: string;
  secondaryLabel?: string;
  height?: number;
}> = ({ data, primaryLabel = 'Primary', secondaryLabel = 'Secondary', height = 200 }) => {
  if (!data || data.length === 0) return null;

  const maxTotal = Math.max(
    1,
    ...data.map((d) => Math.max(0, d.value) + Math.max(0, d.secondary ?? 0))
  );
  const hasSecondary = data.some((d) => typeof d.secondary === 'number' && d.secondary > 0);
  const barWidth = Math.max(10, Math.min(36, Math.floor(520 / data.length) - 6));
  const svgW = Math.max(360, data.length * (barWidth + 8) + 24);

  return (
    <div className="w-full overflow-x-auto">
      <div className="mb-2 flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-slate-400">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: 'var(--page-accent)' }} />
          {primaryLabel}
        </span>
        {hasSecondary && (
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: 'var(--page-accent-2)' }} />
            {secondaryLabel}
          </span>
        )}
      </div>
      <svg
        viewBox={`0 0 ${svgW} ${height + 28}`}
        className="w-full min-w-[340px]"
        role="img"
        aria-label="Calculation breakdown chart"
      >
        {[0.25, 0.5, 0.75, 1].map((frac) => {
          const y = height - frac * (height - 12);
          return (
            <line
              key={frac}
              x1={12}
              x2={svgW - 12}
              y1={y}
              y2={y}
              stroke="currentColor"
              strokeOpacity={0.1}
              strokeDasharray="3 3"
            />
          );
        })}
        {data.map((d, idx) => {
          const x = 16 + idx * (barWidth + 8);
          const v1 = Math.max(0, d.value);
          const v2 = Math.max(0, d.secondary ?? 0);
          const h1 = (v1 / maxTotal) * (height - 16);
          const h2 = (v2 / maxTotal) * (height - 16);
          const y1 = height - h1;
          const y2 = y1 - h2;
          return (
            <g key={`${d.label}-${idx}`}>
              <rect
                x={x}
                y={y1}
                width={barWidth}
                height={Math.max(1, h1)}
                rx={3}
                fill="var(--page-accent)"
                fillOpacity={0.85}
              >
                <title>{`${d.label}: ${v1.toLocaleString()}`}</title>
              </rect>
              {h2 > 0 && (
                <rect
                  x={x}
                  y={y2}
                  width={barWidth}
                  height={Math.max(1, h2)}
                  rx={3}
                  fill="var(--page-accent-2)"
                  fillOpacity={0.88}
                >
                  <title>{`${d.label} (${secondaryLabel}): ${v2.toLocaleString()}`}</title>
                </rect>
              )}
              {(data.length <= 16 || idx % Math.ceil(data.length / 10) === 0) && (
                <text
                  x={x + barWidth / 2}
                  y={height + 16}
                  textAnchor="middle"
                  className="fill-slate-500 dark:fill-slate-400"
                  fontSize="10"
                >
                  {d.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
};
