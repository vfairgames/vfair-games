# 🎮 vFair Games

**Open-source provably fair iGaming platform built with TypeScript, React, NestJS, and Nx.**

Production-ready casino game infrastructure with **Dice, Mines, Limbo, Plinko, and Keno**, including provably fair verification, configurable RTP, partner wallet integration, admin tooling, and reporting.

[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-Backend-red)](https://nestjs.com/)
[![React](https://img.shields.io/badge/React-Frontend-61DAFB)](https://react.dev/)
[![Nx](https://img.shields.io/badge/Nx-Monorepo-143055)](https://nx.dev/)

https://github.com/user-attachments/assets/d80f6f34-29de-47dd-ac61-dd67c4f04ded

**Keywords:** provably fair casino, iGaming, online casino, crypto casino, dice game, mines game, limbo, plinko, keno, crash game, betting, RTP, white-label casino, partner integration, wallet API, Socket.IO, NestJS, React, TypeScript, Nx monorepo

`#provablyfair` `#igaming` `#casino` `#onlinecasino` `#cryptocasino` `#dice` `#mines` `#limbo` `#plinko` `#keno` `#crashgame` `#betting` `#rtp` `#whitelabel` `#nestjs` `#react` `#typescript` `#nx` `#socketio` `#postgresql`

[🎮 Live Demo](https://vfair.games/games)

Try the games without installing anything:

| Game | Live Demo |
| --- | --- |
| 🎲 **Dice** | [dice.vfair.games](https://dice.vfair.games) |
| 💎 **Mines** | [mines.vfair.games](https://mines.vfair.games) |
| 🚀 **Limbo** | [limbo.vfair.games](https://limbo.vfair.games) |
| 🔵 **Plinko** | [plinko.vfair.games](https://plinko.vfair.games) |
| 🎯 **Keno** | [keno.vfair.games](https://keno.vfair.games) |

All games are also available at **[vfair.games/games](https://vfair.games/games)**.

### 🔐 Provably Fair

Game outcomes can be independently verified using cryptographic seeds and HMAC-based deterministic result generation.

### ⚙️ Configurable RTP

Game mathematics and payout configuration are separated from the UI, allowing operators to configure game behavior and RTP.

### 💳 Partner Wallet Integration

Designed for B2B integrations where the casino/operator remains responsible for player balances.

The platform communicates with the partner wallet API for game transactions instead of maintaining an isolated player wallet.

### 📊 Admin & Reporting

Back-office applications and services are included for managing integrations and monitoring platform activity.

### 🔌 Partner Integration

The platform is designed to be embedded into an existing casino or gaming product while keeping game infrastructure isolated from the operator's platform.

### ⚡ Real-Time Gameplay

Game communication uses **Socket.IO** for real-time interaction between clients and backend services.


## Prerequisites

- [nvm](https://github.com/nvm-sh/nvm) (to install and switch Node versions)
- Node.js 24 (see `.nvmrc`; `nvm use` after install)
- pnpm 11 (`corepack enable`)
- Docker Desktop (or Docker Engine + Compose)

## Run locally

### 1. Install

```bash
nvm use
corepack enable
pnpm install
pnpm env:init
```

`pnpm env:init` copies each `.env.example` to `.env` when the file is missing. Use `pnpm env:init --force` to overwrite existing files.

### 2. Start Postgres, Redis, and RabbitMQ

```bash
docker compose up -d
```

| Service  | Port                                 | Credentials                            |
| -------- | ------------------------------------ | -------------------------------------- |
| Postgres | `5432`                               | user/password `vfair`, db `vfairgames` |
| Redis    | `6379`                               | none                                   |
| RabbitMQ | `5672` (UI `http://localhost:15672`) | `vfair` / `vfair`                      |
| pgAdmin  | `http://localhost:5050`              | `admin@vfair.com` / `vfair`            |

### 3. Databases

Games / admin (database `vfairgames`):

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm db:seed:dev        # local only — sample partner, players, and KPI reports
```

Partner sandbox (database `vfair_partner`):

```bash
pnpm db:partner:init
pnpm db:partner:generate
pnpm db:partner:migrate
pnpm db:partner:seed
```

Local seed logins (not for production):

| Login             | Email / username        | Password |
| ----------------- | ----------------------- | -------- |
| Admin dashboard   | `admin@example.com`     | `secret` |
| Fake partner site | `player1` … `player100` | `secret` |

`db:seed:dev` also creates partner `demo-partner`. `PARTNER_CODE` / `PARTNER_SECRET` in `apps/fake-partner-api/.env.example` must match that partner.

### 4. Start apps

```bash
# Everything with a serve target
pnpm dev:all

# One project
pnpm nx serve mines-web
pnpm nx serve kpi-worker
pnpm nx serve partner-docs
```

| App              | URL                                                                                 |
| ---------------- | ----------------------------------------------------------------------------------- |
| Dice             | [http://localhost:4200](http://localhost:4200)                                      |
| Mines            | [http://localhost:4201](http://localhost:4201)                                      |
| Limbo            | [http://localhost:4202](http://localhost:4202)                                      |
| Plinko           | [http://localhost:4203](http://localhost:4203)                                      |
| Keno             | [http://localhost:4204](http://localhost:4204)                                      |
| Admin            | [http://localhost:4300](http://localhost:4300)                                      |
| Fake partner     | [http://localhost:4400](http://localhost:4400)                                      |
| Verification     | [http://localhost:4500](http://localhost:4500)                                      |
| Partner docs     | [http://localhost:4600](http://localhost:4600)                                      |
| Games API        | [http://localhost:3000](http://localhost:3000)                                      |
| Games API health | [http://localhost:3000/api/health](http://localhost:3000/api/health)                |
| Admin API        | [http://localhost:3001](http://localhost:3001) (proxied by admin-web `/api`)        |
| Fake partner API | [http://localhost:3002](http://localhost:3002) (proxied by fake-partner-web `/api`) |
| KPI worker       | [http://localhost:3003](http://localhost:3003)                                      |

Open a game UI directly only after a session token exists. The usual path is fake partner → launch game, or admin for back-office.

## Environment files

| File                         | Purpose                                                                          |
| ---------------------------- | -------------------------------------------------------------------------------- |
| `.env`                       | Prisma / tooling: `DATABASE_URL`, `PARTNER_API_DATABASE_URL`, `RABBITMQ_URL`     |
| `apps/games-api/.env`        | Games API                                                                        |
| `apps/admin-api/.env`        | Admin API                                                                        |
| `apps/fake-partner-api/.env` | Partner sandbox API (`PARTNER_CODE` / `PARTNER_SECRET` must match `db:seed:dev`) |
| `apps/kpi-worker/.env`       | KPI consumer                                                                     |
| `apps/*-web/.env`            | Vite `VITE_*` (game apps need `VITE_API_WS_URL`)                                 |

`fake-partner-web` has no env file. `admin-web` proxies `/api` to admin-api; optional `VITE_*_PREVIEW_ORIGIN` vars default to the localhost game ports.

## Layout

```

apps/ dice-web, mines-web, limbo-web, plinko-web, keno-web,
admin-web, fake-partner-web, games-verification-web, partner-docs,
games-api, admin-api, fake-partner-api, kpi-worker
libs/ games-web-shell, game-math, app-common, game-contracts,
nest-utils, radix-palette

```

## License

This project is licensed under the [Apache License 2.0](LICENSE).

## Support
⭐ **If you find vFair useful, consider giving it a star.**
To support this project, contact [info@vfair.games](mailto:info@vfair.games).
