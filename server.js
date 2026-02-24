import express from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'
import { generateSiteFromProject } from './scripts/render-project.mjs'
import { startUpdateChecker, getDownloadStatus } from './update-checker.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = 5174

app.use(express.json())
app.use(express.static(path.join(__dirname, 'dist')))
app.use(express.static(path.join(__dirname, 'public')))

function toSlug(name) {
  return name
    .toLowerCase()
    .replace(/^yatra\s+mesh\s+/i, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}

// Download bar is injected as a client-side script so it always reflects
// the current download status without requiring a site regeneration.
const DOWNLOAD_BAR_SCRIPT = `
<div id="_dl-bar" style="display:none;position:fixed;bottom:0;left:0;right:0;z-index:9999;background:rgba(8,10,20,0.92);backdrop-filter:blur(8px);border-top:1px solid #1e2d50;padding:10px 20px;align-items:center;gap:12px;flex-wrap:wrap;font-family:sans-serif">
  <span style="color:#8b9cbc;font-size:12px;text-transform:uppercase;letter-spacing:.08em;font-weight:600">Downloads</span>
  <span id="_dl-links" style="display:contents"></span>
</div>
<script>
fetch('/api/downloads/status').then(function(r){return r.json()}).then(function(items){
  var avail=items.filter(function(d){return d.available});
  if(!avail.length)return;
  var svg='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';
  document.getElementById('_dl-links').innerHTML=avail.map(function(d){
    return '<a href="'+d.downloadPath+'" download style="display:inline-flex;align-items:center;gap:6px;background:#1a2540;color:#7eb8f7;border:1px solid #2a3a60;padding:6px 14px;border-radius:6px;text-decoration:none;font-size:13px;font-weight:500;white-space:nowrap">'+svg+d.label+(d.tag?'<span style="opacity:.6;font-size:11px;margin-left:4px">'+d.tag+'</span>':'')+'</a>';
  }).join('');
  var bar=document.getElementById('_dl-bar');
  bar.style.display='flex';
  document.body.style.paddingBottom='52px';
}).catch(function(){});
<\/script>`

function buildHtml(name, html, css) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${name}</title>
  <link rel="stylesheet" href="/fonts/fonts.css">
  <style>${css}</style>
</head>
<body>
${html}
${DOWNLOAD_BAR_SCRIPT}
</body>
</html>`
}

function generateSiteFiles(pages) {
  const siteDir = path.join(__dirname, 'public', 'site')
  fs.mkdirSync(siteDir, { recursive: true })
  pages.forEach((page, index) => {
    const slug = index === 0 ? 'index' : toSlug(page.name)
    fs.writeFileSync(path.join(siteDir, `${slug}.html`), buildHtml(page.name, page.html, page.css))
  })
}

function autoCommit() {
  try {
    execSync('git add -A', { cwd: __dirname })
    const date = new Date().toISOString()
    execSync(`git commit -m "Auto-save: ${date}"`, { cwd: __dirname })
    console.log(`Auto-committed at ${date}`)
  } catch (err) {
    console.error('Auto-commit failed:', err.message)
  }
}

app.post('/api/save-project', (req, res) => {
  const { project, pages } = req.body
  const filePath = path.join(__dirname, 'public', 'gjs-project.grapesjs')
  fs.writeFileSync(filePath, JSON.stringify(project, null, 2))
  if (pages?.length) {
    generateSiteFiles(pages)
    console.log(`[save] Site generated: ${pages.length} pages`)
  }
  autoCommit()
  res.json({ success: true })
})

app.get('/editor', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'editor.html'))
})

// Download routes – serve locally cached release assets
const downloadsDir = path.join(__dirname, 'public', 'downloads')

app.get('/downloads/columba.apk', (req, res) => {
  const file = path.join(downloadsDir, 'columba-universal.apk')
  if (!fs.existsSync(file)) return res.status(404).json({ error: 'Not yet downloaded' })
  res.download(file, 'columba-universal.apk')
})

app.get('/downloads/meshchat-windows.exe', (req, res) => {
  const file = path.join(downloadsDir, 'meshchat-win-portable.exe')
  if (!fs.existsSync(file)) return res.status(404).json({ error: 'Not yet downloaded' })
  res.download(file, 'meshchat-win-portable.exe')
})

app.get('/downloads/meshchat-mac.dmg', (req, res) => {
  const file = path.join(downloadsDir, 'meshchat-mac.dmg')
  if (!fs.existsSync(file)) return res.status(404).json({ error: 'Not yet downloaded' })
  res.download(file, 'meshchat-mac.dmg')
})

app.get('/downloads/meshchat-linux.AppImage', (req, res) => {
  const file = path.join(downloadsDir, 'meshchat-linux.AppImage')
  if (!fs.existsSync(file)) return res.status(404).json({ error: 'Not yet downloaded' })
  res.download(file, 'meshchat-linux.AppImage')
})

app.get('/api/downloads/status', (req, res) => {
  res.json(getDownloadStatus())
})

const placeholder = `<!doctype html><html><body style="font-family:sans-serif;padding:2rem;background:#0b0b13;color:#eaeaf1"><p>Site not yet published. <a href="/editor" style="color:#47b3ff">Open editor →</a></p></body></html>`

app.get('/:slug?', (req, res) => {
  const slug = req.params.slug || 'index'
  const filePath = path.join(__dirname, 'public', 'site', `${slug}.html`)
  if (fs.existsSync(filePath)) {
    return res.sendFile(filePath)
  }
  if (!req.params.slug) {
    res.send(placeholder)
  } else {
    res.status(404).send(placeholder)
  }
})

// Generate site from project JSON on startup if public/site/ is missing
const siteDir = path.join(__dirname, 'public', 'site')
const projectPath = path.join(__dirname, 'public', 'gjs-project.grapesjs')
if (!fs.existsSync(siteDir) && fs.existsSync(projectPath)) {
  try {
    const n = generateSiteFromProject(projectPath, siteDir)
    console.log(`[site] Generated ${n} pages from project JSON`)
  } catch (err) {
    console.error('[site] Failed to generate site on startup:', err.message)
  }
}

// Start release update checker (runs immediately, then every 30 minutes)
startUpdateChecker()

app.listen(PORT, () => {
  console.log(`Site:   http://localhost:${PORT}`)
  console.log(`Editor: http://localhost:${PORT}/editor`)
})
