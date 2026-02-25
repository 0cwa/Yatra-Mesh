# GrapesJS CSS Rule JSON Format Reference

**Extracted:** 2026-02-25
**Context:** When editing public/gjs-project.grapesjs styles array programmatically or debugging broken CSS

## Problem
GrapesJS stores CSS in a JSON `styles` array. Wrong formats silently produce invalid CSS:
- Class-keyed objects in `style` fields look valid but don't render
- `selectorsAdd: "@keyframes foo"` looks like it should work but generates invalid output
- Missing `:root` CSS variable rule causes all `var(--gjs-t-color-*)` to resolve to empty

## Format Reference

### Regular class rule
```json
{ "selectors": ["my-class"], "style": { "color": "red" } }
```

### Hover / pseudo-class
```json
{ "selectors": ["my-class"], "selectorsAdd": ":hover", "style": { "color": "red" } }
```

### Pseudo-element (::before, ::after, ::marker)
```json
{ "selectors": ["my-class"], "selectorsAdd": "::after", "style": { "content": "\"+\"" } }
```

### Compound selector (.parent li, .parent li::before)
```json
{ "selectors": ["parent-class"], "selectorsAdd": " li", "style": { "padding": "0.5rem" } }
{ "selectors": ["parent-class"], "selectorsAdd": " li::before", "style": { "content": "\"→\"" } }
```

### CSS variables (:root) — MUST use data-variable type for GrapesJS globalStyles
```json
{
  "selectors": [],
  "selectorsAdd": ":root",
  "style": {
    "--gjs-t-color-primary": {
      "defaultValue": "#a06aff",
      "path": "globalStyles.color-primary.value",
      "type": "data-variable"
    }
  }
}
```

### Media query — MUST be individual rules, NOT a single object with class-keyed style
```json
{ "selectors": ["my-class"], "style": { "grid-template-columns": "1fr" }, "mediaText": "(max-width: 768px)", "atRuleType": "media" }
```

### Keyframe rules — use atRuleType, NOT selectorsAdd: "@keyframes ..."
```json
{ "selectors": [], "selectorsAdd": "0%",   "style": { "transform": "translateY(0)" },    "mediaText": "floatSlow", "atRuleType": "keyframes" }
{ "selectors": [], "selectorsAdd": "50%",  "style": { "transform": "translateY(-12px)" }, "mediaText": "floatSlow", "atRuleType": "keyframes" }
{ "selectors": [], "selectorsAdd": "100%", "style": { "transform": "translateY(0)" },    "mediaText": "floatSlow", "atRuleType": "keyframes" }
```

## Anti-patterns (INVALID — will not render)
```
❌ style: { ".my-class": { "color": "red" } }  ← class-keyed style object
❌ selectorsAdd: "@keyframes floatSlow"          ← use atRuleType: "keyframes" instead
❌ Missing :root rule → var(--gjs-t-color-*) resolves to empty string
```

## Diagnosis Script

```python
import json

with open('public/gjs-project.grapesjs') as f:
    data = json.load(f)

styles = data.get('styles', [])

# Check 1: CSS variables root rule present
has_root = any(s.get('selectorsAdd') == ':root' for s in styles)
print(f"CSS variables :root rule: {'✓' if has_root else '✗ MISSING — all var() will fail'}")

# Check 2: Invalid class-keyed media query rules
bad_mq = [i for i, s in enumerate(styles)
          if any(k.startswith('.') for k in s.get('style', {}))]
print(f"Invalid class-keyed rules: {bad_mq or 'none ✓'}")

# Check 3: Invalid @keyframes in selectorsAdd
bad_kf = [i for i, s in enumerate(styles)
          if s.get('selectorsAdd', '').startswith('@keyframes')]
print(f"Invalid @keyframes selectorsAdd: {bad_kf or 'none ✓'}")

# Check 4: Duplicate keyframe names
from collections import Counter
kf_names = [s.get('mediaText') for s in styles if s.get('atRuleType') == 'keyframes']
dupes = {n: c for n, c in Counter(kf_names).items() if c > 3}  # >3 = more than 0%/50%/100%
print(f"Duplicate keyframe animations: {dupes or 'none ✓'}")
```

## Diagnosis Checklist
When GrapesJS canvas looks broken after a project file edit/migration:

1. **CSS variables** — grep for `selectorsAdd: ":root"` — if missing, all `var()` calls fail silently
2. **Media queries** — any `style` object with keys starting with `"."` is the invalid batch format
3. **Keyframes** — any `selectorsAdd` starting with `"@keyframes"` is invalid; use `atRuleType: "keyframes"`
4. **Duplicate keyframes** — multiple animation definitions with the same `mediaText` name; last wins, earlier definitions are wasted
5. **Orphaned classes** — CSS classes defined in styles but no HTML element has that class (e.g. `.step-item` defined but `<li>` elements have no class — use compound selector `steps-list li` instead)

## When to Use
- When editing `gjs-project.grapesjs` styles array in scripts or by hand
- When diagnosing broken canvas styles after a project file migration/cleanup
- When writing Python/JS to patch GrapesJS project files programmatically
- When a GrapesJS project looks visually broken despite App.jsx being unchanged
