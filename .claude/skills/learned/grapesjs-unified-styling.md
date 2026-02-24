# GrapesJS Unified Multi-Page Styling

**Extracted:** 2026-02-21
**Context:** When building multiple pages in GrapesJS that need consistent styling

## Problem
Different pages in a GrapesJS project (captive portal, schedule, help guide) had inconsistent styling because they used different CSS classes and inline styles. The navbar looked different across pages.

## Solution
Use a unified `body-root` class and consolidated CSS selectors:

1. Add shared styles with selectors that apply to all pages
2. Apply `body-root` class to the root component on all pages
3. Use consistent class names (header, header-container, primary-nav, etc.)

## Example

```javascript
// Add unified styles that apply everywhere
const unifiedStyles = [
  {
    selectors: [{ name: 'body-root' }],
    style: {
      'font-family': 'Roboto, Inter, ui-sans-serif, system-ui, sans-serif',
      'background-color': '#0b0b13',
      color: '#eaeaf1',
      'font-size': '18px',
      'line-height': '1.6'
    }
  },
  {
    selectors: [{ name: 'header' }],
    style: {
      'backdrop-filter': 'blur(8px)',
      'background-image': 'linear-gradient(90deg, rgba(71,179,255,0.12), rgba(160,106,255,0.12))'
    }
  },
  // ... more shared styles
];

// Apply to all pages
pages.forEach(page => {
  page.frames[0].component.classes = ['gjs-t-body', 'body-root'];
});
```

## When to Use
- Building multiple pages that should share the same design language
- Need consistent navbar/header across pages
- Want to avoid duplicating CSS for each page