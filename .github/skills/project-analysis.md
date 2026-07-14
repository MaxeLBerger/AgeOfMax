---
name: project-analysis
description: 'How to detect project type, build system, framework, test runner, and dependencies from config files and directory structure.'
---

# Project Analysis Skill

## Detection Strategy
Analyze a project by reading its config files and directory structure. Check multiple signals and cross-reference for accuracy.

## Config File Indicators

### Package Manager & Runtime
| File | Indicates |
|------|-----------|
| `package.json` | Node.js / JavaScript / TypeScript project |
| `package-lock.json` | npm |
| `yarn.lock` | Yarn |
| `pnpm-lock.yaml` | pnpm |
| `bun.lockb` | Bun |
| `deno.json` / `deno.lock` | Deno |
| `requirements.txt` / `Pipfile` / `pyproject.toml` | Python |
| `Cargo.toml` | Rust |
| `go.mod` | Go |
| `pom.xml` / `build.gradle` | Java / JVM |
| `*.csproj` / `*.sln` | .NET / C# |
| `Gemfile` | Ruby |

### Framework Detection (from package.json dependencies)
| Dependency | Framework |
|------------|-----------|
| `react`, `react-dom` | React |
| `next` | Next.js |
| `vue` | Vue.js |
| `nuxt` | Nuxt |
| `@angular/core` | Angular |
| `svelte` | Svelte |
| `express` | Express.js |
| `fastify` | Fastify |
| `hono` | Hono |
| `@nestjs/core` | NestJS |

### Build System
| File/Dep | Build System |
|----------|-------------|
| `esbuild.mjs` / `esbuild` dep | esbuild |
| `vite.config.*` | Vite |
| `webpack.config.*` | Webpack |
| `rollup.config.*` | Rollup |
| `tsconfig.json` | TypeScript (tsc) |
| `turbo.json` | Turborepo |

### Test Runner
| File/Dep | Test Runner |
|----------|-------------|
| `jest.config.*` / `jest` dep | Jest |
| `vitest.config.*` / `vitest` dep | Vitest |
| `cypress.config.*` | Cypress |
| `playwright.config.*` | Playwright |
| `mocha` dep / `.mocharc.*` | Mocha |
| `pytest.ini` / `conftest.py` | pytest |

### VS Code Extension
| Signal | Indicates |
|--------|-----------|
| `package.json` with `engines.vscode` | VS Code extension |
| `contributes` section in package.json | Extension contributions |
| `activationEvents` in package.json | Extension activation triggers |
| `@types/vscode` in devDependencies | VS Code API types |

## AI Captain Project Type
This project (AI Captain) is detected as:
- **Runtime**: Node.js (via VS Code extension host)
- **Language**: TypeScript (`tsconfig.json`, `strict: true`, `module: NodeNext`)
- **Build**: esbuild (`esbuild.mjs`)
- **Type check**: `tsc --noEmit` (separate from build)
- **Package**: VS Code extension (`engines.vscode: ^1.99.0`)
- **Dependencies**: Zero runtime deps; all in `devDependencies`
- **Test runner**: None configured (potential improvement)

## Analysis Workflow
1. List root directory files to find config files
2. Read `package.json` (or equivalent) for dependencies and scripts
3. Read `tsconfig.json` / build config for compilation settings
4. Scan `src/` structure for architecture patterns
5. Check for CI/CD files (`.github/workflows/`, `.gitlab-ci.yml`)
6. Summarize: language, framework, build system, test runner, deployment target
