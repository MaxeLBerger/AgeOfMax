---
name: code-review-checklist
description: 'Structured code review checklist covering OWASP security, performance, correctness, style consistency, and common bug patterns.'
---

# Code Review Checklist Skill

## Security (OWASP Top 10)

### Injection (A03)
- [ ] No string concatenation in SQL queries (use parameterized queries)
- [ ] No user input in `eval()`, `Function()`, or template literals executed as code
- [ ] No unsanitized user input in HTML output (XSS)
- [ ] No user input in shell commands (`child_process.exec`)
- [ ] No user input in file paths without validation (path traversal)

### Broken Access Control (A01)
- [ ] Authorization checks on every endpoint/action
- [ ] No IDOR (Insecure Direct Object Reference) — validate ownership
- [ ] CORS configured correctly (not `*` in production)

### Cryptographic Failures (A02)
- [ ] No hardcoded secrets, API keys, or passwords
- [ ] Secrets loaded from environment or secure storage
- [ ] HTTPS used for all external API calls
- [ ] No weak hashing (MD5, SHA1 for passwords) — use bcrypt/argon2

### Security Misconfiguration (A05)
- [ ] No debug mode in production
- [ ] Error messages don't leak internal details
- [ ] Dependencies are up to date (no known CVEs)

### SSRF (A10)
- [ ] URLs from user input are validated against allowlist
- [ ] No internal network access from user-provided URLs

## Correctness

### Logic
- [ ] Conditional logic is correct (no inverted conditions)
- [ ] Loop bounds are correct (no off-by-one)
- [ ] Null/undefined handled at boundaries
- [ ] Edge cases covered (empty arrays, zero values, empty strings)

### Async/Concurrency
- [ ] All promises are awaited (no fire-and-forget unless intentional)
- [ ] No race conditions in shared state
- [ ] Error handling in async paths (try/catch or .catch())
- [ ] Cancellation tokens properly checked and propagated

### Types
- [ ] No unnecessary `any` types
- [ ] Union types handled exhaustively (switch/if chains)
- [ ] Optional properties checked before access
- [ ] Return types match all code paths

## Performance

### General
- [ ] No N+1 query patterns (batch instead)
- [ ] No unnecessary re-computation (memoize or cache)
- [ ] No unbounded growth (arrays, maps, event listeners)
- [ ] Large data sets paginated or streamed

### JavaScript/TypeScript Specific
- [ ] No synchronous file I/O in async context
- [ ] No blocking operations on the main thread
- [ ] Event listeners cleaned up (dispose pattern in VS Code)
- [ ] Regular expressions are not vulnerable to ReDoS

## Style & Consistency

### Code Structure
- [ ] Follows existing project conventions
- [ ] Functions are small and focused (single responsibility)
- [ ] No deep nesting (early returns preferred)
- [ ] No dead code or commented-out code

### Quality Gates
- [ ] No functions longer than 50 lines
- [ ] No files longer than 800 lines (200–400 typical)
- [ ] No nesting deeper than 4 levels
- [ ] No more than 5 parameters per function (use options object beyond 3)
- [ ] Cyclomatic complexity ≤15

### Immutability
- [ ] `const` used by default (no `let` without reassignment)
- [ ] `readonly` for interface/class properties where applicable
- [ ] Functions return new objects/arrays — don't mutate inputs
- [ ] Config objects frozen (`Object.freeze`) where appropriate

### Naming
- [ ] Names are descriptive and consistent with existing code
- [ ] Boolean variables/functions use is/has/should prefix
- [ ] No abbreviations that reduce clarity

### Imports
- [ ] No unused imports
- [ ] No circular dependencies
- [ ] Import order follows project convention

## Common Bug Patterns in AI Captain

### Search-Replace
- [ ] `search` text is unique in the target file
- [ ] No use of `String.replace()` — use `indexOf` + `slice`
- [ ] Path traversal guard present for user-provided paths

### Perplexity API
- [ ] API key checked before making requests
- [ ] Cancellation token passed through and checked
- [ ] Response parsed with error handling
- [ ] Model selection respects user configuration

### VS Code Extension
- [ ] Disposables returned from `activate()` and added to `context.subscriptions`
- [ ] Webview content uses CSP (Content Security Policy)
- [ ] `postMessage` / `onDidReceiveMessage` properly paired
- [ ] File URIs use `vscode.Uri.file()`, not string concatenation
