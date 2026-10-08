/**
 * Production entry point: `npm start`
 * Sets NODE_ENV before the app boots so the Express static handler
 * serves the Vite build from /dist.
 */
process.env.NODE_ENV = process.env.NODE_ENV || 'production'
await import('./src/index.js')
