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
- **API codegen**: Orval (from OpenAPI spec) — run `pnpm --filter @workspace/api-spec run codegen`
- **Auth**: Session-based (cookie) with SHA-256 password hashing (in-memory sessions map)
- **Build**: esbuild (CJS bundle)
- **Fonts**: Inter (body/UI) + DM Serif Display (headings)

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
- `comandas` — Checkout records with services, products, payments, commissions (desconto, descontoTipo, parcelas)
- `produtos` — Product inventory (codigoBarras, validade)
- `contasFinanceiras` — Financial accounts payable/receivable
- `pacotes` — Service packages (nome, preco, sessoesTotal, validade)
- `pacotesCliente` — Client package purchases with session tracking
- `avaliacoes` — Satisfaction surveys (nota 1-5, comentario)
- `listaEspera` — Waitlist management
- `recompensas` — Loyalty rewards catalog
- `resgates` — Loyalty redemption history
- `movimentacoesEstoque` — Inventory movement history
- `mensagens` — Messages (retorno/promocao) with draft/sent status

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
- `/barbearias/{id}/financeiro/**` — Financial accounts CRUD
- `/barbearias/{id}/pacotes/**` — Service packages CRUD
- `/barbearias/{id}/pacotes-cliente/**` — Client packages + session usage
- `/barbearias/{id}/avaliacoes/**` — Satisfaction surveys
- `/barbearias/{id}/lista-espera/**` — Waitlist CRUD
- `/barbearias/{id}/recompensas/**` — Loyalty rewards CRUD
- `/barbearias/{id}/resgates/**` — Loyalty redemptions
- `/barbearias/{id}/produtos/{produtoId}/movimentacoes/**` — Inventory movements
- `/barbearias/{id}/mensagens/**` — Messages CRUD
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
- `/financeiro` — Financial management (Resumo/A Pagar/A Receber tabs, CRUD contas)
- `/pacotes` — Service packages management + client package sales & session tracking
- `/lista-espera` — Waitlist management with status tracking
- `/avaliacoes` — Satisfaction surveys dashboard with ratings distribution
- `/mensagens` — Return messages & promotions (draft/send)
- `/empresa` — Studio settings with ViaCEP + hours toggle
- `/clube` — Loyalty program (Ranking/Recompensas/Resgates tabs)

## Design & Theme

- **Luxury clinic aesthetic**: white marble, warm gold, cream, off-white — inspired by high-end beauty clinics
- **Fonts**: Inter (body/UI), DM Serif Display (headings/display)
- **Brand**: "Glow Agenda" with Sparkles icon
- **Color palette**: Primary warm gold (hsl 38 45% 58%), amber accents for VIP, warm neutral backgrounds (hsl 40 20% 98%), warm beige borders/muted tones
- **Chart colors**: gold, warm beige, terracotta, sage green, burnt sienna

## Key Features

- Multi-tenant: each salon is isolated by barbeariaId
- 30-day free trial plan
- Commission calculation (percentage or fixed per professional)
- Checkout with split payment support (pix, dinheiro, crédito, débito)
- Loyalty points for clients with rewards catalog and redemption
- Service packages with session tracking
- Financial management (accounts payable/receivable)
- Waitlist management
- Client satisfaction surveys with professional rankings
- Messages system (return reminders & promotions)
- Inventory movements with stock tracking
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
- Query invalidation: always use generated `getList*QueryKey()` functions from api-client-react, NOT manual string keys
- Role enum "barbeiro" kept in DB/API for backward compatibility; `getRoleLabel()` maps to "profissional" in UI
