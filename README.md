# Bella Cucina — Restaurant Ordering

Premium dark/gold digital menu + kitchen dashboard.

## Project structure

```
restaurantorder/
├── frontend/     # Next.js UI (pages, components, public assets)
├── backend/      # API routes, Prisma schema, server libraries
├── package.json  # Root scripts — `npm run dev` starts both apps
└── .env          # Shared environment config (loaded by both apps)
```

## Quick start

```bash
npm install
cp .env.example .env   # if you don't already have .env at the repo root
npm run db:push
npm run db:seed
npm run dev
```

This starts:
- **Frontend** at http://localhost:3000 (customer menu + admin UI)
- **Backend API** at http://localhost:4000 (proxied via frontend at `/api/*`)

## Demo

| Role | URL / credentials |
|------|-------------------|
| Customer menu (Table 12) | http://localhost:3000/r/bella-cucina/t/12 |
| Staff login | http://localhost:3000/admin/login |
| Admin | `admin@bellacucina.com` / `password123` |

## Brand

- Restaurant: **Bella Cucina**
- Theme: black background, gold accents, Playfair + DM Sans
- Currency: Rs.
