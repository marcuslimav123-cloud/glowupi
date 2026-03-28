# Glow Upi

## Overview
Glow Upi is a multi-tenant SaaS platform designed for beauty salon and studio management. It aims to provide a comprehensive solution for beauty professionals, including manicurists, estheticians, and hair stylists, to manage their businesses efficiently. The platform includes features for appointment scheduling, client management, financial tracking, marketing, and loyalty programs. The business vision is to become the leading management tool for beauty industry professionals, enhancing their operational efficiency and client engagement.

## User Preferences
I prefer clear and concise communication. When making changes, prioritize iterative development and ask for confirmation before implementing major architectural shifts or complex features. I value detailed explanations for significant code modifications or new feature implementations.

## System Architecture
The project is a full-stack monorepo utilizing `pnpm workspaces`. The frontend is built with `React`, `Vite`, `TailwindCSS`, `shadcn/ui`, and `Recharts` for data visualization. The backend uses `Express 5` and `PostgreSQL` with `Drizzle ORM`. `TypeScript 5.9` is used across the entire monorepo.

**UI/UX Decisions:**
The design follows a "luxury clinic aesthetic" with a color palette of warm gold, cream, and off-white, aiming for a high-end feel. It uses `Inter` for body text and `DM Serif Display` for headings, with subtle borders and `fafafa` backgrounds for a clean, Apple-inspired look.

**Dark Mode:** All internal pages (inside AppLayout) use semantic Tailwind tokens (`bg-card`, `bg-muted`, `bg-background`, `border-border`, `text-foreground`) instead of hardcoded `bg-white`/`border-black`. Dark mode toggled via `.dark` class on `<html>`, controlled by `tema_layout` parameter (Claro/Escuro/Automático). Public pages (PublicBooking, PublicStorefront, Landing, auth) use their own dark backgrounds intentionally and are NOT tokenized. Parameter changes (theme/font) invalidate `["parametros-layout"]` query for instant updates without page reload.

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
- **Mobile Bottom Tab Navigation (Task #49):** Fixed bottom navigation bar on mobile (hidden on md+ breakpoints) with 5 tabs: Início (Dashboard), Agenda, Clientes, Caixa, Menu. Component: `MobileBottomBar.tsx`. Active tab highlighted with primary color. Safe area padding for notch devices. Main content area has extra bottom padding on mobile to avoid overlap with tab bar.
- **Menu Page (Task #49):** Dedicated `/menu` route providing mobile-friendly access to app sections. Shows user profile card (name, role, establishment), organized sections (Gestão: Profissionais/Serviços/Produtos/Pacotes; Relatórios: Faturamento/Rankings/Resumo; Configurações: Estúdio/Funcionamento/Parâmetros/Acessos), appearance settings (color theme picker with 17 themes, dark/light/auto mode toggle), and logout button. Sections filtered by user role. Component: `pages/Menu.tsx`.
- **Admin Panel:** A separate super admin interface for platform-level management (tenant activation, configuration, revenue analytics).

- **Email (Brevo Integration):** Round-robin email sending across 4 Brevo API keys (300/day each = 1200/day total). `brevo_email_log` table tracks daily counts per key. Service at `api-server/src/lib/brevo.ts`. Admin endpoint `GET /admin/email-stats` shows daily usage. Used for invite emails and future transactional emails.
- **Team Invite Flow:** Owner invites team members via `/convites` API. Invite includes role (gerente/colaborador) + optional perfil de acesso. Invite can be sent via Brevo email or link copied for WhatsApp. Convidado accepts by authenticating with Google (email must match invite). `convites` table has `perfil_acesso_id` column. Accept page at `/convite/:token` requires Google auth.
- **Google-Only Registration:** Manual registration is blocked (API returns 403). New users must register via Google Sign-In for verified emails. Login page keeps email/password as secondary option for existing accounts.
- **Página de Venda Direta (PDVD):** Direct sales page now at `/` (root) — without free trial mentions. Original landing with trial is at `/pdvd`. Flow: "Assinar" → Google auth popup → Stripe Checkout (no trial) → `/sucesso?session_id=` → quiz (tipo estabelecimento, como soube) → simplified onboarding (nome, telefone, endereço) → creates barbearia with `subscriptionStatus: "ativo"`, `onboardingStep: 5` → redirects to `/dashboard`. API endpoints: `POST /checkout/create-direct-session` (no requireBarbearia), `POST /checkout/verify-direct-session`, `POST /checkout/complete-direct-onboarding`. Security: session ownership validation (`metadata.userId`), source validation (`metadata.source === "pdvd"`), strict payment check (`payment_status === 'paid'`), postMessage origin validation.

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
- Auto-send pesquisa de satisfação email after checkout when envioAutomatico is enabled (sends branded email with survey link to client)
- Frontend Tipos.tsx: extra fields for forma_pagamento (isCartao, multiplicadorPontos) and bandeira (taxaOperadora, tipoBandeira, diasRecebimento, diasUteis)
- Frontend Caixa.tsx: gorjeta field, gorjeta/taxa columns, líquido calculation with taxa deduction

**Financeiro & Caixa (Task #27 — Tutorial Compliance):**
- `forma_pagamento` field added to `contas_financeiras` for tracking payment method on baixa
- PUT `/financeiro/:contaId/baixa` sets status=paga, dataPagamento, formaPagamento
- Caixa: sangria (cash withdrawal), vale (advance to professional w/ atomic debit in contas_profissional)
- Fechar Caixa: conferência modal showing esperado/informado/diferença
- FluxoCaixa: 3 tabs (Total Movimentado, Total Disponível, Total a Receber) with per-payment-entry calculations

**Logo Upload com Crop (Task #35):**
- `LogoUpload.tsx` component with react-easy-crop for circular crop + zoom slider
- Integrated in AppLayout sidebar header (dono role only can upload/change)
- Non-dono users see the logo but can't change it
- Uses object storage presigned URL flow (same as ImageUpload)
- `AuthContext` now exposes `logoUrl` and `barbeariaNome` from barbearia data
- `UpdateBarbeariaInput` schema updated with `logoUrl` field

**Equipamentos — Integração com Agendamento (Task #34):**
- slots.ts now checks equipment capacity: for each equipment linked to the requested service, counts concurrent bookings for services in that equipment's `servicosIds`, blocks slot if count >= `quantidadeMaxima`

**Clientes & Relatórios (Task #28):**
- Client dashboard: `/gestao/clientes/:clienteId` page with summary cards (favorite service, favorite product, days since last appointment, total spent, loyalty points), tabs for agendamento history and comanda history
- WhatsApp button on client listing opens `wa.me/55{phone}` in new tab
- API: `GET /clientes/:clienteId/dashboard` returns aggregated client stats + history
- Report "Dias sem Vir": `/relatorios/dias-sem-vir` lists inactive clients (configurable days threshold)
- Report "Lucro por Produtos": `/relatorios/lucro-produtos` calculates revenue - cost = profit per product
- Both new reports accessible from sidebar under Relatórios > Gerencial

**Mobile App — Glow Upi Pro (Task #46):**
- Expo mobile app at `artifacts/mobile` for owners (dono) and professionals (gerente/colaborador)
- Auth: email/senha login via `/api/auth/login` + Google Sign-In via `expo-auth-session` (sends ID token to `/api/auth/google`), Bearer token stored in SecureStore, AuthContext with `setAuthTokenGetter` and `loginWithGoogle`
- Google client ID passed via `EXPO_PUBLIC_GOOGLE_CLIENT_ID` env var (sourced from `GOOGLE_CLIENT_ID` in dev script), button conditionally shown when configured
- Logo: uses same Glow Upi golden logo (`assets/images/logo.png`) as web app
- `@workspace/api-client-react` extended with `setBaseUrl()` and `setAuthTokenGetter()` in `custom-fetch.ts`
- Navigation: 5 tabs — Caixa (dashboard), Comandas, Agenda, Clientes, Menu
- Dashboard: fetches `/api/barbearias/:id/dashboard?periodo=hoje` for daily metrics (faturamento, agendamentos, clientes, ticket médio, ocupação, top serviços, alertas)
- Colaborador view: shows only personal agendamentos
- Resolves barbeariaId from `/api/auth/me` (donos via donoId, profissionais via barbeariaId)
- Dark theme: graphite #0f0f0f background, gold accent #c4a46a, Inter font
- Supports NativeTabs (liquid glass iOS 26+) with classic Tabs fallback

**Push Notifications & Agenda (Task #47):**
- `push_tokens` table: stores Expo/web push tokens per user per barbearia (userId, barbeariaId, token, plataforma, ativo)
- API routes: `POST /push-tokens/register`, `POST /push-tokens/unregister`, `GET /push-tokens` (all require auth + barbearia access)
- Push utility at `api-server/src/lib/pushNotifications.ts`: `sendPushToUser()`, `sendPushToBarbearia()` (tenant-scoped), `sendAgendamentoReminders()` (idempotent, handles day rollover)
- Expo Push API integration (`https://exp.host/--/api/v2/push/send`) for ExponentPushToken tokens
- Reminder service runs every 5 minutes, checks appointments within next 30 minutes, deduplicates via in-memory set
- Push sent on appointment creation and cancellation (non-blocking via `.catch()`)
- Enhanced `Agenda.tsx`: horizontal calendar strip, professional avatar filter with badges, red current-time indicator line, FAB (+) button, appointment detail modal (confirm/cancel/checkout actions), multi-step new appointment flow (client search → service → professional → time slot)

**DB Schema Path:** `lib/db/src/schema/` (each table in its own file, exported from `index.ts`)