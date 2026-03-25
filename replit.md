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
- **Subscription Management:** Includes a 30-day free trial, various subscription plans, and a subscription guard to control access.
- **Appointment & Schedule Management:** Visual agenda, professional schedules with per-weekday configuration, and peak hours analysis.
- **Client & Product Management:** Detailed client profiles, product inventory with barcode/expiry tracking, and movement history.
- **Financial & Reporting:** Commission calculations, checkout with split payments and discounts, financial accounts (payable/receivable), and various analytical reports.
- **Relatórios Module (Task #12):** Sidebar expandable submenu with 8 report pages: Resumo (KPI dashboard with 11 colored cards), Faturamento, Aniversariantes, Agendamentos, Perfil Cliente, Financeiro, Cancelamentos, Rankings. All gerencial reports use `ReportTemplate.tsx` (date filters, sortable/paginated table, Excel/PDF/Print export). API routes: `/dashboard/resumo` (KPI counts), `/relatorios/*` (6 report endpoints in `relatorios.ts`).
- **Marketing & Loyalty:** Loyalty programs with rewards, message system for promotions, discount coupons, automated reminders, and client groups.
- **Public Booking Portal:** Salons can have a public page for online appointment booking.
- **Configuração de Parâmetros (Task #13):** 38 tenant-scoped business rules across 8 categories (Agenda, Cancelamentos, Comandas, Notificações, Comissões, Clientes, Fidelidade, Outros). Table `parametros_config` with auto-seed on first GET. API: GET/PUT/DELETE at `/barbearias/:id/parametros`. Sidebar "Configurações" section with Parâmetros page + placeholder pages (Rodízio, Ordem de Chegada, Lista de Espera Config, Alertas).
- **Barra de Notificações (Task #14):** HeaderBar component in AppLayout with quick-access icons (Agenda, Financeiro, Comandas) and popup dropdowns (Aniversários, Mensagens, Solicitações de Cadastro, Perfil). Theme selector with 17 color options persisted per user (`tema` column in users table). Solicitações de Cadastro table for client registration requests with approve/reject flow. API endpoints: GET `/notificacoes/aniversariantes`, GET `/notificacoes/mensagens`, GET/PUT `/notificacoes/solicitacoes`, PUT `/auth/tema`.
- **Perfis de Acesso Granulares (Task #15):** Access profile system for granular menu-level permissions. Tables: `perfis_acesso` (barbeariaId, descricao, tipo web/app, permissoes jsonb, ativo) and `profissionais_perfis` (links profissional to perfil). API CRUD at `/barbearias/:id/perfis-acesso` with validated permissions, tipo, and tenant-scoped profissionalId verification. Frontend page at `/configuracoes/acessos` (dono-only). `/auth/me` returns `perfilPermissoes` array for gerente/colaborador users with assigned profiles. Sidebar filtering enhanced via `HREF_TO_PERMISSION` mapping — when a user has `perfilPermissoes`, nav items are filtered by permission keys (24 permission keys across 6 groups).
- **Admin Panel:** A separate super admin interface for platform-level management (tenant activation, configuration, revenue analytics).

- **Email (Brevo Integration):** Round-robin email sending across 4 Brevo API keys (300/day each = 1200/day total). `brevo_email_log` table tracks daily counts per key. Service at `api-server/src/lib/brevo.ts`. Admin endpoint `GET /admin/email-stats` shows daily usage. Used for invite emails and future transactional emails.
- **Team Invite Flow:** Owner invites team members via `/convites` API. Invite includes role (gerente/colaborador) + optional perfil de acesso. Invite can be sent via Brevo email or link copied for WhatsApp. Convidado accepts by authenticating with Google (email must match invite). `convites` table has `perfil_acesso_id` column. Accept page at `/convite/:token` requires Google auth.
- **Google-Only Registration:** Manual registration is blocked (API returns 403). New users must register via Google Sign-In for verified emails. Login page keeps email/password as secondary option for existing accounts.

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