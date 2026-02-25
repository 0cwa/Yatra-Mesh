# GrapesJS: Explicit ::marker Suppression for List Items

**Extracted:** 2026-02-25
**Context:** <ol>/<ul> list items showing browser-default markers in the GrapesJS canvas

## Problem
`list-style: none` on an `<ol>` or `<ul>` (and even on `<li>` directly) may not
fully suppress the `::marker` pseudo-element inside GrapesJS's canvas iframe.
Browser default markers (numbers for `<ol>`, bullets for `<ul>`) can bleed through
even when `list-style: none` is set.

## Solution
Always pair `list-style: none` with an explicit `::marker` rule in the GrapesJS
styles array:

```json
{ "selectors": ["my-list"], "selectorsAdd": " li::marker",
  "style": { "display": "none", "content": "''" } }
```

## Triple-rule pattern for `<details>/<summary>` (disclosure triangle)

`<summary>` needs three rules to suppress its disclosure marker across all browsers:

```json
{ "selectors": ["my-summary"], "selectorsAdd": "",
  "style": { "list-style": "none" } },
{ "selectors": ["my-summary"], "selectorsAdd": "::marker",
  "style": { "display": "none", "font-size": "0" } },
{ "selectors": ["my-summary"], "selectorsAdd": "::-webkit-details-marker",
  "style": { "display": "none" } }
```

## Full example for a styled <ol>

```json
{ "selectors": ["steps-list"], "selectorsAdd": "",
  "style": { "list-style": "none", "padding": "0", "margin": "0" } },
{ "selectors": ["steps-list"], "selectorsAdd": " li",
  "style": { "display": "flex", "list-style": "none" } },
{ "selectors": ["steps-list"], "selectorsAdd": " li::marker",
  "style": { "display": "none", "content": "''" } }
```

Note: `display: flex` on `<li>` already suppresses markers per spec (markers only
render for `display: list-item`), but GrapesJS canvas still needs the explicit
`::marker` rule to be reliable.

## When to Use
- `<ol>` or `<ul>` shows numbered/bullet markers in the GrapesJS editor
- `list-style: none` was set on the list or list items but markers still appear
- Adding a new styled list to the project
- `<details>/<summary>` shows the disclosure triangle (`▶`) in the canvas
