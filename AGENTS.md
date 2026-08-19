# Agent Guidance

## Communication

- Keep replies short and direct: lead with the answer, skip preamble, avoid padding and unnecessary follow-ups.
- Match depth to the question; use bullets and code citations only when they add value.

## Project

- **Stack:** Nx monorepo (19 projects), pnpm, TypeScript, Node from `.nvmrc`. React + Vite frontends; NestJS backends; Astro Starlight (`partner-docs`); Prisma + PostgreSQL; RabbitMQ (KPI); Redis (Socket.IO adapter).
- **Apps:** `dice-web`, `mines-web`, `limbo-web`, `plinko-web`, `keno-web` (games); `admin-web`, `admin-api` (admin); `fake-partner-web`, `fake-partner-api` (local partner sandbox); `games-verification-web` (provably-fair verification); `partner-docs` (Astro Starlight partner docs); `games-api` (sockets, bets, fairness); `kpi-worker` (round-settled consumer).
- **Libs:** `games-web-shell` (shared game UI, session, stores), `game-math`, `app-common`, `game-contracts` (shared WS/API types), `nest-utils`, `radix-palette`. Prisma clients: `@vfair/prisma-client`, `@vfair/prisma-partner-client`.
- **Layout:** See `.cursor/rules/monorepo-app-layout.mdc` and `game-component-colocation.mdc`. No `apps/web`; no per-game libs. Do not import game code across apps.
- **UI:** Radix Themes in `libs/games-web-shell`; game-specific UI in each `apps/<game>-web`.
- **Realtime:** Socket.IO between game apps and `games-api`; Redis + Socket.IO Redis adapter for scaling. Shared event names/types in `@vfair/game-contracts`.
- **Session:** `SessionGate` + `sessionService` in `games-web-shell` own connect/disconnect and main store init; per-game bet logic and socket handlers stay in each game app.
- **Data:** Prisma + PostgreSQL. Env: run `pnpm env:init`; root `.env` for shared DB/RabbitMQ URLs; per-app `.env` under each API and game web app (`VITE_*` in frontends). `admin-web` proxies `/api` and optionally sets theme-preview game origins (`VITE_*_PREVIEW_ORIGIN`). `fake-partner-web` proxies `/api` and needs no env.
- **Testing:** Vitest + Testing Library (frontend), Jest (Nest APIs), ESLint + Prettier. Default `pnpm test` excludes `tag:fake-partner`.
- **Tooling:** `pnpm` only; Nx for tasks. After editing `.ts`/`.tsx`, run ReadLints and `pnpm nx typecheck <project>` on affected projects.

### Local ports

| Service          | Port |
| ---------------- | ---- |
| Games API        | 3000 |
| Admin API        | 3001 |
| Fake partner API | 3002 |
| KPI worker       | 3003 |
| Dice             | 4200 |
| Mines            | 4201 |
| Limbo            | 4202 |
| Plinko           | 4203 |
| Keno             | 4204 |
| Admin web        | 4300 |
| Fake partner web | 4400 |
| Verification     | 4500 |
| Partner docs     | 4600 |
| Postgres         | 5432 |
| Redis            | 6379 |

### Common commands

```bash
pnpm env:init          # create missing .env from .env.example
pnpm dev               # dice-web + games-api
pnpm dev:admin         # admin-web + admin-api + dice-web
pnpm dev:partner       # fake-partner-* + games-api + game apps + games-verification-web
pnpm dev:all           # all serve targets
pnpm nx serve <project>
pnpm nx typecheck <project>
pnpm nx test <project>
pnpm nx lint <project>
```

<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

## General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax

<!-- nx configuration end-->
