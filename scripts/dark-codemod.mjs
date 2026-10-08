// One-off codemod: convert hard-coded light-mode classes to theme-aware tokens.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const walk = (d) =>
  readdirSync(d, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]
  )

// Global class-level swaps (verified against every usage site).
const GLOBAL = [
  ['bg-white/15', '@@KEEP15@@'],        // overlay on permanently-dark gradient
  ['bg-white', 'bg-surface'],           // card/page surfaces must flip
  ['text-brand-600', 'text-brand-700'], // link/eyebrow text -> flipping shade
  ['text-brand-200', 'text-brand-300'],   // text on always-dark panels
  ['text-brand-100/90', 'text-white/80'], // paragraph on brand gradient
  ['bg-ink-900', 'bg-night'],             // dark bands stay dark both themes
  ['via-white', 'via-surface'],           // gradient mid-stop flips
]

const PER_FILE = {
  'src/pages/Revision.jsx': [['text-brand-500', 'text-brand-700']],
  'src/pages/Analysis.jsx': [['from-brand-600 to-brand-800', 'from-brand-600 to-night']],
  'src/components/charts.jsx': [
    ['stroke="#eceef6"', 'stroke="rgb(var(--chart-track))"'],
    ['fill="#eceef6"', 'fill="rgb(var(--chart-track))"'],
    ['fill="#b0b8d4"', 'fill="rgb(var(--chart-axis))"'],
    ['fill="#8590b9"', 'fill="rgb(var(--chart-muted))"'],
    ['fill="#0f1223"', 'fill="rgb(var(--chart-label))"'],
    ['fill="#fff"', 'fill="rgb(var(--chart-dot))"'],
  ],
}

let changed = 0
for (const f of walk('src')) {
  if (!f.endsWith('.jsx')) continue
  const before = readFileSync(f, 'utf8')
  let src = before
  for (const [a, b] of GLOBAL) src = src.split(a).join(b)
  for (const [a, b] of PER_FILE[f] || []) src = src.split(a).join(b)
  src = src.split('@@KEEP15@@').join('bg-white/15')
  if (src !== before) {
    writeFileSync(f, src)
    changed++
    console.log('updated', f)
  }
}
console.log(`${changed} files updated`)
