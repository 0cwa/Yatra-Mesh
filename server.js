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
  const { project } = req.body
  const filePath = path.join(__dirname, 'public', 'gjs-project.grapesjs')
  const siteDir = path.join(__dirname, 'public', 'site')
  fs.writeFileSync(filePath, JSON.stringify(project, null, 2))
  const n = generateSiteFromProject(filePath, siteDir)
  console.log(`[save] Site generated: ${n} pages`)
  autoCommit()
  res.json({ success: true })
})

app.get('/editor', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'editor.html'))
})

// Download routes – serve locally cached release assets
// Explicit MIME types prevent browser content-sniffing: APK/EXE/DMG are ZIP-based
// binary formats and without a proper Content-Type, Android sniffs them as
// application/zip and appends ".zip" to the filename.
// Cache-Control: no-transform tells any proxy/CDN not to re-encode the body.
const downloadsDir = path.join(__dirname, 'public', 'downloads')

const DOWNLOAD_ROUTES = {
  '/downloads/columba.apk':            { file: 'columba-universal.apk',     mime: 'application/vnd.android.package-archive' },
  '/downloads/meshchat-windows.exe':   { file: 'meshchat-win-portable.exe', mime: 'application/octet-stream' },
  '/downloads/meshchat-mac.dmg':       { file: 'meshchat-mac.dmg',          mime: 'application/x-apple-diskimage' },
  '/downloads/meshchat-linux.AppImage':{ file: 'meshchat-linux.AppImage',   mime: 'application/octet-stream' },
}

Object.entries(DOWNLOAD_ROUTES).forEach(([route, { file, mime }]) => {
  app.get(route, (req, res) => {
    const fullPath = path.join(downloadsDir, file)
    if (!fs.existsSync(fullPath)) return res.status(404).json({ error: 'Not yet downloaded' })
    res.set('Content-Type', mime)
    res.set('X-Content-Type-Options', 'nosniff')
    res.set('Cache-Control', 'no-transform')
    res.download(fullPath, file)
  })
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
