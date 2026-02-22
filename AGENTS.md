# Agent Guidelines for Yatra Editor

This document provides guidelines for agents working on the Yatra Editor codebase.

## Project Overview

This is a self-hosted GrapesJS Studio Editor built with Vite + React using @grapesjs/studio-sdk.

## Design Language

Follow the design principles from the first commit (3d1364a):

- **Minimal**: Full-viewport editor canvas, no extra UI chrome
- **Clean styling**: Simple CSS reset, `box-sizing: border-box`, no decorative styles
- **Functional**: Basic React hooks, straightforward state management
- **Verbose debugging**: Console logging for development visibility

## Commands

### Yatra Editor (Vite + React)

```bash
# Development server
cd /home/x/Documents/Yatra-Mesh
npm run dev

# Build for production
npm run build

# Run linter
npm run lint

# Run linter with auto-fix
npm run lint -- --fix

# Preview production build
npm run preview
```

## Code Style Guidelines

### General Principles
- Keep code concise and focused - avoid unnecessary abstraction
- Prefer explicit over implicit
- Write self-documenting code with clear variable/function names
- **All assets must be self-hosted**: Images, fonts, icons, and media must be stored and served from your own server — never link to external domains (CDNs, Unsplash, Google Fonts, etc.). Upload assets through the editor's asset manager and use local paths.

### Imports
- Use absolute imports from packages, relative for local files
- Order: React/library imports → relative imports → CSS/styles
- Example:
  ```jsx
  import { useEffect, useState } from 'react';
  import createStudioEditor from '@grapesjs/studio-sdk';
  import './App.css';
  ```

### React Patterns
- Use functional components with hooks
- Prefer `useState` for local state, `useRef` for mutable refs
- Use `useEffect` with proper cleanup (return function)
- Avoid inline object styles - use CSS files or CSS-in-JS libraries
- Destructure props when possible

### Naming Conventions
- Components: PascalCase (e.g., `EditorPanel`, `ButtonGroup`)
- Variables/functions: camelCase (e.g., `handleSave`, `projectData`)
- Constants: SCREAMING_SNAKE_CASE for config values
- Files: kebab-case for non-components, PascalCase for components

### Error Handling
- Use try/catch for async operations
- Always handle fetch/async errors with `.catch()`
- Display user-friendly error messages in UI
- Log errors to console with descriptive messages

### JavaScript/TypeScript
- Use ES6+ features (const/let, arrow functions, destructuring, async/await)
- Avoid `var` - use `const` by default, `let` when reassignment needed
- Use optional chaining (`?.`) and nullish coalescing (`??`)
- Prefer explicit return types in complex functions

### CSS
- Use CSS modules or separate CSS files
- Avoid inline styles except for dynamic values
- Use semantic class names
- Follow existing CSS patterns in the project

## Project Structure

```
Yatra-Mesh/
├── public/
│   └── gjs-project.grapesjs    # Project data file
├── src/
│   ├── App.jsx                 # Main component
│   ├── App.css                 # Styles
│   ├── main.jsx                # Entry point
│   └── index.css               # Global styles
├── vite.config.js              # Vite configuration
├── package.json
└── eslint.config.js            # ESLint configuration
```

## Working with GrapesJS Studio SDK

### Initializing the Editor
```jsx
import createStudioEditor from '@grapesjs/studio-sdk';
import '@grapesjs/studio-sdk/style';

editor = createStudioEditor({
  root: '#editor',           // Mount point (NOT container)
  project: {
    type: 'web',
    default: projectData,    // Project JSON data
  },
  storage: {
    type: 'self',            // Self-hosted storage
    autosaveChanges: 10,      // Save after N changes
    onSave: async ({ project }) => {
      // Handle save - POST to API or write to file
    },
    onLoad: async () => {
      // Return project data
    },
  },
});
```

### Key Configuration Notes
- Use `root` not `container` for SDK mount point
- Storage callbacks are required for `type: 'self'`
- Project data format: `{ pages: [...], assets: [...], styles: [...] }`

### Storage Architecture

| Setting | Value |
|---|---|
| Storage type | `'self'` (custom) |
| Auto-save trigger | Every 10 changes (`autosaveChanges: 10`) |
| Save endpoint | `POST /api/save-project` (Vite plugin in `vite.config.js`) |
| Data file | `public/gjs-project.grapesjs` |

Do not add a second storage adapter or call `editor.store()` manually unless implementing an explicit "Save" button — the autosave handles persistence automatically.

### Critical Architecture Rules

#### 1. Never Touch the DOM Directly

The GrapesJS canvas is an iframe. **Never** query or mutate it directly.

```js
// ❌ NEVER
document.querySelector('.gjs-frame').contentDocument.body.innerHTML = '...';

// ✅ ALWAYS use the editor API
editor.setComponents('<section>...</section>');
```

#### 2. Always Access the Editor via `editorRef.current`

The editor instance lives in a React ref inside `App.jsx`. It is **not** exported, not on `window`, and not in any global store.

```jsx
// Inside App.jsx
const editorRef = useRef(null);

// SDK callback sets it:
onEditor: (editor) => {
  editorRef.current = editor;
}

// All programmatic editor access must go through:
editorRef.current.someApiMethod();
```

If you need to trigger editor actions from outside `App.jsx`, add a handler function inside `App.jsx` and pass it down as a prop or expose it via a callback — do **not** try to import or reach the editor instance from another file.

#### 3. Use `editor.getProjectData()` / `editor.loadProjectData()` for Full State

The canonical way to read or restore complete editor state (components + CSS + pages):

```js
// READ — pass to AI as context
const snapshot = editorRef.current.getProjectData();

// WRITE — restore AI-generated full project
editorRef.current.loadProjectData(aiGeneratedProjectData);
```

#### 4. Wrap Bulk AI Changes in UndoManager Stops

This makes the entire AI update a single undo step for the user:

```js
const editor = editorRef.current;
const um = editor.UndoManager;

um.stop();
editor.setComponents(aiComponents);
editor.setStyle(aiCss);
um.start();
```

### Component API — How to Make Changes

#### Read Current State (for AI context)

```js
const editor = editorRef.current;

// Full project (best for AI input)
const projectData = editor.getProjectData();

// HTML + CSS strings
const html = editor.getHtml();
const css  = editor.getCss();

// Currently selected component
const comp = editor.getSelected();
const compJson = comp?.toJSON();
```

#### Add / Replace Components

```js
// Replace entire canvas content
editor.setComponents('<section class="hero"><h1>Hello</h1></section>');

// Or with a Component Definition object (preferred — no parsing ambiguity)
editor.setComponents({
  tagName: 'section',
  classes: ['hero'],
  components: [
    { tagName: 'h1', type: 'text', content: 'Hello' }
  ]
});

// Append without wiping the canvas
editor.addComponents({ tagName: 'div', classes: ['new-block'] });

// Append inside a specific component
editor.getSelected()?.append({ tagName: 'p', content: 'New paragraph' });
```

#### Modify an Existing Component

```js
const comp = editor.getSelected(); // or find by selector

// Change content (text components)
comp.set('content', 'Updated text');

// Change attributes
comp.setAttributes({ 'data-id': 'hero-1', class: 'hero active' });

// Add a class
comp.addClass('highlighted');

// Remove a class
comp.removeClass('old-class');
```

#### Apply Styles

```js
// Apply/replace ALL styles (full CSS string)
editor.setStyle('.hero { background: #000; color: #fff; }');

// Add a rule without wiping others
editor.addStyle({ selectors: ['.hero'], style: { 'font-size': '2rem' } });

// Style a specific component instance (inline-style, use sparingly)
const comp = editor.getSelected();
comp.setStyle({ color: 'red', padding: '1rem' });

// Merge styles without overwriting
comp.addStyle({ 'font-weight': 'bold' });
```

**Prefer class-based styles via `editor.addStyle()`** over inline `comp.setStyle()` so styles appear in the Style Manager and remain editable by the user.

#### Full Page / Project Replacement

```js
// Load a completely AI-generated project (replaces everything)
editor.loadProjectData({
  pages: [...],   // array of page objects with component trees
  styles: [...], // CSS rule objects
  assets: [...]  // optional
});
```

### Component Definition JSON Shape

When generating GrapesJS content, use **Component Definition JSON**, not raw HTML. This avoids parser ambiguity.

```jsonc
{
  "tagName": "section",
  "classes": ["hero", "hero--dark"],
  "attributes": { "id": "main-hero" },
  "components": [
    {
      "tagName": "h1",
      "type": "text",
      "content": "Welcome"
    },
    {
      "tagName": "p",
      "type": "text",
      "content": "Subtitle text here"
    },
    {
      "tagName": "a",
      "attributes": { "href": "#", "class": "btn" },
      "content": "Get Started"
    }
  ]
}
```

Valid built-in types are: `text`, `image`, `video`, `map`, `link`, `default`. Omit `type` entirely for plain HTML elements.

### What NOT to Do

| ❌ Don't | ✅ Do instead |
|---|---|
| Manipulate `.gjs-frame` DOM | Use `editor.setComponents()` / `editor.addComponents()` |
| Import `editorRef` from outside `App.jsx` | Add handler functions inside `App.jsx` and pass as props |
| Add a second storage plugin | Use the existing `type: 'self'` storage; call `editor.store()` for manual save |
| Use `comp.set('style', {...})` for class-level styles | Use `editor.addStyle({ selectors, style })` |
| Chain multiple `editor.set*` calls without stopping UndoManager | Wrap bulk changes in `um.stop()` / `um.start()` |
| Write to `public/gjs-project.grapesjs` directly | Only the Vite plugin's `/api/save-project` handler should write this file |
| Call `editor.setComponents()` during SDK initialization | Wait for `onEditor` callback before making any API calls |
| Link to external assets (CDNs, Unsplash, Google Fonts) | Upload assets through the editor's asset manager and use local paths |

### React Integration Notes

- The editor mounts after `useEffect` runs — **never call editor APIs during render**.
- If adding UI controls (e.g. an "AI Generate" button), keep them in `App.jsx` where `editorRef` is in scope, or pass the editor instance down explicitly.
- Do not store `editorRef.current` in React state (`useState`) — the editor instance is mutable and will cause unwanted re-renders.
- If adding new React components alongside the editor, keep them **outside** the `#editor` div to avoid GrapesJS managing them as canvas content.

```jsx
// ✅ Correct layout pattern
return (
  <>
    <MyToolbar onGenerate={handleAiGenerate} />  {/* outside editor */}
    <div id="editor" />                           {/* GrapesJS mounts here */}
  </>
);
```

### Recommended AI Integration Flow

```
1. User triggers AI action
2. const context = editorRef.current.getProjectData()  // serialize for AI
3. Send context + user prompt to AI
4. AI returns: { components: {...}, css: '...' }  (Component Definition JSON + CSS string)
5. Validate response (check tagName exists, no script injection)
6. editorRef.current.UndoManager.stop()
7. editorRef.current.setComponents(components)
8. editorRef.current.setStyle(css)
9. editorRef.current.UndoManager.start()
10. Auto-save fires after 10 changes, or call editorRef.current.store() immediately
```

## Common Tasks

### Adding a New Component
1. Create component file in appropriate location
2. Import and add to parent component
3. Add styles in CSS file
4. Test in development mode

### Modifying the Editor Configuration
Edit `src/App.jsx` to modify:
- Storage behavior (autosave, onSave, onLoad)
- Project settings (type, defaults)
- Theme and UI customization

### Working with Project Data
Project files are JSON with structure:
- `pages`: Array of page objects with component trees
- `assets`: Images and media references
- `styles`: CSS styles and theming

### File Map

| File | Purpose |
|---|---|
| `src/App.jsx` | Main component; owns `editorRef`, all editor API calls go here |
| `src/main.jsx` | React entry point; mounts `<App />` |
| `vite.config.js` | Defines `/api/save-project` endpoint + file write logic |
| `public/gjs-project.grapesjs` | Persisted project JSON; read on load, written on save |

### If You Add Custom Component Types

Update this file immediately when `editor.DomComponents.addType(...)` is called anywhere. Document:
- The `type` string
- Required props / traits
- Any `data-gjs-*` attributes the AI should emit
- Whether it has a special `isComponent` detector

Until then, **assume zero custom types exist**.

## Testing

Currently no test framework is set up. If adding tests:
- Use Vitest for unit tests (works with Vite)
- Use React Testing Library for component tests
- Run single test: `npx vitest run --test-name-pattern="test name"`

## Linting

ESLint is configured with:
- React hooks recommended rules
- React refresh for HMR compatibility
- No unused vars (except vars starting with underscore)

Run lint before committing:
```bash
npm run lint
```

## Important Notes

- The editor uses Vite on port 5173 by default
- The SDK requires async storage callbacks even if just reading local files

## Learned Skills & Agents

The following domain-specific skills have been learned from previous work on this project:

| Skill | Description |
|-------|-------------|
| `grapesjs-collapsible-accordion` | Implementing collapsible accordion components in GrapesJS |
| `grapesjs-page-replacement` | Full page replacement patterns for AI-generated content |
| `grapesjs-dynamic-date-sections` | Dynamic date sections with live/today/upcoming filtering |
| `grapesjs-unified-styling` | Unified styling system with centralized CSS class management |

These skills are stored in `.claude/skills/learned/` and should be referenced when implementing related features.
