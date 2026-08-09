# Pizza Capucino Reservation MVP - Complete Build

This build delivers the full restaurant reservation MVP on top of the existing frontend without redesigning the customer-facing website.

## Included

- Express backend with JWT admin auth, bcrypt hashing, CORS, rate limiting, and Prisma MySQL models
- Public reservation flow with:
  - branch selection
  - guest/date/time validation
  - overbooking prevention
  - preorder dishes
  - manual GPay or UPI QR payment instructions
  - booking lookup by booking ID and phone
- Admin dashboard with:
  - summary cards
  - reservation queue
  - payment verification
  - preorder orders view
  - branch seat management
  - calendar view
  - analytics panels
  - notifications
  - settings management
  - menu CRUD
- Menu image uploads stored on Cloudinary (free tier) so they survive redeploys on ephemeral-disk hosts
- Email hooks for booking confirmation, status changes, and payment updates
- Generated SQL schema, seed data, environment example, and setup docs

## Important payment flow

This MVP uses manual preorder payment instead of live card charging.

1. Customer selects `Reserve Table + Pre-order Food`.
2. The site shows the configured GPay or UPI QR and WhatsApp number.
3. Customer pays manually and sends the screenshot to the restaurant WhatsApp.
4. Admin verifies the payment inside the dashboard.
5. The screenshot itself is **not** uploaded or stored by this app.

## Setup

1. Copy `.env.example` to `.env`
2. Update `DATABASE_URL`, `JWT_SECRET`, and optional SMTP values
3. Install dependencies:

```powershell
npm.cmd install
```

4. Generate Prisma client:

```powershell
npm.cmd run prisma:generate
```

5. Push schema to MySQL:

```powershell
npm.cmd run db:push
```

6. Seed starter data:

```powershell
npm.cmd run db:seed
```

7. Start the app:

```powershell
npm.cmd run dev
```

## URLs

- Website: `http://localhost:4000/`
- Reservation page: `http://localhost:4000/reserve.html`
- Admin login: `http://localhost:4000/admin/login`
- Admin dashboard: `http://localhost:4000/admin`

## Seeded admin

- Username: value from `ADMIN_SEED_USERNAME`
- Password: value from `ADMIN_SEED_PASSWORD`

## Main API endpoints

- `GET /api/health`
- `GET /api/public/bootstrap`
- `GET /api/public/menu`
- `GET /api/public/availability`
- `POST /api/public/reservations`
- `GET /api/public/reservations/:bookingCode?phone=...`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/admin/dashboard-summary`
- `GET /api/admin/reservations`
- `PATCH /api/admin/reservations/:id/status`
- `GET /api/admin/payments`
- `PATCH /api/admin/payments/:id`
- `GET /api/admin/orders`
- `GET /api/admin/menu`
- `POST /api/admin/menu`
- `PATCH /api/admin/menu/:id`
- `DELETE /api/admin/menu/:id`
- `GET /api/admin/analytics`
- `GET /api/admin/calendar`
- `GET /api/admin/settings`
- `PATCH /api/admin/settings`
- `GET /api/admin/notifications`
- `PATCH /api/admin/notifications/:id/read`
- `POST /api/admin/notifications/read-all`
- `GET /api/admin/branches`
- `PATCH /api/admin/branches/:id`

## Deploying for free (Render + TiDB Cloud + Cloudinary)

1. **Database — TiDB Cloud Serverless** (free, MySQL-compatible, no code changes needed)
   - Sign up at tidbcloud.com, create a free Serverless cluster.
   - Open the "Connect" panel and copy the connection string. It'll look like:
     `mysql://<user>.root:<password>@gateway01.<region>.prod.aws.tidbcloud.com:4000/pizzacapucino?sslaccept=strict`
   - Use that as `DATABASE_URL`.

2. **Image storage — Cloudinary** (free tier)
   - Sign up at cloudinary.com.
   - From the dashboard, copy either the single `CLOUDINARY_URL` or the three
     separate `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` values.

3. **App server — Render** (free web service)
   - Push this project to a GitHub repo.
   - In Render, choose "New > Blueprint" and point it at the repo — it will
     read `render.yaml` and set up the service and build/start commands
     automatically (`npm install && npx prisma generate` to build,
     `npx prisma migrate deploy && npm start` to start, which applies
     pending migrations on every deploy).
   - Fill in the env vars marked as manual in the Render dashboard:
     `DATABASE_URL`, `CORS_ORIGIN` (your Render URL, e.g.
     `https://pizzacapucino-mvp.onrender.com`), `ADMIN_SEED_*`,
     `CLOUDINARY_*`, and SMTP creds if you want real emails.
   - After the first deploy, open the Shell tab in Render and run
     `npm run db:seed` once to create the admin user and starter data.

4. **Known free-tier tradeoffs**
   - Render's free web service spins down after ~15 minutes idle; the next
     request wakes it up with a 30-60s delay.
   - TiDB Cloud's free tier caps storage at 5GB — plenty for an MVP.
   - Cloudinary's free tier has generous but not unlimited storage/bandwidth —
     fine for testing and early traffic, worth checking before real launch.

## Notes

- The current data and frontend references still contain 3 branches (`Chathiram`, `Tennur`, `Kattur`), even though the original brief mentioned 2. The system now supports any number of active branches.
- Full end-to-end booking, payment, analytics, and admin behavior requires a running MySQL database.
- SMTP is optional. If SMTP is not configured, the email service falls back to a non-delivery JSON transport so the app can still run locally.
