# Glow Up

## Overview
Glow Up is a multi-tenant SaaS platform designed for beauty salon and studio management. It aims to provide a comprehensive solution for beauty professionals, including manicurists, estheticians, and hair stylists, to manage their businesses efficiently. The platform includes features for appointment scheduling, client management, financial tracking, marketing, and loyalty programs. The business vision is to become the leading management tool for beauty industry professionals, enhancing their operational efficiency and client engagement.

## User Preferences
I prefer clear and concise communication. When making changes, prioritize iterative development and ask for confirmation before implementing major architectural shifts or complex features. I value detailed explanations for significant code modifications or new feature implementations.

## System Architecture
The project is a full-stack monorepo utilizing `pnpm workspaces`. The frontend is built with `React`, `Vite`, `TailwindCSS`, `shadcn/ui`, and `Recharts` for data visualization. The backend uses `Express 5` and `PostgreSQL` with `Drizzle ORM`. `TypeScript 5.9` is used across the entire monorepo.

**UI/UX Decisions:**
The design follows a "luxury clinic aesthetic" with a color palette of warm gold, cream, and off-white, aiming for a high-end feel. It uses `Inter` for body text and `DM Serif Display` for headings, with subtle borders and `fafafa` backgrounds for a clean, Apple-inspired look.

**Technical Implementations:**
- **Authentication:** Session-based with cookies. Supports Google Sign-In. Features a multi-level access control system (owner, manager, collaborator, client) and a separate super admin login.
- **API:** All endpoints are prefixed with `/api` and are documented with OpenAPI, generating client code via Orval.
- **Database:** `PostgreSQL` managed with `Drizzle ORM`, structured for multi-tenancy.
- **Stripe Integration:** Handled via `stripe` and `stripe-replit-sync` for subscription management, product syncing, and webhook processing. Pricing is configurable and supports various subscription tiers and billing periods.
- **Reporting & Exports:** Supports exporting data to `XLSX` and `PDF` formats.
- **Monorepo Structure:** Divided into `artifacts` (api-server, barberpro), `lib` (shared code like api-spec, api-client-react, api-zod, db), and `scripts` (utility scripts).

**Feature Specifications:**
- **Multi-tenancy:** Each salon operates in an isolated environment.
- **Subscription Management:** Includes a 30-day free trial with countdown banner (urgency colors at <=10 and <=5 days), trial expiration lockout (frontend paywall + backend middleware `requireActiveSubscription` on all `/barbearias/:id/*` routes), professional limits per plan tier (`1_pro`=1, `2_5_pro`=5, `6_15_pro`=15, `15_plus_pro`/`single`/`trial`=unlimited), and monthly recurring vs semestral/anual checkout differentiation (monthly uses `trial_period_days: 1` for next-day charge, semestral/anual charge immediately). Billing period resolved server-side from Stripe price metadata to prevent client manipulation.
- **Appointment & Schedule Management:** Visual agenda, professional schedules with per-weekday configuration, and peak hours analysis.
- **Client & Product Management:** Detailed client profiles, product inventory with barcode/expiry tracking, and movement history.
- **Financial & Reporting:** Commission calculations, checkout with split payments and discounts, financial accounts (payable/receivable), and various analytical reports.
- **Relatórios Module (Task #12):** Sidebar expandable submenu with 8 report pages: Resumo (KPI dashboard with 11 colored cards), Faturamento, Aniversariantes, Agendamentos, Perfil Cliente, Financeiro, Cancelamentos, Rankings. All gerencial reports use `ReportTemplate.tsx` (date filters, sortable/paginated table, Excel/PDF/Print export). API routes: `/dashboard/resumo` (KPI counts), `/relatorios/*` (6 report endpoints in `relatorios.ts`).
- **Marketing & Loyalty:** Loyalty programs with rewards, message system for promotions, discount coupons, automated reminders, and client groups.
- **Public Booking Portal:** Booking-first design at `/s/:slug` — shows service selection wizard immediately (service→professional→date→time→confirm). Profile info (team, reviews, hours, payments, etc.) accessible via info button/logo click (modal drawer). Standalone booking also at `/agendar/:slug`. Color contrast protection: `getContrastColor()` computes WCAG luminance to switch button text between black/white based on accent brightness. Slot generation respects `horarioFuncionamento` (array format: `[{dia, ativo, abertura, fechamento, intervaloInicio, intervaloFim}]`) — closed days return no slots, break intervals are excluded, business hours constrain slot windows.
- **Configuração de Parâmetros (Task #13):** 38 tenant-scoped business rules across 8 categories (Agenda, Cancelamentos, Comandas, Notificações, Comissões, Clientes, Fidelidade, Outros). Table `parametros_config` with auto-seed on first GET. API: GET/PUT/DELETE at `/barbearias/:id/parametros`. Sidebar "Configurações" section with Parâmetros page + placeholder pages (Rodízio, Ordem de Chegada, Lista de Espera Config, Alertas).
- **Barra de Notificações (Task #14):** HeaderBar component in AppLayout with quick-access icons (Agenda, Financeiro, Comandas) and popup dropdowns (Aniversários, Mensagens, Solicitações de Cadastro, Perfil). Theme selector with 17 color options persisted per user (`tema` column in users table). Solicitações de Cadastro table for client registration requests with approve/reject flow. API endpoints: GET `/notificacoes/aniversariantes`, GET `/notificacoes/mensagens`, GET/PUT `/notificacoes/solicitacoes`, PUT `/auth/tema`.
- **Perfis de Acesso Granulares (Task #15):** Access profile system for granular menu-level permissions. Tables: `perfis_acesso` (barbeariaId, descricao, tipo web/app, permissoes jsonb, ativo) and `profissionais_perfis` (links profissional to perfil). API CRUD at `/barbearias/:id/perfis-acesso` with validated permissions, tipo, and tenant-scoped profissionalId verification. Frontend page at `/configuracoes/acessos` (dono-only). `/auth/me` returns `perfilPermissoes` array for gerente/colaborador users with assigned profiles. Sidebar filtering enhanced via `HREF_TO_PERMISSION` mapping — when a user has `perfilPermissoes`, nav items are filtered by permission keys (24 permission keys across 6 groups).
- **Admin Panel:** A separate super admin interface for platform-level management (tenant activation, configuration, revenue analytics).

- **Email (Brevo Integration):** Round-robin email sending across 4 Brevo API keys (300/day each = 1200/day total). `brevo_email_log` table tracks daily counts per key. Service at `api-server/src/lib/brevo.ts`. Admin endpoint `GET /admin/email-stats` shows daily usage. Used for invite emails and future transactional emails.
- **Team Invite Flow:** Owner invites team members via `/convites` API. Invite includes role (gerente/colaborador) + optional perfil de acesso. Invite can be sent via Brevo email or link copied for WhatsApp. Convidado accepts by authenticating with Google (email must match invite). `convites` table has `perfil_acesso_id` column. Accept page at `/convite/:token` requires Google auth.
- **Google-Only Registration:** Manual registration is blocked (API returns 403). New users must register via Google Sign-In for verified emails. Login page keeps email/password as secondary option for existing accounts.

- **Object Storage & Image Upload:** GCS-backed object storage via Replit App Storage. Presigned URL upload flow (client → API for presigned URL → client uploads directly to GCS). `ImageUpload` component (`components/ImageUpload.tsx`) provides reusable upload UI with preview, remove, and drag-to-replace. Upload endpoint requires staff auth (`requireAuth`). Serving endpoint is public (for logos/photos visible on public storefront). Storage routes: `POST /api/storage/uploads/request-url` (auth required), `GET /api/storage/objects/*` (public serving). Business `logoUrl` stored on barbearias table; professional `fotoUrl` on profissionais table. Both displayed on PublicStorefront/PublicBooking pages.

## External Dependencies
- **Stripe:** For payment processing, subscription management, and billing.
- **PostgreSQL:** Primary database.
- **Google Sign-In API:** For user authentication (required for registration and team invite acceptance).
- **Brevo (Sendinblue):** Transactional email sending with 4-key round-robin rotation. Keys: BREVO_API_KEY_1 through BREVO_API_KEY_4. Verified sender: marcuslimav123@gmail.com (BREVO_SENDER_EMAIL). Email templates stored in `email_templates` table with per-tenant overrides. Templates page at `/configuracoes/templates`.
- **ViaCEP:** For address auto-fill functionality during onboarding.
- **Recharts:** For data visualization in dashboards and reports.
- **Orval:** For API client code generation from OpenAPI specifications.
- **jspdf & jspdf-autotable:** For PDF generation.
- **xlsx:** For Excel file generation.

## AppBeleza Clone Overhaul (Tasks #20-22)
The system is being fully restructured to clone all AppBeleza functionality. Key additions:

**New DB Tables (14 schema files):**
- `caixa_diario`, `movimentacoes_caixa` — daily cash register open/close
- `categorias_servico` — service categories
- `fornecedores`, `equipamentos` — suppliers and equipment
- `tipo_anamnese`, `anamnese_formularios`, `anamnese_clientes` — anamnesis forms
- `bandeiras` — card brands/flags with fees
- `remuneracoes`, `deducoes` — remunerations and deductions
- `mensagens_padrao` — standard message templates
- `pesquisa_satisfacao`, `respostas_pesquisa` — satisfaction surveys
- `rodizio` — professional rotation rules
- `documentos`, `restricoes_cliente` — documents and client restrictions
- `clube_vantagens` — advantages club
- `comissoes` — individual commission tracking
- `contas_profissional` — professional accounts

**Sidebar Structure (AppBeleza clone):**
Dashboard → Agenda → Cadastros (Clientes, Profissionais, Serviços, Pacotes sub, Tipos 13 sub-items incl. Cat. Serviço/Profissional/Produto, Comunicação sub, Fidelização sub, Assinaturas sub) → Comandas (Abertas, Histórico) → Financeiro (Caixa, Histórico, Mov, Comissões, Conta Cliente, Estoque, Fluxo, Conta Prof, Caixinha) → Relatórios (Agendamentos sub, Gerencial sub) → Configurações (Parâmetros, Rodízio, Acessos, Templates, Fila sub, Anamnese sub, Documentos sub, Outros sub) → Meu Estúdio → Equipe

**Equipamentos (Tutorial Compliance):**
- Dedicated `equipamentos` table with `quantidade_maxima` (simultaneous usage limit) + `servicos_ids` (jsonb array of associated service IDs)
- Dedicated API routes at `/barbearias/:id/equipamentos` with tenant-scoped service validation
- UI in Tipos page → Equipamentos tab with custom form (quantity + service association checkboxes)

**Pesquisa de Satisfação (Tutorial Compliance):**
- `envio_automatico` boolean field for auto-send after comanda finalization
- `profissional_id` / `profissional_nome` on `respostas_pesquisa` for per-professional ratings
- UI toggle in survey form + badge indicator in survey list

**Categorias (Tutorial Compliance):**
- 3 subtypes: Cat. Serviço, Cat. Profissional, Cat. Produto (all stored in `tipos` table with different `categoria` values)

**Comandas & Pagamentos (Task #26 — Tutorial Compliance):**
- `tipos` table extended: `is_cartao` + `multiplicador_pontos` (forma_pagamento), `taxa_operadora` + `tipo_bandeira` + `dias_recebimento` + `dias_uteis` (bandeira)
- `comandas` table extended: `gorjeta` (jsonb {profissionalId, valor}), `tipo_comanda` (text), `valor_liquido` (numeric), `taxa_cartao` (numeric), `data_compensacao` (text)
- Checkout calculates bandeira tax automatically from tipos table, computes valorLiquido, dataCompensacao
- Gorjeta support in checkout and nova comanda dialog
- Pontos fidelidade multiplicador per forma de pagamento
- Auto-send pesquisa de satisfação log after checkout when envioAutomatico is enabled
- Frontend Tipos.tsx: extra fields for forma_pagamento (isCartao, multiplicadorPontos) and bandeira (taxaOperadora, tipoBandeira, diasRecebimento, diasUteis)
- Frontend Caixa.tsx: gorjeta field, gorjeta/taxa columns, líquido calculation with taxa deduction

**Financeiro & Caixa (Task #27 — Tutorial Compliance):**
- `forma_pagamento` field added to `contas_financeiras` for tracking payment method on baixa
- PUT `/financeiro/:contaId/baixa` sets status=paga, dataPagamento, formaPagamento
- Caixa: sangria (cash withdrawal), vale (advance to professional w/ atomic debit in contas_profissional)
- Fechar Caixa: conferência modal showing esperado/informado/diferença
- FluxoCaixa: 3 tabs (Total Movimentado, Total Disponível, Total a Receber) with per-payment-entry calculations

**Clientes & Relatórios (Task #28):**
- Client dashboard: `/gestao/clientes/:clienteId` page with summary cards (favorite service, favorite product, days since last appointment, total spent, loyalty points), tabs for agendamento history and comanda history
- WhatsApp button on client listing opens `wa.me/55{phone}` in new tab
- API: `GET /clientes/:clienteId/dashboard` returns aggregated client stats + history
- Report "Dias sem Vir": `/relatorios/dias-sem-vir` lists inactive clients (configurable days threshold)
- Report "Lucro por Produtos": `/relatorios/lucro-produtos` calculates revenue - cost = profit per product
- Both new reports accessible from sidebar under Relatórios > Gerencial

**DB Schema Path:** `lib/db/src/schema/` (each table in its own file, exported from `index.ts`)