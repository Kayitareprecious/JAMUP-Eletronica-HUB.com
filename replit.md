# JAMUP Eletrônica HUB — Website

## Project Overview
Full company website for JAMUP Eletrônica HUB LTD, an electronics repair and installation enterprise in Musanze, Rwanda. Includes public homepage, booking system, and a private admin dashboard for the 5 co-founders.

## Tech Stack
- **Frontend**: React 19 + TypeScript, Vite 6, Tailwind CSS v4, shadcn/ui, Framer Motion, Wouter, TanStack Query, Recharts
- **Backend**: Node.js + Express on port 3001, SQLite via better-sqlite3
- **Auth**: Custom JWT-based admin auth (no Clerk required), bcryptjs for password hashing

## Running the Project
Two workflows must both be running:
- **Start application**: `npm run dev` — Frontend on port 5000
- **Backend API**: `node server.js` — Express API on port 3001

## Key Files
- `src/App.tsx` — Main app: public routes + admin routes wrapped in AuthProvider
- `src/context/AuthContext.tsx` — JWT auth context (localStorage key: `jamup_admin`)
- `src/pages/AdminLoginPage.tsx` — Admin login form
- `src/pages/AdminRegisterPage.tsx` — Admin registration with email whitelist
- `src/pages/AdminDashboard.tsx` — Full dashboard (5 tabs: overview, bookings, clients, analytics, admins)
- `src/components/BookingModal.tsx` — Public repair booking form (posts to /api/book-repair)
- `server.js` — Express backend: auth, bookings, analytics, visit tracking
- `jamup.db` — SQLite database (auto-created at startup)
- `public/team.png` — Team graduation photo

## Admin System
- **Authorized emails** (hardcoded whitelist):
  - jabojulesmaurice@gmail.com
  - gasnamoses01@gmail.com
  - uwingabireange2003@gmail.com
  - uwajenezaernestine2002@gmail.com
  - kayitareprecious057@gmail.com
- Access admin portal at `/admin/login` and `/admin/register`
- JWT tokens stored in localStorage, sent as `Authorization: Bearer <token>`

## API Endpoints
- `POST /api/track-visit` — Log a page visit
- `POST /api/book-repair` — Submit a repair booking
- `POST /api/admin/login` — Admin login (returns JWT)
- `POST /api/admin/register` — Admin registration (whitelist enforced)
- `POST /api/admin/check-email` — Check if email is authorized and unregistered
- `GET /api/admin/clients` — Get all bookings + admin list (protected)
- `PATCH /api/admin/bookings/:id/status` — Update booking status (protected)
- `GET /api/admin/analytics` — Get analytics data (protected)

## Booking Status Values
`pending` → `in_progress` → `completed` | `denied` | `cancelled`

## Deployment
- Frontend: `npm run build` (output in `dist/`)
- Backend (`server.js`) must also run alongside the frontend
