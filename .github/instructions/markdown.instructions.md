---
applyTo: "**/*.md"
---

# Markdown File Rules

- Use ATX headers (`#`, `##`, `###`) — not setext underlines
- One blank line before and after headers, code blocks, and lists
- Code blocks must specify language: ` ```typescript `, ` ```json `, etc.
- Links: prefer `[text](url)` over bare URLs
- Tables: align columns with pipes, include header separator
- Keep lines under 120 characters where possible
- Use `- [ ]` / `- [x]` for task lists
- YAML frontmatter (if present) must be valid: `---` delimiters, proper indentation
