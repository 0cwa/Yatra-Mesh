import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { generateSiteFromProject } from './scripts/render-project.mjs'
import { startUpdateChecker, getDownloadStatus } from './update-checker.mjs'

function toSlug(name) {
  return name
    .toLowerCase()
    .replace(/^yatra\s+mesh\s+/i, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}

function buildHtml(name, html, css, devReload = false) {
  const reloadScript = devReload
    ? `<script>(function(){var h='';function c(){fetch('/api/site-hash').then(function(r){return r.text()}).then(function(n){if(h&&h!==n){location.reload()}h=n}).catch(function(){})}setInterval(c,2000);c()})()</script>`
    : ''
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
${reloadScript}
</body>
</html>`
}

function generateSiteFiles(pages, isDev = false) {
  const siteDir = path.join(import.meta.dirname, 'public', 'site')
  fs.mkdirSync(siteDir, { recursive: true })
  pages.forEach((page, index) => {
    const slug = index === 0 ? 'index' : toSlug(page.name)
    const filename = `${slug}.html`
    fs.writeFileSync(path.join(siteDir, filename), buildHtml(page.name, page.html, page.css, isDev))
  })
}

const saveProjectPlugin = {
  name: 'save-project',
  configureServer(server) {
    // Generate site from project JSON on startup if public/site/ is missing
    const siteDir = path.join(import.meta.dirname, 'public', 'site')
    const projectPath = path.join(import.meta.dirname, 'public', 'gjs-project.grapesjs')
    if (!fs.existsSync(siteDir) && fs.existsSync(projectPath)) {
      try {
        const n = generateSiteFromProject(projectPath, siteDir, true)
        console.log(`[site] Generated ${n} pages from project JSON`)
      } catch (err) {
        console.error('[site] Failed to generate site on startup:', err.message)
      }
    }

    // Start release update checker
    startUpdateChecker()

    // Route /editor → /editor.html
    server.middlewares.use((req, res, next) => {
      if (req.url === '/editor' || req.url === '/editor/') {
        req.url = '/editor.html'
      }
      next()
    })

    // Serve generated static site pages
    server.middlewares.use((req, res, next) => {
      const url = req.url.split('?')[0]
      let filePath

      if (url === '/' || url === '/index.html') {
        filePath = path.join(import.meta.dirname, 'public', 'site', 'index.html')
      } else if (/^\/[a-z0-9-]+$/.test(url)) {
        const slug = url.slice(1)
        const candidate = path.join(import.meta.dirname, 'public', 'site', `${slug}.html`)
        if (fs.existsSync(candidate)) filePath = candidate
      }

      if (filePath && fs.existsSync(filePath)) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8')
        res.end(fs.readFileSync(filePath))
        return
      }
      next()
    })

    // Site hash endpoint for dev auto-reload
    server.middlewares.use('/api/site-hash', (req, res) => {
      const siteDir = path.join(import.meta.dirname, 'public', 'site')
      let hash = 'empty'
      if (fs.existsSync(siteDir)) {
        const files = fs.readdirSync(siteDir).sort()
        const combined = files
          .map(f => `${f}:${fs.statSync(path.join(siteDir, f)).mtimeMs}`)
          .join(',')
        hash = crypto.createHash('md5').update(combined).digest('hex')
      }
      res.setHeader('Content-Type', 'text/plain')
      res.end(hash)
    })

    // Download status endpoint
    server.middlewares.use('/api/downloads/status', (req, res) => {
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify(getDownloadStatus()))
    })

    // Download file routes
    // Explicit MIME types prevent browser content-sniffing: APK/EXE/DMG are ZIP-based
    // binary formats and without a proper Content-Type, Android sniffs them as
    // application/zip and appends ".zip" to the filename.
    const downloadRoutes = {
      '/downloads/columba.apk':            { file: 'columba-universal.apk',         mime: 'application/vnd.android.package-archive' },
      '/downloads/meshchat-windows.exe':   { file: 'meshchat-win-portable.exe',     mime: 'application/octet-stream' },
      '/downloads/meshchat-mac.dmg':       { file: 'meshchat-mac.dmg',              mime: 'application/x-apple-diskimage' },
      '/downloads/meshchat-linux.AppImage':{ file: 'meshchat-linux.AppImage',       mime: 'application/octet-stream' },
    }
    server.middlewares.use((req, res, next) => {
      const urlPath = req.url.split('?')[0]
      const route = downloadRoutes[urlPath]
      if (route) {
        const filePath = path.join(import.meta.dirname, 'public', 'downloads', route.file)
        if (!fs.existsSync(filePath)) {
          res.statusCode = 404
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Not yet downloaded' }))
          return
        }
        const size = fs.statSync(filePath).size
        // Use writeHead to commit headers atomically, preventing any upstream
        // middleware (e.g. compression) from adding Content-Encoding and causing
        // the browser to save the file with a wrong extension.
        res.writeHead(200, {
          'Content-Type': route.mime,
          'Content-Disposition': `attachment; filename="${route.file}"`,
          'Content-Length': size,
          'X-Content-Type-Options': 'nosniff',
          'Cache-Control': 'no-transform',
        })
        fs.createReadStream(filePath).pipe(res)
        return
      }
      next()
    })

    // Save project + generate static site
    server.middlewares.use('/api/save-project', async (req, res) => {
      if (req.method !== 'POST') {
        res.writeHead(405).end()
        return
      }
      let body = ''
      req.on('data', chunk => { body += chunk })
      req.on('end', () => {
        try {
          const { project } = JSON.parse(body)
          const projectFilePath = path.join(import.meta.dirname, 'public', 'gjs-project.grapesjs')
          const siteDir = path.join(import.meta.dirname, 'public', 'site')
          fs.writeFileSync(projectFilePath, JSON.stringify(project, null, 2))
          const n = generateSiteFromProject(projectFilePath, siteDir, true)
          console.log(`[save] Site generated: ${n} pages`)
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ success: true }))
        } catch (err) {
          console.error('[save] Error:', err)
          res.writeHead(500, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: err.message }))
        }
      })
    })
  }
}

export default defineConfig({
  plugins: [react(), saveProjectPlugin],
  server: {
    port: 5173,
    host: true,
  },
  build: {
    rollupOptions: {
      input: {
        editor: path.resolve(import.meta.dirname, 'editor.html'),
      }
    }
  }
})
