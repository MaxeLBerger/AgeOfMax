---
name: search-replace-editing
description: 'How AI Captain applies code changes via search-replace JSON blocks: context uniqueness, new files, fuzzy matching, indentation transfer, and path safety.'
---

# Search-Replace Editing Skill

## How It Works
AI Captain's coding loop uses search-replace blocks to apply changes. The coder model outputs JSON with `changes[]`, and `applyChanges.ts` executes them.

## JSON Schema
```json
{
  "changes": [
    {
      "filePath": "relative/path/to/file.ts",
      "search": "exact text to find (multi-line, with enough context)",
      "replace": "replacement text",
      "isNewFile": false
    }
  ],
  "completedTodos": ["todo-id-1"],
  "reasoning": "what was changed and why"
}
```

## Rules for Search Blocks

### Context Uniqueness
The `search` string must contain enough surrounding context to match exactly one location in the file. Include 2-3 lines before and after the target code.

**Bad** (matches multiple locations):
```json
{ "search": "return result;", "replace": "return result ?? null;" }
```

**Good** (unique context):
```json
{
  "search": "  const result = await fetchUser(id);\n  return result;",
  "replace": "  const result = await fetchUser(id);\n  return result ?? null;"
}
```

### New Files
To create a new file, set `isNewFile: true` and put the full file content in `replace`. The `search` field is ignored.

```json
{
  "filePath": "src/newModule.ts",
  "search": "",
  "replace": "export function hello() { return 'world'; }",
  "isNewFile": true
}
```

### Empty Search
An empty `search` (or whitespace-only) also creates/overwrites the file — equivalent to `isNewFile: true`.

## Apply Algorithm

### 1. Deduplication
Duplicate `(filePath, search)` pairs are skipped. Only the first occurrence is applied.

### 2. Path Safety
All paths are resolved with `path.resolve(wsRoot, filePath)`. The resolved path **must** start with the workspace root — otherwise the change is rejected as path traversal.

### 3. Exact Match (indexOf)
Uses `original.indexOf(search)` — NOT `String.replace()`. This avoids regex special character issues and ensures only one occurrence is replaced.

### 4. Fuzzy Fallback
If exact match fails, the fuzzy algorithm:
1. Normalizes whitespace (trim trailing, tabs→spaces)
2. Searches for the normalized text in the normalized original
3. Finds the matching start line by trimmed comparison
4. Transfers indentation: calculates the delta between original and replacement indent, adjusts all replacement lines

### 5. Indentation Transfer
The fuzzy matcher preserves the original file's indentation:
- Detects leading whitespace on both the matched line and replacement
- Computes delta and shifts all replacement lines by that amount
- Empty lines are left unchanged

## Common Pitfalls
- **Search text too short** → matches nothing or wrong location
- **Tabs vs spaces** → fuzzy handles this, but exact match requires exact whitespace
- **Path separators** → always use forward slashes in `filePath`
- **Multiple replacements in same area** → apply one at a time; first change shifts offsets
