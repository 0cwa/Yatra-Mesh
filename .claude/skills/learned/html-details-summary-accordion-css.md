# Hiding Native Browser Markers on details/summary Accordions

**Extracted:** 2026-02-25
**Context:** Custom accordion using `<details>/<summary>` with a CSS-only toggle icon

## Problem
The browser renders a native disclosure triangle on `<summary>` elements.
Three separate rules are needed to fully suppress it cross-browser, and the
approach differs when the CSS lives in a GrapesJS project JSON file.

## Solution

You need THREE rules to fully suppress the native marker cross-browser:

```css
summary.my-header { list-style: none }                          /* Firefox */
summary.my-header::-webkit-details-marker { display: none }    /* Old WebKit */
summary.my-header::marker { display: none; font-size: 0 }       /* Modern spec */
```

Then add the custom toggle icon and open-state rotation:

```css
summary.my-header::after {
  content: "+";
  margin-left: auto;
  font-size: 1.4rem;
  color: #47b3ff;
  font-weight: 300;
  transition: transform 0.2s ease;
}

details.parent-class[open] > summary::after {
  transform: rotate(45deg);
}
```

## GrapesJS JSON Format

All five rules in the `styles` array of `gjs-project.grapesjs`:

```json
{
  "selectors": ["my-header"],
  "style": { "list-style": "none", "display": "flex", "align-items": "center", "cursor": "pointer" }
},
{
  "selectors": ["my-header"],
  "selectorsAdd": "::-webkit-details-marker",
  "style": { "display": "none" }
},
{
  "selectors": ["my-header"],
  "selectorsAdd": "::marker",
  "style": { "display": "none", "font-size": "0" }
},
{
  "selectors": ["my-header"],
  "selectorsAdd": "::after",
  "style": {
    "content": "\"+\"",
    "margin-left": "auto",
    "font-size": "1.4rem",
    "color": "#47b3ff",
    "font-weight": "300",
    "transition": "transform 0.2s ease"
  }
},
{
  "selectors": ["parent-details-class"],
  "selectorsAdd": "[open] > summary::after",
  "style": { "transform": "rotate(45deg)" }
}
```

## Key Details
- `list-style: none` on the `<summary>` itself handles Firefox's `::marker`
- `::-webkit-details-marker` is the old WebKit/Blink pseudo — still needed for some Chrome versions
- `::marker` with `font-size: 0` is belt-and-suspenders for modern browsers where `display: none` on `::marker` alone sometimes doesn't work
- The open-state rule uses `[open]` on the `<details>` parent + `> summary::after` — this works in GrapesJS via `selectorsAdd: "[open] > summary::after"` on the details class selector
- `margin-left: auto` pushes the icon to the right inside a flex summary

## When to Use
Any time a custom accordion uses `<details>/<summary>` with a custom indicator icon instead of the native browser triangle.
