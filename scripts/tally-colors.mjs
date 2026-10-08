// One-off audit: which hard-coded light-mode colors exist in src (for dark mode planning).
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const walk = (d) =>
  readdirSync(d, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]
  )

const tally = {}
const bgWhite = {}
const whiteTextOn = {}

for (const f of walk('src')) {
  if (!f.endsWith('.jsx')) continue
  const src = readFileSync(f, 'utf8')
  const classes = src.match(/className=\{?[\`"']([^\`"']*)[\`"']/g) || []
  for (const decl of classes) {
    const inner = decl.replace(/^className=\{?[\`"']/, '').replace(/[\`"']$/, '')
    for (const t of inner.split(/\s+/)) {
      if (/^(?:bg|text|ring|border|hover:bg|hover:text|from|to|via)-(?:red|orange|yellow|green|blue|purple|pink|teal|indigo)-\d/.test(t))
        tally[t] = (tally[t] || 0) + 1
      if (/^bg-white/.test(t)) bgWhite[t] = (bgWhite[t] || 0) + 1
      if (/^text-white/.test(t)) whiteTextOn[t] = (whiteTextOn[t] || 0) + 1
    }
  }
}

console.log('--- built-in color classes ---')
console.log(Object.entries(tally).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}: ${v}`).join('\n'))
console.log('\n--- bg-white variants ---')
console.log(Object.entries(bgWhite).map(([k, v]) => `${k}: ${v}`).join(', '))
console.log('\n--- text-white variants ---')
console.log(Object.entries(whiteTextOn).map(([k, v]) => `${k}: ${v}`).join(', '))
