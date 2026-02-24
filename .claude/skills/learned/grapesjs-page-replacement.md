# GrapesJS Programmatic Page Replacement

**Extracted:** 2026-02-21
**Context:** When you need to completely replace a page's content in a GrapesJS project

## Problem
Need to replace an entire GrapesJS page (e.g., schedule page) with new content - keeping the old structure but updating components.

## Solution
Replace the page object in the `pages` array with a new structure:

```javascript
const d = JSON.parse(fs.readFileSync('./public/gjs-project.grapesjs'));

const newPage = {
  name: 'Page Name',
  id: 'existing-page-id',
  frames: [{
    component: {
      type: 'wrapper',
      name: 'Body',
      classes: ['gjs-t-body', 'body-root'],
      components: [
        // ... new components
      ]
    }
  }]
};

// Replace at specific index
d.pages[1] = newPage;

fs.writeFileSync('./public/gjs-project.grapesjs', JSON.stringify(d, null, 2));
```

## Example

Replacing a schedule page with 4 collapsible days:

```javascript
const newSchedulePage = {
  name: 'Yatra Mesh Schedule',
  id: 'existing-id',
  frames: [{
    component: {
      type: 'wrapper',
      classes: ['gjs-t-body', 'body-root'],
      components: [
        // Header
        // Main content with details elements for each day
        // Footer
      ]
    }
  }]
};

d.pages[1] = newSchedulePage;
```

## When to Use
- Completely redesigning a page while keeping its ID
- Generating pages programmatically from data
- Bulk restructuring of page content