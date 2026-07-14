---
description: Formal verification loop for code changes. Defines the Build → Typecheck → Test → Lint cycle that must pass after every change. Used by all agents to verify their work.
applyTo: '**'
---

# Verification Loop

Every code change must pass this verification loop before being considered complete. No exceptions.

## The Loop

```
┌─────────────────┐
│  Make Change     │
└───────┬─────────┘
        ▼
┌─────────────────┐     FAIL → Fix and retry
│  1. TypeCheck    │────────────────┐
│  tsc --noEmit    │                │
└───────┬─────────┘                │
        ▼ PASS                     │
┌─────────────────┐     FAIL → Fix and retry
│  2. Build        │────────────────┤
│  node esbuild.mjs│               │
└───────┬─────────┘                │
        ▼ PASS                     │
┌─────────────────┐     FAIL → Fix and retry
│  3. Test         │────────────────┤
│  vitest run      │               │
└───────┬─────────┘                │
        ▼ PASS                     │
┌─────────────────┐                │
│  ✓ Change        │               │
│    Verified      │               │
└─────────────────┘                │
        ◄──────────────────────────┘
```

## Commands

### Quick Verification (after small changes)
```bash
npx tsc --noEmit && node esbuild.mjs && npx vitest run
```

### Full Verification (before commit/handoff)
```bash
# TypeScript type checking
npx tsc --noEmit

# Production build
node esbuild.mjs --production

# All tests
npx vitest run

# Check VS Code Problems panel for diagnostics
# (use #problems tool)
```

## Rules

1. **Run after every change** — Not after batches of changes; after each individual change
2. **Fix failures immediately** — Don't continue making new changes with a broken build
3. **All three must pass** — TypeCheck + Build + Test; partial passes don't count
4. **No skipping tests** — Even for "obvious" changes; tests catch unexpected regressions
5. **Report the result** — Always include verification status in your output

## Verification Status Format

Report verification results in this format:

```
## Verification
- TypeCheck: ✓ (0 errors) | ✗ (N errors)
- Build: ✓ | ✗
- Tests: ✓ (N/N passing) | ✗ (N failing)
```

## When Steps Fail

### TypeCheck fails (`tsc --noEmit`)
- Read the full error messages
- Fix type errors one at a time, starting with import/module errors
- Re-run after each fix — cascade errors often resolve
- See the Build Fixer agent for complex type error resolution

### Build fails (`node esbuild.mjs`)
- Usually an import/export issue or missing dependency
- Check for circular dependencies
- Verify all imports resolve to actual files

### Tests fail (`vitest run`)
- Read the failure output carefully — is it the test or the code?
- Run the specific failing test file for faster iteration
- Check if mocks need updating after code changes
- Don't modify tests just to make them pass — fix the code or fix a genuinely wrong test

## Coverage Gate

When running tests with coverage:
```bash
npx vitest run --coverage
```

Minimum thresholds:
- **Line coverage:** 80%+
- **Branch coverage:** 75%+
- **Function coverage:** 80%+

If coverage drops below minimums, add tests before proceeding.
