# Accessibility Specification & Audit (WCAG 2.2 AA)

This document details the accessibility architecture, keyboard controls, contrast guidelines, and screen-reader walkthroughs for Theng Nioh's personal photography portfolio.

---

## 1. Compliance Standard: WCAG 2.2 AA

The application is engineered to meet or exceed **WCAG 2.2 Level AA** criteria:
- **Perceivable**: All canvas-rendered photographs have accessible names (`aria-label`) and descriptive `alt` texts. Ambient glow OKLCH contrast is clamped to $\ge 4.5:1$.
- **Operable**: 100% of features and views are operable via keyboard alone without trapped focus.
- **Understandable**: Native accessible controls mirror rotational or gesture dials.
- **Robust**: Clean semantic HTML with ARIA live regions for telemetry updates.

---

## 2. Global Keyboard Map

| Key | Context | Action |
|:---|:---|:---|
| `Tab` / `Shift+Tab` | Global | Move keyboard focus sequentially through interactive elements |
| `Enter` / `Space` | Global | Activate focused button, link, or photo |
| `Esc` | Global / Modals | Close open modal, search drawer, or return to gallery from Inspector |
| `1` | Gallery | Switch to Kinetic Sway Grid mode |
| `2` | Gallery | Switch to Spatial 2D Infinite Canvas mode |
| `3` | Gallery | Switch to Darkroom Contact Sheet mode |
| `4` | Gallery | Switch to Visual Zine (Story Mode) |
| `V` / `v` | Gallery | Toggle Viewfinder optical dials drawer |
| `ArrowUp` / `ArrowDown` | Spatial Canvas | Pan camera vertically |
| `ArrowLeft` / `ArrowRight` | Spatial Canvas | Pan camera horizontally |
| `+` / `-` | Spatial Canvas | Zoom in / Zoom out |
| `0` | Spatial Canvas | Fit all photographs in view |
| `ArrowLeft` / `ArrowRight` | Photo Inspector | Navigate to previous / next photograph |
| `ArrowLeft` / `ArrowRight` | Split-Loupe | Move Before/After divider slider |
| `Home` / `End` | Split-Loupe | Jump divider to 0% (Before) or 100% (After) |
| `ArrowLeft` / `ArrowRight` | Visual Zine | Flip previous / next editorial spread |
| `?` | Admin Studio | Toggle keyboard shortcuts cheat sheet |

---

## 3. Screen Reader Walkthroughs

### Visual Gallery
1. **Skip Link**: The very first focusable element is `<a href="#main-content">Skip to content</a>`.
2. **Masthead**: Identifies "Theng Nioh Photography" with links to Gallery and About.
3. **Gallery Dock**: Roving tablist announcing current mode (e.g. "Kinetic Sway Grid", "Spatial 2D Canvas").
4. **Photo Cards**: Each photo is presented with full accessible text:
   `aria-label="Title. Descriptive alt text explaining subject, lighting, and composition."`
5. **Viewfinder Telemetry**: Changes to optical dials announce matching photo counts dynamically via `aria-live="polite"`.

### Photo Inspector (`/photo/:slug`)
1. **Heading**: Photo title (`<h1>`) and collection badge.
2. **Visual Viewport**: Real DOM `<p class="sr-only">` contains the long visual description.
3. **Telemetry & Histogram**: Live values for Shutter, Aperture, and ISO are presented in standard `<dl>` definition lists.
4. **Composition Guides**: High-contrast SVG guides with text equivalents describing dominant light angle.

### Visual Zine (`/zine/:id`)
1. **Page Landmark**: Horizontal spreads with clear `aria-label="Page X of Y"`.
2. **GPS Privacy**: Approximate or concealed GPS telemetry prevents unwanted location disclosure.

---

## 4. Motion & Contrast Guardrails

1. **`prefers-reduced-motion`**:
   - Automatically detected via `window.matchMedia('(prefers-reduced-motion: reduce)')`.
   - When enabled, 3D perspective tilts, gyro sway, and liquid bends are disabled.
   - Smooth transitions are replaced with instantaneous or simple linear fades.
2. **OKLCH Ambient Glow Contrast**:
   - Ambient background gradients derived from photo palettes are clamped in OKLCH space to ensure background luminance never exceeds safety thresholds ($L \le 0.15$), maintaining text contrast $\ge 7:1$ for white text.
3. **Minimum Touch Targets**:
   - All interactive buttons and dials provide a minimum target area of $44 \times 44$ CSS pixels.

