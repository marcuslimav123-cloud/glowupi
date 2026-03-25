# Glow Agenda — SaaS para Salões de Beleza

## Overview
Glow Agenda is a multi-tenant SaaS platform designed for beauty salon management. It provides a comprehensive suite of tools for various beauty professionals, including manicurists, estheticians, and hair stylists. The platform aims to streamline operations, enhance client engagement, and provide valuable insights for business growth. Key capabilities include appointment scheduling, client management, inventory tracking, financial reporting, marketing tools, and a robust subscription billing system. The project's vision is to become the leading management solution for beauty businesses, offering a user-friendly and feature-rich experience.

## User Preferences
I want to iteratively develop this project, focusing on small, reviewable changes. I prefer detailed explanations for any proposed changes or complex logic. Do not make changes to the `artifacts-monorepo/lib/api-spec/` folder. Do not make changes to the `stripe.*` tables directly via SQL; all Stripe product creation and synchronization should happen via the Stripe API and `stripe-replit-sync`.

## System Architecture

**Monorepo:** The project is structured as a full-stack monorepo using `pnpm workspaces`.
**Frontend:** Built with React, Vite, TailwindCSS, `shadcn/ui`, and Recharts for data visualization.
**Backend:** Powered by Express 5, using PostgreSQL as the database with Drizzle ORM.
**Authentication:** Session-based (cookie) authentication with SHA-256 password hashing. Supports Google Sign-In. Features multi-level access control (owner, manager, employee) and a separate authentication system for clients. Super admin has a distinct authentication flow.
**API:** All API endpoints are under `/api`, generated from an OpenAPI specification using Orval.
**UI/UX:** The design follows a "luxury clinic aesthetic" with a clean, Apple-inspired look. It features the Inter font for body text and DM Serif Display for headings, a warm gold and neutral color palette, generous whitespace, and subtle borders.
**Key Features:**
*   **Multi-tenancy:** Each salon operates in an isolated environment.
*   **Subscription Management:** Includes a 30-day free trial, Stripe subscription billing with four tiers and three billing periods, and a single-price mode.
*   **Financial & Reporting:** Commission calculation, split payment support, financial accounts management (payable/receivable), and detailed revenue and commission reports.
*   **Scheduling & Client Management:** Flexible per-professional schedules, waitlist management, client satisfaction surveys, and a public booking portal.
*   **Inventory & Products:** Product/inventory management with barcode, expiry tracking, and movement history.
*   **Marketing & Communication:** Loyalty program, service packages with session tracking, message system for promotions and reminders, and discount coupons.
*   **Admin Panel:** A separate Super Admin Panel for platform oversight, tenant management, configuration, and revenue analytics.
*   **LGPD Compliance:** Built-in LGPD consent popup and editable terms.

## External Dependencies

*   **Database:** PostgreSQL
*   **ORM:** Drizzle ORM
*   **Payments:** Stripe (via Replit integration) and `stripe-replit-sync`
*   **Validation:** Zod (`zod/v4`), `drizzle-zod`
*   **API Codegen:** Orval
*   **Google Sign-In:** Google API (requires `GOOGLE_CLIENT_ID` environment variable and `google-auth-library` for backend verification).
*   **Address Auto-fill:** ViaCEP (for address lookup in onboarding).
*   **Exports:** xlsx (Excel), jspdf + jspdf-autotable (PDF) for Comandas/Caixa exports.

## Database Schema Management
Schema changes use `pnpm --filter @workspace/db run push` (drizzle push) — no migration files.
After pushing, restart the API server workflow.