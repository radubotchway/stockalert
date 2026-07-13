# StockAlert

A community pharmacy inventory and expiry tracker with barcode scanning and supplier order management. Built as a university project to demonstrate a full-stack application with realistic domain logic (FEFO stock deduction, expiry/low-stock alerting, and a purchase-order lifecycle).

## Overview

Pharmacies lose money and put patients at risk when stock silently expires on the shelf or runs out unnoticed. StockAlert gives a small pharmacy team a single place to:

- Track every product and the batches that make it up (batches carry their own expiry date, cost, and quantity).
- Scan a barcode at the shelf to instantly see stock levels and dispense or receive stock.
- See expired / expiring-soon / low-stock alerts on a dashboard, instead of finding out the hard way.
- Generate and track purchase orders to suppliers, including a one-click "suggested order" for anything below its reorder level.
- Export expiry, low-stock, and stock-movement reports to CSV for record-keeping.

## Features

- **Auth & roles** — email/password login (JWT). Two roles: **Pharmacist** (full access) and **Assistant** (can view stock and record sales/receipts, but cannot manage suppliers, purchase orders, or delete products).
- **Product & inventory management** — full CRUD for products, batch-level stock tracking (quantity, batch number, expiry date, cost price), search/filter/sort, and a full stock-movement audit log (who did what, when, and why).
- **Barcode scanning** — a Scan page that opens the device camera (EAN-13 / Code-128) and looks the product up instantly; falls back to manual barcode entry so it can be demoed without a webcam.
- **Expiry & low-stock alerts** — dashboard cards for Expired / Expiring ≤30 days / Expiring ≤90 days / Below reorder level, with matching color-coded highlighting throughout the app. Dispensing always uses **FEFO (First-Expiry-First-Out)** — stock is deducted automatically from whichever batch expires soonest, splitting across batches when needed. Batches can be marked **disposed** with a reason, which is logged as a write-off.
- **Supplier & purchase orders** — supplier CRUD; purchase orders move through `Draft → Sent → Partially Received → Received` (or `Cancelled`); a **Suggested Order** button generates draft POs grouped by supplier from everything currently below its reorder level; receiving a PO prompts for batch number/expiry/cost per line and creates the batches; a print-friendly PO view.
- **Dashboard & reports** — total stock value, product count, active alerts, pending orders, recent movements, a stock-value-by-category pie chart and a 30-day movements line chart (Recharts). A Reports page adds expiry, low-stock, and date-filterable movement-history reports, each exportable to CSV.
- **Demo readiness** — the seed script creates 30 products with real (checksum-valid) EAN-13 barcodes, 60 batches spread across expired/expiring-soon/expiring-later/safe, 4 suppliers, and 4 sample purchase orders in different statuses. A **Demo Barcodes** page renders every seeded barcode on screen with JsBarcode, so scanning can be demoed by pointing one device's camera at another screen.

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | React (Vite) + Tailwind CSS v4, React Router, Recharts, `html5-qrcode`, `JsBarcode`, `react-hot-toast` |
| Backend | Node.js + Express |
| Database | SQLite via Prisma ORM (zero-config, file-based — no external services to install) |
| Auth | JWT (`jsonwebtoken` + `bcryptjs`) |
| Tests | Vitest + Supertest (backend) |

Everything runs locally with `npm install && npm run dev` in each of `backend/` and `frontend/` — no Docker, no cloud database, no API keys.

## Project structure

```
StockAlert(Barcode)/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma      # Product, Batch, StockMovement, Supplier, PurchaseOrder(Item), User
│   │   └── seed.js            # realistic demo data
│   ├── src/
│   │   ├── routes/            # Express routers (one per resource)
│   │   ├── controllers/       # request handling + validation
│   │   ├── services/          # domain logic: fefoService, alertService
│   │   ├── middleware/        # auth (JWT), error handling
│   │   └── utils/             # jwt, csv export, ApiError, asyncHandler
│   └── tests/                 # Vitest: FEFO dispensing, alert buckets, PO receiving
└── frontend/
    └── src/
        ├── api/                # axios client
        ├── context/            # AuthContext
        ├── components/         # shared UI: Layout, Modal, Badge, StatCard, etc.
        └── features/           # one folder per feature, each with its own api.js
            ├── auth/ dashboard/ products/ scan/ alerts/
            └── suppliers/ purchaseOrders/ reports/ barcodes/
```

## Setup

Requires Node.js 18+.

### 1. Backend

```bash
cd backend
npm install
npx prisma migrate dev --name init   # creates dev.db and applies the schema
npm run seed                          # populates demo data
npm run dev                           # starts the API on http://localhost:4000
```

### 2. Frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev                           # starts the app on http://localhost:5173
```

The Vite dev server proxies `/api/*` to `http://localhost:4000`, so the frontend and backend talk to each other with no extra configuration. Open **http://localhost:5173**.

### Running backend tests

```bash
cd backend
npm test
```

Tests run against a separate SQLite file (`test.db`) that Vitest's `globalSetup` creates automatically — they never touch your `dev.db` demo data.

### Resetting demo data

Re-run `npm run seed` from `backend/` at any point to wipe and regenerate fresh demo data.

## Demo accounts

Shown on the login screen for easy access:

| Role | Email | Password |
|---|---|---|
| Pharmacist (full access) | `frances@stockalert.demo` | `Pharmacist123!` |
| Assistant (view/dispense only) | `assistant@stockalert.demo` | `Assistant123!` |

## Architecture notes

- **SQLite has no native enum type**, so `Role`, `MovementType`, and `POStatus` are plain `String` columns in `schema.prisma`, constrained by application-level validation in the relevant controllers rather than the database.
- **FEFO dispensing** (`backend/src/services/fefoService.js`) is the one piece of logic every other feature depends on: it pulls a product's non-disposed batches ordered by `expiryDate ASC`, deducts from the earliest-expiring batch first, and splits across multiple batches inside a single Prisma transaction if one batch isn't enough. It's exercised directly (not just through the HTTP layer) in `tests/fefo.test.js`.
- **Alerts** (`backend/src/services/alertService.js`) are computed on read, not stored — a batch's expiry bucket (expired / ≤30d / ≤90d) and a product's low-stock status are derived from current data every time the dashboard, alerts page, or reports page loads, so they're never stale.
- **Purchase order receiving** creates a new `Batch` (and a `RECEIPT` stock movement) per line item received, and only advances a PO to `RECEIVED` once every line's `quantityReceived` has caught up to its `quantityOrdered` — partial receipts land in `PARTIALLY_RECEIVED` and can be received again later.
- **Every stock change is logged** as a `StockMovement` (`RECEIPT`, `DISPENSE`, `ADJUSTMENT`, or `DISPOSAL`) with the acting user, quantity, and reason — this is what powers the dashboard's recent-activity list and the movement-history report.
- **Role checks** live in Express middleware (`requireRole('PHARMACIST')`) on the backend and are mirrored in the frontend (`useAuth().isPharmacist`) purely to hide/disable UI the user isn't allowed to use — the backend is the actual enforcement point.
