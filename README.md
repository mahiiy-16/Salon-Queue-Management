# Salon Queue Management System (MSc IT Project)

A real-time, bilingual (English & Gujarati) web application designed to eliminate salon lobby crowding through virtual queue management, multi-service selection, and synchronized multi-screen updates.

---

## Technology Stack

- **Frontend:** React (v18.3.1), Vite (v5.4.11), TypeScript (v5.6.3), Tailwind CSS (v3.4.15), React Router (v6.28.0)
- **Backend:** Node.js (v24.x LTS), Express.js (v4.21.1), TypeScript (v5.6.3)
- **Database:** SQLite (`better-sqlite3` v11.5.0 with WAL mode enabled)
- **Real-Time:** Socket.IO (v4.8.1)
- **Design System:** Luxury Salon Theme — Dark Charcoal (`#1F2937`) & Gold (`#D4A017`)

---

## Project Structure

```text
Salon-Queue-Management/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # Reusable layout and UI components
│   │   ├── contexts/       # Language (EN/GU) and Socket.IO state
│   │   ├── locales/        # English (en.json) & Gujarati (gu.json) dictionaries
│   │   ├── pages/          # 7 Screen Route Shells
│   │   ├── App.tsx         # Route configurations
│   │   └── main.tsx        # React mount
│   └── package.json
├── server/                 # Backend Node.js / Express application
│   ├── src/
│   │   ├── config/         # SQLite DB & environment configuration
│   │   ├── routes/         # REST API routes (Health check)
│   │   ├── sockets/        # Socket.IO connection handler
│   │   ├── app.ts          # Express middleware & router mounting
│   │   └── index.ts        # Server entry point
│   ├── data/               # SQLite database file storage
│   └── package.json
├── docs/                   # Project specifications & rules
│   ├── 01-brief.md         # Problem statement, objectives, scope
│   ├── 02-screens.md       # 7-Screen UI/UX specification
│   └── 03-flows-rules.md   # Workflows, queue rules, test checklist
├── AGENTS.md               # AI development rules and guidelines
├── package.json            # Root dev runner (concurrently)
└── README.md               # Project guide
```

---

## Getting Started

### Prerequisites

- **Node.js:** v20.x or v24.x LTS
- **npm:** v10.x or higher

### 1. Installation

Install dependencies across the root, client, and server:

```bash
npm run install:all
```

### 2. Environment Setup

Create `.env` files from the example template:

```bash
cp .env.example .env
cp .env.example server/.env
cp .env.example client/.env
```

### 3. Running in Development

Start both the backend server and frontend development server concurrently:

```bash
npm run dev
```

- **Frontend:** [http://localhost:5173](http://localhost:5173)
- **Backend:** [http://localhost:5000](http://localhost:5000)
- **Health Check:** [http://localhost:5000/api/health](http://localhost:5000/api/health)

---

## Screen Routes (All 7 Screens)

| # | Screen | Route | Target User |
| :--- | :--- | :--- | :--- |
| 1 | **Home** | `/` | Customers (View queue length & barber statuses) |
| 2 | **Join Queue** | `/join` | Customers (Select services, barber & join line) |
| 3 | **My Status** | `/status/:id` | Customers (Live token tracking & turn alerts) |
| 4 | **Reception Dashboard** | `/reception` | Receptionist (Manage walk-ins & chair dispatch) |
| 5 | **Barber View** | `/barber/:name` | Barbers (Station timer & customer servicing) |
| 6 | **Waiting Area TV** | `/display` | Salon Lobby (Fullscreen TV queue board) |
| 7 | **Owner Settings** | `/admin` | Owner (Service pricing, barbers & master queue toggle) |

---
