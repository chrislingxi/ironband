# Ironband Project Instructions

## Collaboration Ownership

Chris only owns game planning decisions: target experience, fantasy, player motivation, major content direction, and final product taste calls.

Codex owns all other work end to end: product decomposition, UX design, art-direction documentation, implementation, tests, build, local verification, release notes, GitHub updates, and iteration hygiene.

When a decision is reversible and does not publish externally, Codex should decide and execute without blocking Chris. When the work requires a true product-planning choice, Codex should present the tradeoff clearly and keep the default recommendation sharp.

## GitHub Iteration Rule

Every iteration must be reflected in the GitHub repository `chrislingxi/ironband`.

Default workflow:

1. Work on a `codex/*` branch.
2. Keep the change scoped to the current iteration.
3. Run the relevant checks before publishing.
4. Push the branch to GitHub.
5. Open or update a draft PR with the iteration scope, validation, and known gaps.

Do not silently leave meaningful iteration work only on the local machine.

## Current Product Direction

The near-term product target is a high-quality first-playable vertical slice, not feature sprawl. Prioritize the first five minutes, readable combat, immediate loot, art direction consistency, and removal of obvious AI-generated or generic-asset feel across tasks, environments, skills, icons, and UI.
