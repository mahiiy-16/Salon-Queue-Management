# Salon Queue Management System (MSc IT Project)

A real-time, bilingual (English & Gujarati) salon queue management application designed to eliminate salon lobby crowding through remote virtual queue registration, multi-service selection, barber station servicing, lobby TV displays, and administrative controls.

---

## Technology Stack

- **Frontend:** React (v18.3.1), Vite (v5.4.11), TypeScript (v5.6.3), Tailwind CSS (v3.4.15), React Router (v6.28.0)
- **Backend:** Node.js (v24.x LTS), Express.js (v4.21.1), TypeScript (v5.6.3)
- **Database:** SQLite (`better-sqlite3` v11.5.0 with WAL mode enabled)
- **Real-Time Communication:** Socket.IO (v4.8.1)
- **Design System:** Luxury Salon Theme — Ivory, Cream & Deep Brown (`#FAF7F2`, `#4A3428`, `#A58B78`)

---

## Project Structure

```text
Salon-Queue-Management/
├── client/                     # Frontend React + Vite application
│   ├── public/                 # Static assets & royalty-free salon photos
│   │   ├── images/             # Salon interior & hairstyle photographs
│   │   │   ├── hairstyles/     # Haircut, beard, facial, hairwash photos
│   │   │   └── ATTRIBUTION.md  # Unsplash license & image documentation
│   ├── src/
│   │   ├── components/         # Reusable AppLayout, LanguageToggle, etc.
│   │   ├── contexts/           # LanguageContext (EN/GU) & SocketContext
│   │   ├── lib/                # api.ts (Environment-aware API & socket URLs)
│   │   ├── locales/            # en.json & gu.json translation dictionaries
│   │   ├── pages/              # 7 Full Screen Modules
│   │   ├── App.tsx             # Route declarations
│   │   └── main.tsx            # Application entry
│   ├── vercel.json             # Vercel SPA routing and asset caching configuration
│   └── package.json
├── server/                     # Backend Express + Socket.IO application
│   ├── src/
│   │   ├── config/             # SQLite connection (WAL mode) & env loader
│   │   ├── routes/             # REST API routers (health, salon, queue)
│   │   ├── sockets/            # Socket.IO event broadcaster
│   │   ├── app.ts              # Express middleware, CORS & route mounting
│   │   └── index.ts            # HTTP server bootstrap
│   ├── data/                   # SQLite database storage directory
│   └── package.json
├── docs/                       # Project specifications
│   ├── 01-brief.md             # Problem statement, objectives, scope boundaries
│   ├── 02-screens.md           # 7-Screen UI/UX comprehensive specification
│   └── 03-flows-rules.md       # 11 Queue rules, wait-time formula, 16 test cases
├── render.yaml                 # Render Infrastructure-as-Code with Persistent Disk
├── .env.example                # Documented environment variables template
├── AGENTS.md                   # Agent development guidelines
├── package.json                # Root concurrently runner
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

## Production Deployment Guide

The application is architectured for deployment across two modern hosting platforms:
- **Frontend (Client):** Vercel (Global Edge CDN for fast single-page app delivery)
- **Backend (Server):** Render (Node.js Web Service with WebSocket & Persistent Disk support)

---

### Step 1: Deploy Backend on Render

1. Log in to your [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** $\rightarrow$ **Web Service** (or connect via Blueprint using `render.yaml`).
3. Connect your Git repository.
4. Configure the Web Service settings:
   - **Name:** `salon-queue-server`
   - **Root Directory:** `server`
   - **Environment:** `Node`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm run start`
   - **Health Check Path:** `/api/health`
5. Configure Environment Variables:
   - `NODE_ENV`: `production`
   - `PORT`: `10000` (Render defaults to 10000)
   - `DB_PATH`: `/var/data/salon_queue.sqlite`
   - `CLIENT_URL`: `https://your-salon-frontend.vercel.app` (Set to your actual Vercel domain)
6. **Crucial — Persistent Disk Setup:**
   - Under the service settings, navigate to **Disks** $\rightarrow$ **Add Disk**.
   - **Name:** `salon-sqlite-data`
   - **Mount Path:** `/var/data`
   - **Size:** `1 GB`
   > **Why a Persistent Disk is Required:** SQLite writes to a local file. Free/ephemeral server instances lose their filesystem state on restart or redeployment. Attaching a persistent disk ensures your salon tickets, barbers, services, and daily statistics survive restarts indefinitely.
7. Click **Create Web Service**. Note your deployed backend URL (e.g. `https://salon-queue-server.onrender.com`).

---

### Step 2: Deploy Frontend on Vercel

1. Log in to your [Vercel Dashboard](https://vercel.com/).
2. Click **Add New...** $\rightarrow$ **Project**.
3. Import your Git repository.
4. Configure project settings:
   - **Framework Preset:** `Vite`
   - **Root Directory:** Edit and select `client`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
5. Configure Environment Variables in Vercel:
   - `VITE_API_URL`: `https://salon-queue-server.onrender.com` (Your Render backend URL)
   - `VITE_SOCKET_URL`: `https://salon-queue-server.onrender.com` (Your Render backend URL)
6. Click **Deploy**.
7. Vercel automatically honors `client/vercel.json`, ensuring all client-side routes (`/join`, `/status/:id`, `/reception`, `/barber/:name`, `/display`, `/admin`) resolve to `index.html` on direct URL access or page refresh.

---

### Step 3: Complete CORS Handshake
After Vercel assigns your production URL (e.g., `https://salon-queue-management.vercel.app`):
1. Go back to Render $\rightarrow$ `salon-queue-server` $\rightarrow$ **Environment**.
2. Update `CLIENT_URL` to match your Vercel URL.
3. Save changes. Render will redeploy with the updated CORS policy.

---

## 7 Application Screens Summary

| # | Screen | Route | Target User | Key Functionality |
|---|---|---|---|---|
| 1 | **Home** | `/` | Customers | Live queue volume, ETA, barber availability badges, photo service catalog |
| 2 | **Join Queue** | `/join` | Customers | 1–3 service picker, barber preference, 10-digit phone regex, token generation |
| 3 | **My Status** | `/status/:id` | Customers | Live token tracking, FCFS wait countdown, "Start Coming" (#2) and "Your Turn" alerts |
| 4 | **Reception** | `/reception` | Receptionists | Station overview, Call Next, No-Show, Cancel spot, walk-in registration, >60m alert |
| 5 | **Barber View** | `/barber/:name` | Barbers | Station timer stopwatch, Start/Done controls, single-chair limit, Break toggle |
| 6 | **Waiting TV** | `/display` | Lounge / TV | 16:9 large display, Now Serving chairs, top 5 Up Next tokens, 10s gold flash chime |
| 7 | **Owner Settings** | `/admin` | Salon Owner | Service CRUD, barber duty roster, online queue master switch, daily analytics |

---

## Licences & Attributions

All photographic assets stored in `client/public/images/` are licensed under the **Unsplash Free Licence** (royalty-free for commercial & personal use). Detailed attribution is documented in [`client/public/images/ATTRIBUTION.md`](client/public/images/ATTRIBUTION.md).
