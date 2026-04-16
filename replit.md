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
- **Subscription Management:** Configurable trial period (default 7 days, adjustable in Admin Settings via `trial_days` platform config). Trial expiration lockout, professional limits per plan, and differentiated billing periods. Data is fully preserved across plan changes (trial→paid, upgrades, downgrades).
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
- **Admin Panel:** Separate super admin interface for platform-level management, including trial link generation.
- **One-Time Trial Links:** Super admins generate unique single-use links (`/trial/:token`) enabling 7-day free trials. Links are valid for 30 days. Atomic claim prevents concurrent redemption. Trial user data auto-deleted after 3 months without paid subscription (daily cleanup scheduler). Admin UI at `/admin/trial-links` with stats, link generation, and usage log.
- **Email:** Round-robin email sending via Brevo for invites and transactional emails, with daily usage tracking.
- **Team Invite Flow:** Owners can invite team members with specific roles and access profiles.
- **Google-Only Registration:** New user registration is exclusively via Google Sign-In.
- **Página de Venda Direta (PDVD):** Direct sales page with a streamlined checkout and onboarding process, bypassing the free trial.
- **Object Storage & Image Upload:** GCS-backed object storage via Replit App Storage for logos and photos, using presigned URLs for secure uploads.
- **Marketing Video (artifacts/glow-upi-video):** Professional 30-second cinematic marketing video built with React + Framer Motion. 5 scenes: O Caos (stress/chaos), Dor Amplificada (pain points), O Ponto de Virada (transformation), O Controle (features), CTA Final (branding). Uses two Gemini-generated images. Vertical 9:16 format for social media. Scene files in `src/components/video/video_scenes/Scene1-5.tsx`.
- **Mobile App – Glow Upi Pro:** An Expo mobile app for owners and professionals with dedicated dashboards, authentication, and push notifications.
- **Push Notifications & Agenda:** Push notification system using Expo Push API for appointment reminders and updates, with a `push_tokens` table for managing device tokens.
- **Web Push Notifications & In-App Notification Bell:** Internal notification system with `notificacoes` table, per-user read tracking, and browser desktop notifications.
- **AppBeleza Clone Overhaul:** Significant expansion to clone AppBeleza functionality, including 14 new database tables for enhanced features like daily cash register, service categories, suppliers, anamnesis forms, card brands, remunerations, satisfaction surveys, and professional rotation.
- **Task #59 - Performance & Bug Fixes:** React.lazy + Suspense for 70+ route components in App.tsx (code splitting). Optimistic CRUD updates with snapshot/rollback pattern for Produtos, Servicos, Profissionais (create/update/toggle/delete). Fixed 5 silent catch blocks in BarbeariaStep.tsx onboarding to show user-facing toast messages. WhatsApp clickable links in Agenda detail view. Backend error responses sanitized across checkout.ts (no raw error.message leaks).
- **Task #60 - Web Push Notifications & WhatsApp in PublicBooking:** Real web push notifications via `web-push` library with VAPID keys. Service worker handles `push` and `notificationclick` events. Frontend auto-subscribes to push via `PushManager` when notification permission is granted, with retry on failure. Public VAPID key endpoint at `/api/push/vapid-public-key`. Backend sends web push to subscribed browsers and auto-deactivates expired/invalid tokens (410/404). WhatsApp optional field added to `com_login` mode confirmation step in PublicBooking, with server-side digits-only validation (10-11 chars).
- **Excel Client Import:** Upload Excel/CSV files to bulk import clients. Smart header detection maps columns automatically (supports Portuguese and English column names). Two-step process: preview with column mapping, then batch import (100 rows at a time). Handles date parsing (Excel serial numbers, DD/MM/YYYY, YYYY-MM-DD), duplicate phone detection, and provides detailed import results. Tutorial/instructions guide included in the import dialog.
- **Professional Anamnese Module:** Complete clinical anamnese system with: Enhanced form builder supporting 8 field types (texto, textarea, boolean, select, multiselect, numero, data, escala 1-10). Client prontuário with 5 tabs (Fichas, Fotos, Termos, Histórico, Saúde). Before/after photo gallery with tipo tags (antes/depois/evolução) and procedure labels. Digital consent forms with HTML5 canvas signature pad and cloud-stored signatures. Health alerts banner showing client allergies and contraindications. Procedure history timeline from agendamentos. DB tables: `anamnese_fotos`, `anamnese_consentimentos`. Added `alergias`/`contraindicacoes` fields to `clientes` table. Routes: `/configuracoes/anamnese-formularios` (config), `/configuracoes/anamnese-clientes` (prontuários).
- **Onboarding Wizard (Rewritten):** 4-step guided wizard at `/onboarding/barbearia` with dark theme (#0A0A0A), gold accents (#C4943C), mobile-first design. Steps: 1) Business Info + Segmentation (combined), 2) Services with pre-filled suggestions by business type (8 categories with curated service templates), 3) Business Hours (day toggles + time pickers), 4) Team (optional). Celebration screen with canvas confetti animation, share booking link, install PWA prompt, and explore dashboard. Progress bar at top, skip buttons on steps 2-4, fixed bottom nav. All API calls validated with user-facing error toasts.
- **Promotional Landing Page (Fundadoras):** Women-focused landing page at `/pdvd` for Meta Ads traffic. ZERO mentions of barbeiro/barbearia. Targets: salon owners, aesthetics clinics, nail designers, lash techs. Offer: 15-professional plan from R$165 to R$97.90/month (promotional). Annual: R$979/year (2 months free). Stripe product "Glow Upi Pro - Fundadoras" with tier `6_15_pro` and promo `fundadoras` metadata. Price IDs: monthly=`price_1TMFmZ75EBjZCK7yUYlgxTIc`, annual=`price_1TMFmZ75EBjZCK7ytXUNXdJA`. IMPORTANT: Server uses `STRIPE_LIVE_SECRET_KEY` (acct `acct_1TEZoE75EBjZCK7y`), NOT the Replit Stripe integration (acct `acct_1TEXvxK2OAJ7SMcr`). Always create Stripe resources using `STRIPE_LIVE_SECRET_KEY`. Facebook Pixel ready (replace `PIXEL_ID_AQUI` constant). Funnel structure: urgency badge (vagas limitadas), pain points, solutions, before/after comparison, pricing card with toggle (mensal/anual), annual bonuses, testimonials, FAQ, final CTA. Uses same `create-direct-session` checkout endpoint as DirectSales.tsx. CountdownBadge with localStorage persistence.
- **PWA Icons for Android:** Dynamic manifest now includes `maskable` purpose icons alongside `any` purpose for proper Android home screen icon display. Both admin panel (blob manifest) and public booking (API manifest) support establishment-branded icons.
- **LGPD Consent Tracking:** Server-side consent log with `lgpd_consents` table recording userId, type, IP, user-agent, and timestamp. First-login dialog blocks access until user accepts Política de Privacidade and Termos de Uso (checkbox + "Aceitar e Continuar"). `/auth/me` returns `lgpdConsentido` boolean. Admin panel has dedicated LGPD page (`/admin/lgpd`) showing paginated consent logs with user details. Admin Settings pre-populates privacy policy and terms of use textareas with default content for easy editing — saved content is served via `/lgpd/terms` and displayed on public `/politica-de-privacidade` and `/termos-de-uso` pages.

## External Dependencies
- **Stripe:** Payment processing, subscription management, and billing.
- **PostgreSQL:** Primary database.
- **Google Sign-In API:** User authentication.
- **Brevo (Sendinblue):** Primary email provider via REST API (`BREVO_API_KEY`). Handles transactional emails, contact management, and campaign lists. Gmail SMTP serves as automatic fallback if Brevo fails. Functions: `sendEmail()` (auto-routes to Brevo first), `addBrevoContact()` (add/update contacts with attributes and list assignment), `getBrevoLists()` (list all contact lists). File: `artifacts/api-server/src/lib/brevo.ts`.
- **web-push:** Web Push Protocol library for sending push notifications to browsers via VAPID.
- **ViaCEP:** Address auto-fill.
- **Recharts:** Data visualization.
- **Orval:** API client code generation.
- **jspdf & jspdf-autotable:** PDF generation.
- **xlsx:** Excel file generation.