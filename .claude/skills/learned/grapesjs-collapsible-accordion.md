# GrapesJS Collapsible Accordion with Details/Summary

**Extracted:** 2026-02-21
**Context:** When building collapsible sections in GrapesJS that users can expand/collapse

## Problem
Need expandable/collapsible sections (like day blocks in a schedule) without JavaScript dependencies.

## Solution
Use native HTML `<details>` and `<summary>` elements:

```javascript
// In GrapesJS component JSON
{
  tagName: 'details',
  attributes: { id: 'day-1' },
  classes: ['schedule-day'],
  components: [
    {
      tagName: 'summary',
      classes: ['day-header'],
      components: [
        { tagName: 'div', classes: ['day-label'], components: [{ type: 'textnode', content: 'Day 1' }] },
        { tagName: 'h2', classes: ['day-title'], components: [{ type: 'textnode', content: 'Friday, Feb 27' }] }
      ]
    },
    {
      tagName: 'div',
      classes: ['day-content'],
      components: [
        // Collapsible content here
      ]
    }
  ]
}
```

## CSS Styles

```javascript
const accordionStyles = [
  {
    selectors: [],
    selectorsAdd: '.schedule-day > summary',
    style: {
      'list-style': 'none',
      display: 'flex',
      'align-items': 'center',
      gap: '16px',
      cursor: 'pointer'
    }
  },
  {
    selectors: [],
    selectorsAdd: '.schedule-day > summary::-webkit-details-marker',
    style: { display: 'none' }
  },
  {
    selectors: [],
    selectorsAdd: '.schedule-day > summary::after',
    style: {
      content: '"+"',
      'margin-left': 'auto',
      'font-size': '1.5rem',
      color: '#47b3ff',
      transition: 'transform 0.2s ease'
    }
  },
  {
    selectors: [],
    selectorsAdd: '.schedule-day[open] > summary::after',
    style: { transform: 'rotate(45deg)' }
  }
];
```

## When to Use
- Schedule/agenda pages with multiple days
- FAQ sections
- Expandable content blocks
- Any collapsible accordion UI