---
description: End-to-end development workflow for implementing features. Defines the Research → Plan → TDD → Implement → Review → Verify → Commit pipeline. Ensures disciplined, high-quality development.
applyTo: '**'
---

# Development Workflow

## The Pipeline

Every feature, fix, or change follows this pipeline:

```
Research → Plan → TDD → Implement → Review → Verify → Commit
```

Each stage has a clear purpose and exit criteria. Don't skip stages.

## Stage 1: Research & Reuse

**Purpose:** Understand the problem and what already exists before writing anything.

**Actions:**
1. Search the codebase for existing code that solves the same or similar problem
2. Read documentation for any libraries/frameworks involved (use context7)
3. Check for existing patterns in the project that should be followed
4. Look up current best practices — APIs and patterns change frequently

**Exit criteria:**
- You understand the problem domain
- You know what existing code can be reused or extended
- You have current documentation for all libraries involved

## Stage 2: Plan

**Purpose:** Break the work into verifiable phases before writing code.

**Actions:**
1. Define scope — what files will be created/modified?
2. Identify dependencies — what must exist before each step?
3. Break into phases — each phase independently verifiable
4. Identify risks — what could go wrong?
5. Define test strategy — what tests are needed?

**Exit criteria:**
- Clear phased plan with verification steps
- Risks identified with mitigations
- Test strategy defined

**Agent:** Delegate complex planning to the Planner agent.

## Stage 3: TDD — Write Tests First

**Purpose:** Define expected behavior through tests before implementing.

**Actions:**
1. Write failing test (RED) for first behavior
2. Verify test fails — confirms it's testing something real
3. Continue writing tests for each discrete behavior

**Exit criteria:**
- Tests exist for all planned behaviors
- All tests fail (nothing implemented yet)
- Tests follow AAA pattern (Arrange, Act, Assert)

**Agent:** Delegate to TDD Guide agent.

## Stage 4: Implement

**Purpose:** Write the minimal code that makes all tests pass.

**Actions:**
1. Implement code to make one test pass at a time (GREEN)
2. Run the test suite after each implementation step
3. Refactor for clarity while keeping tests green (IMPROVE)
4. Repeat until all tests pass

**Exit criteria:**
- All tests pass
- Code is clean and follows project conventions
- No `any` types, no `@ts-ignore`, no hardcoded values

**Agent:** Delegate to AI Captain Dev agent.

## Stage 5: Review

**Purpose:** Catch issues the author missed.

**Review checklist:**
- [ ] **Correctness** — Does the code do what it should?
- [ ] **Security** — OWASP Top 10 checks (injection, XSS, auth)
- [ ] **Performance** — No unnecessary operations, proper async handling
- [ ] **Style** — Follows project conventions, proper naming
- [ ] **Tests** — Adequate coverage, testing behavior not implementation
- [ ] **Quality gates** — Functions <50 lines, files <800, nesting <4

**Exit criteria:**
- All review items pass
- Critical/high issues fixed
- No security vulnerabilities

**Agent:** Delegate to AI Captain PR Review agent.

## Stage 6: Verify

**Purpose:** Confirm everything works end-to-end.

**Actions:**
```bash
# Full verification loop
npx tsc --noEmit        # Type check passes
node esbuild.mjs        # Build succeeds
npx vitest run           # All tests pass
```

**Exit criteria:**
- Zero TypeScript errors
- Build succeeds
- All tests pass
- VS Code Problems panel clean for modified files

## Stage 7: Commit

**Purpose:** Record the change with a clear, conventional commit message.

**Format:**
```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:** `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `perf`, `style`

**Rules:**
- Subject line ≤72 characters
- Use imperative mood: "Add feature" not "Added feature"
- Reference issue numbers when applicable
- Don't commit with failing tests or typecheck errors

## When to Skip Stages

| Scenario | Can Skip |
|----------|----------|
| One-line typo fix | Plan, TDD |
| Documentation-only change | TDD, Review |
| New feature | Nothing — full pipeline |
| Bug fix | Plan (if root cause is clear) |
| Refactoring | Nothing — full pipeline |
| Security fix | Nothing — full pipeline |

**Rule:** When in doubt, don't skip. The pipeline exists to catch mistakes that "obvious" changes introduce.

## Agent Delegation Map

| Stage | Agent |
|-------|-------|
| Research | Explore |
| Plan | AI Captain Planner |
| TDD | AI Captain TDD Guide / Test Writer |
| Implement | AI Captain Dev |
| Review | AI Captain PR Review |
| Verify | AI Captain Build Fixer (if errors found) |
| Security review | AI Captain Security Audit (for sensitive changes) |
