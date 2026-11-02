# Traccoon PayAgent

## Mandatory Traccoon UI skill

For **every Traccoon UI, UX, landing page, component, design token, or interface-copy
change**, read and apply `.agents/skills/traccoon-design-skill/SKILL.md`.
Do this without requiring the user to repeat design requirements. If the skill cannot
be found in the current agent environment, state that limitation rather than inventing
Traccoon rules. Prioritize its hard rules over stylistic inspiration. First audit the
existing components and master theme; preserve product logic; use centralized tokens;
verify states, responsive behavior, and accessibility.

For any component that must work on small viewports, also apply
`.agents/skills/traccoon-responsive/SKILL.md` (reflow or crop, never scale to fit).

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
