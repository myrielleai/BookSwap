import React, { useId } from 'react';

/*
 * BookSwap logo: two leather-bound books, caramel and moss, with arrows
 * passing between them. The grain is SVG noise multiplied over the covers;
 * stitching, a raised spine, and a cream page edge finish the bound-book look.
 * public/favicon.svg is the same drawing on a parchment tile.
 */
const BrandLogo = ({ className = 'w-10 h-10', withTile = false }) => {
  // useId gives ":r0:"; colons break url(#...) references, so strip them.
  const id = useId().replace(/:/g, '');
  const ref = (name) => `url(#${name}-${id})`;

  return (
    <svg viewBox="0 0 64 64" className={className} role="img" aria-label="BookSwap logo">
      <defs>
        <filter id={`grain-${id}`} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="1.6" numOctaves="2" seed="7" result="noise" />
          <feColorMatrix in="noise" type="matrix" values="0 0 0 0 0.18  0 0 0 0 0.1  0 0 0 0 0.04  0 0 0 -1.6 1.05" result="specks" />
          <feComposite in="specks" in2="SourceGraphic" operator="in" result="grain" />
          <feMerge>
            <feMergeNode in="SourceGraphic" />
            <feMergeNode in="grain" />
          </feMerge>
        </filter>
        <linearGradient id={`caramel-${id}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#8a5a2b" />
          <stop offset="0.45" stopColor="#c08a50" />
          <stop offset="1" stopColor="#956536" />
        </linearGradient>
        <linearGradient id={`moss-${id}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#304b2c" />
          <stop offset="0.45" stopColor="#5c8b52" />
          <stop offset="1" stopColor="#3b5d36" />
        </linearGradient>
        <linearGradient id={`sheen-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff4de" stopOpacity="0.35" />
          <stop offset="0.5" stopColor="#fff4de" stopOpacity="0" />
          <stop offset="1" stopColor="#2a1608" stopOpacity="0.25" />
        </linearGradient>
        <marker id={`headBrown-${id}`} viewBox="0 0 10 10" refX="5" refY="5" markerWidth="1.7" markerHeight="1.7" orient="auto">
          <path d="M0 0 L10 5 L0 10 Z" fill="#5f3e23" />
        </marker>
        <marker id={`headMoss-${id}`} viewBox="0 0 10 10" refX="5" refY="5" markerWidth="1.7" markerHeight="1.7" orient="auto">
          <path d="M0 0 L10 5 L0 10 Z" fill="#304b2c" />
        </marker>
      </defs>

      {withTile && (
        <g>
          <rect x="1" y="1" width="62" height="62" rx="14" fill="#e8d5b3" />
          <rect x="1" y="1" width="62" height="62" rx="14" fill={ref('sheen')} />
          <rect x="4.5" y="4.5" width="55" height="55" rx="11" fill="none" stroke="#a8743f" strokeWidth="1" strokeDasharray="2.4 1.8" />
        </g>
      )}

      {/* Shadow the books stand on */}
      <ellipse cx="32" cy="50.5" rx="22" ry="2.6" fill="#4a301c" opacity="0.28" />

      {/* Caramel book */}
      <g>
        <rect x="27.6" y="18.6" width="3" height="29.8" rx="1" fill="#f3e7d3" stroke="#d6b483" strokeWidth="0.4" />
        <rect x="10" y="17" width="19" height="32" rx="3" fill={ref('caramel')} filter={ref('grain')} />
        <rect x="10" y="17" width="19" height="32" rx="3" fill={ref('sheen')} />
        <rect x="10" y="17" width="4.2" height="32" rx="2" fill="#6b4423" opacity="0.55" />
        <line x1="10.6" y1="23" x2="14.2" y2="23" stroke="#e6d0ac" strokeWidth="0.7" opacity="0.8" />
        <line x1="10.6" y1="43" x2="14.2" y2="43" stroke="#e6d0ac" strokeWidth="0.7" opacity="0.8" />
        <rect x="16.2" y="20" width="10.6" height="26" rx="1.6" fill="none" stroke="#fbeed6" strokeWidth="0.75" strokeDasharray="1.5 1.1" opacity="0.9" />
        <rect x="17.8" y="27" width="7.4" height="2" rx="0.6" fill="#5f3e23" opacity="0.45" />
        <rect x="17.8" y="26.6" width="7.4" height="2" rx="0.6" fill="#f3e7d3" opacity="0.55" />
      </g>

      {/* Moss book */}
      <g>
        <rect x="51.6" y="18.6" width="3" height="29.8" rx="1" fill="#f3e7d3" stroke="#d6b483" strokeWidth="0.4" />
        <rect x="34" y="17" width="19" height="32" rx="3" fill={ref('moss')} filter={ref('grain')} />
        <rect x="34" y="17" width="19" height="32" rx="3" fill={ref('sheen')} />
        <rect x="34" y="17" width="4.2" height="32" rx="2" fill="#263c24" opacity="0.55" />
        <line x1="34.6" y1="23" x2="38.2" y2="23" stroke="#c6d9bf" strokeWidth="0.7" opacity="0.8" />
        <line x1="34.6" y1="43" x2="38.2" y2="43" stroke="#c6d9bf" strokeWidth="0.7" opacity="0.8" />
        <rect x="40.2" y="20" width="10.6" height="26" rx="1.6" fill="none" stroke="#eef4e8" strokeWidth="0.75" strokeDasharray="1.5 1.1" opacity="0.9" />
        <rect x="41.8" y="27" width="7.4" height="2" rx="0.6" fill="#263c24" opacity="0.45" />
        <rect x="41.8" y="26.6" width="7.4" height="2" rx="0.6" fill="#e2ecdd" opacity="0.55" />
      </g>

      {/* Swap arrows: caramel book → moss book over the top, back underneath */}
      <path d="M18 13.5 Q32 2.5 45 11.5" fill="none" stroke="#5f3e23" strokeWidth="3.2" strokeLinecap="round" markerEnd={ref('headBrown')} />
      <path d="M18 13.5 Q32 2.5 45 11.5" fill="none" stroke="#d6b483" strokeWidth="0.9" strokeLinecap="round" opacity="0.7" />
      <path d="M46 55.5 Q32 63.5 19 56" fill="none" stroke="#304b2c" strokeWidth="3.2" strokeLinecap="round" markerEnd={ref('headMoss')} />
      <path d="M46 55.5 Q32 63.5 19 56" fill="none" stroke="#a0c095" strokeWidth="0.9" strokeLinecap="round" opacity="0.7" />
    </svg>
  );
};

export default BrandLogo;
