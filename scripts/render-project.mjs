/**
 * Server-side renderer for GrapesJS project JSON.
 * Generates static HTML files from gjs-project.grapesjs without needing the editor.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

// ─── CSS ────────────────────────────────────────────────────────────────────

function resolveValue(val) {
  if (val === null || val === undefined) return ''
  if (typeof val === 'string') return val
  if (typeof val === 'object' && val.type === 'data-variable') return val.defaultValue ?? ''
  return ''
}

function renderProps(style) {
  return Object.entries(style)
    .map(([prop, val]) => {
      const v = resolveValue(val)
      return v !== '' ? `${prop}:${v}` : ''
    })
    .filter(Boolean)
    .join(';')
}

function renderSelector(sel) {
  if (typeof sel === 'string') {
    // Already prefixed (#id, .class, :pseudo, [attr]) — use as-is
    return /^[#.:\[]/.test(sel) ? sel : `.${sel}`
  }
  if (sel && typeof sel === 'object' && sel.name) return `.${sel.name}`
  return ''
}

function buildSelector(selectors, selectorsAdd) {
  const classPart = (selectors || []).map(renderSelector).join(', ')
  const addPart = (selectorsAdd || '').trim()
  if (!classPart) return addPart
  if (!addPart) return classPart
  // Pseudo/combinator: concatenate directly. Otherwise comma-join.
  return /^[:\[>~+]/.test(addPart) ? classPart + addPart : `${classPart}, ${addPart}`
}

function renderKeyframeStops(style) {
  // Keys are stop selectors ("0%", "50%", "0%, 100%"), values are CSS property objects
  return Object.entries(style)
    .map(([stop, props]) => {
      if (!props || typeof props !== 'object' || props.type === 'data-variable') return ''
      const propsStr = Object.entries(props)
        .map(([p, v]) => `${p}:${resolveValue(v) || v}`)
        .filter(Boolean)
        .join(';')
      return propsStr ? `${stop}{${propsStr}}` : ''
    })
    .filter(Boolean)
    .join('')
}

function renderCss(styles) {
  const parts = []

  // Group Format-2 keyframe stops by animation name
  const kfGroups = {}
  // Group media rules by mediaText
  const mediaGroups = {}

  for (const rule of styles) {
    const { selectors = [], selectorsAdd = '', style = {}, atRuleType, mediaText } = rule

    if (atRuleType === 'keyframes') {
      const name = mediaText || 'unknown'
      if (!kfGroups[name]) kfGroups[name] = []
      kfGroups[name].push(rule)
      continue
    }

    if (atRuleType === 'media') {
      const mq = mediaText || ''
      if (!mediaGroups[mq]) mediaGroups[mq] = []
      mediaGroups[mq].push(rule)
      continue
    }

    // Format-1 keyframe: @keyframes name in selectorsAdd, stops as style keys
    if (selectorsAdd.startsWith('@keyframes')) {
      const stops = renderKeyframeStops(style)
      if (stops) parts.push(`${selectorsAdd}{${stops}}`)
      continue
    }

    // Regular rule
    const sel = buildSelector(selectors, selectorsAdd)
    if (!sel) continue
    const props = renderProps(style)
    if (props) parts.push(`${sel}{${props}}`)
  }

  // Emit Format-2 keyframe groups
  for (const [name, stops] of Object.entries(kfGroups)) {
    const stopsStr = stops
      .map(s => {
        const props = renderProps(s.style || {})
        return props ? `${s.selectorsAdd}{${props}}` : ''
      })
      .filter(Boolean)
      .join('')
    if (stopsStr) parts.push(`@keyframes ${name}{${stopsStr}}`)
  }

  // Emit media groups
  for (const [mq, rules] of Object.entries(mediaGroups)) {
    const inner = rules
      .map(r => {
        const sel = buildSelector(r.selectors, r.selectorsAdd)
        if (!sel) return ''
        const props = renderProps(r.style || {})
        return props ? `${sel}{${props}}` : ''
      })
      .filter(Boolean)
      .join('')
    if (inner) parts.push(`@media ${mq}{${inner}}`)
  }

  return parts.join('')
}

// ─── HTML ───────────────────────────────────────────────────────────────────

const VOID = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr',
])

const TYPE_TAG = {
  link: 'a',
  image: 'img',
  video: 'video',
  map: 'div',
  text: 'div',
  script: 'script',
}

function escAttr(v) {
  return String(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;')
}

function renderAttrs(attributes) {
  return Object.entries(attributes || {})
    .map(([k, v]) => {
      if (v === true) return k
      if (v === false || v === null || v === undefined) return ''
      return `${k}="${escAttr(v)}"`
    })
    .filter(Boolean)
    .join(' ')
}

function renderComp(c) {
  if (typeof c === 'string') return c
  const { type, tagName, classes = [], attributes = {}, components = [], content = '' } = c

  // Wrapper is the body element — render its children as the page body
  if (type === 'wrapper') return (components || []).map(renderComp).join('')
  // Pure text node
  if (type === 'textnode') return content || ''

  const tag = tagName || TYPE_TAG[type] || 'div'

  const parts = []
  if (classes.length) parts.push(`class="${classes.join(' ')}"`)
  const attrStr = renderAttrs(attributes)
  if (attrStr) parts.push(attrStr)
  const allAttrs = parts.length ? ' ' + parts.join(' ') : ''

  if (VOID.has(tag)) return `<${tag}${allAttrs}>`

  const inner = content || (components || []).map(renderComp).join('')
  return `<${tag}${allAttrs}>${inner}</${tag}>`
}

// ─── Page assembly ──────────────────────────────────────────────────────────

function toSlug(name) {
  return name
    .toLowerCase()
    .replace(/^yatra\s+mesh\s+/i, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}

function buildPageHtml(name, bodyHtml, css, devReload = false) {
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
${bodyHtml}
${reloadScript}
</body>
</html>`
}

// ─── Public API ─────────────────────────────────────────────────────────────

export function generateSiteFromProject(projectPath, siteDir, devReload = false) {
  const project = JSON.parse(fs.readFileSync(projectPath, 'utf8'))
  const css = renderCss(project.styles || [])
  fs.mkdirSync(siteDir, { recursive: true })

  let count = 0
  for (const [index, page] of project.pages.entries()) {
    const frame = page.frames?.[0]
    if (!frame?.component) continue
    const bodyHtml = renderComp(frame.component)
    const slug = index === 0 ? 'index' : toSlug(page.name)
    const html = buildPageHtml(page.name, bodyHtml, css, devReload)
    fs.writeFileSync(path.join(siteDir, `${slug}.html`), html)
    count++
  }
  return count
}

// ─── CLI ────────────────────────────────────────────────────────────────────

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const projectPath = path.join(ROOT, 'public', 'gjs-project.grapesjs')
  const siteDir = path.join(ROOT, 'public', 'site')
  try {
    const n = generateSiteFromProject(projectPath, siteDir)
    console.log(`Generated ${n} pages in ${siteDir}`)
  } catch (err) {
    console.error('Failed to generate site:', err.message)
    process.exit(1)
  }
}
