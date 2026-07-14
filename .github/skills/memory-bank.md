---
description: "Persistent memory bank system for cross-session learning"
---

# Memory Bank Skill

AI Captain persists learnings across sessions in `.ai-captain/memory/` within the workspace.

## Memory Files

| File | Purpose |
|------|---------|
| `project-context.md` | Project overview, architecture decisions, key constraints |
| `decisions.md` | Timestamped log of decisions (library choices, patterns adopted) |
| `patterns.md` | Learned codebase conventions (naming, file structure, idioms) |
| `errors.md` | Errors encountered and their fixes (prevents repeating mistakes) |

## When Memory is Used

1. **Start of `/code` loop** — Full memory bank is loaded and included in the coder prompt
2. **End of `/code` loop** — Session learnings (completed todos, fixed findings, changed files) are persisted
3. **Agents** — Any agent can reference `.ai-captain/memory/` to understand past context

## What Gets Recorded Automatically

- **Decisions**: Goal + changed files after successful code completion
- **Errors**: Review findings that were found and fixed (error + fix pairs)
- **Patterns**: Discovered during implementation (naming conventions, project quirks)

## Manual Memory Updates

Agents or users can update memory by editing files in `.ai-captain/memory/` directly:

```markdown
# In .ai-captain/memory/patterns.md
- This project uses barrel exports in index.ts files
- API routes follow /api/v1/{resource}/{id} pattern
- All database queries go through the repository layer
```

## Rules

1. **Never delete memory** — only append or update
2. **Keep entries concise** — one line per learning, timestamped
3. **Project context** is the only file that gets overwritten (it's a summary, not a log)
4. **Memory is workspace-scoped** — each project has its own memory bank
5. **Memory is gitignored** — add `.ai-captain/` to `.gitignore` (it's machine-specific context)
