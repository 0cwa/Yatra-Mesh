# Agent Guidelines for Yatra Editor

This document provides guidelines for agents working on the Yatra Editor codebase.

## Project Overview

This is a self-hosted GrapesJS Studio Editor for editing the Yatra Mesh website. The project consists of:
- **yatra-editor/**: Vite + React project using @grapesjs/studio-sdk
- **YatraMesh/**: Express static server with exported site files

## Commands

### Yatra Editor (Vite + React)

```bash
# Development server
cd /home/x/Documents/yatra-editor
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

### YatraMesh (Express Static Server)

```bash
cd /home/x/Documents/YatraMesh
npm start
# Runs at http://localhost:3000
# Editor at http://localhost:3000/editor
```

## Code Style Guidelines

### General Principles
- Keep code concise and focused - avoid unnecessary abstraction
- Prefer explicit over implicit
- Write self-documenting code with clear variable/function names

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
yatra-editor/
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

- The yatra-editor uses Vite on port 5173 by default
- The YatraMesh Express server runs on port 3000
- When debugging, ensure you're using the correct server
- The SDK requires async storage callbacks even if just reading local files
