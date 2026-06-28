# Claude Workspace Instructions — bot.ts Monorepo Root

Always follow the instructions in the root `CLAUDE.md` and `GEMINI.md`.

## Core Guardrails
- **No any-types**: Derive types with `ReturnType<typeof functionName>`.
- **ESM Hoisting in Tests**: Use dynamic imports (`await import(...)`) inside `src/index.test.ts`.
- **Path Resolution**: Resolve project paths using `process.cwd()`.
- **NPM Modules src/ Convention**: Published modules put code under `src/`; on install, `unpackNpmModule` flattens them into `src/modules/<name>/`.
