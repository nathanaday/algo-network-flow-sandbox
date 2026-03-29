# Graph Visualization UI & Style Specification

This document defines the complete visual language for algorithm visualization canvases.
Anyone following this specification should produce graph visualizations with an identical
look and feel.

---

## 1. Design Philosophy

The aesthetic is a **dark, minimal IDE-like canvas**. Think VS Code meets a network
monitoring dashboard. The palette is desaturated and neutral at rest, with vivid semantic
color applied only when the algorithm activates elements. The overall feel is technical,
precise, and calm -- not playful or decorative.

Key principles:

- **Dark-first**: Near-black backgrounds with subtle texture. No pure blacks or whites.
- **Color is signal**: Color is reserved for meaning. Inactive elements are monochrome.
- **Monospace for data, sans-serif for labels**: Two typefaces with strict roles.
- **Soft glow over hard contrast**: Highlighted elements use SVG glow filters and widened
  strokes rather than jarring color blocks.
- **Dot-grid canvas**: The graph sits on a subtle dot grid that implies infinite space
  and gives spatial grounding during pan/zoom.

---

## 2. Canvas

### Background
The graph canvas is a full-bleed container that fills its grid cell. It has no padding --
the graph floats freely within it.

| Property          | Value                                                    |
|-------------------|----------------------------------------------------------|
| Background color  | `#111113`                                                |
| Dot pattern       | `radial-gradient(circle, #252528 1px, transparent 1px)`  |
| Dot spacing       | `20px x 20px` (backgroundSize)                           |
| Border radius     | `8px`                                                    |
| Overflow          | `hidden`                                                 |

The dot grid is purely CSS -- no SVG pattern needed. The dots are `#252528`, barely
visible against `#111113`, providing a faint graph-paper feel.

### SVG Layer
The SVG element fills 100% of the container. All graph elements live inside a single
`<g>` group that receives zoom/pan transforms.

| Property       | Value         |
|----------------|---------------|
| Zoom range     | `0.3x - 3.0x` |
| Pan            | Unrestricted  |
| Implementation | D3 zoom behavior on the SVG, transform applied to inner `<g>` |

### SVG Defs
Define these shared resources in `<defs>`:

**Arrow markers** (one per edge color state):

| Marker ID          | Fill color |
|--------------------|------------|
| `arrow-default`    | `#444`     |
| `arrow-flow`       | `#34D399`  |
| `arrow-full`       | `#EF4444`  |
| `arrow-path`       | `#3B82F6`  |
| `arrow-updating`   | `#F59E0B`  |

All markers share these properties:

| Property     | Value              |
|--------------|--------------------|
| viewBox      | `0 -5 10 10`       |
| refX         | `32`               |
| refY         | `0`                |
| markerWidth  | `8`                |
| markerHeight | `8`                |
| orient       | `auto`             |
| Path         | `M0,-5L10,0L0,5`  |

The `refX` of `32` offsets the arrowhead so it stops at the node circle boundary
(node radius 22 + marker clearance).

**Glow filter:**

```
<filter id="glow">
  <feGaussianBlur stdDeviation="3" result="coloredBlur" />
  <feMerge>
    <feMergeNode in="coloredBlur" />
    <feMergeNode in="SourceGraphic" />
  </feMerge>
</filter>
```

This creates a soft bloom effect on active/path edges.

---

## 3. Nodes

### Shape and Size
Nodes are **circles**, rendered as SVG `<circle>` elements inside a `<g>` group.

| Property       | Value         |
|----------------|---------------|
| Radius         | `22px`        |
| Stroke width   | `2px` (default), `3px` (active) |
| Cursor         | `grab`        |

### Node Label
Each node contains a centered text label (typically a single uppercase letter like
"S", "A", "B", "T" or a short identifier).

| Property           | Value                          |
|--------------------|--------------------------------|
| Font family        | `'Outfit', sans-serif`         |
| Font size          | `14px`                         |
| Font weight        | `600`                          |
| Color              | `#E8E8E8`                      |
| Text anchor        | `middle`                       |
| Dominant baseline  | `central`                      |
| Pointer events     | `none`                         |

The label is always centered in the circle. It does not respond to mouse events
(clicks pass through to the circle).

### Node Color States

Nodes have a **fill** and a **stroke** that change based on role and algorithm state.
The hierarchy below is evaluated top-to-bottom; first match wins.

| State              | Fill        | Stroke      | Stroke Width |
|--------------------|-------------|-------------|--------------|
| Source node        | `#F59E0B`   | `#F59E0B`   | 2px          |
| Sink node          | `#10B981`   | `#10B981`   | 2px          |
| Active (current)   | `#3B82F6`   | `#3B82F6`   | 3px          |
| Frontier (queued)  | `#1E3A5F`   | `#3B82F6`   | 2px          |
| Visited            | `#4C1D95`   | `#A78BFA`   | 2px          |
| Default            | `#1E1E22`   | `#444`      | 2px          |

**Visual notes:**
- Source and sink nodes use a **monochrome fill+stroke** (amber and green respectively)
  making them immediately identifiable at any zoom level.
- Active nodes are vivid blue with thickened stroke to draw the eye.
- Frontier nodes use a dimmed blue fill (`#1E3A5F`) with bright blue stroke, creating
  a "hollow highlight" effect -- they are next in line but not yet the focus.
- Visited nodes use deep purple fill (`#4C1D95`) with lighter purple stroke (`#A78BFA`),
  signaling "already processed" without demanding attention.
- Default nodes are dark surface color (`#1E1E22`) with neutral gray stroke, receding
  into the background.

### Node Transitions
All color changes animate over **200ms** using D3 transitions. This prevents jarring
pops as the algorithm steps through states.

---

## 4. Edges

### Line Rendering
Edges are straight SVG `<line>` elements connecting node centers. The arrowhead marker
visually terminates the line at the target node boundary.

| Property       | Default Value |
|----------------|---------------|
| Stroke color   | `#444`        |
| Stroke width   | `2px`         |
| Marker end     | `url(#arrow-default)` |

### Edge Color States

Evaluated top-to-bottom; first match wins.

| State                          | Color     | Width  | Marker            | Filter         |
|--------------------------------|-----------|--------|-------------------|----------------|
| Active (being updated)         | `#F59E0B` | `4px`  | `arrow-updating`  | `url(#glow)`   |
| In augmenting path             | `#3B82F6` | `3.5px`| `arrow-path`      | `url(#glow)`   |
| Full (flow = capacity, cap > 0)| `#EF4444` | `2px`  | `arrow-full`      | none           |
| Carrying flow (flow > 0)       | `#34D399` | `2px`  | `arrow-flow`      | none           |
| Default (no flow)              | `#444`    | `2px`  | `arrow-default`   | none           |

**Visual notes:**
- The **glow filter** is applied only to path edges and the actively-updating edge.
  This creates a soft luminous halo that makes the augmenting path visually pop against
  the neutral graph.
- Active edges are amber (`#F59E0B`) and the thickest at 4px -- they represent the
  single edge currently being modified.
- Path edges are blue (`#3B82F6`) at 3.5px -- slightly thinner than active but still
  prominent, tracing the discovered route.
- Full-capacity edges turn red (`#EF4444`) as a warning signal.
- Edges carrying partial flow are green (`#34D399`).
- Marker colors always match their line color.

### Edge Transitions
Color and width animate over **200ms** using D3 transitions, matching node timing.

---

## 5. Edge Labels

Every directed edge displays a **flow/capacity label** at its midpoint.

### Label Text

| Property          | Value                              |
|-------------------|------------------------------------|
| Font family       | `'JetBrains Mono', monospace`      |
| Font size         | `11px`                             |
| Font weight       | `500`                              |
| Text anchor       | `middle`                           |
| Dominant baseline | `central`                          |
| Format            | `{flow} / {capacity}` (e.g. `0 / 10`) |

### Label Background Pill
The text sits on a small rounded rectangle that prevents the label from blending into
crossing edges.

| Property       | Value                      |
|----------------|----------------------------|
| Fill           | `#111113` (canvas bg)      |
| Stroke         | `rgba(255,255,255,0.06)`   |
| Stroke width   | `1px`                      |
| Border radius  | `4px` (rx/ry)              |
| Padding X      | `6px` (each side of text)  |
| Padding Y      | `3px` (above and below)    |

The pill is sized dynamically from the text bounding box on each simulation tick.

### Label Color
- When the edge is in its default state: `#9CA3AF` (secondary text)
- When the edge has any non-default color state: the label text inherits that edge's
  color (green, red, blue, or amber), keeping the label visually linked to its edge.

### Label Positioning
Labels are placed at the geometric midpoint between source and target node centers:
```
x = (source.x + target.x) / 2
y = (source.y + target.y) / 2
```

---

## 6. Force Layout

Nodes are positioned by a D3 force simulation, not manually. This creates organic,
balanced layouts automatically.

| Force          | Parameter          | Value              |
|----------------|--------------------|--------------------|
| Link distance  | `distance`         | `160px`            |
| Charge         | `strength`         | `-400`             |
| Center         | `(x, y)`           | `(width/2, height/2)` |
| Collision      | `radius`           | `40px`             |

**Drag behavior:**
- Cursor shows `grab`. On drag start, the simulation wakes (`alphaTarget(0.3)`).
- During drag, the node is pinned to the cursor position.
- On drag end, the pin is released (`fx/fy = null`) and the simulation cools
  (`alphaTarget(0)`), letting the node settle naturally.

---

## 7. Color Palette Reference

### Backgrounds & Surfaces
| Name           | Hex         | Usage                          |
|----------------|-------------|--------------------------------|
| bg             | `#111113`   | Canvas, label pill background  |
| bgDot          | `#252528`   | Canvas dot pattern             |
| surface        | `#1E1E22`   | Panels, default node fill      |
| surfaceHover   | `#26262B`   | Button/element hover state     |
| surfaceActive  | `#2E2E34`   | Button/element active press    |

### Borders
| Name           | Value                      | Usage               |
|----------------|----------------------------|----------------------|
| border         | `rgba(255,255,255,0.06)`   | Panel borders, label pills |
| borderLight    | `rgba(255,255,255,0.1)`    | Lighter accents      |

### Text
| Name           | Hex         | Usage                            |
|----------------|-------------|----------------------------------|
| text           | `#E8E8E8`   | Primary text, node labels        |
| textSecondary  | `#9CA3AF`   | Edge labels, descriptions        |
| textMuted      | `#6B7280`   | Subtitles, disabled text         |

### Semantic Colors (Vivid / Dim pairs)
Each semantic color has a vivid variant for strokes/text and a dim variant for fills.

| Name     | Vivid     | Dim       | Meaning                     |
|----------|-----------|-----------|------------------------------|
| Green    | `#34D399` | `#065F46` | Flow, success                |
| Amber    | `#F59E0B` | `#78350F` | Source, active update        |
| Blue     | `#3B82F6` | `#1E3A5F` | Path, active node, frontier  |
| Purple   | `#A78BFA` | `#4C1D95` | Visited nodes                |
| Red      | `#EF4444` | `#7F1D1D` | Full capacity, error         |

---

## 8. Typography

### Font Stack

| Role     | Family                             | Usage                      |
|----------|-------------------------------------|----------------------------|
| Display  | `'Outfit', system-ui, sans-serif`   | Labels, headings, body text|
| Data     | `'JetBrains Mono', monospace`       | Edge labels, code, values  |

Both fonts must be loaded externally (Google Fonts or self-hosted).

### Type Scale

| Element          | Family       | Size   | Weight | Other                     |
|------------------|-------------|--------|--------|---------------------------|
| Page title       | Outfit      | 18px   | 700    | letter-spacing: -0.02em   |
| Subtitle         | JetBrains   | 12px   | 400    | color: textMuted          |
| Section header   | Outfit      | 11px   | 600    | uppercase, ls: 0.08em     |
| Body text        | Outfit      | 13px   | 400    | line-height: 1.5          |
| Node label       | Outfit      | 14px   | 600    | centered in circle        |
| Edge label       | JetBrains   | 11px   | 500    | on pill background        |
| Code display     | JetBrains   | 12px   | 400    | line-height: 20px         |

### Font Rendering
```css
-webkit-font-smoothing: antialiased;
-moz-osx-font-smoothing: grayscale;
```

---

## 9. Container & Panel Styling

All UI panels (code display, description, variables, editor) share these properties:

| Property          | Value                       |
|-------------------|-----------------------------|
| Background        | `#1E1E22`                   |
| Border            | `1px solid rgba(255,255,255,0.06)` |
| Border radius     | `8px`                       |
| Padding           | `14px`                      |
| Font family       | `'Outfit', sans-serif`      |
| Text color        | `#E8E8E8`                   |

### Scrollbar Styling (WebKit)
| Property          | Value                       |
|-------------------|-----------------------------|
| Width/height      | `6px`                       |
| Track             | `transparent`               |
| Thumb             | `rgba(255,255,255,0.1)`     |
| Thumb hover       | `rgba(255,255,255,0.2)`     |
| Thumb radius      | `3px`                       |

---

## 10. Interactive States

### Buttons
| State     | Style                               |
|-----------|--------------------------------------|
| Default   | surface background, text color       |
| Hover     | `filter: brightness(1.15)`           |
| Disabled  | `opacity: 0.4`, `cursor: not-allowed`|

### Inputs / Selects
| Property      | Value                               |
|---------------|--------------------------------------|
| Background    | `#1E1E22`                            |
| Text color    | `#E8E8E8`                            |
| Padding       | `4px 8px`                            |
| Border radius | `4px`                                |

---

## 11. Code Display Highlighting

When algorithm steps highlight code lines, the active range gets:

| Property              | Value                           |
|-----------------------|---------------------------------|
| Background            | `rgba(59, 130, 246, 0.12)`      |
| Left border           | `3px solid #3B82F6`             |
| Scroll behavior       | `smooth` (auto-centers active line) |

### Syntax Coloring (Python)
| Token type | Color     |
|------------|-----------|
| Keywords   | `#C678DD` |
| Builtins   | `#E5C07B` |
| Strings    | `#98C379` |
| Comments   | `#6A737D` |
| Numbers    | `#D19A66` |
| Operators  | `#ABB2BF` |

---

## 12. Animation & Timing

| Animation               | Duration   | Easing       |
|-------------------------|------------|--------------|
| Node color transition   | `200ms`    | D3 default (ease-cubic) |
| Edge color transition   | `200ms`    | D3 default   |
| Edge width transition   | `200ms`    | D3 default   |
| Code scroll             | smooth     | native CSS   |
| Playback base interval  | `1200ms`   | --           |
| Speed options           | 0.5x, 1x, 2x, 4x | interval = 1200 / speed |

---

## 13. Applying to New Graph Problems

To create a new visualization with the same look and feel:

1. **Reuse the color palette exactly.** Import or copy the semantic color tokens. Do not
   introduce new hues. Map your algorithm's concepts to the existing semantic roles:
   - Amber = source / origin / actively-updating element
   - Green = sink / destination / success / flow
   - Blue = current focus / path / frontier
   - Purple = visited / processed / historical
   - Red = saturated / error / constraint

2. **Keep nodes as 22px-radius circles** with the same fill/stroke pattern. If your
   problem requires distinguishing node types beyond source/sink, use the dim/vivid pairs
   (e.g., `purpleDim` fill + `purple` stroke for a new category).

3. **Keep edge labels in JetBrains Mono on pill backgrounds.** Change the label format
   to suit your problem (e.g., `weight: 5` for Dijkstra, `3 / 7` for flow).

4. **Always use the dot-grid canvas** with `#111113` background and `#252528` dots at
   20px spacing.

5. **Use the glow filter** for the primary visual emphasis (the thing the user should
   look at right now). Reserve it for 1-2 elements at a time.

6. **Match the force simulation parameters** (link distance 160, charge -400, collision 40)
   for consistent graph density and spacing. Adjust link distance if your graphs are
   significantly larger or smaller.

7. **Animate at 200ms for state transitions.** This is fast enough to feel responsive
   but slow enough to be perceptible. Do not use easing functions that overshoot.

8. **Panels are surface-colored boxes** (`#1E1E22`) with 1px translucent white borders
   and 8px border radius. No shadows. No gradients.
