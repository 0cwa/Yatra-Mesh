# GrapesJS: Interactive HTML State is Static in the Canvas

**Extracted:** 2026-02-25
**Context:** Debugging visual differences between the GrapesJS editor canvas and the live site

## Problem
Interactive HTML elements (`<details>`, `<input>`, `<select>`, etc.) have their
state "frozen" in the GrapesJS canvas — the editor does not support interactive
toggling. Whatever state is serialised in the project JSON is what the canvas always
shows. This means CSS selectors that depend on interactive state will produce
editor-only visual discrepancies:

- `details[open]`      — always matches if `open` attribute is in JSON
- `input:checked`      — always matches if `checked` attr is in JSON
- `:focus` / `:active` — never matches (no real interaction in canvas)

A real example: `.sched-day[open] > summary::after { transform: rotate(45deg) }`
permanently rotated the `+` indicator into `×` because the first `<details>` had
`"open": true` in the project JSON.

## Solution
Remove interactive-state attributes from the project JSON for elements that should
default to their "closed/inactive" state in the editor. If the live site needs a
default-open element, handle it with JavaScript on the live side rather than via the
HTML attribute.

## Example

```python
# Python: strip 'open' from all <details> in gjs-project.grapesjs
def remove_open(component):
    if component.get('tagName') == 'details':
        component.get('attributes', {}).pop('open', None)
    for child in component.get('components', []):
        remove_open(child)
```

Or fix directly in the JSON:
```json
// BEFORE
{ "tagName": "details", "attributes": { "open": true }, "classes": ["sched-day"] }

// AFTER
{ "tagName": "details", "classes": ["sched-day"] }
```

## When to Use
- A CSS `[state]` selector (`:checked`, `[open]`, `[disabled]`) style appears
  permanently applied in the editor but not on the live site
- An element looks different in the editor canvas vs. the live preview
- You find `"open"`, `"checked"`, or similar boolean attributes in the project JSON
