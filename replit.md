# BarberPro SaaS

## Overview

Multi-tenant SaaS for barbershop management ("barbearia" in Portuguese). Full-stack monorepo with React frontend and Express backend using PostgreSQL.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite + TailwindCSS + shadcn/ui + Recharts
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Auth**: Session-based (cookie) with SHA-256 password hashing (in-memory sessions map)
- **Build**: esbuild (CJS bundle)

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express API server
│   └── barberpro/          # React + Vite frontend
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
```

## Database Schema

- `users` — User accounts (dono/gerente/barbeiro/cliente roles)
- `barbearias` — Barbershop profiles (multi-tenant root)
- `profissionais` — Professionals per barbershop
- `servicos` — Services offered
- `clientes` — Clients per barbershop
- `agendamentos` — Appointments with status (confirmado/pago/cancelado)
- `comandas` — Checkout records with services, products, payments, commissions
- `produtos` — Product inventory

## API Endpoints

All under `/api`:
- `/auth/register`, `/auth/login`, `/auth/logout`, `/auth/me` — Authentication
- `/barbearias`, `/barbearias/me` — Barbershop management
- `/barbearias/{id}/profissionais/**` — Professionals CRUD
- `/barbearias/{id}/servicos/**` — Services CRUD
- `/barbearias/{id}/clientes/**` — Clients CRUD
- `/barbearias/{id}/agendamentos/**` — Appointments + checkout
- `/barbearias/{id}/comandas` — Service orders listing
- `/barbearias/{id}/produtos/**` — Products/inventory CRUD
- `/barbearias/{id}/dashboard` — Dashboard metrics
- `/barbearias/{id}/relatorios/faturamento` — Revenue reports
- `/barbearias/{id}/relatorios/comissoes` — Commission reports
- `/barbearias/{id}/slots-disponiveis` — Available time slots
- `/public/{slug}` — Public barbershop page (no auth required)
- `/public/{slug}/agendar` — Public appointment booking

## Frontend Pages

- `/login`, `/cadastro` — Auth pages
- `/onboarding/barbearia` — Onboarding step 1 (create barbershop)
- `/dashboard` — Main dashboard with charts, metrics, rankings
- `/agenda` — Visual schedule with appointment management + checkout modal
- `/gestao/profissionais` — Professional management
- `/gestao/servicos` — Service management
- `/gestao/produtos` — Product/inventory management
- `/relatorios`, `/caixa`, `/financeiro`, `/empresa`, `/clube` — Various management pages

## Key Features

- Dark premium barbershop design (dark background, gold accents)
- Multi-tenant: each barbershop is isolated by barbeariaId
- 30-day free trial plan
- Commission calculation (percentage or fixed per professional)
- Checkout with split payment support (pix, dinheiro, crédito, débito)
- Loyalty points for clients
- Dashboard with Recharts charts (bar + donut)
- Responsive sidebar (collapses to mobile menu on small screens)
- ViaCEP integration for address auto-fill in onboarding
- Public booking portal at `/public/{slug}`
