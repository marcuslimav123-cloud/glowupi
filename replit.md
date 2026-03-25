# Glow Agenda

## Overview
Glow Agenda is a multi-tenant SaaS platform designed for beauty salon and studio management. It aims to provide a comprehensive solution for beauty professionals, including manicurists, estheticians, and hair stylists, to manage their businesses efficiently. The platform includes features for appointment scheduling, client management, financial tracking, marketing, and loyalty programs. The business vision is to become the leading management tool for beauty industry professionals, enhancing their operational efficiency and client engagement.

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
- **Admin Panel:** A separate super admin interface for platform-level management (tenant activation, configuration, revenue analytics).

## External Dependencies
- **Stripe:** For payment processing, subscription management, and billing.
- **PostgreSQL:** Primary database.
- **Google Sign-In API:** For user authentication.
- **ViaCEP:** For address auto-fill functionality during onboarding.
- **Recharts:** For data visualization in dashboards and reports.
- **Orval:** For API client code generation from OpenAPI specifications.
- **jspdf & jspdf-autotable:** For PDF generation.
- **xlsx:** For Excel file generation.