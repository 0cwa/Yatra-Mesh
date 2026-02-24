# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Yatra-Mesh is a self-hosted visual web page editor built with React + Vite and the **GrapesJS Studio SDK** (`@grapesjs/studio-sdk`). It's a full-viewport editor with offline-first, 100% self-hosted assets and Git-backed persistence.

## Commands

```bash
npm run dev          # Dev server at localhost:5173
npm run build        # Production build → dist/
npm run preview      # Preview production build
npm run lint         # ESLint check
npm run lint -- --fix  # Auto-fix lint issues
npm test             # Run tests (Vitest)
npm run test:watch   # Tests in watch mode
node server.js       # Production server at localhost:5174 (separate from Vite)
```

To validate project JSON before running the app:
```bash
node -e "JSON.parse(require('fs').readFileSync('public/gjs-project.grapesjs'))"
```

## Architecture

### Data Flow

```
public/gjs-project.grapesjs  ←→  Vite plugin (/api/save-project)  ←→  App.jsx (editorRef)
                                                                          ↕
                                                              GrapesJS Studio SDK
                                                              (iframe canvas)
```

- **`src/App.jsx`** — The entire app. Owns `editorRef`, loads project JSON, injects fonts into the canvas iframe, initializes the editor, and handles auto-save.
- **`vite.config.js`** — Custom Vite plugin that provides the `POST /api/save-project` endpoint (writes to `public/gjs-project.grapesjs`).
- **`server.js`** — Express server for production; same `/api/save-project` endpoint but also auto-commits to Git.
- **`public/gjs-project.grapesjs`** — The persisted project state (JSON). Only written via the save endpoint, never directly.

### Storage

| Setting | Value |
|---|---|
| Storage type | `'self'` (custom callbacks) |
| Auto-save trigger | Every 10 changes (`autosaveChanges: 10`) |
| Save endpoint | `POST /api/save-project` |
| Data file | `public/gjs-project.grapesjs` |

## Critical Rules

See `AGENTS.md` for the full reference. The non-negotiable rules:

1. **Never touch the canvas DOM directly.** The GrapesJS canvas is an iframe. Always use the editor API (`editor.setComponents()`, `editor.addComponents()`, etc.).

2. **Editor instance lives only in `editorRef.current`** inside `App.jsx`. It is not exported, not on `window`. If you need editor access from outside `App.jsx`, add a handler inside `App.jsx` and pass it as a prop.

3. **All canvas styles must go through `editor.addStyle()`** in the `onEditor` callback — not external CSS files. Styles in `App.css`/`index.css` are only for React UI outside the canvas.

4. **All assets must be self-hosted.** Never link to external CDNs, Google Fonts, Unsplash, etc. Use local paths under `public/`.

5. **Never call editor APIs before `onEditor` fires.** The editor is not available during render or before the SDK callback.

6. **Wrap bulk changes in UndoManager stops** to give users a single undo step:
   ```js
   const um = editorRef.current.UndoManager;
   um.stop();
   editor.setComponents(newContent);
   editor.setStyle(newCss);
   um.start();
   ```

7. **Don't add a second storage adapter.** The existing `type: 'self'` autosave handles persistence. Call `editor.store()` only for an explicit manual save button.

## GrapesJS API Quick Reference

```js
// Read state
editor.getProjectData()        // Full project snapshot (use for AI context)
editor.getHtml() / editor.getCss()

// Write content
editor.setComponents(htmlOrJson)   // Replace canvas
editor.addComponents(json)          // Append
editor.loadProjectData({ pages, styles, assets })  // Replace everything

// Styles
editor.addStyle({ selectors: ['my-class'], style: { color: 'red' } })

// Selected component
const comp = editor.getSelected();
comp.set('content', 'new text');
comp.addClass('foo') / comp.removeClass('foo');
comp.setAttributes({ href: '#' });
```

Prefer **Component Definition JSON** (with `tagName`, `classes`, `components`) over raw HTML strings. Valid built-in types: `text`, `image`, `video`, `map`, `link`, `default`.

## Common JSON Issues in Project File

Trailing commas break JSON parsing. The last element in any array/object must NOT have a trailing comma. When you see a parse error, check the reported line for a `},` that should be `}`.

## Learned Skills

Domain-specific skills from previous work are in `.claude/skills/learned/`:
- `grapesjs-collapsible-accordion` — accordion components
- `grapesjs-page-replacement` — full page replacement for AI content
- `grapesjs-dynamic-date-sections` — dynamic date filtering sections
- `grapesjs-unified-styling` — centralized CSS class management
