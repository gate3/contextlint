# Health Scan demo project

Intentionally broken memory for testing Meminspect.

**In the UI:** click **Try demo** in the header, then **Health Scan**.

Expected findings (heuristic — counts may vary):

| Severity | Rule | Trigger |
|----------|------|---------|
| Error | `contradiction` | `use-pnpm.mdc` vs `use-npm.mdc` |
| Warning | `over-broad` | `over-broad.mdc` has `alwaysApply` with no globs |
| Warning | `stale-dep` | CLAUDE.md mentions react 16, package.json has react 18 |
| Warning | `cross-project-leak` | CLAUDE.md references `/Users/other-dev/...` |
| Info | `redundant` | `style-guide.mdc` vs `style-guide-copy.mdc` |
| Info | `shadow-memory` | Non-trivial `learned_memories.mdc` |
