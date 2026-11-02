---
name: bryl-minimal-design
description: Traccoon-adapted version of Bryl Lim's bryl-minimal design language. Use alongside traccoon-design-skill for layout restraint, hairline structure, card shadows, motion timing, and dark-mode token mapping in Traccoon PayAgent UI. Never overrides traccoon-design-skill; where they differ, Traccoon wins.
---

# bryl-minimal, tweaked for Traccoon

Adapted from Bryl Lim's `bryl-minimal-design` (MIT, https://github.com/bryllim/bryl-minimal-design).
This version keeps Bryl's restraint, structure and motion, and removes everything that
conflicts with `traccoon-design-skill`.

## Precedence

1. The user's explicit instructions and accessibility requirements.
2. `traccoon-design-skill` hard rules.
3. This skill.

If anything here seems to conflict with `traccoon-design-skill`, follow Traccoon and do not
mention this skill as justification.

## Removed from the original (do not use)

- Halftone dot textures, dot fields, and masked dot photo treatments.
- Numbered section headers such as `01 — blog`, and any decorative indexes.
- Tiny uppercase monospace micro-labels, eyebrows, kickers, and pre-titles.
- Geist, Geist Mono, Geist Pixel and Source Serif 4. Use **Nunito** for all UI text.
  A monospace face is allowed only for genuinely technical values (transaction hashes,
  IDs, code), never as a decorative label register.
- "No accent color" pure black-and-white palette. Use Traccoon's semantic color tokens.
- Understated flat buttons and arrow text-links posing as buttons. Buttons follow
  Traccoon's tactile button rules.
- Lowercase single-word page titles as a stylistic rule. Use clear, normal-case titles.

## What to keep

### Restraint

- Whitespace is structure. If a screen feels slightly empty, that is usually correct.
- Emphasis comes from hierarchy and inversion (ink surface with light text) before color.
  Allow at most one high-emphasis element per view.
- Filled surfaces are rare. Prefer a border to a background tint.

### Hairline structure

- Separate sections, list rows and grid cells with 1px borders using the subtle-border token.
- Stat rows and summary tiles may divide cells with hairlines on both axes instead of gaps.
- Keep borders one weight. Do not mix 1px and 2px dividers on the same screen
  (tactile button edges are the exception and come from Traccoon tokens).

### Layout

- Reading and form content: max width about 42rem. Dense dashboards and tables: up to
  about 72rem, only when the content needs it.
- Page padding 1rem on mobile and 1.5rem on desktop. Card padding about 1.25rem.
  Gaps inside components about 0.75rem, between cards 0.75 to 1.5rem.
- Large vertical rhythm between sections (about 3rem), tight rhythm inside them.
- Follow `traccoon-responsive` for small viewports.

### Cards, panels and modals

- Radius ladder: large cards 16px, medium 12px, small elements 8px, inputs 6px, pills full.
  If Traccoon tokens define radii, use those instead.
- Card shadows read as soft ground contact: low-alpha, large blur, strong negative spread
  (roughly 0 8px 22px -14px at 25% ink). On hover a clickable card may lift 2px and deepen
  the shadow slightly. In dark mode, rely on borders and let shadows nearly disappear.
  Buttons do not use this shadow; they use Traccoon's tactile offset shadow.
- Modals: overlay of ink at about 30% with a light blur, centered panel up to about 28rem,
  16px radius, fade and scale from 95% to 100% over 200ms. Escape closes, focus is trapped
  and returned on close.

### Links

- Underline drawn at about 25% opacity of the text color, offset about 2px, rising to full
  opacity on hover. External links get a trailing "↗" with an accessible label.

### Motion

- Micro-interactions (color, opacity, small transforms): about 200ms.
- Card hover: shadows about 350ms, transforms about 420ms, on a strong ease-out such as
  `cubic-bezier(0.16, 1, 0.3, 1)`.
- Page entrance: elements fade up from 12px over about 700ms, staggered about 70ms,
  capped around 330ms total delay. Use only on first load of a page, not on every data refresh.
- Status indicators (for example "waiting for payment") may pulse opacity 1 to 0.25 to 1
  on a slow 1.8s loop.
- Theme change crossfades colors over about 500ms.
- Disable all of it under `prefers-reduced-motion`. The UI must be complete when still.
- Store durations and easing as tokens, never as literals in components.

### Theming

- Colors are semantic tokens swapped wholesale for dark mode: dark mode is a re-mapping,
  not a redesign. Support light, dark and system, defaulting to system, and persist the choice.
- Declare `color-scheme: light dark` so native controls and scrollbars match.
- Text selection uses the inverted ink and background pair.
- Slim scrollbars (about 6px, transparent track, rounded thumb using a border token).

## Applying it

Work in this order on a screen: apply Traccoon tokens and components first, then tighten
layout width and spacing, convert boxes and tints into hairlines where possible, soften card
shadows, add dark-mode mapping, and add entrance motion last. Stop before it gets busy.
