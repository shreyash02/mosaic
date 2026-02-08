# Mosaic Design Principles

This document defines the visual design language for Mosaic. These principles ensure consistency across all product surfaces and should guide every design and implementation decision.

---

## Core Philosophy

**Trust through simplicity.** Mosaic handles sensitive feedback data. Our visual design should feel calm, professional, and trustworthy—never flashy or distracting. We earn trust by being clear, not clever.

---

## The Six Principles

### 1. Restraint Over Decoration

**What it means:** Use whitespace and typography hierarchy instead of colors, borders, and embellishments.

**In practice:**
- Separate sections with generous spacing, not heavy dividers
- Let content breathe—when in doubt, add more whitespace
- Avoid decorative elements that don't serve a functional purpose
- Use subtle dividers (1px, light gray) only when section breaks need emphasis

**Avoid:**
- Drop shadows for non-interactive elements
- Gradients for backgrounds
- Decorative icons or illustrations that don't convey meaning


### 2. Monochromatic Confidence

**What it means:** Build visual hierarchy through shades of gray and black. Reserve color for meaningful actions and states only.

**In practice:**
- Primary text: Dark charcoal (#1a1a2e or similar)
- Secondary text: Medium gray (#6b7280)
- Tertiary/helper text: Light gray (#9ca3af)
- Backgrounds: White (#ffffff) and light gray (#f9fafb)
- Color is reserved for: Primary actions, error states, success states, links

**Avoid:**
- Using color to decorate or add visual interest
- Multiple accent colors competing for attention
- Colored backgrounds for content sections


### 3. Structured Clarity

**What it means:** Use clear section labels, consistent grids, and predictable patterns so users always know where they are.

**In practice:**
- Section headers use small caps, lighter weight, with generous top margin
- Content follows a consistent grid (3-column for features, single column for steps)
- Numbered sequences use circular badges with consistent styling
- Related items are grouped visually with consistent spacing

**Patterns:**
- **Section label:** ALL CAPS, small size, medium gray, letter-spacing
- **Content title:** Sentence case, bold, dark text
- **Content body:** Normal weight, secondary gray


### 4. Icons as Accents, Not Heroes

**What it means:** Icons support and reinforce text—they never replace it or compete with it.

**In practice:**
- Use lightweight, outlined (line-style) icons
- Contain icons in subtle rounded-square backgrounds
- Keep icons monochromatic (dark gray)
- Maintain consistent sizing across similar contexts
- Always pair icons with text labels

**Avoid:**
- Filled or heavy icons
- Colorful or multi-colored icons
- Icons without accompanying text
- Oversized icons that dominate the layout


### 5. Two-Tier CTAs

**What it means:** Establish clear visual hierarchy between primary and secondary actions.

**In practice:**
- **Primary action:** Solid dark background (#1a1a2e), white text, subtle hover state
- **Secondary action:** Transparent background, dark border, dark text (ghost/outlined style)
- Primary buttons may include a directional arrow (→) for forward actions
- Only one primary action per visible viewport when possible

**Avoid:**
- Multiple primary buttons competing for attention
- Colorful buttons (blue, green) for primary actions
- Text-only buttons for important actions


### 6. Trust Through Simplicity

**What it means:** Every element should feel intentional and necessary. Remove anything that doesn't directly serve the user's task.

**In practice:**
- Minimal navigation—show only what's needed
- Clear, direct copy—no marketing fluff in the app
- Predictable layouts—similar pages should feel similar
- Fast, responsive interactions—no unnecessary animations

**The trust equation:**
- Clean design = professional = trustworthy
- Visual noise = confusion = uncertainty
- Simplicity = confidence = trust

---

## Typography Scale

| Element | Size | Weight | Color | Notes |
|---------|------|--------|-------|-------|
| Page title | 2.5rem (40px) | 700 (Bold) | Primary | Main headline |
| Section label | 0.75rem (12px) | 500 (Medium) | Tertiary | ALL CAPS, letter-spacing: 0.05em |
| Card title | 1rem (16px) | 600 (Semibold) | Primary | Feature/item titles |
| Body text | 0.875rem (14px) | 400 (Regular) | Secondary | Descriptions, paragraphs |
| Helper text | 0.75rem (12px) | 400 (Regular) | Tertiary | Captions, metadata |

---

## Spacing Scale

Use a consistent 4px base unit:

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Tight spacing, inline elements |
| sm | 8px | Related elements, icon padding |
| md | 16px | Standard element spacing |
| lg | 24px | Section padding, card padding |
| xl | 32px | Between content blocks |
| 2xl | 48px | Between major sections |
| 3xl | 64px | Page-level vertical rhythm |

---

## Component Patterns

### Feature Card
```
┌─────────────────────────────┐
│  [icon]                     │
│                             │
│  **Title**                  │
│  Description text in gray   │
│  that explains the feature. │
└─────────────────────────────┘
```
- Icon: 40x40px container, rounded corners, light gray background
- Title: Semibold, primary color
- Description: Regular weight, secondary color
- No border on the card itself

### Numbered Step
```
(1)  **Step Title**
     Description of what happens in this step,
     with enough detail to be useful.
```
- Number badge: 24x24px circle, dark background, white text
- Title: Semibold, primary color, inline with badge
- Description: Below title, secondary color, indented to align with title

### Section Header
```
KEY CAPABILITIES
─────────────────────────────────────
```
- All caps, letter-spaced
- Optional thin divider below
- Large top margin (2xl or 3xl)

---

## Applying These Principles

When making design decisions, ask:

1. **Is this necessary?** Remove anything that doesn't help the user.
2. **Is this consistent?** Follow established patterns.
3. **Is this calm?** Avoid visual noise and competing elements.
4. **Does this build trust?** Professional, not playful.

---

## References

- Landing page design (Figma Make, Feb 2026)
- See `frontend/src/styles/tokens.ts` for implementation values
