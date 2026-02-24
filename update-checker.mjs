import fs from 'fs'
import path from 'path'
import { pipeline } from 'stream/promises'
import { Readable } from 'stream'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const downloadsDir = path.join(__dirname, 'public', 'downloads')
const versionsFile = path.join(downloadsDir, 'versions.json')

const APPS = [
  {
    id: 'columba',
    repo: 'torlando-tech/columba',
    includePrereleases: true,
    // Asset ends with "universal.apk" but NOT "no-sentry"
    pickAsset: (assets) => assets.find(a => a.name.endsWith('universal.apk') && !a.name.includes('no-sentry')),
    localName: 'columba-universal.apk',
    label: 'Columba (Android)',
    downloadPath: '/downloads/columba.apk',
  },
  {
    id: 'meshchat-windows',
    repo: 'liamcottle/reticulum-meshchat',
    includePrereleases: false,
    // Windows portable: contains "win-portable", not "win-installer"
    pickAsset: (assets) => assets.find(a => a.name.includes('win-portable')),
    localName: 'meshchat-win-portable.exe',
    label: 'MeshChat (Windows)',
    downloadPath: '/downloads/meshchat-windows.exe',
  },
  {
    id: 'meshchat-mac',
    repo: 'liamcottle/reticulum-meshchat',
    includePrereleases: false,
    pickAsset: (assets) => assets.find(a => a.name.endsWith('-mac.dmg')),
    localName: 'meshchat-mac.dmg',
    label: 'MeshChat (macOS)',
    downloadPath: '/downloads/meshchat-mac.dmg',
  },
  {
    id: 'meshchat-linux',
    repo: 'liamcottle/reticulum-meshchat',
    includePrereleases: false,
    pickAsset: (assets) => assets.find(a => a.name.endsWith('-linux.AppImage')),
    localName: 'meshchat-linux.AppImage',
    label: 'MeshChat (Linux)',
    downloadPath: '/downloads/meshchat-linux.AppImage',
  },
]

function loadVersions() {
  if (fs.existsSync(versionsFile)) {
    try {
      return JSON.parse(fs.readFileSync(versionsFile, 'utf8'))
    } catch {
      return {}
    }
  }
  return {}
}

function saveVersions(versions) {
  fs.mkdirSync(downloadsDir, { recursive: true })
  fs.writeFileSync(versionsFile, JSON.stringify(versions, null, 2))
}

async function fetchReleases(repo) {
  const url = `https://api.github.com/repos/${repo}/releases?per_page=10`
  const res = await fetch(url, {
    headers: { 'User-Agent': 'yatra-mesh-server/1.0' },
  })
  if (!res.ok) throw new Error(`GitHub API error: ${res.status} for ${repo}`)
  return res.json()
}

async function downloadFile(url, dest) {
  const tmpDest = dest + '.tmp'
  const res = await fetch(url, {
    headers: { 'User-Agent': 'yatra-mesh-server/1.0' },
  })
  if (!res.ok) throw new Error(`Download failed: ${res.status} for ${url}`)
  const fileStream = fs.createWriteStream(tmpDest)
  try {
    await pipeline(Readable.fromWeb(res.body), fileStream)
    fs.renameSync(tmpDest, dest)
  } catch (err) {
    fileStream.destroy()
    try { fs.unlinkSync(tmpDest) } catch {}
    throw err
  }
}

async function checkApp(app, versions) {
  try {
    const releases = await fetchReleases(app.repo)
    const eligible = app.includePrereleases ? releases : releases.filter(r => !r.prerelease)
    if (!eligible.length) {
      console.log(`[update] No eligible releases for ${app.id}`)
      return
    }

    const latest = eligible[0]
    const asset = app.pickAsset(latest.assets)
    if (!asset) {
      console.log(`[update] No matching asset in ${app.id} ${latest.tag_name}`)
      return
    }

    const current = versions[app.id]
    const dest = path.join(downloadsDir, app.localName)

    if (current?.tag === latest.tag_name && fs.existsSync(dest)) {
      console.log(`[update] ${app.id} up to date (${latest.tag_name})`)
      return
    }

    console.log(`[update] Downloading ${app.id} ${latest.tag_name} (${Math.round(asset.size / 1024 / 1024)}MB)...`)
    fs.mkdirSync(downloadsDir, { recursive: true })
    await downloadFile(asset.browser_download_url, dest)

    versions[app.id] = {
      tag: latest.tag_name,
      assetName: asset.name,
      downloadedAt: new Date().toISOString(),
      size: asset.size,
    }
    saveVersions(versions)
    console.log(`[update] ${app.id} updated to ${latest.tag_name}`)
  } catch (err) {
    console.error(`[update] Failed to update ${app.id}:`, err.message)
  }
}

export async function checkAndDownload() {
  console.log('[update] Checking for app updates...')
  const versions = loadVersions()
  for (const app of APPS) {
    await checkApp(app, versions)
  }
}

export function getDownloadStatus() {
  const versions = loadVersions()
  return APPS.map(app => {
    const info = versions[app.id] || null
    const localPath = path.join(downloadsDir, app.localName)
    const available = fs.existsSync(localPath)
    return {
      id: app.id,
      label: app.label,
      downloadPath: app.downloadPath,
      tag: info?.tag || null,
      assetName: info?.assetName || null,
      downloadedAt: info?.downloadedAt || null,
      available,
    }
  })
}

export function startUpdateChecker(intervalMs = 30 * 60 * 1000) {
  // Run immediately on start, then every interval
  checkAndDownload().catch(err => console.error('[update] Initial check failed:', err.message))
  setInterval(() => {
    checkAndDownload().catch(err => console.error('[update] Scheduled check failed:', err.message))
  }, intervalMs)
}
