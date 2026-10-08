/**
 * Lightweight SVG charts — no charting dependency, fully responsive,
 * accessible via <title>/<desc>, and styled with the design system.
 */

import { useMemo, useState } from 'react'

const W = 560
const H = 200
const PAD = { l: 34, r: 12, t: 14, b: 26 }

/* ------------------------------------------------------- line chart */

export function LineChart({ points = [], title = 'Trend', unit = '%' }) {
  const [hover, setHover] = useState(null)
  const data = points.length ? points : [{ label: '—', value: 0 }]

  const { x, y, path, area, min, max } = useMemo(() => {
    const innerW = W - PAD.l - PAD.r
    const innerH = H - PAD.t - PAD.b
    const vals = data.map((p) => p.value)
    const lo = Math.max(0, Math.min(...vals) - 8)
    const hi = Math.min(100, Math.max(...vals) + 8, 100)
    const span = Math.max(1, hi - lo)
    const xs = data.map((_, i) => PAD.l + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW))
    const ys = data.map((v) => PAD.t + innerH - ((v.value - lo) / span) * innerH)
    const d = xs.map((px, i) => `${i ? 'L' : 'M'}${px.toFixed(1)},${ys[i].toFixed(1)}`).join(' ')
    return {
      x: xs,
      y: ys,
      path: d,
      area: `${d} L${xs[xs.length - 1].toFixed(1)},${H - PAD.b} L${xs[0].toFixed(1)},${H - PAD.b} Z`,
      min: lo,
      max: hi,
    }
  }, [data])

  return (
    <figure className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={title}>
        <title>{title}</title>
        <defs>
          <linearGradient id="lg-brand" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3563f5" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#3563f5" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {[0, 0.5, 1].map((t) => {
          const gy = PAD.t + (H - PAD.t - PAD.b) * t
          const val = Math.round(max - (max - min) * t)
          return (
            <g key={t}>
              <line x1={PAD.l} y1={gy} x2={W - PAD.r} y2={gy} stroke="#eceef6" strokeWidth="1" />
              <text x={PAD.l - 8} y={gy + 3} fontSize="9" fill="#b0b8d4" textAnchor="end">
                {val}
              </text>
            </g>
          )
        })}

        <path d={area} fill="url(#lg-brand)" />
        <path d={path} fill="none" stroke="#3563f5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

        {data.map((p, i) => (
          <g key={i}>
            <circle
              cx={x[i]}
              cy={y[i]}
              r={hover === i ? 6 : 4}
              fill="#fff"
              stroke="#3563f5"
              strokeWidth="2.5"
              className="transition-all"
            />
            <rect
              x={x[i] - 16}
              y={PAD.t}
              width={32}
              height={H - PAD.t - PAD.b}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            />
            {hover === i && (
              <text
                x={Math.min(W - 60, Math.max(PAD.l, x[i]))}
                y={y[i] - 12}
                fontSize="11"
                fontWeight="700"
                fill="#0f1223"
                textAnchor="middle"
              >
                {p.value}
                {unit}
              </text>
            )}
          </g>
        ))}

        {data.map((p, i) =>
          data.length <= 8 || i % Math.ceil(data.length / 6) === 0 ? (
            <text key={`l${i}`} x={x[i]} y={H - 8} fontSize="9" fill="#8590b9" textAnchor="middle">
              {p.label}
            </text>
          ) : null
        )}
      </svg>
      <figcaption className="sr-only">{title}</figcaption>
    </figure>
  )
}

/* ------------------------------------------------------ bar chart */

export function BarChart({ data = [], title = 'Comparison', unit = '%' }) {
  const [hover, setHover] = useState(null)
  const maxVal = Math.max(100, ...data.map((d) => d.value))
  return (
    <figure className="w-full">
      <div className="flex h-44 items-end gap-2" role="img" aria-label={title}>
        <title>{title}</title>
        {data.map((d, i) => (
          <div
            key={i}
            className="group relative flex h-full flex-1 flex-col justify-end"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          >
            <span
              className={`absolute left-1/2 -translate-x-1/2 -top-1 whitespace-nowrap rounded-md bg-night px-2 py-1 text-[10px] font-bold text-white transition ${
                hover === i ? 'opacity-100' : 'opacity-0'
              }`}
            >
              {d.value}
              {unit}
            </span>
            <div
              className="w-full rounded-t-md transition-all duration-500"
              style={{
                height: `${Math.max(3, (d.value / maxVal) * 100)}%`,
                background: d.color || '#3563f5',
                opacity: hover === null || hover === i ? 1 : 0.45,
              }}
            />
            <span className="mt-2 block truncate text-center text-[10px] font-semibold text-ink-500" title={d.label}>
              {d.label}
            </span>
          </div>
        ))}
      </div>
      <figcaption className="sr-only">{title}</figcaption>
    </figure>
  )
}

/* --------------------------------------------------- donut / ring */

export function ProgressRing({ value = 0, size = 132, stroke = 12, label = 'score', color }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(100, value))
  const fill = color || (pct >= 75 ? '#22c55e' : pct >= 50 ? '#f97316' : '#ef4444')

  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" role="img" aria-label={`${label}: ${Math.round(pct)}%`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#eceef6" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={fill}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (pct / 100) * c}
          className="transition-[stroke-dashoffset] duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center leading-none">
        <div>
          <div className="text-3xl font-extrabold text-ink-900">{Math.round(pct)}%</div>
          <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-ink-400">{label}</div>
        </div>
      </div>
    </div>
  )
}

export function Donut({ segments = [], size = 140, stroke = 18, centerLabel, centerSub }) {
  const total = segments.reduce((a, s) => a + s.value, 0) || 1
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  let offset = 0

  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" role="img" aria-label={centerLabel || 'chart'}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#eceef6" strokeWidth={stroke} />
        {segments.map((s, i) => {
          const len = (s.value / total) * c
          const el = (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={stroke}
              strokeDasharray={`${len} ${c - len}`}
              strokeDashoffset={-offset}
              className="transition-all duration-700"
            >
              <title>{`${s.label}: ${s.value}`}</title>
            </circle>
          )
          offset += len
          return el
        })}
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center leading-none">
        <div>
          <div className="text-xl font-extrabold text-ink-900">{centerLabel}</div>
          {centerSub && <div className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-ink-400">{centerSub}</div>}
        </div>
      </div>
    </div>
  )
}

/* --------------------------------------------------- horizontal bars */

export function HBars({ data = [], unit = '%' }) {
  return (
    <ul className="space-y-3.5">
      {data.map((d, i) => (
        <li key={i}>
          <div className="mb-1.5 flex items-baseline justify-between gap-3">
            <span className="truncate text-sm font-semibold text-ink-700">{d.label}</span>
            <span className="shrink-0 text-sm font-bold text-ink-900">
              {d.display ?? `${d.value}${unit}`}
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-ink-100">
            <div
              className="h-full rounded-full transition-[width] duration-700 ease-out"
              style={{ width: `${Math.max(2, Math.min(100, d.value))}%`, background: d.color || '#3563f5' }}
            />
          </div>
          {d.hint && <p className="mt-1 text-[11px] text-ink-400">{d.hint}</p>}
        </li>
      ))}
    </ul>
  )
}
