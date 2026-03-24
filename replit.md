# Glow Agenda — SaaS para Salões de Beleza

## Overview

Multi-tenant SaaS for beauty salon management (salão/estúdio de beleza). Full-stack monorepo with React frontend and Express backend using PostgreSQL. Targets manicurists, estheticians, hair stylists, and other beauty professionals.

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
- **Fonts**: Nunito (body) + Playfair Display (headings)

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express API server
│   └── barberpro/          # React + Vite frontend (directory name kept for compatibility)
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
```

## Database Schema

- `users` — User accounts (dono/gerente/profissional/cliente roles)
- `barbearias` — Salon/studio profiles (multi-tenant root; table name kept for API compatibility)
- `profissionais` — Professionals per salon
- `servicos` — Services offered (nails, skincare, hair, etc.)
- `clientes` — Clients per salon
- `agendamentos` — Appointments with status (confirmado/pago/cancelado)
- `comandas` — Checkout records with services, products, payments, commissions
- `produtos` — Product inventory

## API Endpoints

All under `/api`:
- `/auth/register`, `/auth/login`, `/auth/logout`, `/auth/me` — Authentication
- `/barbearias`, `/barbearias/me` — Salon management (endpoint name kept for compatibility)
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
- `/public/{slug}` — Public salon page (no auth required)
- `/public/{slug}/agendar` — Public appointment booking

## Frontend Pages

- `/login`, `/cadastro` — Auth pages
- `/onboarding/barbearia` — Onboarding step 1 (create salon/studio)
- `/dashboard` — Main dashboard with charts, metrics, rankings
- `/agenda` — Visual schedule with appointment management + checkout modal
- `/agenda/picos` — Peak hours heatmap analysis
- `/gestao/profissionais` — Professional management
- `/gestao/servicos` — Service management
- `/gestao/clientes` — Client management with search, VIP, birthday detection
- `/gestao/produtos` — Product/inventory management
- `/relatorios` — Revenue & commission reports with charts
- `/caixa` — Checkout/comanda history
- `/financeiro` — Financial overview with area charts
- `/empresa` — Studio settings with ViaCEP + hours toggle
- `/clube` — Loyalty program with leaderboard & VIP

## Design & Theme

- **Light feminine design**: rosé, lilás, nude, white with soft gold accents
- **Fonts**: Nunito (body/UI), Playfair Display (headings/display)
- **Brand**: "Glow Agenda" with Sparkles icon
- **Color palette**: Primary rosé (hsl 340 45% 62%), purple accents, warm neutrals

## Key Features

- Multi-tenant: each salon is isolated by barbeariaId
- 30-day free trial plan
- Commission calculation (percentage or fixed per professional)
- Checkout with split payment support (pix, dinheiro, crédito, débito)
- Loyalty points for clients
- Dashboard with Recharts charts (bar + donut)
- Responsive sidebar (collapses to mobile menu on small screens)
- ViaCEP integration for address auto-fill in onboarding
- Public booking portal at `/public/{slug}`
- Peak hours heatmap analysis
- Low-stock product alerts with margin calculation

## Important Notes

- shadcn Select components do NOT bind to native form FormData — always use React state (useState) for Select values
- DB numeric fields stored as strings in Postgres — parse with parseFloat() in routes
- Demo login: joao@barberpro.com / 123456, barbeariaId: 1 (legacy test credentials, not user-facing)
- `date-fns` v3 is installed; use `date-fns/locale` for ptBR
- API endpoint names still use "barbearias" for backward compatibility
