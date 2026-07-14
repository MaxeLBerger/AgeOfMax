---
description: Coding standards and quality gates for TypeScript/JavaScript development. Covers immutability, file organization, error handling, naming conventions, and measurable quality thresholds.
applyTo: '**/*.{ts,tsx,js,jsx}'
---

# Coding Standards

## Immutability — Default to Immutable

Immutability prevents entire categories of bugs. Follow these rules:

- **Use `const` by default** — Only use `let` when reassignment is genuinely needed
- **Use `readonly` for properties** — Mark class/interface properties as `readonly` unless mutation is required
- **Prefer `ReadonlyArray<T>`** — Or `readonly T[]` for arrays that shouldn't be mutated
- **Return new objects** — Don't mutate input parameters; return new objects/arrays instead
- **Freeze config objects** — Use `Object.freeze()` for configuration that must not change at runtime

```typescript
// ✅ Good — immutable patterns
const config = Object.freeze({ maxRetries: 3, timeout: 5000 });
function addItem(items: readonly string[], item: string): string[] {
  return [...items, item];
}

// ❌ Bad — mutable patterns
let config = { maxRetries: 3, timeout: 5000 };
function addItem(items: string[], item: string): void {
  items.push(item); // mutates input
}
```

## File Organization

### Size Limits

| Metric | Guideline | Hard Limit |
|--------|-----------|------------|
| Lines per file | 200–400 | 800 |
| Lines per function | 20–30 | 50 |
| Parameters per function | 2–3 | 5 (use options object beyond 3) |
| Nesting depth | 2 levels | 4 levels |
| Cyclomatic complexity | ≤10 | ≤15 |

### File Structure

Every file should follow this order:
1. Imports (external → internal, alphabetized within groups)
2. Type definitions / interfaces
3. Constants
4. Main exports (functions / classes)
5. Helper functions (private, not exported)

### When to Split a File

- File exceeds 400 lines → Look for a natural boundary to split
- Function exceeds 30 lines → Extract helper functions
- More than 5 exported items → Consider splitting by concern
- Nesting deeper than 3 levels → Extract inner logic to a function

## Naming Conventions

| Thing | Convention | Example |
|-------|-----------|---------|
| Files | camelCase or kebab-case (match project) | `commandHandlers.ts` |
| Classes | PascalCase | `PerplexityClient` |
| Interfaces | PascalCase (no `I` prefix) | `OutputSink` |
| Functions | camelCase, verb-first | `detectIntent()`, `applyChanges()` |
| Constants | UPPER_SNAKE_CASE | `MAX_RETRIES` |
| Booleans | `is/has/should/can` prefix | `isReady`, `hasApiKey` |
| Callbacks | `on` prefix | `onMessage`, `onError` |
| Private | `_` prefix (class fields only) | `_cache` |

## Error Handling

### Rules

1. **Catch at boundaries** — Handle errors at system boundaries (API calls, file I/O, user input), not deep in business logic
2. **No silent catches** — Every `catch` must log, rethrow, or handle meaningfully
3. **Use typed errors** — Create custom error classes for different failure modes
4. **Fail fast** — Validate inputs at entry points; don't pass bad data through layers
5. **Include context** — Error messages must include what failed, why, and what to do

```typescript
// ✅ Good — informative error at boundary
try {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Perplexity API returned ${response.status}: ${response.statusText}`);
  }
  return await response.json();
} catch (err) {
  console.error(`[perplexity] Research query failed for "${query}":`, err);
  throw err;
}

// ❌ Bad — silent catch, no context
try {
  return await fetch(url).then(r => r.json());
} catch (e) {
  return null;
}
```

## Input Validation

Validate at system boundaries:

- **User input** — Sanitize and validate all user-provided strings
- **API responses** — Validate shape/types before using
- **File content** — Check existence and format before parsing
- **Configuration** — Validate config values on load, not on use

## TypeScript Best Practices

### Type Safety

- **No `any`** — Use `unknown` for truly unknown types, then narrow
- **Use discriminated unions** — For variant types, not class hierarchies
- **Use type guards** — For runtime type narrowing
- **Prefer interfaces** — Over type aliases for object shapes (they are extendable)
- **Use `satisfies`** — For type checking without widening

### Async/Await

- **Always `await` in try/catch** — Don't let promises escape error handling
- **Use `Promise.allSettled()`** — For parallel operations where some can fail
- **Cancel when possible** — Use `CancellationToken` for long operations
- **Dispose resources in finally** — `CancellationTokenSource`, streams, handles

## Quality Checklist

Before submitting any code, verify:

- [ ] No `any` types
- [ ] No `@ts-ignore` without justification comment
- [ ] No `console.log` (use proper logging)
- [ ] No hardcoded secrets or credentials
- [ ] No functions longer than 50 lines
- [ ] No files longer than 800 lines
- [ ] No nesting deeper than 4 levels
- [ ] All public functions have clear names describing behavior
- [ ] Error handling at boundaries with context in messages
- [ ] Immutable by default — `const`, `readonly`, new objects returned
