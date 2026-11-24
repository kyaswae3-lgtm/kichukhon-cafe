# Kichukhon Cafe
Full-stack food ordering and delivery management platform.

## Stack
- Frontend: React, Vite, Tailwind CSS, React Router
- Backend: Node.js, Express, PostgreSQL (`pg`)
- Authentication: JWT + bcrypt
- Validation/security: Zod, Helmet, CORS, rate limiting
- Image storage: Cloudinary adapter-ready
- Payments: COD plus gateway integration boundaries for bKash, Nagad and SSLCommerz

## Requirements
Node.js 20+, npm, PostgreSQL 14+.

## 1. Configure PostgreSQL
Create a database:
```sql
CREATE DATABASE kichukhon_cafe;
```
Run the schema and seed:
```bash
cd backend
cp .env.example .env
# Edit DATABASE_URL and JWT_SECRET
npm install
npm run db:migrate
npm run db:seed
npm run dev
```
Backend runs at `http://localhost:5000`; health check: `/api/health`.

## 2. Start frontend
In a second terminal:
```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```
Open `http://localhost:5173`.

## Demo accounts
Seed creates:
- Admin: `admin@kichukhoncafe.com` / `Admin123!`
- Customer: `customer@example.com` / `Customer123!`
Change these credentials immediately outside local development.

## Implemented foundation
Authentication, role checks, catalog/categories, cart, addresses, coupon validation,
order creation, order history/status, admin order/food/category/customer/coupon
management, reviews, favorites, and sales summary endpoints are implemented.
The UI includes menu browsing, category filtering, cart, login/register, customer
orders, and a protected admin workspace.

## Payment safety
Cash on Delivery is supported. Online gateway routes are deliberately disabled
until official merchant credentials and the provider's current API/signature
requirements are configured. A payment is never marked successful by this starter
without a verified provider callback. Do not use test secrets in production.

## Production checklist
- Use HTTPS and a strong random JWT_SECRET.
- Restrict CORS to the real frontend origin.
- Configure database backups, migrations, monitoring and log retention.
- Configure Cloudinary credentials and validate uploaded file types/size.
- Implement and test official bKash/Nagad/SSLCommerz merchant onboarding,
  signature verification, callback IP/host verification where required, idempotency,
  refunds and reconciliation before accepting online payments.
- Add email/SMS/push provider credentials before enabling notifications.
- Add automated integration tests and security review before launch.
