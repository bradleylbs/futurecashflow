# Color Usage Audit for FutureCashflow

This README documents all color usages in the codebase, including Tailwind classes, inline styles, and custom overrides. Each entry lists the color, usage context, file, and line number. Overrides and custom colors are noted.

---


## 1. Semantic Color Class Names

All color usage now references semantic class names, not raw hex codes. This enables design intent, scalability, and maintainability.

### Semantic Color Classes & Design Intent

| Semantic Name         | Hex Value   | Design Intent / Usage                |
|----------------------|------------|--------------------------------------|
| text-primary         | #3594f7    | Brand accent, highlights, chevrons   |
| bg-primary           | #3594f7    | Primary buttons, CTAs, badges        |
| text-on-primary      | #fefefe    | Text on primary backgrounds          |
| text-muted           | #b8b6b4    | Muted info, secondary text           |
| text-soft            | #b4c5d6    | Soft info, subheadings               |
| text-dark            | #161616    | Main body text, headlines            |
| bg-surface           | #161616    | Card backgrounds, panels             |
| bg-surface-alt       | #2d2d2d    | Alternate card backgrounds           |
| border-default       | #3d3d3d    | Card/tab borders                     |
| bg-muted             | #b8b6b4    | Muted backgrounds, tabs              |
| bg-black             | #050505    | App background, dark sections        |
| text-white           | #fefefe    | Text on dark backgrounds             |
| text-error           | #6c0e0e    | Error, destructive alerts            |
| bg-error             | #6c0e0e    | Error backgrounds                    |

**Example usage:**
```tsx
<div className="bg-primary text-on-primary">...</div>
<span className="text-muted">Secondary info</span>
<button className="bg-primary hover:bg-surface text-on-primary">...</button>
```

**Design intent:**
- Use semantic names to communicate purpose, not just color.
- Never use raw hex codes in components—always use semantic classes.

---



## 2. Inline Styles & SVG Colors

- All inline styles and SVG fills/strokes must use semantic CSS variables or classes, not raw hex codes.
- Example:
```tsx
<svg fill="var(--color-primary)">...</svg>
<div style={{ background: 'var(--color-surface)' }} />
```

---



## 3. Overrides & Custom Colors

- All legacy colors have been abstracted into semantic class names and CSS variables.
- No direct hex codes are allowed in components or stylesheets.
- Palette is defined in Tailwind config and/or CSS variables for global enforcement.

---



## 4. File Locations & Overrides

- All color usage now references semantic class names in all files (landing, dashboard, debug, etc.).
- Tailwind config and CSS variables enforce palette globally.
- SVGs and inline styles use semantic variables only.

---


## 5. How to Audit/Override Colors

- To change a color globally, update the semantic class or CSS variable in Tailwind config or global stylesheet.
- Never override with raw hex codes—use semantic names only.
- SVG colors must use semantic variables.

---



## 6. Summary Table

| Semantic Class      | Usage Context         | Example File/Line        | Design Intent    |
|---------------------|----------------------|--------------------------|------------------|
| text-primary        | Logo, chevrons       | app/page.tsx:10,31,32    | Brand accent     |
| bg-primary          | Buttons, badges      | app/page.tsx:46,61,82    | CTA, highlight   |
| text-on-primary     | Headline, text       | app/page.tsx:36,headline | Contrast         |
| fill-primary        | Chevron SVG, icons   | app/page.tsx:31,32,159   | Brand accent     |
| bg-surface         | Card backgrounds     | app/page.tsx:114,card    | Panel surface    |
| text-muted         | Muted text           | app/page.tsx:38,subhead  | Secondary info   |
| ...                | ...                  | ...                      | ...              |

---


---

## 7. Linting & CI Enforcement

- All code must use semantic class names or CSS variables for colors.
- Add ESLint rules (e.g., no-hex-colors-in-jsx, no-hex-in-css) to block raw hex usage in JSX, TSX, CSS, SCSS, etc.
- Add CI checks to fail builds if hex codes are detected outside config files.
- Example ESLint rule:
  - Disallow `/#[0-9a-fA-F]{6}/` in JSX, TSX, CSS except in config/theme files.
- Example CI step:
  - `grep -r --exclude='tailwind.config.js' --exclude='theme.ts' '#[0-9a-fA-F]{6}' . && exit 1`

---

For a full list, see the detailed sections above. Update this README as new semantic colors are added or changed.
