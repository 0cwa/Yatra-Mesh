import express from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'

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

app.listen(PORT, () => {
  console.log(`Site:   http://localhost:${PORT}`)
  console.log(`Editor: http://localhost:${PORT}/editor`)
})
