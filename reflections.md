# Engineering Reflections & Technical Post-Mortem

**Project:** Salon Queue Management System (MSc IT Project)  
**Authors & Contributors:** Student & Engineering Agent (Google Antigravity)  
**Repository Root:** `/home/dell/Desktop/Salon-Queue-Management`  
**Date:** November 2026  

---

## Executive Summary

The **Salon Queue Management System** is a real-time, bilingual web application engineered to eliminate physical waiting room congestion in salons and barbershops through virtual queue dispatching, multi-service selection, dedicated barber chair operations, waiting room TV displays, and administrative controls.

Throughout the specification, prototyping, module implementation, integration auditing, database migration, and cloud deployment preparation, several significant technical challenges were encountered. This document reflects on each challenge faced, the technical root causes, how they were overcome, and key lessons learned.

---

## Table of Contents

1. [Architectural Planning & Specification Enforcement](#1-architectural-planning--specification-enforcement)
2. [Design System & Theme Synchronization](#2-design-system--theme-synchronization)
3. [Business Rules & Edge Case Enforcement](#3-business-rules--edge-case-enforcement)
4. [Bilingual Localization (English & Gujarati)](#4-bilingual-localization-english--gujarati)
5. [Database Architecture & Migration (SQLite WAL to Neon PostgreSQL)](#5-database-architecture--migration-sqlite-wal-to-neon-postgresql)
6. [Cloud Networking & IPv4/IPv6 Dual-Stack Resolution](#6-cloud-networking--ipv4ipv6-dual-stack-resolution)
7. [Real-Time Synchronization: Socket.IO vs Serverless Runtimes](#7-real-time-synchronization-socketio-vs-serverless-runtimes)
8. [Vercel Services Architecture & Monorepo Configuration](#8-vercel-services-architecture--monorepo-configuration)
9. [TypeScript Build Configurations & Entrypoint Scoping](#9-typescript-build-configurations--entrypoint-scoping)
10. [Key Takeaways for Future Projects](#10-key-takeaways-for-future-projects)

---

## 1. Architectural Planning & Specification Enforcement

### The Problem
During early project phases, AI coding agents often introduce "scope creep"—hallucinating unrequested features such as online payment gateways (Stripe/Razorpay), complex customer authentication/passwords, inventory tracking, or advance appointment calendars. Adding these would violate the project boundaries defined in the course syllabus and `docs/01-brief.md`.

### The Cause
General-purpose LLMs are biased toward generating boilerplate e-commerce or booking SaaS architectures unless strictly anchored to foundational documentation.

### How We Overcame It
- Authored [AGENTS.md](file:///home/dell/Desktop/Salon-Queue-Management/AGENTS.md) as a persistent set of instructions that governed every turn.
- Separated specifications into three authoritative documents:
  - [docs/01-brief.md](file:///home/dell/Desktop/Salon-Queue-Management/docs/01-brief.md): Boundaries and scope.
  - [docs/02-screens.md](file:///home/dell/Desktop/Salon-Queue-Management/docs/02-screens.md): Strict layout, button, and responsive behavior for exactly seven screens.
  - [docs/03-flows-rules.md](file:///home/dell/Desktop/Salon-Queue-Management/docs/03-flows-rules.md): 11 queue business rules and 16 test cases.
- Enforced a "One Feature at a Time" protocol with mandatory pre-step review and post-step reporting.

---

## 2. Design System & Theme Synchronization

### The Problem
The project started with a dark charcoal and gold luxury aesthetic (`#1F2937`, `#D4A017`). Midway through the project, the design vision was refined to a warm luxury salon palette featuring ivory, cream, and deep warm brown (`#FAF7F2`, `#4A3428`, `#A58B78`). Early prototypes had hardcoded hex values across several components, creating visual inconsistency.

### The Cause
Decentralized CSS utility classes and inline colors scattered across individual React component files.

### How We Overcame It
- Centralized all semantic color tokens in `tailwind.config.js`:
  - `salon-bg`: `#FAF7F2` (Warm Ivory)
  - `salon-card`: `#FFFFFF` (Pure White Card Surface)
  - `salon-primary`: `#4A3428` (Deep Warm Espresso)
  - `salon-gold`: `#A58B78` (Warm Muted Gold / Taupe Accent)
  - `salon-border`: `#E8E2D9` (Delicate Cream Border)
- Audited and updated shared components (`AppLayout`, `LanguageToggle`, `QueueCard`) first, ensuring downstream screen implementations inherited the design system consistently.
- Curated high-resolution royalty-free salon interior and hairstyle photographs in `client/public/images/` with full attribution to replace placeholder boxes.

---

## 3. Business Rules & Edge Case Enforcement

### The Problem
Queue systems have complex state transitions. During module testing, several edge-case vulnerabilities emerged:
1. Customers could attempt to select 4 or more services.
2. The same phone number could register multiple simultaneous waiting tickets.
3. Receptionists or barbers could call a customer while a barber's chair was already occupied.
4. Barbers on break could be inadvertently assigned customers.
5. Online queue joining needed to automatically close 30 minutes before salon closing, while still permitting receptionist walk-ins.

### The Cause
Relying solely on client-side form validation allowed race conditions or bypassed checks when requests hit backend endpoints directly.

### How We Overcame It
- **Centralized Validation:** Encoded the 11 business rules from `docs/03-flows-rules.md` on both backend Express routes and client forms.
- **Capacity Guard (Rule 4):** In `/api/queue/call-next` and `/api/queue/ticket/:id/start`, added database queries checking for existing `In Chair` status for that barber. If occupied, the request is rejected with `HTTP 400` and an explicit error message.
- **Strict Barber Affinity (Rule 3):** When a customer selects a specific preferred barber, the queue dispatch query strictly matches `preferred_barber == barber_id`. Customers who choose "Any Barber" can be called by any available barber, preserving strict First-Come, First-Served (FCFS) order.
- **Active Phone De-duplication (Rule 5):** Added an active-ticket lookup before token creation:
  ```sql
  SELECT id, token, status FROM queue_tickets 
  WHERE phone = $1 AND status IN ('Waiting', 'Called', 'In Chair')
  ```
- **Walk-in Cutoff Exception (Rules 9 & 10):** Added an `isWalkIn` flag in the payload; the master queue cutoff rejects remote web requests while allowing receptionist walk-in registrations.

---

## 4. Bilingual Localization (English & Gujarati)

### The Problem
Initial screen mockups contained hardcoded English text inside JSX tags. When switching to Gujarati, certain components either did not update, truncated lengthy Gujarati strings, or broke flexbox layouts due to font size differences.

### The Cause
Absence of a centralized translation dictionary and missing Gujarati string mappings for status badges, validation toasts, and time formatting.

### How We Overcame It
- Created `client/src/locales/en.json` and `client/src/locales/gu.json` with matching key hierarchies for all seven screens (`home`, `join`, `status`, `reception`, `barber`, `tv`, `admin`).
- Built a lightweight, zero-dependency `LanguageContext` (`LanguageProvider`, `useLanguage`) that stores the user's preference in `localStorage` and provides a translation helper function `t(key)`.
- Replaced all JSX text with `t(...)` lookups and added a dynamic toggle (`EN | ગુજરાતી`) in the shared header.
- Verified that Gujarati Unicode characters render cleanly with appropriate line heights and responsive padding.

---

## 5. Database Architecture & Migration (SQLite WAL to Neon PostgreSQL)

### The Problem
The project initially used local SQLite with `better-sqlite3` and Write-Ahead Logging (WAL). While ideal for zero-configuration local desktop development, deploying to serverless cloud environments (like Vercel) causes SQLite database state to reset whenever serverless instances recycle. Migrating to cloud PostgreSQL (Neon) was required, but posed several challenges:
1. SQL dialect discrepancies: Parameter markers (`?` in SQLite vs `$1, $2` in `pg`).
2. Upsert syntax (`INSERT OR REPLACE` in SQLite vs `ON CONFLICT (key) DO UPDATE` in PostgreSQL).
3. Date filtering functions (`DATE('now')` vs `CURRENT_DATE`).
4. Asynchronous vs Synchronous APIs (`better-sqlite3` is synchronous `.run()`, `.get()`, `.all()`, whereas `pg.Pool` is asynchronous `await pool.query(...)`).

### The Cause
SQLite and PostgreSQL have fundamentally different connection models and SQL syntax dialects.

### How We Overcame It
- **Safe Pre-Migration Backup:** Created a complete snapshot of `server/data/` at `server/backup/data_sqlite_backup_20261124_211413/` prior to any code edits.
- **Universal Database Abstraction Layer:** In [server/src/config/db.ts](file:///home/dell/Desktop/Salon-Queue-Management/server/src/config/db.ts), implemented a unified async `query(sql, params)` and `queryOne(sql, params)` abstraction.
- **Dual Mode Support:**
  - If `DATABASE_URL` is provided, `dbMode = 'postgres'` activates `pg.Pool` with SSL.
  - If `DATABASE_URL` is empty, `dbMode = 'sqlite'` activates local SQLite with SQL translation fallbacks for offline development.
- **Asynchronous Route Refactoring:** Converted every handler in [server/src/routes/salon.ts](file:///home/dell/Desktop/Salon-Queue-Management/server/src/routes/salon.ts), [server/src/routes/queue.ts](file:///home/dell/Desktop/Salon-Queue-Management/server/src/routes/queue.ts), and [server/src/routes/health.ts](file:///home/dell/Desktop/Salon-Queue-Management/server/src/routes/health.ts) to `async/await` with safe parameterized queries.
- **Automated Schema & Seed Initialization:** Added `initDatabase()` that automatically creates `services`, `barbers`, `queue_tickets`, and `settings` tables and seeds default records upon first connection.

---

## 6. Cloud Networking & IPv4/IPv6 Dual-Stack Resolution

### The Problem
During initial connection tests to Neon PostgreSQL (`ep-sample-pool...neon.tech:5432`), connection attempts repeatedly timed out with `ETIMEDOUT` across multiple IP addresses. Direct TCP checks to port 5432 failed, even though port 443 succeeded.

### The Cause
Under Node.js v20/v24 on Linux, the default DNS resolution order is `verbatim` (attempting IPv6 `AAAA` records before IPv4 `A` records). If the local network or ISP lacks native IPv6 routing to AWS/Neon data centers, connections hang trying to reach the IPv6 endpoints (`2600:1f16:...:5432`) until timing out, before failing over to IPv4.

### How We Overcame It
- Tested DNS lookups and found that Neon returned both IPv6 and IPv4 addresses.
- Confirmed that direct IPv4 socket connections to Neon connected in under 200ms.
- Added DNS resolution prioritization at the top of [server/src/config/db.ts](file:///home/dell/Desktop/Salon-Queue-Management/server/src/config/db.ts):
  ```typescript
  import dns from 'dns';
  if (typeof dns.setDefaultResultOrder === 'function') {
    dns.setDefaultResultOrder('ipv4first');
  }
  ```
- Configured connection pooling parameters (`max: 10`, `connectionTimeoutMillis: 10000`) and SSL options (`rejectUnauthorized: false`) suitable for Neon cloud pooling.
- Connection tests and health checks immediately turned green (`{ healthy: true, type: 'PostgreSQL (Neon)' }`).

---

## 7. Real-Time Synchronization: Socket.IO vs Serverless Runtimes

### The Problem
The specification calls for real-time synchronization across screens (e.g. when a receptionist calls a ticket, the TV flashes gold, the barber chair updates, and the customer's phone displays "It's Your Turn" within 5 seconds without manual refresh).
However, Vercel Serverless Functions are stateless and spin down between requests; long-lived persistent WebSocket connections (`ws://` / `wss://`) cannot remain continuously open on standard serverless tiers.

### The Cause
Serverless execution models decouple compute from persistent network socket lifecycles.

### How We Overcame It
- **Dual-Sync Strategy in [client/src/contexts/SocketContext.tsx](file:///home/dell/Desktop/Salon-Queue-Management/client/src/contexts/SocketContext.tsx):**
  1. **Persistent Mode (Local Dev / Dedicated Server):** Socket.IO connects via WebSocket/polling and broadcasts instant events (`queue:updated`, `CUSTOMER_CALLED`, `SERVICE_STARTED`, `SERVICE_COMPLETED`).
  2. **Serverless Fallback Mode (Vercel):** When deployed to Vercel Serverless, `SocketContext` automatically activates a background reactive polling timer every **4 seconds** (`POLL_SYNC`).
- **Standard Compliance:** This 4-second interval strictly satisfies the project requirement in `AGENTS.md` and `docs/03-flows-rules.md` (which permits fallback short polling $\le 5\text{s}$) while guaranteeing zero dropped updates.

---

## 8. Vercel Services Architecture & Monorepo Configuration

### The Problem
Deploying a fullstack repository containing both a Vite frontend and an Express backend can lead to routing conflicts, CORS errors, or fragmented deployments if configured as two separate unrelated projects. The user specifically required the official **Vercel Services** model (two services inside a single Vercel project).

### The Cause
Vercel's legacy monorepo model required separate projects or URL rewrites pointing to external domains. The modern Vercel Services specification requires explicit `services` definitions and object-based rewrite destinations.

### How We Overcame It
- Implemented the official top-level [vercel.json](file:///home/dell/Desktop/Salon-Queue-Management/vercel.json):
  ```json
  {
    "$schema": "https://openapi.vercel.sh/vercel.json",
    "services": {
      "client": {
        "root": "client",
        "framework": "vite"
      },
      "salon-queue-server": {
        "root": "server",
        "framework": "express",
        "entrypoint": "api/index.ts"
      }
    },
    "rewrites": [
      {
        "source": "/api/(.*)",
        "destination": { "service": "salon-queue-server" }
      },
      {
        "source": "/(.*)",
        "destination": { "service": "client" }
      }
    ]
  }
  ```
- **Same-Domain Benefits:** Both frontend and backend share the same public domain. The frontend calls relative `/api/...` paths, eliminating cross-origin preflight requests (`OPTIONS`) and CORS failures.
- **Service Isolation:** Frontend receives static client assets, while `DATABASE_URL` remains isolated strictly to the `salon-queue-server` backend service.

---

## 9. TypeScript Build Configurations & Entrypoint Scoping

### The Problem
During verification of the Vercel Services entrypoint, two test commands exited with code 1:
1. `node -e "import('./dist/api/index.js')"` failed because `server/tsconfig.json` only included `"src/**/*"`, meaning `server/api/index.ts` was not being compiled into `dist/`.
2. A subsequent test assertion evaluated `app._router.stack` before Express had initialized its internal router, throwing a TypeError.

### The Cause
- `tsconfig.json` compilation scope did not match the directory layout of the newly added service entrypoint.
- Test assertions inspected internal Express private properties (`_router`) rather than testing public API behavior (`app.handle` or HTTP requests).

### How We Overcame It
- Updated [server/tsconfig.json](file:///home/dell/Desktop/Salon-Queue-Management/server/tsconfig.json) to include both `"src/**/*"` and `"api/**/*"`:
  ```json
  "include": ["src/**/*", "api/**/*"]
  ```
- Updated `server/package.json` `"start"` script to `"node dist/src/index.js"` to align with the compiled directory tree.
- Tested the exported Express instance using real HTTP requests (`http.createServer(app).listen(...)`), confirming that all endpoints (`/api/health`, `/api/salon/status`, `/api/salon/services`, `/api/salon/barbers`, `/api/queue/all`, `/api/queue/join`) returned `HTTP 200`/`201` with valid JSON payloads.

---

## 10. Key Takeaways for Future Projects

1. **Invest Early in Documentation & Rules:** Clear specifications (`AGENTS.md`, `01-brief.md`, `02-screens.md`, `03-flows-rules.md`) saved dozens of hours by providing unambiguous acceptance criteria for every screen and endpoint.
2. **Defensive Database Design:** Isolating queries behind a database helper module made migrating from SQLite to Neon PostgreSQL straightforward, as business logic routes did not directly manipulate low-level database drivers.
3. **Be Aware of Node.js DNS Semantics in Cloud Environments:** Default IPv6 preference can cause mysterious connection timeouts when targeting cloud endpoints from environments with partial IPv6 routing. `dns.setDefaultResultOrder('ipv4first')` is a critical safeguard.
4. **Design for Serverless State Realities:** Applications relying on WebSockets must include client-side reactive polling fallbacks if serverless deployment is anticipated.
5. **Treat Verification Failures as Diagnostic Clues:** Investigating failed test exit codes rather than ignoring them uncovered a compilation scope gap in `tsconfig.json` before code was ever pushed to production.

---

*End of Reflections.*
