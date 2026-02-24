# GrapesJS Studio SDK – Static Site Rendering

**Extracted:** 2026-02-24
**Context:** Generating static HTML files from a GrapesJS Studio SDK project JSON

## Problem

Two related issues when rendering GrapesJS projects to static HTML:

1. **`editor.getHtml()` returns a full HTML document**, not body content. Calling it and wrapping the result in `buildHtml()` produces nested HTML (`<body><!DOCTYPE html><html>...`), which breaks JavaScript (SPA page-toggle scripts) and CSS.

2. **Body tag attributes are lost.** The GrapesJS wrapper component stores the `<body>` tag's classes (e.g. `body-root gjs-t-body`) in `wrapper.classes` and extra attributes in `wrapper.attributes`. If these aren't placed on the `<body>` tag in the rendered output, CSS rules targeting those classes (dark background, font, etc.) won't apply.

## Solution

**Never use `editor.getHtml()` to generate static site files.** Instead:

1. Save only the project JSON (`project`) from `onSave` — not `pages` with pre-rendered HTML.
2. Use a custom component-tree renderer that reads the project JSON directly.
3. In the renderer, extract body attributes from the wrapper component and apply them to the `<body>` tag.

### Renderer pattern (render-project.mjs)

```js
// Wrapper renders just its children as body content
function renderComp(c) {
  if (type === 'wrapper') return (components || []).map(renderComp).join('')
  // ...
}

// Extract body tag attributes from wrapper before rendering
const wrapper = frame.component
const bodyHtml = renderComp(wrapper)
const bodyClasses = (wrapper.classes || []).join(' ')
const bodyId = wrapper.attributes?.id || ''
let bodyAttrs = bodyClasses ? ` class="${bodyClasses}"` : ''
if (bodyId) bodyAttrs += ` id="${bodyId}"`

// Pass to buildPageHtml so the <body> tag is correct
buildPageHtml(page.name, bodyHtml, css, devReload, bodyAttrs)
```

```js
function buildPageHtml(name, bodyHtml, css, devReload = false, bodyAttrs = '') {
  return `<!doctype html>
<html lang="en">
<head>...</head>
<body${bodyAttrs}>
${bodyHtml}
</body>
</html>`
}
```

### Save endpoint pattern

```js
// App.jsx onSave — only send project JSON, not pages
onSave: async ({ project }) => {
  await fetch('/api/save-project', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ project }),  // no pages
  })
}

// Save endpoint — regenerate from project JSON using renderer
app.post('/api/save-project', (req, res) => {
  const { project } = req.body
  fs.writeFileSync(projectFilePath, JSON.stringify(project, null, 2))
  generateSiteFromProject(projectFilePath, siteDir)  // uses component-tree renderer
  res.json({ success: true })
})
```

## When to Use

- Any time you're building a static site generator on top of GrapesJS Studio SDK
- When served HTML doesn't match the editor (check for nested `<!DOCTYPE html>`)
- When CSS classes on `<body>` aren't applying (dark background gone, font wrong)
- When adding a save endpoint that writes HTML files from editor state
