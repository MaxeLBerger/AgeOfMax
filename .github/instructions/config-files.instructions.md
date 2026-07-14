---
applyTo: "**/package.json,**/.eslintrc*,**/tsconfig.json,**/.prettierrc*,**/vite.config.*,**/esbuild.*"
---

# Configuration File Rules

- Never remove existing configuration keys without understanding their purpose
- JSON config files must be valid JSON (no trailing commas, no comments unless jsonc)
- `package.json` changes: always verify scripts still work after modification
- `tsconfig.json`: prefer `strict: true`; don't loosen strictness without explicit reason
- Version bumps: update version in `package.json` AND any install scripts that reference it
- Dependencies: devDependencies for build/test tools only; zero runtime deps where possible
- After config changes: run `npm install` (if deps changed), `tsc --noEmit`, and test suite
