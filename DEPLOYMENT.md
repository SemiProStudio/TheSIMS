# SIMS Deployment Guide

This guide covers deploying SIMS to Vercel with Supabase as the backend.

## Prerequisites

- Node.js 18+
- A Supabase account (free tier works fine)
- A Vercel account (free tier works fine)
- Git

## Step 1: Set Up Supabase

### 1.1 Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Fill in:
   - **Name**: SIMS (or your preferred name)
   - **Database Password**: Generate a strong password (save it!)
   - **Region**: Choose closest to your users
4. Click "Create new project" and wait for setup (~2 minutes)

### 1.2 Run Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Click "New query"
3. Run the SQL files in this order:
   - `supabase/schema.sql` - Core tables and relationships
   - `supabase/functions.sql` - Database functions
   - `supabase/storage.sql` - Storage bucket setup
   - `supabase/seed.sql` - Sample data (optional)

### 1.3 Get API Credentials

1. Go to **Settings** > **API**
2. Copy these values:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon public** key (under Project API keys)

### 1.4 Configure Authentication (Optional)

1. Go to **Authentication** > **Providers**
2. Enable Email provider (enabled by default)
3. Configure other providers as needed (Google, GitHub, etc.)

## Step 2: Configure Environment Variables

### 2.1 Local Development

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` with your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

3. Test locally:
   ```bash
   npm install
   npm run dev
   ```

## Step 3: Deploy to Vercel

### 3.1 Using Vercel CLI

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Login to Vercel:
   ```bash
   vercel login
   ```

3. Deploy:
   ```bash
   vercel
   ```

4. Follow the prompts:
   - Set up and deploy? **Y**
   - Which scope? (Select your account)
   - Link to existing project? **N** (first time)
   - Project name? **sims** (or your preferred name)
   - Directory? **./** 
   - Override settings? **N**

5. Add environment variables:
   ```bash
   vercel env add VITE_SUPABASE_URL
   vercel env add VITE_SUPABASE_ANON_KEY
   ```

6. Redeploy with environment variables:
   ```bash
   vercel --prod
   ```

### 3.2 Using Vercel Dashboard

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "Add New" > "Project"
3. Import your Git repository
4. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: ./
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Add Environment Variables:
   - `VITE_SUPABASE_URL` = your Supabase URL
   - `VITE_SUPABASE_ANON_KEY` = your Supabase anon key
6. Click "Deploy"

## Step 4: Configure Domain (Optional)

1. In Vercel dashboard, go to your project
2. Click **Settings** > **Domains**
3. Add your custom domain
4. Configure DNS as instructed

## Demo Mode

If environment variables are not set, SIMS runs in "demo mode" with local sample data. This is useful for:
- Testing without a database
- Offline development
- Quick demos

To enable demo mode, simply don't provide Supabase credentials.

## Database Schema Overview

### Tables

| Table | Description |
|-------|-------------|
| `inventory` | Core equipment items |
| `reservations` | Equipment bookings |
| `maintenance_records` | Service history |
| `clients` | Customer information |
| `packages` | Pre-defined equipment bundles |
| `pack_lists` | User-created packing lists |
| `categories` | Equipment categories |
| `specs` | Category-specific fields |
| `locations` | Storage locations (hierarchical) |
| `users` | User profiles (extends Supabase auth) |
| `roles` | Permission roles |
| `audit_log` | Activity history |

### Key Features

- **Row Level Security (RLS)**: All tables have RLS policies
- **Auto-timestamps**: `created_at` and `updated_at` are auto-managed
- **Cascading deletes**: Related records are cleaned up automatically
- **Database functions**: Helper RPCs for common operations

## Troubleshooting

### "Supabase credentials not found"
- Check that `.env` file exists and has correct values
- Ensure variable names start with `VITE_`
- Restart the dev server after changing `.env`

### "Permission denied" errors
- Check that RLS policies are created (run schema.sql)
- Ensure the user is authenticated
- Check the user's role permissions

### Build fails on Vercel
- Ensure environment variables are set in Vercel
- Check build logs for specific errors
- Try running `npm run build` locally first

### Data not loading
- Check browser console for errors
- Verify Supabase URL is correct (no trailing slash)
- Check Supabase dashboard for API errors

## Updating the Schema

When updating the database schema:

1. Write migration SQL
2. Test locally with Supabase CLI or a test project
3. Apply to production Supabase via SQL Editor
4. Deploy updated application code

## Security Notes

- Never commit `.env` files to Git
- Use environment variables for all secrets
- The `anon` key is safe to expose (RLS protects data)
- For admin operations, use the `service_role` key server-side only

## Support

- [Supabase Documentation](https://supabase.com/docs)
- [Vercel Documentation](https://vercel.com/docs)
- [Vite Documentation](https://vitejs.dev/guide/)
