---
name: git-workflow
description: 'Git operations for AI agents: reading diffs, branches, commits, staging changes, conventional commit messages, and safe push practices.'
---

# Git Workflow Skill

## Reading Repository State

### Current Status
```bash
git status --short          # Modified/staged/untracked files
git diff --stat             # Summary of unstaged changes
git diff --cached --stat    # Summary of staged changes
git log --oneline -10       # Recent commits
git branch -a               # All local and remote branches
```

### Reading Diffs
```bash
git diff                           # Unstaged changes
git diff --cached                  # Staged changes
git diff HEAD~1                    # Last commit's changes
git diff main..feature-branch      # Branch comparison
git diff --name-only               # Just file names
git diff -- src/specific-file.ts   # Single file
```

### Finding Changes
```bash
git log --oneline --all --graph -20    # Visual branch history
git log --follow -- path/to/file.ts    # File history (follows renames)
git blame path/to/file.ts              # Line-by-line authorship
git show HEAD:path/to/file.ts          # File at specific commit
```

## Making Changes

### Staging and Committing
```bash
git add src/modified-file.ts    # Stage specific file
git add -A                      # Stage everything
git commit -m "type: message"   # Commit with message
```

### Conventional Commits
Format: `type(scope): description`

| Type | Use For |
|------|---------|
| `feat` | New feature |
| `fix` | Bug fix |
| `refactor` | Code restructuring (no behavior change) |
| `docs` | Documentation only |
| `test` | Adding/fixing tests |
| `chore` | Build, CI, tooling changes |
| `perf` | Performance improvement |
| `style` | Formatting, whitespace (no logic change) |

Examples:
```
feat(sidebar): add state persistence across tab switches
fix(apply): prevent path traversal in search-replace paths
refactor(utils): rewrite extractJson with balanced-brace parser
docs: add perplexity-research skill documentation
chore: extend file discovery to include yaml, rust, go extensions
```

### Branch Management
```bash
git checkout -b feat/new-feature    # Create and switch
git checkout main                    # Switch to main
git merge feat/new-feature           # Merge branch
git branch -d feat/new-feature       # Delete merged branch
```

## Safe Practices

### Before Pushing
1. Run the build: `node esbuild.mjs` or project-specific build command
2. Run type check: `npx tsc --noEmit`
3. Run tests (if available)
4. Review your own diff: `git diff --cached`

### Dangerous Operations (require user confirmation)
- `git push --force` — rewrites remote history
- `git reset --hard` — discards uncommitted changes
- `git clean -fd` — deletes untracked files permanently
- `git rebase` on published branches — rewrites shared history

### Recovery
```bash
git reflog                    # Find lost commits
git stash                     # Temporarily save changes
git stash pop                 # Restore stashed changes
git checkout -- file.ts       # Discard changes to one file
```

## AI Captain Context
- The project uses esbuild for builds: `node esbuild.mjs`
- Type checking is separate: `npx tsc --noEmit`
- Test runner: vitest — run with `npx vitest run`
- Package command: `npm run package` (builds + creates .vsix)
- Publisher: MaxeLBerger on VS Code Marketplace
