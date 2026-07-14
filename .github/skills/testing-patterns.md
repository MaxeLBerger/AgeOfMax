---
name: testing-patterns
description: 'Testing patterns for common frameworks: Jest/Vitest (JS/TS), pytest (Python), JUnit (Java), Go testing — mocking, assertions, coverage, and VS Code extension testing.'
---

# Testing Patterns Skill

## JavaScript / TypeScript

### Jest
```typescript
// Unit test
describe('applyChanges', () => {
  it('should apply exact match replacement', async () => {
    const changes = [{ filePath: 'test.ts', search: 'old', replace: 'new' }];
    const results = await applyChanges(changes, '/workspace');
    expect(results[0].success).toBe(true);
    expect(results[0].method).toBe('exact');
  });

  it('should reject path traversal', async () => {
    const changes = [{ filePath: '../../../etc/passwd', search: '', replace: 'malicious' }];
    const results = await applyChanges(changes, '/workspace');
    expect(results[0].success).toBe(false);
    expect(results[0].error).toContain('Path traversal blocked');
  });
});
```

### Vitest
Same API as Jest but with ESM support:
```typescript
import { describe, it, expect, vi } from 'vitest';

vi.mock('fs/promises', () => ({
  readFile: vi.fn().mockResolvedValue('file content'),
  writeFile: vi.fn().mockResolvedValue(undefined),
}));
```

### Mocking in JS/TS
```typescript
// Mock VS Code API
jest.mock('vscode', () => ({
  workspace: {
    getConfiguration: () => ({ get: (key: string, def: any) => def }),
    workspaceFolders: [{ uri: { fsPath: '/test' } }],
    findFiles: jest.fn().mockResolvedValue([]),
  },
  CancellationTokenSource: class { token = { isCancellationRequested: false }; },
}));
```

## Python

### pytest
```python
import pytest
from unittest.mock import patch, MagicMock

def test_research_returns_citations():
    result = research("React hooks", context="web app")
    assert result.citations
    assert len(result.content) > 0

@pytest.fixture
def mock_api():
    with patch('requests.post') as mock:
        mock.return_value.json.return_value = {"choices": [{"message": {"content": "answer"}}]}
        yield mock

def test_api_call(mock_api):
    result = query("test")
    mock_api.assert_called_once()
```

## VS Code Extension Testing

### Test Runner Setup
VS Code extensions use `@vscode/test-electron` to run tests in a real VS Code instance:

```json
// package.json scripts
{
  "test": "vitest run",
  "test:watch": "vitest",
  "test:e2e": "vscode-test"
}
```

### Mocking the VS Code API
Since `vscode` is only available at runtime, mock it in unit tests:
```typescript
// __mocks__/vscode.ts
export const workspace = {
  getConfiguration: () => ({
    get: (key: string, defaultValue: any) => defaultValue,
  }),
  workspaceFolders: [{ uri: { fsPath: '/mock/workspace' } }],
  findFiles: async () => [],
};

export const window = {
  showInformationMessage: async () => undefined,
  showErrorMessage: async () => undefined,
};

export const Uri = {
  file: (path: string) => ({ fsPath: path, scheme: 'file' }),
};
```

## General Testing Principles
1. **Test behavior, not implementation** — assert on outputs, not internal calls
2. **One assertion per concept** — each test verifies one specific behavior
3. **Descriptive names** — `it('should reject path traversal attempts')` not `it('test1')`
4. **Arrange-Act-Assert** — clear separation of setup, execution, and verification
5. **Mock at boundaries** — mock external APIs and filesystem, not internal functions
6. **Test edge cases** — empty input, null/undefined, boundary values, error paths

## TDD Workflow (RED → GREEN → IMPROVE)

When implementing new behavior, tests come FIRST:

1. **RED** — Write a failing test that describes the desired behavior. Run it. Confirm it fails.
2. **GREEN** — Write the minimal implementation to make the test pass. No more, no less.
3. **IMPROVE** — Refactor the code while keeping all tests green. Run tests after every change.
4. **Repeat** — Go back to RED for the next behavior.

**Why TDD matters:** It ensures every line of code exists because a test requires it. No dead code, no untested paths.

## Coverage Gates

Minimum coverage thresholds that must be met before code is accepted:

| Metric | Minimum | Target |
|--------|---------|--------|
| Line coverage | 80% | 90%+ |
| Branch coverage | 75% | 85%+ |
| Function coverage | 80% | 90%+ |

Run with coverage: `npx vitest run --coverage`

**Rules:**
- Coverage must not decrease with new changes
- New code must have ≥80% line coverage
- Untested code paths must be justified

## Eval-Driven Development

For complex features, define success criteria as evaluations before implementing:

1. **Define capability evals** — What should the feature do? Express as test assertions.
2. **Define regression evals** — What existing behavior must not break?
3. **Set pass criteria** — e.g., 95% of capability evals must pass.
4. **Implement** — Write code until evals pass.
5. **Report** — Document eval results: `pass@1`, total pass rate, any failing cases.
