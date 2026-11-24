# Salon Queue Management System — Project Brief

## 1. Project Problem Statement

Traditional hair salons and barbershops often experience operational bottlenecks due to unmanaged customer queues, unpredictable waiting durations, and chaotic waiting areas. Key issues identified include:

- **Lobby Congestion & Unpredictable Wait Times:** Customers arrive without knowing the queue length or estimated wait duration, leading to overcrowded waiting areas, customer frustration, and walk-outs.
- **Lack of Remote Check-In:** Customers must physically visit the salon to secure a spot in line, wasting valuable personal time sitting in the waiting lounge.
- **Manual & Error-Prone Queue Tracking:** Salons relying on paper registers or verbal order struggle to maintain accurate wait orders, especially during peak rush hours.
- **Coordination Challenges Across Barbers:** Without a centralized queue dispatch, balancing walk-ins with customers requesting specific barbers creates scheduling friction and uneven workloads.
- **Multi-Service Selection Complications:** When a customer requires multiple services (e.g., Haircut and Beard Grooming), calculating estimated service duration and coordinating barber availability manually is difficult.
- **Lobby Visibility Deficits:** In-salon customers frequently inquire about their turn because there is no synchronized public display showing current and upcoming clients.
- **Language Barriers in Regional Contexts:** In multi-lingual communities, non-English speaking customers or staff face difficulties when digital tools are only available in English.

---

## 2. Project Objectives

The primary objective of this MSc IT project is to design and develop a web-based **Salon Queue Management System** that streamlines salon customer flow, optimizes barber utilization, and elevates customer experience through real-time queue visibility.

Specific project objectives include:
1. **Remote Queue Access:** Enable customers to join the virtual queue remotely from their personal devices without being physically present at the salon.
2. **Transparent Real-Time Tracking:** Provide customers with a live queue tracking interface displaying current position in line and estimated wait time.
3. **Flexible Service & Barber Allocation:** Allow customers to select one or more salon services and choose a specific preferred barber or the "Any Barber" option for expedited service.
4. **Efficient Walk-In Management:** Equip salon receptionists with tools to seamlessly register walk-in customers into the central queue alongside remote entrants.
5. **Barber Queue Autonomy:** Provide individual barbers with dedicated queue management capabilities to track assigned clients, call the next customer, and update service progress.
6. **Public In-Salon Visibility:** Deliver a synchronized, real-time TV display board for the salon lobby showing current customers being served and upcoming tokens.
7. **Comprehensive Administrative Control:** Provide salon owners with full management over services, barber rosters and availability, and queue operating status.
8. **Bilingual Accessibility:** Deliver full dual-language support in **English** and **Gujarati** across all interfaces to ensure local accessibility.
9. **Premium Brand Aesthetic:** Implement an elegant, luxury salon user experience utilizing a dark charcoal theme accented with refined gold detailing.

---

## 3. Target Users

The system is designed for three distinct user groups within the salon ecosystem:

### 3.1. Customers
- **Remote Customers:** Access the system via mobile or web browser to review salon services, select a preferred barber or "Any Barber", join the live queue, and monitor their queue position remotely.
- **In-Salon Waiting Customers:** View the live TV screen in the salon lobby to see real-time queue progress and know when their turn is called.
- **Language Needs:** Require a simple language switch between English and Gujarati.

### 3.2. Receptionist / Owner
- **Receptionist:** Acts as the front-desk operator responsible for entering walk-in customers into the digital queue, assigning requested services, routing clients to preferred barbers or the general pool, and monitoring overall queue health.
- **Owner:** Possesses full administrative rights to oversee salon operations, manage the service catalog (names, prices, estimated durations), manage barber profiles and shifts/availability, and open or close the queue intake.

### 3.3. Barbers
- **Salon Barbers / Stylists:** Professional staff members who log in or select their profile to manage their assigned queue of customers, view requested service combinations, call the next client, and transition customer service states (start service, complete service).

---

## 4. Must-Have Features

### 4.1. Customer Module
- **Remote Queue Registration:** Customers can enter their name and mobile number to join the queue remotely.
- **Multi-Service Selection:** Ability to choose multiple services in a single queue ticket (e.g., Haircut, Beard Trim, Hair Wash, Facial).
- **Barber Preference Selection:** Option to pick a specific barber from available staff or choose **"Any Barber"** for the earliest available chair.
- **Live Queue Tracking:** Dedicated ticket status screen displaying:
  - Token / Queue position
  - Assigned barber (or Any Barber status)
  - Selected services and total estimated duration
  - Real-time queue status (Waiting, In-Service, Completed)
- **Bilingual Interface:** Toggle between English and Gujarati (ગુજરાતી) on all customer-facing views.

### 4.2. Receptionist & Walk-In Management Module
- **Walk-In Registration:** Fast check-in interface for customers arriving physically at the front desk without prior registration.
- **Service & Barber Assignment:** Ability to add single or multiple services and assign the walk-in to a specific barber or "Any Barber".
- **Queue Overview & Coordination:** Centralized live view of all queued and in-service customers across all barbers.

### 4.3. Barber Module
- **Barber Queue View:** Dedicated screen filtered by barber to view only the customers assigned to their chair.
- **Customer Action Controls:**
  - Call next customer in line.
  - Start service.
  - Complete service.
- **Customer Details Visibility:** Immediate visibility into customer name, token, and list of chosen services.

### 4.4. TV Display Module (Lobby Waiting Board)
- **Fullscreen Salon Display:** Dedicated interface formatted for large screens and lobby TVs.
- **Current & Upcoming Status:**
  - "Now Serving" section displaying barber name/chair and corresponding customer/token.
  - "Up Next" section displaying upcoming tokens and wait sequence.
- **Real-Time Synchronization:** Automatically reflects state changes without requiring manual browser reload.

### 4.5. Owner Administration Module
- **Service Management:** Add, edit, remove, and toggle active status for salon services, including service name, estimated duration, and pricing.
- **Barber Management:** Add and manage barber profiles, set operational status (Available / Unavailable / On Break).
- **Queue Availability Control:** Master switch to open or close the queue (prevent new remote or walk-in joins when the salon reaches capacity or at end of business hours).

### 4.6. Localization Module
- **Dual Language Support:** Complete translation and interface localization for **English** and **Gujarati** across customer, staff, admin, and display views.

---

## 5. Features Explicitly Excluded

To ensure a focused and attainable project scope for this MSc IT capstone, the following features are strictly excluded:

- **Online Payment Processing & Gateways:** No digital payment collection (e.g., Razorpay, Stripe, UPI payment links). Payments are settled offline at the salon counter.
- **Future Appointment / Calendar Booking:** The system is exclusively a real-time, same-day virtual queue management system; it does not support calendar-based bookings for future dates or timeslots.
- **Retail Product & Inventory Management:** No tracking of retail inventory, hair care products, stock alerts, or supply purchase orders.
- **Staff Payroll, Commission & Attendance Tracking:** No automated payroll calculation, tip/commission distribution, or biometric attendance logging.
- **Loyalty Programs & Reward Points:** No customer loyalty tiers, referral bonuses, or discount promo engine.
- **Automated SMS / WhatsApp Marketing Campaigns:** No external marketing broadcasts or automated promotional campaign dispatchers.
- **Multi-Branch / Multi-Tenant Salon Architecture:** The system is architected for a single salon premises with multiple barbers/chairs, not a distributed multi-chain franchise network.

---

## 6. Technology and Design Expectations

### 6.1. Design & Aesthetic Guidelines
- **Color Palette:** Premium salon design utilizing a dark charcoal base (`#121212` / `#1E1E1E`) paired with elegant gold accents (`#D4AF37` / `#C5A059`) for highlights, action buttons, and active status indicators.
- **Typography & Atmosphere:** Modern, refined, and legible typography delivering a luxurious grooming lounge ambiance.
- **Responsive Layout:**
  - Mobile-first layout for customer remote join and queue tracking.
  - Tablet/Desktop-friendly layout for receptionist walk-in entry and owner administration.
  - High-visibility fullscreen presentation for TV queue displays.
- **Accessible Dual-Language Display:** High readability in both Latin and Gujarati script across all viewports.

### 6.2. Technology Expectations
- **Web Application Architecture:** Lightweight, responsive web-based architecture accessible via modern standard web browsers without requiring end-users to install native apps.
- **Real-Time Data Flow:** Reactive state updates to ensure changes made by receptionists or barbers (e.g., calling next customer, completing service) are immediately reflected on customer tracking screens and the salon TV display.
- **Role-Based Views:** Clear modular separation between Customer View, Receptionist Walk-in View, Barber Chair View, TV Display, and Owner Administration.

---

## 7. Project Scope

### 7.1. In-Scope
- Complete digital queue lifecycle for a single salon: remote join, receptionist walk-in entry, multi-service selection, barber allocation ("Specific Barber" or "Any Barber"), live queue tracking, barber queue servicing, and TV display board.
- Owner controls for services, barber availability, and queue operating hours (open/close).
- Dual-language support across the application in English and Gujarati.
- Responsive, dark charcoal and gold user interface suited for mobile, tablet, desktop, and large TV displays.

### 7.2. Out-of-Scope
- Financial transactions, accounting, and payment integrations.
- Multi-day calendar scheduling and appointment booking.
- Product inventory management and retail point-of-sale (POS).
- Employee payroll, commission, and human resource management.
- External promotional messaging platforms.

---
