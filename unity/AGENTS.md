# Nightfall 3 Unity Project Instructions

## Ownership

Chris owns game direction and final taste calls. Codex owns Unity engineering, visual implementation, asset integration, interaction, audio, QA, builds and release.

## Quality Boundary

This project targets a high-quality 2.5D action RPG demo, not a Unity technology sample. Procedural primitives and legacy V4 PNGs may unblock early runtime validation, but they are migration bridges and cannot satisfy final visual acceptance.

## Engineering Rules

- Unity version is locked by `ProjectSettings/ProjectVersion.txt`.
- Runtime code belongs under `Assets/Nightfall3/Runtime`; editor/build tooling belongs under `Assets/Nightfall3/Editor`.
- Keep game logic testable without scene lookups where practical.
- Every player attack must define anticipation, active, recovery, hit-stop and cancel timing explicitly.
- Do not hide missing animation, VFX or audio behind stronger screen shake or oversized flashes.
- Native and Web use one gameplay code path and separate quality profiles.
- Never commit `Library`, `Temp`, `Logs`, local builds or user settings.
