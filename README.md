# Salon Queue Management System (MSc IT Project)

A real-time, bilingual (English & Gujarati) salon queue management application designed to eliminate salon lobby crowding through remote virtual queue registration, multi-service selection, barber station servicing, lobby TV displays, and administrative controls.

---

## Technology Stack

- **Frontend:** React (v18.3.1), Vite (v5.4.11), TypeScript (v5.6.3), Tailwind CSS (v3.4.15), React Router (v6.28.0)
- **Backend:** Node.js (v24.x LTS), Express.js (v4.21.1), TypeScript (v5.6.3)
- **Database:** PostgreSQL (Neon PostgreSQL Free via `pg` connection pool with SSL) / SQLite fallback
- **Real-Time Communication:** Socket.IO (v4.8.1) with 4-second reactive polling fallback for serverless architectures
- **Design System:** Luxury Salon Theme — Ivory, Cream & Deep Brown (`#FAF7F2`, `#4A3428`, `#A58B78`)

---

## Hosting Architecture

- **Frontend:** Vercel Free (Single Page Application with SPA routing and edge CDN caching)
- **Backend:** Vercel Services / Serverless Functions (`/api` handler) or persistent Node.js server
- **Database:** Neon PostgreSQL Free (`DATABASE_URL` with SSL connection pooling)

---

## Project Structure

```text
Salon-Queue-Management/
├── api/                        # Vercel Serverless Function entry point (/api/index.ts)
├── client/                     # Frontend React + Vite application
│   ├── public/                 # Static assets & royalty-free salon photos
│   │   ├── images/             # Salon interior & hairstyle photographs
│   │   │   ├── hairstyles/     # Haircut, beard, facial, hairwash photos
│   │   │   └── ATTRIBUTION.md  # Unsplash license & image documentation
│   ├── src/
│   │   ├── components/         # Reusable AppLayout, LanguageToggle, etc.
│   │   ├── contexts/           # LanguageContext (EN/GU) & SocketContext (with fallback polling)
│   │   ├── lib/                # api.ts (Environment-aware API & socket URLs)
│   │   ├── locales/            # en.json & gu.json translation dictionaries
│   │   ├── pages/              # 7 Full Screen Modules
│   │   ├── App.tsx             # Route declarations
│   │   └── main.tsx            # Application entry
│   ├── vercel.json             # Vercel SPA routing and asset caching configuration
│   └── package.json
├── server/                     # Backend Express + PostgreSQL / Socket.IO application
│   ├── src/
│   │   ├── config/             # PostgreSQL connection pool (pg.Pool) & env loader
│   │   ├── routes/             # REST API routers (health, salon, queue)
│   │   ├── sockets/            # Socket.IO event broadcaster
│   │   ├── app.ts              # Express middleware, CORS & route mounting
│   │   └── index.ts            # HTTP server bootstrap
│   ├── backup/                 # Archived SQLite backup snapshots
│   └── package.json
├── docs/                       # Project specifications
│   ├── 01-brief.md             # Problem statement, objectives, scope boundaries
│   ├── 02-screens.md           # 7-Screen UI/UX comprehensive specification
│   └── 03-flows-rules.md       # 11 Queue rules, wait-time formula, 16 test cases
├── .env.example                # Documented environment variables template
├── AGENTS.md                   # Agent development guidelines
├── package.json                # Root runner scripts
└── README.md                   # This project guide
```

---

## Local Development Guide

### Prerequisites
- **Node.js:** v20.x or v24.x LTS
- **npm:** v10.x or higher

### 1. Installation
Install all dependencies across the root, client, and server workspaces:
```bash
npm run install:all
```

### 2. Configure Environment Variables
Copy `.env.example` to the appropriate directories:
```bash
cp .env.example .env
cp .env.example server/.env
cp .env.example client/.env
```

To connect to your Neon PostgreSQL database:
Set `DATABASE_URL` in `server/.env`:
```env
DATABASE_URL=postgresql://neondb_owner:npg_password@ep-sample-pool-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
```
*(If left empty, the server automatically uses local SQLite in WAL mode for zero-setup local offline development).*

### 3. Start Local Servers
Run both backend (port 5000) and frontend (port 5173) concurrently:
```bash
npm run dev
```

### 4. Local URLs
- **Customer Home:** [http://localhost:5173/](http://localhost:5173/)
- **Join Virtual Queue:** [http://localhost:5173/join](http://localhost:5173/join)
- **Live Ticket Status:** [http://localhost:5173/status/S-01](http://localhost:5173/status/S-01)
- **Receptionist Dashboard:** [http://localhost:5173/reception](http://localhost:5173/reception)
- **Barber Station View:** [http://localhost:5173/barber/vikram](http://localhost:5173/barber/vikram)
- **Waiting Area TV Display:** [http://localhost:5173/display](http://localhost:5173/display)
- **Owner Admin Settings:** [http://localhost:5173/admin](http://localhost:5173/admin)
- **Backend API Health Check:** [http://localhost:5000/api/health](http://localhost:5000/api/health)

---

## Database Migration & Compatibility (Neon PostgreSQL)

1. **Schema & Tables:**
   - `services`: Salon services, bilingual names (`name_en`, `name_gu`), duration, price, active state.
   - `barbers`: Barber roster, chairs (`Chair 1`..`4`), specialization, on-duty, on-break.
   - `queue_tickets`: Tokens (`S-01`), customer name, phone, preferred/assigned barber, service IDs, timestamps, status (`Waiting`, `Called`, `In Chair`, `Done`, `Cancelled`, `No-show`).
   - `settings`: Salon settings (`queue_open`, `closing_time`).
2. **Automatic Initialization:**
   - When the backend connects to Neon PostgreSQL, tables and default seed data are created automatically if not already present.
3. **Data Safety:**
   - All SQL queries use safe parameterized placeholders (`$1, $2, ...`) via `pg.Pool`.
   - SQLite data was safely backed up prior to migration at `server/backup/data_sqlite_backup_20261124_211413`.

---

## Production Deployment to Vercel

### Step 1: Create Free Database on Neon
1. Go to [https://neon.tech](https://neon.tech) and create a free project (`neondb`).
2. Copy your connection string (`postgresql://neondb_owner:password@ep-xyz.neon.tech/neondb?sslmode=require`).

### Step 2: Deploy Frontend on Vercel
1. Import the repository into Vercel.
2. Set Root Directory to `client`.
3. Framework Preset: `Vite`.
4. Set Environment Variables:
   - `VITE_API_URL`: Your deployed backend URL.
   - `VITE_SOCKET_URL`: Your deployed backend URL.
5. Deploy.

### Step 3: Deploy Backend on Vercel
1. Import the repository or deploy the API root.
2. Set Environment Variables:
   - `DATABASE_URL`: Your Neon PostgreSQL connection string.
   - `CLIENT_URL`: Your deployed frontend Vercel URL.
   - `NODE_ENV`: `production`.
3. Deploy.

---

## Socket.IO & Vercel Serverless Architecture Note

Vercel Functions are stateless and serverless. Standard WebSocket connections (`ws://`) terminate when serverless execution finishes. 
To guarantee 100% reliable real-time synchronization on Vercel:
- **Dual-Sync Strategy:** The frontend features automated reactive polling fallback (every 4 seconds) whenever a persistent WebSocket connection is inactive.
- If WebSocket connections are active (e.g. local development or persistent Node.js hosting), events trigger instantly. In serverless environments, state updates synchronize within 4 seconds without user interaction or manual page refreshes.
