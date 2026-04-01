/**
 * Build script for GitHub Pages deployment.
 *
 * - Uses the checked-in site HTML from public/site/
 * - Fetches the latest real download URLs from GitHub Releases
 * - Replaces local /downloads/* paths with the actual GitHub asset URLs
 * - Strips dev-only scripts (/api/site-hash, /api/downloads/status)
 * - Rewrites absolute asset/nav paths to relative ones (works at any base URL)
 * - Copies all static assets into dist-gh-pages/
 *
 * Usage:
 *   node scripts/build-github-pages.mjs
 *   GITHUB_TOKEN=... node scripts/build-github-pages.mjs
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { generateSiteFromProject } from './render-project.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

// Mirror the app definitions from update-checker.mjs (without the local-caching logic)
const APPS = [
  {
    id: 'columba',
    repo: 'torlando-tech/columba',
    includePrereleases: true,
    pickAsset: (assets) => assets.find(a => a.name.endsWith('universal.apk') && !a.name.includes('no-sentry')),
    localPath: '/downloads/columba.apk',
  },
  {
    id: 'meshchat-windows',
    repo: 'liamcottle/reticulum-meshchat',
    includePrereleases: false,
    pickAsset: (assets) => assets.find(a => a.name.includes('win-portable')),
    localPath: '/downloads/meshchat-windows.exe',
  },
  {
    id: 'meshchat-mac',
    repo: 'liamcottle/reticulum-meshchat',
    includePrereleases: false,
    pickAsset: (assets) => assets.find(a => a.name.endsWith('-mac.dmg')),
    localPath: '/downloads/meshchat-mac.dmg',
  },
  {
    id: 'meshchat-linux',
    repo: 'liamcottle/reticulum-meshchat',
    includePrereleases: false,
    pickAsset: (assets) => assets.find(a => a.name.endsWith('-linux.AppImage')),
    localPath: '/downloads/meshchat-linux.AppImage',
  },
]

async function fetchReleases(repo) {
  const url = `https://api.github.com/repos/${repo}/releases?per_page=10`
  const headers = { 'User-Agent': 'yatra-mesh-gh-pages-builder/1.0' }
  if (process.env.GITHUB_TOKEN) headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`
  const res = await fetch(url, { headers })
  if (!res.ok) throw new Error(`GitHub API ${res.status} for ${repo}`)
  return res.json()
}

async function resolveDownloadUrls() {
  // Deduplicate: MeshChat has 3 apps from one repo — fetch in parallel
  const [columbaReleases, meshchatReleases] = await Promise.all([
    fetchReleases('torlando-tech/columba'),
    fetchReleases('liamcottle/reticulum-meshchat'),
  ])

  const urls = {}
  for (const app of APPS) {
    const releases = app.repo === 'torlando-tech/columba' ? columbaReleases : meshchatReleases
    const eligible = app.includePrereleases ? releases : releases.filter(r => !r.prerelease)
    const latest = eligible[0]
    if (!latest) {
      console.warn(`[gh-pages] ${app.id}: no eligible releases found`)
      urls[app.localPath] = null
      continue
    }
    const asset = app.pickAsset(latest.assets)
    urls[app.localPath] = asset?.browser_download_url ?? null
    if (urls[app.localPath]) {
      console.log(`[gh-pages] ${app.id} ${latest.tag_name} → ${urls[app.localPath]}`)
    } else {
      console.warn(`[gh-pages] ${app.id}: no matching asset in ${latest.tag_name}`)
    }
  }
  return urls
}

function fixHtml(html, downloadUrls) {
  let out = html

  // Replace local download paths with real GitHub release URLs
  for (const [localPath, ghUrl] of Object.entries(downloadUrls)) {
    if (ghUrl) out = out.split(`href="${localPath}"`).join(`href="${ghUrl}"`)
  }

  // Remove the download bar div + its fetch('/api/downloads/status') script
  out = out.replace(/<div id="_dl-bar"[\s\S]*?<\/script>/, '')

  // Remove the dev auto-reload script (fetch('/api/site-hash'))
  out = out.replace(/<script>\(function\(\)\{var h='';[\s\S]*?<\/script>/, '')

  // Rewrite nav and footer links to relative HTML paths
  out = out.replace(/href="\/"/g, 'href="./index.html"')
  out = out.replace(/href="\/schedule"/g, 'href="./schedule.html"')
  out = out.replace(/href="\/help#([^"]+)"/g, 'href="./help.html#$1"')
  out = out.replace(/href="\/help"/g, 'href="./help.html"')

  // Rewrite absolute asset paths to relative
  out = out.replace(/href="\/fonts\//g, 'href="./fonts/')
  out = out.replace(/src="\/icons\//g, 'src="./icons/')
  out = out.replace(/src="\/columba-logo\.svg"/g, 'src="./columba-logo.svg"')
  out = out.replace(/src="\/meshchat-logo\.png"/g, 'src="./meshchat-logo.png"')
  // Fix missing psychedelic-logo-48.png (stored in images/, referenced from icons/)
  out = out.replace(/src="\.\/icons\/psychedelic-logo-48\.png"/g, 'src="./images/psychedelic-logo-48.png"')
  out = out.replace(/src="\/icons\/psychedelic-logo-48\.png"/g, 'src="./images/psychedelic-logo-48.png"')

  return out
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true })
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)
    if (entry.isDirectory()) copyDir(srcPath, destPath)
    else fs.copyFileSync(srcPath, destPath)
  }
}

async function main() {
  const projectPath = path.join(ROOT, 'public', 'gjs-project.grapesjs')
  const siteDir = path.join(ROOT, 'public', 'site')
  const outDir = path.join(ROOT, 'dist-gh-pages')

  // Prefer the checked-in site HTML from the deployment snapshot.
  // Only regenerate from the GrapesJS project if public/site/ is missing.
  if (!fs.existsSync(siteDir)) {
    if (fs.existsSync(projectPath)) {
      const n = generateSiteFromProject(projectPath, siteDir)
      console.log(`[gh-pages] Generated ${n} pages from project JSON`)
    } else {
      console.error('[gh-pages] Neither public/gjs-project.grapesjs nor public/site/ found')
      process.exit(1)
    }
  } else {
    console.log('[gh-pages] Using existing public/site HTML')
  }

  console.log('[gh-pages] Fetching latest release URLs from GitHub...')
  const downloadUrls = await resolveDownloadUrls()

  // Start with a clean output directory
  if (fs.existsSync(outDir)) fs.rmSync(outDir, { recursive: true })
  fs.mkdirSync(outDir, { recursive: true })

  // Process each HTML page
  for (const file of fs.readdirSync(siteDir).filter(f => f.endsWith('.html'))) {
    const html = fs.readFileSync(path.join(siteDir, file), 'utf8')
    fs.writeFileSync(path.join(outDir, file), fixHtml(html, downloadUrls))
    console.log(`[gh-pages] Processed ${file}`)
  }

  // Copy static asset directories
  for (const dir of ['fonts', 'icons', 'images']) {
    const src = path.join(ROOT, 'public', dir)
    if (fs.existsSync(src)) {
      copyDir(src, path.join(outDir, dir))
      console.log(`[gh-pages] Copied ${dir}/`)
    }
  }

  // Fix font URLs in fonts.css to use relative paths
  const fontsCssPath = path.join(outDir, 'fonts', 'fonts.css')
  if (fs.existsSync(fontsCssPath)) {
    let fontsCss = fs.readFileSync(fontsCssPath, 'utf8')
    fontsCss = fontsCss.replace(/url\(['"]\/fonts\//g, "url('./")
    fs.writeFileSync(fontsCssPath, fontsCss)
    console.log('[gh-pages] Fixed font URLs in fonts.css')
  }

  // Copy root-level image assets referenced in the HTML
  for (const file of ['columba-logo.svg', 'meshchat-logo.png']) {
    const src = path.join(ROOT, 'public', file)
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(outDir, file))
      console.log(`[gh-pages] Copied ${file}`)
    }
  }

  // Preserve the custom domain on GitHub Pages.
  const cnamePath = path.join(siteDir, 'CNAME')
  if (fs.existsSync(cnamePath)) {
    fs.copyFileSync(cnamePath, path.join(outDir, 'CNAME'))
    console.log('[gh-pages] Copied CNAME')
  }

  // Prevent GitHub Pages from running Jekyll on the output
  fs.writeFileSync(path.join(outDir, '.nojekyll'), '')

  console.log(`\n[gh-pages] Done — output in dist-gh-pages/`)
}

main().catch(err => {
  console.error('[gh-pages] Build failed:', err.message)
  process.exit(1)
})
