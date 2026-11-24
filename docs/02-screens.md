# Salon Queue Management System — Screen Specifications

This document defines the comprehensive UI/UX specifications for the **Salon Queue Management System**. The application features a luxury, premium barbershop aesthetic with responsive layouts across mobile, tablet, desktop, and TV display environments.

---

## Global Design System & Standards

- **Color Palette:**
  - **Primary Background (Charcoal):** `#1F2937` (Rich, deep dark charcoal)
  - **Surface & Card Background:** `#111827` (Darker slate charcoal for elevated depth)
  - **Border & Dividers:** `#374151` (Subtle muted charcoal outline)
  - **Primary Accent (Gold):** `#D4A017` (Refined metallic warm gold)
  - **Gold Hover / Active:** `#B8860B` (Darker antique gold) / `#F59E0B` (Vibrant highlight)
  - **Text Primary:** `#F9FAFB` (Crisp off-white for optimal contrast)
  - **Text Muted / Secondary:** `#9CA3AF` (Muted silver-gray)
  - **Status Colors:**
    - Available / Active: `#10B981` (Emerald green accent)
    - Busy / In-Service: `#D4A017` (Gold accent)
    - On Break / Inactive: `#6B7280` (Neutral gray)
    - Alert / Delayed (>60m): `#EF4444` (Crimson red)
- **Component Styling:**
  - **Cards:** Rounded container cards (`border-radius: 12px` / `rounded-xl`) with `#374151` subtle borders.
  - **Buttons:** Unified solid gold primary buttons with `#111827` dark bold text, and charcoal outline secondary buttons with gold border and text.
  - **Localization:** Bilingual switch between English (EN) and Gujarati (GU — ગુજરાતી) available on all screens.

---

## Screen 1: Home (`/`)

### 1. Purpose
The public landing page provides prospective and arriving customers with real-time salon operating status, live queue volume, estimated wait times, and barber availability before they enter the queue.

### 2. Target User
Remote and arriving salon customers.

### 3. Layout (Top to Bottom)
1. **Header Navigation Bar:**
   - Salon logo emblem (gold scissors & crown motif) and salon name (*"The Royal Cut Salon"*).
   - Salon operational badge: Pill badge showing **"Queue Open"** (green indicator) or **"Queue Closed"** (gray/red indicator).
   - Language toggle control (`EN` | `ગુજરાતી`).
2. **Hero Queue Summary Card:**
   - Dark charcoal rounded card with gold accent border.
   - Large metric display: **Current Waiting Customers** (e.g., `4 in line`).
   - Secondary metric display: **Estimated Wait Time** (e.g., `~25 mins`).
   - Contextual subtitle: e.g., *"Join now to reserve your spot before arriving."*
3. **Primary Call-To-Action (CTA):**
   - Prominent, full-width gold button: **"Join Queue"** (Disabled if salon queue status is "Closed").
4. **Live Barber Roster Section:**
   - Section heading: **"Barbers on Floor"** / **"આજના બાર્બર્સ"**.
   - Grid of barber status cards:
     - Barber avatar/photo placeholder.
     - Barber name.
     - Live status badge:
       - **Available** (Green pill badge) — Ready for next client.
       - **Busy** (Gold pill badge) — Currently serving a customer.
       - **On Break** (Gray pill badge) — Temporarily away.
5. **Footer:**
   - Salon operating hours (e.g., `Mon-Sun: 9:00 AM - 9:00 PM`).
   - Front desk contact number and salon address.

### 4. Buttons and Actions
- **Language Toggle (`EN` | `ગુજરાતી`):** Switches entire interface text instantly between English and Gujarati without page reload.
- **Join Queue Button:**
  - *Click Action:* Navigates customer to Screen 2 (`/join`).
  - *Disabled State:* If the queue is marked "Closed" by the owner, button displays **"Queue Currently Closed"**, is disabled with lowered opacity, and clicking shows an alert toast.
- **Barber Card Tap (Optional shortcut):** Tapping an active barber card navigates to `/join` with that barber pre-selected.

### 5. Form Validations
- *No input form fields on this screen.*

### 6. Empty States
- **Queue Empty State:** When 0 customers are in queue, Hero card displays:
  - Metric: `0 Customers Waiting`.
  - Subtitle: *"No waiting time! Join now and be served immediately."*
  - Estimated Wait Time: `0 - 5 mins`.
- **No Barbers Available State:** If all barbers are on break or off-duty, shows notice: *"All barbers are currently unavailable. Queue joining may be temporarily paused."*

### 7. Loading States
- Skeleton shimmer animation placeholders in charcoal (`#374151`) for the queue counters, wait time badge, and barber cards while initial queue metrics and barber statuses load from the database.

### 8. Error States
- If live salon status fails to fetch: Banner across top: *"Unable to load real-time salon status. Tap to retry."* with a retry button.

### 9. Mobile Layout
- Single-column vertical stack.
- Sticky top navigation bar.
- Hero queue summary card takes full width with prominent large numbers.
- Full-width fixed bottom or sticky CTA button: **"Join Queue"**.
- Barber cards stack in a 1-column or 2-column compact grid.

### 10. Desktop / Tablet Layout
- Centered container with max-width (e.g., `1024px`).
- Hero section displays queue count and estimated wait time side-by-side in a 2-column summary card.
- Barber roster renders as a 3-column or 4-column responsive grid with rounded cards and hover elevation.

---

## Screen 2: Join Queue (`/join`)

### 1. Purpose
Allows customers to enter their contact details, select between 1 and 3 salon services, choose a specific barber or the fastest available option ("Any Barber"), review pricing and durations, and confirm their spot in line.

### 2. Target User
Remote and arriving customers joining the virtual queue.

### 3. Layout (Top to Bottom)
1. **Top Header & Back Navigation:**
   - Back arrow link (`< Back to Home`).
   - Page title: **"Join Virtual Queue"** / **"કતારમાં જોડાઓ"**.
   - Language selector (`EN` | `ગુજરાતી`).
2. **Customer Information Section:**
   - Input field: **Full Name** (text input).
   - Input field: **Phone Number** (numeric input with country prefix `+91` pre-filled or indicated).
3. **Service Selection Section:**
   - Section heading: **"Select Services (Max 3)"** / **"સેવાઓ પસંદ કરો (મહત્તમ ૩)"**.
   - Helper badge showing selection count: `(e.g., 2/3 selected)`.
   - Grid/list of selectable service cards:
     - Checkbox / selector indicator.
     - Service name (bilingual display).
     - Estimated duration (e.g., `30 mins`).
     - Price (e.g., `₹250`).
4. **Barber Selection Section:**
   - Section heading: **"Select Barber"** / **"બાર્બર પસંદ કરો"**.
   - Radio button / selectable card list:
     - **"Any Barber (Fastest)"** [Recommended option, highlighted with a gold badge] — Assigns first available barber.
     - Individual Barber Cards: Barber name, current status (Available / Busy), and current queue count for that barber.
5. **Live Queue & Booking Summary Card:**
   - Rounded charcoal container with gold trim:
     - **Selected Services Summary:** List of checked services.
     - **Total Service Duration:** Sum of selected service durations (e.g., `45 mins`).
     - **Total Price:** Sum of service prices (e.g., `₹400`).
     - **Estimated Wait Time:** Calculated wait time before service starts based on current queue ahead (e.g., `~20 mins`).
6. **Confirmation Action Area:**
   - Large primary gold button: **"Confirm & Join Queue"** / **"કન્ફર્મ કરો અને જોડાઓ"**.
   - Microcopy: *"By joining, you will receive real-time queue position tracking."*

### 4. Buttons and Actions
- **Back Button:** Returns to Home screen (`/`).
- **Service Selection Cards/Checkboxes:**
  - Selecting adds the service duration and price to the running summary.
  - Tapping an unselected 4th service triggers an inline limit alert: *"You can select up to 3 services only."*
- **Barber Selection Options:** Updates the estimated wait time calculation (Any Barber calculates fastest queue throughput; selecting a specific barber recalculates based on that specific barber's queue line).
- **Confirm & Join Queue Button:**
  - Validates name, phone, and at least 1 service selection.
  - Submits the queue entry to the backend.
  - Upon success, redirects immediately to Screen 3: My Status (`/status/:id`).

### 5. Form Validations
- **Customer Name:** Mandatory; minimum 2 characters; trims whitespace.
- **Phone Number:** Mandatory; exactly 10 numeric digits; validates against standard mobile regex (`^[6-9]\d{9}$`).
- **Service Selection:**
  - Minimum: At least 1 service must be selected.
  - Maximum: Exactly 3 services allowed. Selecting a 4th is disabled with helper feedback.
- **Barber Selection:** Defaults to **"Any Barber (Fastest)"** if no specific barber is explicitly clicked.

### 6. Empty States
- **No Services Available:** If no active services are returned by the admin system, displays: *"No salon services currently available. Please contact reception."* and disables the confirm button.
- **Queue Full/Closed Mid-Session:** If the owner closes the queue while the user is filling the form, upon submit a modal/banner states: *"The salon queue has just closed. Please try again later."*

### 7. Loading States
- Loading spinner over the confirm button: *"Securing your queue spot..."*.
- Disabled form controls during submission to prevent double-tapping.

### 8. Error States
- **Inline Validation Errors:** Highlighted input borders in red with descriptive error messages (e.g., *"Please enter a valid 10-digit mobile number"*).
- **Submission Error Toast:** If server fails to create queue item: *"Unable to join queue due to network error. Please try again."*

### 9. Mobile Layout
- Single-column vertical scroll flow.
- Service list displayed as vertical stacked cards with clear touch targets (min 48px height).
- Sticky bottom summary drawer or footer card showing Total Price, Total Duration, and the **"Confirm & Join Queue"** button.

### 10. Desktop / Tablet Layout
- Two-column layout:
  - **Left Column (60% width):** Personal details form, service selection grid, and barber selection radio cards.
  - **Right Column (40% width):** Sticky live summary sidebar containing selected services list, total duration, total price, estimated wait time, and the primary confirmation button.

---

## Screen 3: My Status (`/status/:id`)

### 1. Purpose
The dedicated live tracking screen for a customer who has joined the queue. Displays their token number, live queue position, estimated wait time, dynamic notifications when their turn approaches, and allows spot cancellation.

### 2. Target User
Remote customers monitoring their wait from home, nearby cafes, or transit, and waiting customers in the salon.

### 3. Layout (Top to Bottom)
1. **Top Header:**
   - Salon logo and name.
   - Language switch (`EN` | `ગુજરાતી`).
   - Live Connection Status pill: Green pulsating dot with text *"Live Updates Active"*.
2. **Prominent Token Card:**
   - High-contrast charcoal card with thick gold border.
   - Large bold token identifier (e.g., **"Token: S-14"**).
   - Customer Greeting: e.g., *"Hello, Rajesh Patel"*.
   - Live Status Badge: `Waiting` / `In-Service` / `Completed` / `Cancelled`.
3. **Queue Position & ETA Display:**
   - Large numbered circle or stat card: **Queue Position: #3 in line**.
   - Sub-metric: **Estimated Wait Time: ~15 mins**.
   - Preferred Barber display: Shows selected barber name or *"Any Barber (Assigned: Vikram)"*.
4. **Contextual Urgent Notification Banners:**
   - **Position 2 Notification ("Start Coming"):**
     - When queue position decreases to **2**: Vibrant gold alert banner appears:
       > 🔔 **"Start Coming! You are next in line. Please head to the salon now."**
   - **Position 1 / Called Notification ("It's Your Turn"):**
     - When the barber calls the token: Flashing gold high-priority alert card:
       > ✂️ **"It's Your Turn! Please proceed to Chair 2 (Barber: Amit)."**
5. **Service Summary Accordion/Card:**
   - List of selected services (e.g., *Haircut + Beard Trim*).
   - Total booked duration (e.g., `45 mins`) and total price (`₹400`).
6. **Action Area:**
   - Outline button with red border/text: **"Cancel My Spot"** / **"મારો વારો રદ કરો"**.

### 4. Buttons and Actions
- **Language Toggle:** Switches page text between English and Gujarati.
- **Cancel My Spot Button:**
  - *Click Action:* Triggers a confirmation modal: *"Are you sure you want to leave the queue? Your token S-14 will be forfeited."*
  - *Confirm Action:* Updates status to `Cancelled`, frees up queue space, and shows a cancellation confirmation screen with button to return to `/`.

### 5. Form Validations
- *No inputs on this screen; cancellation requires explicit two-step modal confirmation.*

### 6. Empty States / Terminal States
- **Token Completed State:** When the barber marks the service as done:
  - Hero card updates to green checkmark icon.
  - Text: *"Service Completed! Thank you for visiting The Royal Cut Salon."*
  - Cancel button disappears; replaced by **"Book Another Service"** linking back to `/`.
- **Token Cancelled / No-Show State:** If customer was cancelled or marked no-show:
  - Red alert card: *"This token has been cancelled or marked as no-show."*
  - CTA button to return to Home (`/`).

### 7. Loading States
- Shimmer skeleton loaders over token ID, queue position number, and ETA while initial status is fetched or WebSocket/polling updates sync.

### 8. Error States
- **Invalid Token URL (`/status/invalid-id`):** Full-screen error state: *"Token not found or expired. Please check your link or join the queue again."* with a button back to `/`.

### 9. Mobile Layout
- Single-column mobile-optimized card layout.
- The Token number and Queue Position dominate the top viewport (above the fold).
- Notification banners appear prominently with distinct colored borders and iconography.
- Cancel button located at the bottom of the card with safety spacing to prevent accidental taps.

### 10. Desktop / Tablet Layout
- Centered card container (max-width `640px`) styled like a premium luxury digital boarding pass.
- Elevated card shadow and gold trim.

---

## Screen 4: Reception Dashboard (`/reception`)

### 1. Purpose
The operational control center for front-desk receptionists and owners to oversee the entire salon queue, monitor individual barber chair status, register walk-in customers on the spot, call next clients, and resolve queue delays or no-shows.

### 2. Target User
Salon Receptionist and Salon Owner.

### 3. Layout (Top to Bottom)
1. **Dashboard Header:**
   - Salon logo, title: **"Reception & Queue Control"**.
   - Live queue counter: `Total Waiting: 6` | `In-Service: 3`.
   - Master queue toggle indicator (Open / Closed).
   - Language switcher (`EN` | `ગુજરાતી`).
2. **Barber Chairs Overview Section:**
   - Section title: **"Active Chairs & Barbers"**.
   - Grid of real-time Barber Status Cards:
     - Barber photo and name.
     - Operational status badge (Available / Busy / On Break).
     - **Current Assigned Customer:** Customer Name and Token (e.g., `S-11: Amit Shah`).
     - **Time Remaining / Elapsed:** Timer countdown for current service (e.g., `Remaining: 12 mins`).
     - **Action Button:** Solid gold button: **"Call Next"** (enabled when barber is available or chair is open).
3. **Queue Health & High-Wait Alert Bar:**
   - System alert banner highlighting any customer waiting over 60 minutes:
     > ⚠️ **Delay Warning:** Customer **Karan Dave (Token: S-08)** has been waiting for **68 minutes**!
4. **Two-Panel Operational Workspace (Split Screen on Desktop):**
   - **Left Panel (60%): Live Waiting Queue List:**
     - Tab / filter: All Waiting | By Preferred Barber.
     - Queue table / cards list:
       - Queue token (e.g., `S-14`).
       - Customer name and mobile number.
       - Selected services list (e.g., `Haircut, Beard Trim`).
       - Preferred Barber (Specific name or `Any Barber`).
       - Live Waiting Time (e.g., `24 mins`). Customers waiting >60 mins highlighted with red pulsing border and warning badge.
       - Action buttons per row:
         - **"No-Show"** button (Marks client absent, removes from active line).
         - **"Cancel"** button (Removes token from queue with confirmation).
   - **Right Panel (40%): Add Walk-In Form:**
     - Form container title: **"Add Walk-in Customer"**.
     - Inputs: Customer Name, 10-digit Phone Number.
     - Multi-service selection checkboxes with price and duration.
     - Barber selector dropdown (`Any Barber (Fastest)` or specific barber name).
     - Calculated total duration and price preview.
     - Action button: Solid gold button **"Add Walk-In to Queue"**.

### 4. Buttons and Actions
- **Call Next (per Barber):** Calls the next eligible waiting customer assigned to that barber (or next "Any Barber" customer). Updates token status to `In-Service` and alerts the customer and TV screen.
- **Add Walk-In to Queue Button:** Validates the walk-in form, generates the next token number (e.g., `S-15`), adds the customer to the live queue, and clears the form.
- **No-Show Button:** Triggers modal: *"Mark Token [X] as No-Show?"*. Confirmation removes customer from active queue and logs them as a no-show in daily metrics.
- **Cancel Button:** Prompts for receptionist confirmation to cancel and delete the customer's queue ticket.
- **Language Switcher:** Updates all dashboard labels and buttons between English and Gujarati.

### 5. Form Validations (Add Walk-In Form)
- **Customer Name:** Mandatory, min 2 characters.
- **Phone Number:** Exactly 10 digits; standard phone regex validation.
- **Service Selection:** At least 1 service selected; maximum 3 services allowed.
- **Barber Selection:** Defaults to "Any Barber (Fastest)".

### 6. Empty States
- **Waiting Queue Empty:** When no customers are waiting in line:
  - Table shows centered empty state illustration with text: *"No customers currently in the waiting queue. Walk-ins can be added using the form."*
- **No Barbers on Duty:** Notice indicating no barbers are checked in today.

### 7. Loading States
- Table row shimmer effect while queue data refetches.
- Spinner on "Add Walk-In" button during creation.

### 8. Error States
- Toast error notification: *"Failed to call next customer. Check connection."*
- Form validation error alerts displayed in red below respective walk-in input fields.

### 9. Mobile Layout
- Accordion or tab-based view:
  - Tab 1: **Barbers** (Cards with "Call Next" buttons).
  - Tab 2: **Queue List** (Stacked cards with No-Show and Cancel actions).
  - Tab 3: **+ Walk-In** (Full-screen walk-in entry form).
- Delay alert banner pinned below sticky header.

### 10. Desktop / Tablet Layout
- Wide desktop layout:
  - Top full-width strip: Barber Chairs with active timers and "Call Next" triggers.
  - Split lower section: 65% width Waiting Queue table and 35% sticky Add Walk-In form.
  - High-visibility red styling for any rows exceeding 60 minutes waiting time.

---

## Screen 5: Barber View (`/barber/:name`)

### 1. Purpose
A streamlined, distraction-free tablet/mobile interface dedicated to a specific barber at their styling station. Enables the barber to see who is currently in their chair, track service duration with an active timer, view the next customer in line, complete services, and toggle their break availability.

### 2. Target User
Salon Barbers and Hair Stylists.

### 3. Layout (Top to Bottom)
1. **Barber Station Header:**
   - Barber avatar, greeting: **"Chair 1 — Vikram"**.
   - Availability toggle switch:
     - **Available** (Green) vs. **On Break** (Gray/Yellow).
   - Language selector (`EN` | `ગુજરાતી`).
2. **Current Customer Focus Card (Hero Station Card):**
   - Rounded dark charcoal container with rich gold borders.
   - Section heading: **"CURRENTLY SERVING"**.
   - Customer Token & Name: e.g., **Token: S-12 — Rahul Sharma**.
   - Selected Services list with breakdown:
     - e.g., *Executive Haircut (30 mins)* + *Beard Trim (15 mins)*.
     - Total scheduled service duration: `45 mins`.
3. **Live Service Timer:**
   - Large digital countdown/elapsed stopwatch display:
     - Digital clock format: `MM:SS` (e.g., `28:45 / 45:00`).
     - Progress bar indicating percentage of expected service duration completed.
4. **Primary Service Action Controls:**
   - **"Start Service"** button (Green/Gold solid button; active when customer arrives at the chair).
   - **"Done" / "Complete Service"** button (Solid gold button; active when haircut/service finishes).
5. **Next Customer in Line Card:**
   - Section title: **"Up Next at Your Chair"**.
   - Container card showing:
     - Next Token (e.g., `S-14`).
     - Customer name (e.g., `Rajesh Patel`).
     - Services requested (e.g., `Hair Wash & Styling`).
     - Customer's current wait duration (e.g., `Waiting for 18 mins`).
6. **Station Queue Counter:**
   - Footer count: `3 more customers in your queue line`.

### 4. Buttons and Actions
- **Available / On Break Toggle:**
  - Toggling to **"On Break"**: Flags barber as paused; system stops assigning "Any Barber" customers to this chair until switched back to **"Available"**.
- **Start Button:**
  - *Action:* Starts the service timer, sets customer status to `In-Service`, and synchronizes updates with the TV display and customer's tracking screen.
- **Done Button:**
  - *Action:* Prompts quick completion: *"Mark service as complete?"*.
  - When confirmed, sets current customer to `Completed`, stops timer, logs duration, and automatically cues up the next customer.
- **Call Next Button (if chair is vacant):**
  - Calls the next assigned customer to the chair.

### 5. Form Validations
- *No complex forms; actions protected by single-tap safety confirmations.*

### 6. Empty States
- **No Customer Currently Serving:**
  - Timer is idle (`00:00`).
  - Hero card displays: *"Chair is empty. Tap 'Call Next Customer' when ready."*
- **No Next Customer Waiting:**
  - Up Next card displays: *"No upcoming customers assigned to your chair right now."*

### 7. Loading States
- Immediate optimistic UI update on button press with small spinner during state synchronization.

### 8. Error States
- Connection lost toast alert: *"Offline — Unable to update service status. Check salon Wi-Fi."*

### 9. Mobile Layout
- Designed specifically for smartphone or tablet mounted beside the barber's mirror.
- Massive touch-friendly buttons (minimum 60px height) for easy tapping with wet or gloved hands.
- Current Customer and Timer dominate 75% of the viewport.

### 10. Desktop / Tablet Layout
- Landscape tablet layout (ideal for iPad/Android station mounts).
- Left side: Currently serving details, service list, and large timer.
- Right side: Big action buttons ("Start", "Done") and the "Up Next" preview card.

---

## Screen 6: Waiting Area TV (`/display`)

### 1. Purpose
A high-contrast, clean, full-screen digital display designed for the salon's waiting room television or lobby monitor. Keeps waiting customers informed of which barber is serving whom, which tokens are up next, and alerts customers when their turn is called.

### 2. Target User
In-salon waiting customers and front-desk viewers watching the lobby TV from across the room.

### 3. Layout (Top to Bottom & Two-Column Grid)
1. **Lobby Display Header:**
   - Large salon gold insignia & name: *"The Royal Cut Salon"*.
   - Live digital clock & date display (e.g., `10:45 AM | Tuesday`).
   - Current salon summary badge: `Total Waiting: 5 Customers`.
2. **Main Split-Screen Board:**
   - **Left Section (60% Width) — "NOW SERVING" (Chairs & Barbers):**
     - Section title with gold scissors icon: **"NOW SERVING / અત્યારે સેવા ચાલુ છે"**.
     - Grid of Chair Display Cards (one for each barber on duty):
       - Barber profile photo and Barber Name (e.g., `Vikram - Chair 1`).
       - Large, high-visibility Token Number (e.g., **S-11**).
       - Customer First Name (e.g., `Amit S.`).
       - Service in progress (e.g., `Haircut & Beard`).
       - Status Indicator: Green pulsing badge `In Chair`.
   - **Right Section (40% Width) — "UP NEXT" (Queue Sequence):**
     - Section title: **"UP NEXT / હવે પછી"**.
     - Vertical list of the **next five (5) tokens**:
       - Rank position number (`#1`, `#2`, `#3`, `#4`, `#5`).
       - Token ID in bold (e.g., `S-14`, `S-15`, `S-16`, `S-17`, `S-18`).
       - Assigned Barber name (or `Any Barber`).
       - Estimated wait time badge (e.g., `~10m`, `~20m`).
3. **Newly Called Customer Visual Flash:**
   - When a barber or receptionist calls a new customer, their token card on the TV **flashes in bright gold (`#D4A017`) for 10 seconds** with an audio chime and visual highlight to catch the customer's attention in the lobby.
4. **Ticker Footer:**
   - Rolling message bar at bottom: *"Welcome to The Royal Cut. Scan the QR code at the desk or visit salon-queue.com to join remotely."*

### 4. Buttons and Actions
- **Fullscreen Mode Trigger (Hidden/Admin corner tap):** Tapping the top-right corner toggles browser fullscreen mode (`F11`).
- *No user buttons for regular viewers (passive viewing screen).*
- **Automatic Real-Time Updates:** Continuously listens for backend queue mutations; screen updates automatically without full page reload.

### 5. Form Validations
- *Not applicable (display screen only).*

### 6. Empty States
- **No Customers Currently Being Served:**
  - Barber cards show: `Chair Open / Ready for Next Client`.
- **No Upcoming Tokens in "Up Next" List:**
  - Up Next card displays: *"No customers waiting in line. Walk-ins welcome!"*

### 7. Loading States
- Dark elegant splash screen with gold spinning shears and text: *"Connecting to Salon Display Board..."*.

### 8. Error States
- If socket/network connection drops: Discreet amber indicator in bottom corner: *"Reconnecting to live queue..."* while retaining cached screen data to prevent blank screen display.

### 9. Mobile Layout
- *Note: While intended for TV monitors (1080p/4K), if opened on mobile, it gracefully stacks: Now Serving cards on top, Up Next list below.*

### 10. Desktop / Large TV Screen Layout (Primary Target)
- 16:9 widescreen layout (`1920x1080` optimized).
- Deep charcoal `#1F2937` background with pitch black `#111827` panels and high-contrast `#F9FAFB` typography.
- Extra-large font sizes (Token IDs at 48pt–64pt) readable from 15–20 feet away across the salon lounge.

---

## Screen 7: Owner Settings (`/admin`)

### 1. Purpose
The master management console for salon owners to configure salon services, adjust pricing and service durations, manage barber profiles and shifts, toggle the master online queue on or off, and review daily operational metrics.

### 2. Target User
Salon Owner and General Manager.

### 3. Layout (Top to Bottom)
1. **Admin Header:**
   - Title: **"Salon Administration & Management"** / **"સેલોન સંચાલન"**.
   - Language selector (`EN` | `ગુજરાતી`).
   - Logout / Exit button back to Home.
2. **Master Queue Availability Control (Hero Banner):**
   - High-priority toggle card:
     - Label: **"Online Queue Status"**.
     - Master Switch: **[ OPEN ]** (Green) / **[ CLOSED ]** (Red).
     - Helper text: *"When Closed, remote customers cannot join the queue. Receptionists can still add in-store walk-ins if needed."*
3. **Daily Performance Metrics Bar:**
   - Four rounded statistical cards:
     1. **Today's Customers Served:** e.g., `38 Clients`.
     2. **Average Waiting Time:** e.g., `18 mins`.
     3. **No-Show Count:** e.g., `3 No-Shows (7.3%)`.
     4. **Active Queue Depth:** e.g., `5 Waiting`.
4. **Tabbed Management Interface:**
   - **Tab 1: Service Management (`/admin#services`):**
     - Button: **"+ Add New Service"**.
     - Services Table / Cards:
       - Service Name in English (e.g., `Royal Beard Grooming`).
       - Service Name in Gujarati (e.g., `રોયલ દાઢી ગ્રૂમિંગ`).
       - Service Duration (in minutes, e.g., `25 min`).
       - Price (in INR, e.g., `₹300`).
       - Status Toggle: **Enable / Disable** (Disabled services hide from `/join`).
       - Action: **Edit** / **Delete**.
     - Add/Edit Service Modal Form:
       - Input: Service Name (English).
       - Input: Service Name (Gujarati).
       - Number Input: Duration in minutes.
       - Number Input: Price in ₹.
       - Toggle: Active (Enabled/Disabled).
       - Save and Cancel buttons.
   - **Tab 2: Barber Management & Duty Roster (`/admin#barbers`):**
     - Button: **"+ Add New Barber"**.
     - Barber Duty List:
       - Barber Name and Photo.
       - Assigned Chair / Station number.
       - On-Duty Status Switch: **On Duty** (Active today) vs. **Off Duty**.
       - Availability State: **Available** / **On Break**.
       - Action: **Edit Details** / **Remove**.
5. **Footer:**
   - App version, MSc IT Project reference, last synchronized timestamp.

### 4. Buttons and Actions
- **Open/Close Online Queue Master Toggle:**
  - *Click Action:* Instantly switches the salon's online queue status. When set to Closed, the Home and Join screens block new entries.
- **Add New Service Button:** Opens modal to input new service details (names, price, duration).
- **Enable/Disable Service Toggle:** Immediately shows/hides service from the customer check-in flow without deleting history.
- **Edit / Delete Service Buttons:** Updates service metadata or removes outdated services.
- **Barber On-Duty Toggle:** Toggles whether the barber appears on the Home screen and in the selection dropdowns for today's shift.
- **Language Switcher:** Localizes administrative fields between English and Gujarati.

### 5. Form Validations
- **Service Name (English):** Mandatory; min 3 characters.
- **Service Name (Gujarati):** Mandatory; ensures proper Gujarati script support.
- **Service Duration:** Mandatory positive integer (e.g., 5 to 180 minutes).
- **Service Price:** Mandatory positive number (`>= 0`).
- **Barber Name:** Mandatory; min 2 characters.

### 6. Empty States
- **No Services Configured:** Table displays: *"No salon services configured yet. Click '+ Add New Service' to create your first offering."*
- **No Barbers Configured:** Table displays: *"No barbers found in registry. Add barbers to start accepting queue assignments."*
- **Zero Daily Metrics (Morning start):** Metrics cards show `0 Clients Served`, `0 mins Avg Wait`, `0 No-Shows`.

### 7. Loading States
- Skeleton cards on the metrics bar.
- Save buttons inside modals display spinner and disable while writing configurations.

### 8. Error States
- Modal form validation highlights missing or invalid fields in red with descriptive helper text.
- Global toast error if admin settings fail to persist: *"Settings update failed. Please retry."*

### 9. Mobile Layout
- Metric cards stack as a 2x2 grid.
- Service and Barber lists render as mobile cards rather than wide data tables, with quick toggle switches directly accessible on each card.
- Tabs appear as a top scrollable pill bar.

### 10. Desktop / Tablet Layout
- Full desktop control dashboard.
- 4-card metric row across the top.
- Tabbed view with full data tables including search and quick filter options.
- Side-panel or clean modal overlays for adding and modifying services and barbers.

---

## Screen Summary & Route Matrix

| Screen # | Screen Name | Route | Primary Target User | Key Functionality |
| :--- | :--- | :--- | :--- | :--- |
| **1** | **Home** | `/` | Customers | View queue length, wait times, barber statuses; language switch; join CTA |
| **2** | **Join Queue** | `/join` | Customers | Form with name, 10-digit phone, up to 3 services, barber preference, summary, confirm |
| **3** | **My Status** | `/status/:id` | Customers | Live queue token (e.g. S-14), position, ETA, "Start Coming" & "Your Turn" alerts, cancel |
| **4** | **Reception Dashboard** | `/reception` | Receptionist / Owner | Chair statuses, timers, Call Next, queue table, No-show/Cancel, Add Walk-in, >60m alerts |
| **5** | **Barber View** | `/barber/:name` | Barbers | Station view, current token & services, duration timer, Start, Done, Up Next, Break toggle |
| **6** | **Waiting Area TV** | `/display` | Lounge / Lobby | Full-screen TV display, barber cards, Now Serving tokens, Up Next 5 tokens, gold flash alert |
| **7** | **Owner Settings** | `/admin` | Owner / Manager | Service CRUD (EN/GU), barber roster & availability, Open/Close queue, daily analytics |

---
