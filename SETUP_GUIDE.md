# SIMS Setup Guide

Complete setup instructions for deploying SIMS with Supabase, GitHub, and Vercel.

---

## Prerequisites

- Node.js 18+ installed
- Git installed
- Accounts on [Supabase](https://supabase.com), [GitHub](https://github.com), and [Vercel](https://vercel.com)
- (Optional) [Resend](https://resend.com) account for email notifications

---

## Part 1: Supabase Setup

Supabase provides the database, authentication, and serverless functions.

### Step 1.1: Create Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click **New Project**
3. Enter project details:
   - **Name:** `sims` (or your preference)
   - **Database Password:** Generate a strong password (save this!)
   - **Region:** Choose closest to your users
4. Click **Create new project** and wait for provisioning (~2 minutes)

### Step 1.2: Set Up the Database

#### Recommended: Using Supabase CLI

If you have the [Supabase CLI](https://supabase.com/docs/guides/cli) installed:

1. Link your project: `supabase link --project-ref YOUR_PROJECT_REF`
2. Apply all migrations: `supabase db push`
3. (Optional) Load sample data: Run `supabase/seed.sql` in the SQL Editor

#### Alternative: Manual SQL Setup (no CLI required)

If you prefer not to use the CLI, run each migration file in the **SQL Editor** in order:

1. `supabase/migrations/20240101000000_baseline_extensions.sql`
2. `supabase/migrations/20240101000001_baseline_tables.sql`
3. `supabase/migrations/20240101000002_baseline_helper_functions.sql`
4. `supabase/migrations/20240101000003_baseline_rls_policies.sql`
5. `supabase/migrations/20240101000004_baseline_triggers_views.sql`
6. `supabase/migrations/20240101000005_baseline_rpc_functions.sql`
7. `supabase/migrations/20240101000006_baseline_storage.sql`
8. `supabase/migrations/20240101000007_baseline_smart_paste.sql`

Verify: Go to **Table Editor** — you should see tables like `inventory`, `packages`, `clients`, `notification_preferences`, etc.

### Step 1.3: (Optional) Load Sample Data

**File:** `supabase/seed.sql`

1. In **SQL Editor**, click **New query**
2. Copy the contents of `supabase/seed.sql`
3. Click **Run**
4. This populates the database with sample inventory items and clients

### Step 1.4: Get API Credentials

1. Go to **Settings** → **API**
2. Copy these values (you'll need them later):
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon/public key** (starts with `eyJ...`)

### Step 1.5: (Optional) Deploy Edge Functions for Email

**Files:**
- `supabase/functions/send-email/index.ts`
- `supabase/functions/due-date-reminder/index.ts`
- `supabase/functions/_shared/utils.ts`

If you want email notifications:

1. Install Supabase CLI: `npm install -g supabase`
2. Login: `supabase login`
3. Link project: `supabase link --project-ref YOUR_PROJECT_REF`
4. Deploy functions:
   ```bash
   supabase functions deploy send-email
   supabase functions deploy due-date-reminder
   ```
5. Set secrets (get API key from [resend.com](https://resend.com)):
   ```bash
   supabase secrets set RESEND_API_KEY=re_xxxxxxxxx
   supabase secrets set FROM_EMAIL=notifications@yourdomain.com
   ```

---

## Part 2: GitHub Setup

GitHub hosts your code and enables automatic deployments.

### Step 2.1: Create Repository

1. Go to [github.com](https://github.com) and sign in
2. Click **+** → **New repository**
3. Enter details:
   - **Repository name:** `sims`
   - **Visibility:** Private (recommended) or Public
4. Click **Create repository**

### Step 2.2: Push Code

In your terminal, from the SIMS project folder:

```bash
# Initialize git (if not already)
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial SIMS application"

# Add GitHub as remote (replace with your repo URL)
git remote add origin https://github.com/YOUR_USERNAME/sims.git

# Push to GitHub
git branch -M main
git push -u origin main
```

### Step 2.3: Verify Upload

**Key files that should be in your repository:**

```
├── package.json          # Dependencies and scripts
├── vite.config.js        # Build configuration
├── vercel.json           # Vercel deployment config
├── index.html            # Entry HTML
├── main.jsx              # React entry point
├── App.jsx               # Main application
├── lib/
│   ├── supabase.js       # Supabase client
│   └── DataContext.jsx   # Data provider
└── public/
    └── manifest.json     # PWA manifest
```

---

## Part 3: Vercel Setup

Vercel builds and hosts your application with automatic deployments.

### Step 3.1: Import Project

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **Add New...** → **Project**
3. Click **Import** next to your `sims` repository
4. Vercel auto-detects Vite - settings should show:
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`

### Step 3.2: Configure Environment Variables

Before deploying, add your Supabase credentials:

1. Expand **Environment Variables**
2. Add each variable:

| Name | Value |
|------|-------|
| `VITE_SUPABASE_URL` | `https://xxxxx.supabase.co` (from Step 1.7) |
| `VITE_SUPABASE_ANON_KEY` | `eyJ...` (from Step 1.7) |

3. Click **Deploy**

### Step 3.3: Verify Deployment

1. Wait for build to complete (~1-2 minutes)
2. Click the preview URL (e.g., `sims-xxxxx.vercel.app`)
3. You should see the SIMS login page
4. Login with any email and password `demo` (demo mode)

### Step 3.4: (Optional) Custom Domain

1. Go to your project **Settings** → **Domains**
2. Add your domain (e.g., `inventory.yourstudio.com`)
3. Follow DNS configuration instructions

---

## Part 4: Configuration Files Reference

### vercel.json

**Purpose:** Configures Vercel deployment and routing

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

This ensures client-side routing works correctly.

### vite.config.js

**Purpose:** Build configuration for Vite

Key settings:
- React plugin for JSX
- Build output to `dist/`
- Development server port

### lib/supabase.js

**Purpose:** Supabase client initialization

This file:
- Reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from environment
- Creates Supabase client
- Enables demo mode if credentials are missing

### public/manifest.json

**Purpose:** PWA configuration

Defines app name, icons, and colors for "Add to Home Screen" functionality.

---

## Part 5: Post-Deployment Checklist

### Verify Core Functionality

- [ ] Login page loads
- [ ] Demo mode login works (any email, password: `demo`)
- [ ] Dashboard displays
- [ ] Gear List shows items (if seed data loaded)
- [ ] Can create/edit/delete items
- [ ] Check-out flow works
- [ ] Check-in flow works

### Verify Database Connection

- [ ] Changes persist after page refresh
- [ ] Data appears in Supabase Table Editor
- [ ] Audit log records operations

### Verify Email Notifications (if configured)

- [ ] Notification Settings saves preferences
- [ ] Checkout sends confirmation email
- [ ] Check-in sends confirmation email
- [ ] Reservation sends confirmation email

---

## Troubleshooting

### "Demo Mode" appears when it shouldn't

**Cause:** Environment variables not set correctly

**Fix:**
1. Verify variables in Vercel dashboard
2. Variable names must start with `VITE_`
3. Redeploy after changing variables

### Database tables not found

**Cause:** Schema not run

**Fix:**
1. Run `supabase/schema.sql` in SQL Editor
2. Verify tables exist in Table Editor

### Styles look wrong

**Cause:** Build issue

**Fix:**
1. Check build logs in Vercel
2. Verify `index.css` is imported in `main.jsx`

### Edge Functions not working

**Cause:** Functions not deployed or secrets missing

**Fix:**
1. Verify functions deployed: `supabase functions list`
2. Verify secrets set: `supabase secrets list`
3. Check function logs in Supabase dashboard

---

## File Reference Summary

| Setup Step | File(s) Required |
|------------|------------------|
| Database tables | `supabase/schema.sql` |
| Notification tables | `notifications-schema.sql` |
| Database functions | `supabase/functions.sql` |
| Sample data | `supabase/seed.sql` |
| Image storage | `supabase/storage.sql` |
| Email function | `supabase/functions/send-email/index.ts` |
| Reminder function | `supabase/functions/due-date-reminder/index.ts` |
| Shared utilities | `supabase/functions/_shared/utils.ts` |
| Vercel config | `vercel.json` |
| Build config | `vite.config.js` |
| PWA manifest | `public/manifest.json` |
| Supabase client | `lib/supabase.js` |

---

## Quick Start Commands

```bash
# Clone your repo
git clone https://github.com/YOUR_USERNAME/sims.git
cd sims

# Install dependencies
npm install

# Create .env.local for local development
echo "VITE_SUPABASE_URL=https://xxxxx.supabase.co" >> .env.local
echo "VITE_SUPABASE_ANON_KEY=eyJ..." >> .env.local

# Run locally
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

---

## Support

- **Supabase Docs:** https://supabase.com/docs
- **Vercel Docs:** https://vercel.com/docs
- **Vite Docs:** https://vitejs.dev/guide/
