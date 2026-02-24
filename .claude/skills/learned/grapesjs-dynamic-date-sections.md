# GrapesJS Dynamic Date-Based Section Expansion

**Extracted:** 2026-02-21
**Context:** When a page has multiple day/section blocks and you want the current day to be open by default

## Problem
Have a schedule page with multiple days (e.g., 4-day festival) and want the appropriate day to be expanded based on the user's current date - before the event starts show first day, during the event show current day, after show last day.

## Solution
Use `<details>` elements with JavaScript to dynamically set the open attribute:

```javascript
// Add script to page component
const scriptComponent = {
  tagName: 'script',
  components: [{
    type: 'textnode',
    content: `
(function() {
  const startDate = new Date('2026-02-27T00:00:00');
  const endDate = new Date('2026-03-02T23:59:59');
  const today = new Date();
  
  let dayToOpen = 'day-1';
  
  if (today >= endDate) {
    dayToOpen = 'day-4';
  } else if (today >= new Date('2026-03-01T00:00:00')) {
    dayToOpen = 'day-3';
  } else if (today >= new Date('2026-02-28T00:00:00')) {
    dayToOpen = 'day-2';
  }
  
  // Open the correct day
  setTimeout(() => {
    const day = document.getElementById(dayToOpen);
    if (day) day.setAttribute('open', '');
  }, 100);
})();
    `
  }]
};
```

## Example

For a 4-day festival schedule:
- Before Feb 27 → open Day 1
- Feb 28 → open Day 2
- March 1 → open Day 3
- March 2 or after → open Day 4

## When to Use
- Event/festival schedules
- Multi-day conference agendas
- Time-based content that should auto-focus