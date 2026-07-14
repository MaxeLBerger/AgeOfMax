---
applyTo: "**/*.test.ts,**/*.test.js,**/*.spec.ts,**/*.spec.js,**/__tests__/**"
---

# Test File Rules

- Use the project's existing test framework (vitest, jest, pytest, go test)
- Follow AAA pattern: Arrange → Act → Assert (one blank line between sections)
- One assertion per test when possible; related assertions in same test are acceptable
- Test names describe behavior: `it('returns empty array when no matches found')`
- Use `describe` blocks to group related tests by function or feature
- Mock external dependencies; never hit real APIs, databases, or filesystems in unit tests
- Target 80%+ line coverage, 75%+ branch coverage
- Test edge cases: empty inputs, nulls, boundary values, error paths
- Never import from `src/` using relative paths that go above the test directory
- Keep test files next to implementation (co-located) or in `__tests__/` directory
