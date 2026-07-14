---
description: "Automatic verification hooks and pre-commit quality gates"
---

# Verification Hooks Skill

AI Captain registers automatic verification hooks that enforce code quality without manual invocation.

## Automatic Hooks (Always Active)

### Post-Save Diagnostics Check
- When a source file is saved, AI Captain checks for compile errors after a brief delay
- If errors are found, a warning notification appears with "Show Problems" action
- Errors are logged to the "AI Captain Hooks" output channel

### Pre-Save Error Warning
- Before saving, checks if the file has syntax/type errors
- Logs a warning to the output channel (non-blocking — never delays saving)

### Status Bar Error Counter
- Bottom-left status bar shows live error/warning count across the workspace
- Red background for errors, yellow for warnings, green checkmark when clean
- Clicking opens the Problems panel

### Diagnostics Change Tracking
- Monitors workspace-wide diagnostics changes in real-time
- Alerts in the output channel when new errors appear

## On-Demand Verification Command

**Command:** `AI Captain: Run Verification (Typecheck + Tests)`

Auto-detects project type and runs appropriate verification:

| Project Type | Detected By | Verification Steps |
|-------------|-------------|-------------------|
| TypeScript/Node.js | `package.json` + `tsconfig.json` | `tsc --noEmit` + vitest/jest/npm test |
| Python | `pyproject.toml` | `pytest` |
| Go | `go.mod` | `go test ./...` |
| Rust | `Cargo.toml` | `cargo test` |

## Integration with Coding Loop

The `/code` command already checks `vscode.languages.getDiagnostics()` after each change iteration. The hooks system extends this to **all manual edits** — not just AI-generated changes.

## Pre-Commit Workflow

For teams wanting pre-commit enforcement:

1. Run `AI Captain: Run Verification` before committing
2. Or add to `.husky/pre-commit`:
   ```sh
   npx tsc --noEmit && npx vitest run
   ```
3. The verification-loop skill documents the full Build → Typecheck → Test cycle

## Supported Languages

TypeScript, JavaScript, Python, Go, Rust, Java, C# — other languages are ignored by save hooks to avoid noise.
