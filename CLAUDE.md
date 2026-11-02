# Traccoon PayAgent

## Traccoon design standard

For all interface and user-facing copy tasks, automatically load the `traccoon-design-skill`
from `.claude/skills/traccoon-design-skill/SKILL.md`.
Follow its no-eyebrow, no-decorative-dots/section-numbering, Nunito, tactile-button,
consistent-return, charcoal-marketing, centralized-token, accessibility, and natural-copy
requirements. Read existing project tokens/components before edits and keep business
logic unchanged. Never silently substitute inspiration skills for this standard.

For any component that must work on mobile, also apply
`.claude/skills/traccoon-responsive/SKILL.md`.

## Other skills in this repo

- **bryl-minimal-design** (Traccoon-adapted): layout restraint, hairlines, card shadows, motion
  and dark-mode mapping. Always subordinate to `traccoon-design-skill`.
- **ponytail**: default coding stance. Smallest change that fully solves the task; reuse
  existing code and the platform before adding code or dependencies.
- **superpowers** (`brainstorming`, `writing-plans`, `executing-plans`, `test-driven-development`,
  `systematic-debugging`, `verification-before-completion`, and others): process skills for
  planning, testing, debugging and review.

When these conflict: the user's instructions first, then `traccoon-design-skill` for UI,
then ponytail for scope. Hackathon deadlines win over process ceremony: skip brainstorming
and long plans for small, clear changes.
