# AGENTS.md — AI Agent Development Guidelines & Instructions

> **Project:** Salon Queue Management System (MSc IT Project)  
> **Repository Root:** `/home/dell/Desktop/Salon-Queue-Management`  
> **Status:** Active Architecture & Development Phase

---

## 1. Project Summary

The **Salon Queue Management System** is a real-time web application engineered to streamline queue operations for salons and barbershops. It replaces chaotic waiting rooms and manual registers with a synchronized, dual-language digital workflow.

### Core Capabilities:
- **Remote Queue Joining:** Customers can check live wait times and enter the virtual queue from their phone or computer.
- **Service & Stylist Customization:** Customers can select 1 to 3 services and choose a specific preferred barber or the fastest option ("Any Barber").
- **Live Ticket Tracking:** Real-time queue position tracking with proactive alerts ("Start Coming" when at position 2, and "It's Your Turn" when called).
- **Front-Desk Walk-In Management:** Receptionists can register walk-in clients into the shared queue and oversee shop throughput.
- **Barber Station Control:** Dedicated chair view with service countdown timers, client call triggers, and service completion controls.
- **Lobby TV Display:** Fullscreen waiting room dashboard displaying "Now Serving" chairs and "Up Next" tokens with gold flashing callouts.
- **Owner Administration:** Controls for service pricing/durations, barber rosters and breaks, master queue open/close switch, and daily metrics.
- **Bilingual Accessibility:** Complete English and Gujarati localization across all screens.

---

## 2. Technology Stack

To ensure a maintainable, high-performance architecture, the project utilizes the following standard stack:

- **Frontend:** React.js / Next.js (App Router or Pages Router) with modern modular architecture.
- **Styling:** Tailwind CSS (configured with the dark charcoal and gold luxury theme tokens).
- **Icons:** Lucide React icons.
- **Backend / API:** Node.js (Next.js Route Handlers / Express.js) or Supabase/Firebase backend services.
- **Database & State Synchronization:** PostgreSQL / Supabase with real-time subscriptions, or WebSocket / Server-Sent Events (SSE) with fallback short polling (<= 5s interval).
- **Localization:** React-i18next / custom context dictionary supporting English (`en`) and Gujarati (`gu`).
- **Validation:** Zod / standard schema validation on both client and server.

---

## 3. Mandatory Documentation Review

**CRITICAL INSTRUCTION FOR ALL AI AGENTS:**  
Before writing any code, modifying existing modules, or proposing architecture, you **MUST** read and adhere to all three foundational project specification documents located in `/docs`:

1. **[docs/01-brief.md](file:///home/dell/Desktop/Salon-Queue-Management/docs/01-brief.md):** Project problem statement, objectives, target user personas, must-have features, explicitly excluded features, and project scope boundaries.
2. **[docs/02-screens.md](file:///home/dell/Desktop/Salon-Queue-Management/docs/02-screens.md):** The definitive UI/UX blueprint for **all seven (7) screens** (Home, Join Queue, My Status, Reception Dashboard, Barber View, Waiting Area TV, Owner Settings), covering layout, buttons, actions, validations, empty states, loading states, and responsive breakpoints.
3. **[docs/03-flows-rules.md](file:///home/dell/Desktop/Salon-Queue-Management/docs/03-flows-rules.md):** The complete business logic engine, covering remote customer flows, walk-in flows, the 6 queue statuses, the 11 queue business rules, the waiting time formula, real-time sync standards, and the 16-point test checklist.

---

## 4. Expected Project Folder Structure

Maintain a clean, scalable separation of concerns:

```text
Salon-Queue-Management/
├── AGENTS.md                     # Agent development instructions (this document)
├── docs/                         # Foundational project specifications
│   ├── 01-brief.md               # Project brief & scope
│   ├── 02-screens.md             # 7 Screen UI/UX specifications
│   └── 03-flows-rules.md         # Business logic, queue rules, test checklist
├── src/                          # Application source code
│   ├── components/               # Reusable React components
│   │   ├── common/               # Buttons, Inputs, Cards, Modals, Badges, LanguageToggle
│   │   ├── customer/             # ServiceSelector, BarberSelector, QueueSummaryCard, TokenStatusCard
│   │   ├── reception/            # BarberChairsGrid, WalkInForm, WaitingQueueTable, HighWaitAlert
│   │   ├── barber/               # StationTimer, CurrentServingCard, UpNextPreview
│   │   └── display/              # TvNowServingCard, TvUpNextList, GoldFlashAlert
│   ├── pages/ (or app/)          # Application route screens (Exactly 7 routes)
│   │   ├── index                 # Screen 1: Home (/)
│   │   ├── join                  # Screen 2: Join Queue (/join)
│   │   ├── status/[id]           # Screen 3: My Status (/status/:id)
│   │   ├── reception             # Screen 4: Reception Dashboard (/reception)
│   │   ├── barber/[name]         # Screen 5: Barber View (/barber/:name)
│   │   ├── display               # Screen 6: Waiting Area TV (/display)
│   │   └── admin                 # Screen 7: Owner Settings (/admin)
│   ├── lib/ (or utils/)          # Centralized business logic & helpers
│   │   ├── queueLogic.ts         # Pure functions for queue dispatch, FCFS sorting, eligibility
│   │   ├── waitTime.ts           # Standard wait-time formula implementation
│   │   ├── validations.ts        # Phone regex (10 digits), service limits (1-3)
│   │   └── constants.ts          # Color tokens, status enums, salon operating hours
│   ├── locales/                  # Bilingual translation dictionaries
│   │   ├── en.json               # English strings
│   │   └── gu.json               # Gujarati strings (ગુજરાતી)
│   ├── contexts/                 # Global state (QueueContext, LanguageContext, AuthContext)
│   └── styles/                   # Tailwind CSS global styles & animations
```

---

## 5. UI Design Rules & Aesthetic Standards

Every component and screen must strictly conform to the **premium luxury salon aesthetic**:

- **Color Palette:**
  - **Main Background (Charcoal):** `#1F2937`
  - **Surface / Card Background:** `#111827`
  - **Borders & Dividers:** `#374151`
  - **Primary Metallic Accent (Gold):** `#D4A017`
  - **Hover / Active Gold:** `#B8860B` / `#F59E0B`
  - **Text Primary (High Contrast):** `#F9FAFB`
  - **Text Muted:** `#9CA3AF`
  - **Status Indicators:**
    - Active / Available: `#10B981` (Emerald green)
    - Busy / In-Service: `#D4A017` (Gold)
    - On Break / Inactive: `#6B7280` (Neutral gray)
    - Delayed Alert (>60 mins): `#EF4444` (Crimson red)
- **Container Styling:** Rounded cards (`border-radius: 12px` / `rounded-xl`) with subtle charcoal borders.
- **Button Conventions:**
  - Primary Action: Solid gold background (`#D4A017`) with bold dark charcoal text (`#111827`).
  - Secondary Action: Charcoal background with gold border and gold text.
  - Danger / Cancel: Charcoal background with red border and red text.
  - **Rule:** Never leave non-functional buttons or placeholder `onClick={() => {}}`. Every button must trigger its documented action, state change, or modal.
- **Responsiveness:**
  - Mobile-first layouts for Customer views (`/`, `/join`, `/status/:id`).
  - Tablet/Desktop split-screen for Reception (`/reception`) and Owner (`/admin`).
  - 1080p/4K TV widescreen optimization for Waiting Area TV (`/display`).

---

## 6. Bilingual Language Requirements (English & Gujarati)

- **Complete Localization:** Every label, placeholder, button, notification banner, status badge, and validation message must support both **English** and **Gujarati (ગુજરાતી)**.
- **Dynamic Language Toggle:** A clean language switcher (`EN | ગુજરાતી`) must be accessible on every screen.
- **Persistence:** User's selected language must persist across page navigation.
- **Proper Font Rendering:** Ensure typography properly renders Gujarati Unicode scripts without truncation or visual distortion.
- **Centralized Dictionaries:** Keep all translations structured in locale dictionaries (`en.json` and `gu.json`). Never hardcode localized strings directly inside JSX.

---

## 7. Coding Standards & Architectural Boundaries

- **Separation of Concerns:** Keep frontend presentation components strictly separated from backend APIs, database access, and core domain business logic.
- **Reusable React Components:** Break UI down into modular components under `src/components/` (e.g., `QueueCard`, `StatusBadge`, `LanguageToggle`). Files should remain clean and maintainable (< 250–300 lines).
- **Centralized Business Rules:** Queue sorting, FCFS rules, dispatch logic, and wait time calculations must reside in centralized helper modules (`src/lib/queueLogic.ts`, `src/lib/waitTime.ts`). Do not duplicate logic inside UI components.
- **Backend Validation:** Always validate critical data on the backend (API routes/controllers) even if client-side validation is present (e.g., 10-digit phone regex, 3-service max limit, single active ticket per phone).
- **TypeScript & Type Safety:** Define clear interfaces for `Customer`, `Service`, `Barber`, `QueueTicket`, and `QueueStatus`. Avoid using `any`.
- **Clean State Management:** Ensure UI state updates optimistically or reactively without requiring full-page browser reloads.

---

## 8. Business Rule Implementation Instructions

Agents implementing queue logic must strictly encode the rules from `docs/03-flows-rules.md`:

1. **First-Come, First-Served (FCFS):** Queue ordering is strictly chronological based on join timestamp.
2. **Call Next Logic:** When a barber calls next, select the earliest customer in queue where `preferred_barber == barber_id` OR `preferred_barber == "any"`.
3. **Barber Affinity Enforcement:** Never assign a customer with a specific barber preference to any other barber.
4. **Single Chair Capacity:** A barber can only have one customer in `In Chair` status. "Start" is disabled if chair is occupied.
5. **Phone Number Uniqueness:** Reject new queue entries if an active ticket (`Waiting`, `Called`, `In Chair`) exists for that phone number.
6. **Max 3 Services:** Enforce selection of between 1 and 3 services. Block the 4th.
7. **10-Minute No-Show Rule:** If a called customer does not arrive within 10 minutes, allow receptionist/barber to mark them `No-show`.
8. **No-Show Reset:** A customer marked `No-show` who rejoins receives a brand-new token and is placed at the end of the line.
9. **Online Queue Cutoff:** Block remote queue joining (`/join`) 30 minutes before salon closing.
10. **Walk-In Availability:** Allow receptionists to continue adding walk-in customers even after the online cutoff.
11. **Barber on Break Alert:** If a selected barber is on break, display a prominent warning banner regarding potential delays.
12. **Wait Time Formula:**
    $$\text{Wait Time} = \frac{\text{Total Duration of Services Ahead}}{\text{Number of Barbers Working}}$$
    Recalculate immediately when tickets are called, cancelled, marked no-show, or when barbers toggle break status.

---

## 9. Testing & Quality Assurance Instructions

- **Mandatory Feature Verification:** After implementing any screen or feature, verify it against the 16 test cases in `docs/03-flows-rules.md` (TC-01 through TC-16).
- **Real-Time Latency Verification:** Ensure cross-screen state updates appear across open tabs/windows within 5 seconds without manual reloads.
- **Edge Case Testing:**
  - 0 waiting customers (empty queue state).
  - All barbers on break or off-duty.
  - Customer waiting >60 minutes (triggers red highlight warning on Reception).
  - Invalid phone numbers (`123`, `abcdef`, `0987...`).
  - Duplicate phone registration attempts.
  - Attempting to select 4 services.
- **Bilingual Verification:** Verify every new component displays correct Gujarati text when toggled.

---

## 10. Development Protocol: One Feature at a Time

To prevent regression and maintain high code quality, all AI agents must follow this disciplined workflow:

### Development Rules:
- **Build Only the Requested Feature:** Focus exclusively on the feature or screen requested in the active prompt. Do not attempt to build the entire system in a single turn.
- **Do Not Modify Completed Screens:** Do not alter, refactor, or break already completed screens or components unless explicitly instructed to do so.
- **No Extra Features:** Do not add unrequested features (e.g., online payments, future calendar bookings, inventory, loyalty points).
- **No Premature Deployment:** Do not execute production deployment scripts or remote hosting commands without explicit user instruction.
- **Follow Specifications Faithfully:**
  - Follow `docs/02-screens.md` for all UI structures and routes.
  - Follow `docs/03-flows-rules.md` for all business rules and status transitions.

### Mandatory Post-Step Reporting Protocol:
At the conclusion of **every** development turn, the agent must output a structured progress report containing:
1. **List of Changed / Created Files:** Exact relative paths of files created or modified.
2. **Implementation Summary:** Clear explanation of what was built and how it functions.
3. **Verification & Testing Commands:** Exact terminal commands, test URLs, or manual verification steps to validate the work.
4. **Pending / Incomplete Functionality:** Explicit mention of any edge cases, dependencies, or subsequent steps remaining for that module.

---
