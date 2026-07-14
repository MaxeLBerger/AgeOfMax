---
applyTo: "**/*.ts"
---

# TypeScript Rules

- Use `const` by default, `let` only when reassignment is needed, never `var`
- No `any` — use `unknown` and narrow with type guards
- Prefer `readonly` for arrays/properties that shouldn't mutate
- Use discriminated unions, not class hierarchies
- Exhaustive switch: always include `default: { const _exhaustive: never = value; }`
- Functions return new objects/arrays — never mutate inputs
- Max function length: 50 lines. Max file length: 800 lines
- Max nesting depth: 4 levels
- Import with `.js` extension for ESM (e.g., `import { foo } from './bar.js'`)
- Validate at system boundaries only (user input, external APIs, file I/O)
- Prefer `Promise.allSettled()` for parallel async operations that shouldn't fail-fast
