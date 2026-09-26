# WHEEL ASSEMBLERS: NEXT.JS + SUPABASE + RENDER DEPLOYMENT GUIDE

This guide walks you through linking your Next.js application repository on GitHub to Render for 24/7 live hosting, connected to your Supabase PostgreSQL backend.

---

## 1. Supabase Backend Setup

### Step 1.1: Create Supabase Project
1. Log into [Supabase Dashboard](https://supabase.com/dashboard).
2. Click **New Project**, select your organization, name the project `wheel-assemblers-wcs`, set a secure database password, and choose the closest region.
3. Once the database provisions, navigate to **SQL Editor** in the left sidebar.

### Step 1.2: Execute Database Migration Schema
1. Open the file `supabase_schema.sql` provided in this repository.
2. Paste the entire SQL script into the Supabase SQL Editor and click **Run**.
3. Verify that the following tables exist in the **Table Editor**:
   - `shuttles`
   - `inspections`
   - `inspection_items`
   - `maintenance_logs`
   - `racking_cavities`
   - `throughput_logs`
   - `oee_metrics`
   - `standard_operating_procedures`
4. Confirm that the RPC function `submit_daily_inspection` and view `view_shuttle_maintenance_gauges` were successfully compiled under **Database -> Functions** and **Views**.

### Step 1.3: Enable Realtime for Live TV Dashboard
1. Go to **Database -> Publications** (or **Replication**).
2. Toggle on replication for the `shuttles` and `throughput_logs` tables so the TV screen auto-updates without manual refreshes.

### Step 1.4: Retrieve API Keys
1. Go to **Project Settings -> API**.
2. Copy the **Project URL** (`https://xyzcompany.supabase.co`).
3. Copy the **anon / public** key (`eyJhbGciOiJIUzI1NiIsInR5c...`).

---

## 2. GitHub Repository Configuration

### Step 2.1: Local Next.js Project Structure
Ensure your Next.js repository has the following file layout:

```
wheel-assemblers/
├── app/
│   ├── layout.tsx
│   ├── page.tsx               # Redirect or Landing selector
│   ├── mobile/
│   │   └── page.tsx           # Module A: Mobile Operator Interlock
│   └── tv/
│       └── page.tsx           # Module B, C, D: Large Screen TV Dashboard
├── src/
│   ├── components/
│   │   ├── MobileInspectionView.tsx
│   │   └── TvKpiDashboard.tsx
│   ├── lib/
│   │   └── supabaseClient.ts
│   └── types.ts
├── public/
├── supabase_schema.sql
├── package.json
├── tailwind.config.js
└── .env.local
```

### Step 2.2: Git Push to GitHub
1. In your local terminal:
```bash
git init
git add .
git commit -m "feat: initial commit with mobile interlock, TV dashboard, and Supabase schema"
git branch -M main
git remote add origin https://github.com/<your-username>/wheel-assemblers-dashboard.git
git push -u origin main
```

---

## 3. Render Deployment Setup

Render hosts modern Next.js applications seamlessly via Docker or Node Web Services.

### Step 3.1: Create Web Service on Render
1. Log into [Render](https://render.com).
2. Click **New +** in the top navigation bar and select **Web Service**.
3. Choose **Build and deploy from a Git repository** and connect your GitHub account.
4. Select your repository: `<your-username>/wheel-assemblers-dashboard`.

### Step 3.2: Configure Web Service Parameters
Configure the service with these settings:
- **Name:** `wheel-assemblers-wcs`
- **Region:** Choose the region closest to your facility / Supabase instance (e.g., Frankfurt or Ohio)
- **Branch:** `main`
- **Root Directory:** (leave blank if repository root is Next.js app)
- **Runtime:** `Node`
- **Build Command:**
  ```bash
  npm install && npm run build
  ```
- **Start Command:**
  ```bash
  npm run start
  ```
- **Plan:** Free or Starter (Starter is recommended for always-on warehouse TV screens to avoid cold-boot sleep).

### Step 3.3: Set Environment Variables in Render
In the **Environment Variables** section on Render, add:
1. `NEXT_PUBLIC_SUPABASE_URL` = `<Your Supabase Project URL>`
2. `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `<Your Supabase Anon / Public Key>`
3. `NODE_VERSION` = `18.17.0` (or `20.x`)

### Step 3.4: Deploy and Verify
1. Click **Create Web Service**.
2. Render will pull from GitHub, run `npm install`, compile the Next.js production build (`npm run build`), and spin up the server.
3. Once the build log displays `Your service is live 🎉`, click the assigned URL (e.g. `https://wheel-assemblers-wcs.onrender.com`).
4. Bookmarks for plant floor operations:
   - Mobile Operators (Forklift mounting): `https://wheel-assemblers-wcs.onrender.com/mobile`
   - 65" Warehouse TV Dashboard: `https://wheel-assemblers-wcs.onrender.com/tv`

---

## 4. Production Tips for Industrial Engineers

1. **Daily Reset Automation (Midnight Interlock):**
   In Supabase, enable the `pg_cron` extension under **Database -> Extensions** and schedule the stored procedure:
   ```sql
   SELECT cron.schedule('shuttle_daily_lockout', '0 0 * * *', 'SELECT reset_shuttles_daily_interlock();');
   ```
   This ensures that at 00:00 every morning, both shuttles automatically revert to `LOCKED_PENDING_INSPECTION` before the morning shift arrives.

2. **Full-Screen TV Display Mode:**
   Configure the smart TV or industrial mini-PC (e.g. Raspberry Pi / Intel NUC) to boot Chromium in kiosk mode:
   ```bash
   chromium-browser --kiosk --noerrdialogs --disable-infobars https://wheel-assemblers-wcs.onrender.com/tv
   ```
