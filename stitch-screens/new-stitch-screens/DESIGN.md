---
name: SkillShare Desktop
colors:
  surface: '#faf8ff'
  surface-dim: '#d2d9f4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#eaedff'
  surface-container-high: '#e2e7ff'
  surface-container-highest: '#dae2fd'
  on-surface: '#131b2e'
  on-surface-variant: '#464555'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#777587'
  outline-variant: '#c7c4d8'
  surface-tint: '#4d44e3'
  primary: '#3525cd'
  on-primary: '#ffffff'
  primary-container: '#4f46e5'
  on-primary-container: '#dad7ff'
  inverse-primary: '#c3c0ff'
  secondary: '#505f76'
  on-secondary: '#ffffff'
  secondary-container: '#d0e1fb'
  on-secondary-container: '#54647a'
  tertiary: '#97000c'
  on-tertiary: '#ffffff'
  tertiary-container: '#c20b17'
  on-tertiary-container: '#ffd1cc'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e2dfff'
  primary-fixed-dim: '#c3c0ff'
  on-primary-fixed: '#0f0069'
  on-primary-fixed-variant: '#3323cc'
  secondary-fixed: '#d3e4fe'
  secondary-fixed-dim: '#b7c8e1'
  on-secondary-fixed: '#0b1c30'
  on-secondary-fixed-variant: '#38485d'
  tertiary-fixed: '#ffdad6'
  tertiary-fixed-dim: '#ffb4ab'
  on-tertiary-fixed: '#410002'
  on-tertiary-fixed-variant: '#93000b'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fd'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.005em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0em
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0.005em
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-xs:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.04em
  code-md:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
  code-sm:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 16px
  gutter-wide: 24px
  margin: 24px
  margin-wide: 32px
  space-2xs: 4px
  space-xs: 8px
  space-sm: 12px
  space-md: 16px
  space-lg: 24px
  space-xl: 32px
  space-2xl: 48px
---

## Brand & Style

This design system targets an intentional, distraction-free desktop learning environment. Built for creators, technical practitioners, and lifelong students, the interface emphasizes instructional clarity, dense content absorption, and focused project workspaces.

The visual style is rooted in **Modern Utilitarianism with Structured Wireframe Precision**. Every element adheres strictly to a clean, structural blueprint aesthetic. The chrome recedes to the background, allowing instructional media, curriculum tracking, and live code exercises to command full visual weight. Clean lines, razor-sharp alignment, deliberate contrast, and explicit layout structures eliminate visual ambiguity without feeling unfinished.

## Colors

The system uses a strictly light color palette designed for high contrast and sustained legibility during long-form learning sessions.

### Functional Tokens & Roles
- **Canvas (`neutral-50` / `#F8FAFC`)**: Applied strictly to outer application viewports, main page canvas, and app-shell structural backdrops.
- **Card Surface (`neutral-0` / `#FFFFFF`)**: Base container fill for panels, sidebars, modules, and instructional content blocks.
- **Primary Indigo (`#4F46E5`)**: Active interactions, primary progress indicators, primary buttons, and key focal points.
- **Primary Hover (`#4338CA`)**: Interactive hover and active focus states.
- **Primary Tint 100 (`#E0E7FF`)**: Selection outlines, active list item backgrounds, and active badge boundaries.
- **Primary Tint 50 (`#EEF2FF`)**: Soft fills, passive selections, and subtle contextual banners.
- **Danger (`#DC2626`)**: Critical alerts, code error syntax, destructive state toggles, and overdue flags.

### Neutral Scale
- **`neutral-0` (`#FFFFFF`)**: Pure surface background.
- **`neutral-50` (`#F8FAFC`)**: Canvas baseline.
- **`neutral-100` (`#F1F5F9`)**: Secondary surfaces, hover states on neutrals, disabled controls, skeleton shimmer base.
- **`neutral-200` (`#E2E8F0`)**: Structural wireframe borders, panel dividers, tab rules.
- **`neutral-300` (`#CBD5E1`)**: Disabled borders, skeleton shimmer highlights, inactive checkboxes/radios.
- **`neutral-500` (`#64748B`)**: Secondary metadata, inactive icons, breadcrumb paths, helper text.
- **`neutral-700` (`#334155`)**: Subheadings, active menu items, table data text.
- **`neutral-900` (`#0F172A`)**: Primary headings, standard body text, prominent labels.

## Typography

Typography establishes an unyielding visual hierarchy calibrated for high-density desktop displays.

- **Proportional UI Typeface (`Inter`)**: Used across all headings, body text, form elements, table structures, and UI controls. Tabular figures (`tnum`) must be enforced for numeric metrics, timestamps, video durations, and curriculum counters.
- **Monospaced Technical Typeface (`JetBrains Mono`)**: Exclusively reserved for inline code, syntax viewers, terminal instances, keyboard shortcut tokens, and asset hashes.
- **Tracking & Proportion**: Tight negative tracking applies to displays and headlines to maintain typographic cohesion. Positive tracking applies to `label-xs` uppercase tags to preserve legibility at micro scales.

## Layout & Spacing

The layout is anchored to a rigid 4px/8px geometric cadence. Arbitrary values outside the 4px, 8px, 12px, 16px, 24px, 32px, and 48px baseline are prohibited.

### Desktop Layout Framework
- **Shell Structure**: A fixed 240px collateral navigation rail on the left, an adaptive core stage (min-width: 768px), and an optional collapsible contextual inspector on the right (320px fixed).
- **Desktop Grid**: 12-column fluid grid within the core stage bounded by a max-width of 1440px. Column gutters scale from `gutter` (16px) on compact desktop viewports (1024px–1280px) to `gutter-wide` (24px) on wide displays (>1280px).
- **Canvas Margins**: Standard interior padding of the central workspace is locked to `margin` (24px) or `margin-wide` (32px).

### Spacing Usage Rules
- `4px` (`space-2xs`): Icon-to-label inline offsets, compact badge padding, stacked tag gaps.
- `8px` (`space-xs`): Form input row gaps, menu list item gaps, nested wireframe component padding.
- `12px` (`space-sm`): Card header internal spacing, list-item block padding, compact form gaps.
- `16px` (`space-md`): Standard component internal padding, default vertical stack gap.
- `24px` (`space-lg`): Card container padding, structural section gaps within panels.
- `32px` (`space-xl`): Module separation, primary view divider gaps.
- `48px` (`space-2xl`): Page headers, major chapter divisions, empty-state orchestrations.

## Elevation & Depth

To preserve a wireframe and skeleton aesthetic, visual separation is achieved through explicit containment lines and tone shifts rather than multi-layered shadows.

### Border Hierarchy
- **Standard Structural Border**: 1px solid `neutral-200` (`#E2E8F0`). Used for cards, panels, table borders, and structural splitters.
- **Interactive / Focused Border**: 1px solid `primary` (`#4F46E5`) with an exterior outline offset of 2px using `primary-100` (`#E0E7FF`).
- **Dividers & Sub-sections**: 1px solid `neutral-100` (`#F1F5F9`). Used inside lists and nested panels.

### Surface Tiers
- **Level 0 (Canvas)**: `neutral-50` (`#F8FAFC`). Root window backdrop.
- **Level 1 (Card / Workspace Surface)**: `neutral-0` (`#FFFFFF`) with 1px border `neutral-200`. Default for modules, video players, and curriculum trees.
- **Level 2 (Active Inset / Table Header / Hover)**: `neutral-100` (`#F1F5F9`). Non-interactive structural backdrops and table headers.

### Shadows
Shadows are minimized. Floating modals and flyout dropdowns use a single utilitarian shadow:
- `0px 4px 12px rgba(15, 23, 42, 0.06), 0px 1px 2px rgba(15, 23, 42, 0.04)` combined with a 1px `neutral-200` containment border.

## Shapes

The design system maintains a **Soft** shape language (`roundedness: 1`), reinforcing precision, data-density, and architectural clarity.

### Corner Radii
- **Base (0.25rem / 4px)**: Default for input fields, buttons, badges, chips, code snippets, checkboxes, and segmented controls.
- **Medium (0.375rem / 6px)**: Dropdown menus, modal dialog shells, toast containers.
- **Large (0.5rem / 8px)**: Standard cards, primary panels, video player viewport containers.
- **None (0px)**: Data grid cells, inline code execution panels, full-bleed split panes.

## Components

### Buttons
- **Primary**: Background `#4F46E5`, text `#FFFFFF`, radius 4px, height 36px (compact) or 40px (default). Hover state: `#4338CA`. Active state: `#3730A3`. Focus-visible: 2px ring `#E0E7FF`.
- **Secondary**: Background `#FFFFFF`, 1px border `#CBD5E1`, text `#334155`. Hover: background `#F8FAFC`, border `#94A3B8`, text `#0F172A`.
- **Ghost / Tertiary**: Transparent background, text `#64748B`. Hover: background `#F1F5F9`, text `#0F172A`.
- **Destructive**: Background `#DC2626`, text `#FFFFFF`. Hover: `#B91C1C`.

### Cards & Panels
- Constructed with `#FFFFFF` background and 1px `#E2E8F0` border.
- Standard internal padding: 24px (`space-lg`). Header areas have 16px bottom padding separated by a 1px `#F1F5F9` rule. No drop shadows in resting state.

### Chips & Badges
- **Status / Category**: Height 22px, font `label-xs`, radius 4px, padding 2px 8px.
  - Active/In-Progress: Background `#EEF2FF`, text `#4F46E5`, border 1px solid `#E0E7FF`.
  - Neutral/Draft: Background `#F1F5F9`, text `#64748B`, border 1px solid `#E2E8F0`.
  - Attention/Danger: Background `#FEF2F2`, text `#DC2626`, border 1px solid `#FEE2E2`.

### Checkboxes & Radio Buttons
- 16x16px footprint, radius 3px (checkbox) or circular (radio).
- Border: 1.5px solid `#CBD5E1`, background `#FFFFFF`.
- Checked state: `#4F46E5` background, `#FFFFFF` checkmark/indicator icon, border `#4F46E5`.

### Input Fields
- Height: 36px (compact), 40px (standard). Background `#FFFFFF`. Border: 1px solid `#CBD5E1`. Radius: 4px.
- Padding: 0 12px. Text style: `body-md` in `#0F172A`. Placeholder: `#64748B`.
- Focus: Border `#4F46E5`, 2px glow ring `#E0E7FF`.

### Lists & Curriculum Navigation
- List item height: 40px. Padding: 0 12px.
- Resting state: transparent background, text `#334155`.
- Hover state: background `#F8FAFC`, text `#0F172A`.
- Active/Selected state: background `#EEF2FF`, text `#4F46E5`, left border indicator 3px `#4F46E5`.

### Code Editor & Snippet Panes
- Background `#FFFFFF`, border 1px solid `#E2E8F0`, header toolbar 32px height filled with `#F8FAFC`.
- Font: `code-md` (`JetBrains Mono`, 13px/20px). Line numbering styled in `neutral-500` (`#64748B`).

### Skeleton States
- Structural wireframe representations use `#F1F5F9` solid block fills with radius 4px. Shimmer highlight sweeps across using `#CBD5E1` at 30% opacity. Text line skeletons maintain an explicit 12px height with an 8px vertical gap.