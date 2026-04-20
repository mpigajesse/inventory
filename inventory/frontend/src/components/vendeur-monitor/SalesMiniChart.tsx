import React, { useId } from 'react';

interface SalesMiniChartProps {
  data: number[];
  color?: string;
  height?: number;
  width?: number;
  filled?: boolean;
  showDots?: boolean;
}

function normalizePoints(
  data: number[],
  width: number,
  height: number
): { x: number; y: number }[] {
  const padding = 4;
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min;

  return data.map((value, index) => {
    const x = padding + (index / (data.length - 1)) * innerWidth;
    const normalizedY = range === 0 ? 0.5 : (value - min) / range;
    // SVG y-axis is inverted: 0 at top, height at bottom
    const y = padding + (1 - normalizedY) * innerHeight;
    return { x, y };
  });
}

function buildSmoothPath(points: { x: number; y: number }[]): string {
  if (points.length === 1) {
    return `M ${points[0].x} ${points[0].y}`;
  }

  const parts: string[] = [`M ${points[0].x} ${points[0].y}`];

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cpX = (prev.x + curr.x) / 2;
    parts.push(`C ${cpX} ${prev.y}, ${cpX} ${curr.y}, ${curr.x} ${curr.y}`);
  }

  return parts.join(' ');
}

function buildAreaPath(
  points: { x: number; y: number }[],
  width: number,
  height: number
): string {
  const padding = 4;
  const bottomY = height - padding;
  const linePath = buildSmoothPath(points);
  const firstX = points[0].x;
  const lastX = points[points.length - 1].x;
  return `${linePath} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
}

export function SalesMiniChart({
  data,
  color = 'hsl(22 72% 48%)',
  height = 40,
  width = 120,
  filled = true,
  showDots = false,
}: SalesMiniChartProps): React.ReactElement | null {
  // useId produces a stable, unique ID per component instance (React 18).
  // Math.random() in useMemo was stable per instance but could theoretically
  // collide when two charts mount simultaneously on the same frame.
  const reactId = useId();
  const gradientId = `sparkline-gradient-${reactId.replace(/:/g, '')}`;

  if (!data || data.length === 0) {
    return null;
  }

  if (data.length === 1) {
    const midY = height / 2;
    const padding = 4;
    return (
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        style={{ maxWidth: '100%', display: 'block' }}
      >
        <line
          x1={padding}
          y1={midY}
          x2={width - padding}
          y2={midY}
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
        />
        <circle cx={width - padding} cy={midY} r={4} fill={color} />
      </svg>
    );
  }

  const allZero = data.every((v) => v === 0);

  if (allZero) {
    const midY = height / 2;
    const padding = 4;
    return (
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        style={{ maxWidth: '100%', display: 'block' }}
      >
        <line
          x1={padding}
          y1={midY}
          x2={width - padding}
          y2={midY}
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeOpacity={0.5}
        />
        <circle cx={width - padding} cy={midY} r={4} fill={color} />
      </svg>
    );
  }

  const points = normalizePoints(data, width, height);
  const linePath = buildSmoothPath(points);
  const areaPath = filled ? buildAreaPath(points, width, height) : null;
  const lastPoint = points[points.length - 1];

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {filled && (
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.2} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
      )}

      {filled && areaPath && (
        <path d={areaPath} fill={`url(#${gradientId})`} />
      )}

      <path
        d={linePath}
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {showDots &&
        points.slice(0, -1).map((point, index) => (
          <circle
            key={index}
            cx={point.x}
            cy={point.y}
            r={2.5}
            fill={color}
            fillOpacity={0.5}
          />
        ))}

      <circle cx={lastPoint.x} cy={lastPoint.y} r={4} fill={color} />
    </svg>
  );
}

export default SalesMiniChart;
