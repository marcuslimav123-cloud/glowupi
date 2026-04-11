# Glow Upi

## Overview
Glow Upi is a multi-tenant SaaS platform designed for beauty salon and studio management. It offers comprehensive features for appointment scheduling, client management, financial tracking, marketing, and loyalty programs for beauty professionals (manicurists, estheticians, hair stylists). The platform aims to be the leading management tool in the beauty industry, enhancing operational efficiency and client engagement.

## User Preferences
I prefer clear and concise communication. When making changes, prioritize iterative development and ask for confirmation before implementing major architectural shifts or complex features. I value detailed explanations for significant code modifications or new feature implementations.

## System Architecture
The project is a full-stack monorepo built with `pnpm workspaces`. The frontend uses `React`, `Vite`, `TailwindCSS`, `shadcn/ui`, and `Recharts`. The backend is powered by `Express 5` and `PostgreSQL` with `Drizzle ORM`. `TypeScript 5.9` is used across the entire monorepo.

**UI/UX Decisions:**
The design adopts a "luxury clinic aesthetic" with a color palette of warm gold, cream, and off-white. It utilizes `Inter` for body text and `DM Serif Display` for headings, featuring subtle borders and `fafafa` backgrounds for a clean, Apple-inspired look. Dark mode is supported using semantic Tailwind tokens for internal pages.

**Technical Implementations:**
- **Authentication:** Session-based with cookies, supporting Google Sign-In and multi-level access control (owner, manager, collaborator, client, super admin).
- **API:** All endpoints are prefixed with `/api`, documented with OpenAPI, and generate client code via Orval.
- **Database:** `PostgreSQL` with `Drizzle ORM`, structured for multi-tenancy.
- **Stripe Integration:** Manages subscriptions, product syncing, and webhook processing for various pricing tiers and billing periods.
- **Reporting & Exports:** Data export to `XLSX` and `PDF` formats.
- **Monorepo Structure:** Divided into `artifacts` (api-server, barberpro), `lib` (shared code), and `scripts`.
- **Multi-tenancy:** Each salon operates in an isolated environment.
- **Subscription Management:** Features a 30-day free trial, trial expiration lockout, professional limits per plan, and differentiated billing periods.
- **Appointment & Schedule Management:** Visual agenda, professional schedules, and peak hours analysis. Double booking prevention is implemented server-side.
- **Client & Product Management:** Detailed client profiles, product inventory, and movement history.
- **Financial & Reporting:** Commission calculations, split payments, discounts, financial accounts, and various analytical reports, including daily cash register management.
- **Relatórios Module:** Comprehensive reporting dashboard with 8 dedicated pages for various business insights.
- **Marketing & Loyalty:** Loyalty programs, message system, discount coupons, automated reminders, and client groups.
- **Public Booking Portal:** A booking-first design allowing clients to schedule appointments publicly, with color contrast protection for accessibility. Also supports simple mode cancellation by clients via WhatsApp verification. Equipment capacity is checked during slot generation.
- **Configuração de Parâmetros:** Tenant-scoped business rules configurable across 8 categories.
- **Barra de Notificações:** In-app notification system with a bell icon, unread count, and pop-up dropdowns for birthdays, messages, and registration requests.
- **Perfis de Acesso Granulares:** System for granular menu-level permissions based on user roles and profiles.
- **Mobile Bottom Tab Navigation:** Fixed bottom navigation for mobile with key app sections.
- **Menu Page:** Mobile-friendly access to app sections, user profile, organized settings, and appearance controls.
- **Filiais (Múltiplas Unidades):** Branch/multi-location support for specific plans, integrating branch association into professionals, services, and appointments.
- **Admin Panel:** Separate super admin interface for platform-level management.
- **Email:** Round-robin email sending via Brevo for invites and transactional emails, with daily usage tracking.
- **Team Invite Flow:** Owners can invite team members with specific roles and access profiles.
- **Google-Only Registration:** New user registration is exclusively via Google Sign-In.
- **Página de Venda Direta (PDVD):** Direct sales page with a streamlined checkout and onboarding process, bypassing the free trial.
- **Object Storage & Image Upload:** GCS-backed object storage via Replit App Storage for logos and photos, using presigned URLs for secure uploads.
- **Mobile App – Glow Upi Pro:** An Expo mobile app for owners and professionals with dedicated dashboards, authentication, and push notifications.
- **Push Notifications & Agenda:** Push notification system using Expo Push API for appointment reminders and updates, with a `push_tokens` table for managing device tokens.
- **Web Push Notifications & In-App Notification Bell:** Internal notification system with `notificacoes` table, per-user read tracking, and browser desktop notifications.
- **AppBeleza Clone Overhaul:** Significant expansion to clone AppBeleza functionality, including 14 new database tables for enhanced features like daily cash register, service categories, suppliers, anamnesis forms, card brands, remunerations, satisfaction surveys, and professional rotation.
- **Task #59 - Performance & Bug Fixes:** React.lazy + Suspense for 70+ route components in App.tsx (code splitting). Optimistic CRUD updates with snapshot/rollback pattern for Produtos, Servicos, Profissionais (create/update/toggle/delete). Fixed 5 silent catch blocks in BarbeariaStep.tsx onboarding to show user-facing toast messages. WhatsApp clickable links in Agenda detail view. Backend error responses sanitized across checkout.ts (no raw error.message leaks).

## External Dependencies
- **Stripe:** Payment processing, subscription management, and billing.
- **PostgreSQL:** Primary database.
- **Google Sign-In API:** User authentication.
- **Brevo (Sendinblue):** Transactional email sending with round-robin API key rotation and email template management.
- **ViaCEP:** Address auto-fill.
- **Recharts:** Data visualization.
- **Orval:** API client code generation.
- **jspdf & jspdf-autotable:** PDF generation.
- **xlsx:** Excel file generation.