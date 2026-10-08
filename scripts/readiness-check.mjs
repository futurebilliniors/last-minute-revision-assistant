const BASE = 'http://localhost:3001'
let cookie = ''
async function call(path, opts = {}) {
  const res = await fetch(`${BASE}/api${path}`, {
    method: opts.method || 'GET',
    headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  })
  ;(res.headers.getSetCookie?.() || []).forEach((c) => { if (c.startsWith('lmr_token=')) cookie = c.split(';')[0] })
  return res.json()
}
await call('/auth/demo', { method: 'POST' })
const r = await call('/readiness')
console.log('score:', r.score)
console.log(r.components.map((c) => `  ${c.key.padEnd(10)} value=${String(c.value).padStart(3)} weight=${c.weight}  ${c.display}`).join('\n'))
console.log('grade:', r.grade)
