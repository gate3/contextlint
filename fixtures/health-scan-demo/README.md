# Health Scan demo project

Intentional memory issues for testing all seven Health Scan rules.

**In the UI:** click **Try demo** in the header, then **Health Scan**.

| Rule | Trigger in this fixture |
|------|-------------------------|
| `contradiction` | `use-pnpm.mdc` vs `use-npm.mdc` |
| `cross-project-leak` | External path in `CLAUDE.md` |
| `stale-dep` | react 16.0.0 in `CLAUDE.md` vs `package.json` |
| `redundant` | `style-guide.mdc` vs `style-guide-copy.mdc` |
| `over-broad` | `over-broad.mdc` (`alwaysApply` with no globs) |
| `shadow-memory` | `.cursor/learned_memories.mdc` |
| `token-budget` | Large `token-budget-pad.mdc` pushes session load over threshold |
