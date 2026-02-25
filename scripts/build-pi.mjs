/**
 * Pi static build script.
 * Regenerates public/site/*.html from the GrapesJS project JSON,
 * strips dev/API-only blocks, and writes clean HTML to public/.
 *
 * Usage: npm run build:pi  (or: node scripts/build-pi.mjs)
 * Serve: cd public && python3 -m http.server 8000
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { generateSiteFromProject } from './render-project.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const PROJECT_PATH = path.join(ROOT, 'public', 'gjs-project.grapesjs')
const SITE_DIR = path.join(ROOT, 'public', 'site')
const OUT_DIR = path.join(ROOT, 'public')

// Matches: <div id="_dl-bar"...></div><script>...</script>
// The block calls /api/downloads/status which doesn't exist on the Pi.
const DL_BAR_RE = /<div id="_dl-bar"[\s\S]*?<\/script>/g

// Matches: <script>(function(){var h='';...})()</script>
// This polls /api/site-hash for dev live-reload — not present on the Pi.
const DEV_RELOAD_RE = /<script>\(function\(\)\{var h='';[\s\S]*?\}\)\(\)<\/script>/g

// Step 1: regenerate public/site/*.html fresh from the GrapesJS project JSON.
console.log('Step 1: Regenerating public/site/ from project JSON…')
const pageCount = generateSiteFromProject(PROJECT_PATH, SITE_DIR)
console.log(`  Generated ${pageCount} page(s) in ${SITE_DIR}`)

// Step 2: read each .html, strip dev/API blocks, write to public/.
console.log('Step 2: Stripping dev/API blocks and writing to public/…')
const htmlFiles = fs.readdirSync(SITE_DIR).filter(f => f.endsWith('.html'))

for (const file of htmlFiles) {
  const src = fs.readFileSync(path.join(SITE_DIR, file), 'utf8')
  const clean = src
    .replace(DL_BAR_RE, '')
    .replace(DEV_RELOAD_RE, '')
    // Collapse any runs of 3+ blank lines left by the removals.
    .replace(/\n{3,}/g, '\n\n')
  fs.writeFileSync(path.join(OUT_DIR, file), clean)
  console.log(`  public/${file}`)
}

console.log(`\nDone. ${htmlFiles.length} file(s) written to ${OUT_DIR}`)
console.log('Serve with: cd public && python3 -m http.server 8000')
