---
applyTo: "**/*.py"
---

# Python Rules

- Use type hints on all function signatures: `def foo(bar: str) -> int:`
- Prefer `dataclass` or `NamedTuple` over plain dicts for structured data
- Use `pathlib.Path` instead of `os.path` for file operations
- `f-strings` for formatting — not `.format()` or `%`
- One class per file for major classes; small helpers can share a file
- Use `with` statements for resource management (files, connections, locks)
- Never catch bare `except:` — always specify exception type
- Use `ruff` or `black` formatting conventions
- Virtual environments: always use `venv` or `pyenv`; never install globally
