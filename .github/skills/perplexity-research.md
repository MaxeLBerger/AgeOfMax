---
name: perplexity-research
description: 'How to use the Perplexity Sonar API in AI Captain: model selection, prompt construction, citation formatting, and error handling.'
---

# Perplexity Research Skill

## API Overview
AI Captain uses the Perplexity Sonar API (`api.perplexity.ai/chat/completions`) via a zero-dependency HTTPS client in `src/perplexityClient.ts`.

## Available Models
| Model | Use Case | Notes |
|-------|----------|-------|
| `sonar` | Fast general queries | Default for `queryPerplexity()` |
| `sonar-pro` | Research with deeper web search | Default for `/research` command |
| `sonar-reasoning-pro` | Code review with reasoning | Used by `/review` command |

The user-configured model (`aicaptain.perplexityModel`) is used for `/research`. Reviews always use `sonar-reasoning-pro`.

## API Client Functions

### `queryPerplexity(messages, options?, token?)`
Low-level call. Accepts `PerplexityMessage[]` with roles `system | user | assistant`.

```typescript
const response = await queryPerplexity(
  [
    { role: 'system', content: 'You are a research assistant...' },
    { role: 'user', content: 'How does React 19 handle transitions?' },
  ],
  { model: 'sonar-pro', maxTokens: 4096, temperature: 0.2 },
  cancellationToken,
);
```

### `research(query, context?, token?)`
High-level research function. Adds project context as system message.

### `reviewWithPerplexity(code, instruction, token?)`
Sends code for expert review. Always uses `sonar-reasoning-pro` with low temperature (0.1).

## Response Shape
```typescript
interface PerplexityResponse {
  content: string;           // Main answer text
  citations: string[];       // URL strings referenced in the answer
  searchResults: PerplexityCitation[];  // { title, url, date? }
  model: string;             // Model that was used
  usage: { promptTokens, completionTokens, totalTokens };
}
```

## Citation Formatting
When presenting research results, format citations as numbered references:

```markdown
React 19 introduces the `use` hook for async data [1].

**Sources:**
1. [React 19 Blog Post](https://react.dev/blog/...)
2. [Migration Guide](https://react.dev/...)
```

## Error Handling
- Missing API key → throws descriptive error with settings path
- HTTP errors → includes status code and first 500 chars of response
- Cancellation → check `token.isCancellationRequested` before and during request
- Network errors → include original error message

## Configuration
- `aicaptain.perplexityApiKey` — Required. Set via VS Code Settings.
- `aicaptain.perplexityModel` — Default model for research queries.
