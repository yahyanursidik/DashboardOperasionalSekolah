# TSLS Admin OS

Admin TSLS OS is a school management administrative panel. It uses Vite, React, TypeScript, TailwindCSS, and Refine with Supabase as the backend.

## Local Development Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   ```
   Fill in your Supabase credentials.

3. Start the dev server:
   ```bash
   npm run dev
   ```

## Netlify Deployment Guide

This project is configured for seamless deployment on Netlify.

### 1. Supabase Backend Setup
1. Go to [Supabase](https://supabase.com) and create a new project.
2. In the Supabase dashboard, navigate to **SQL Editor**.
3. Run the SQL migrations found in the `/supabase/migrations` directory in chronological order to create the database schema.
4. Go to **Authentication > Providers** and ensure Email provider is enabled.
5. Create your first Super Admin user:
   - Sign up a new user via Supabase Auth or your app's signup page (if exposed).
   - In Supabase SQL Editor, run:
     ```sql
     INSERT INTO user_roles (user_id, role) VALUES ('<user_uuid>', 'super_admin');
     ```

### 2. Configure Netlify
1. Log in to [Netlify](https://app.netlify.com).
2. Click **Add new site** > **Import an existing project**.
3. Connect your GitHub repository containing this code.
4. Netlify will automatically read the `netlify.toml` file to configure the build (`npm run build`) and publish directory (`dist`).

### 3. Add Environment Variables
Before deploying, you must add your Supabase credentials to Netlify:
1. In the Netlify site setup (or Site settings > Environment variables), add the following keys:
   - `VITE_SUPABASE_URL`: Your Supabase Project URL.
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase Project `anon` public key.
   *(These can be found in Supabase under Project Settings > API).*

### 4. Deploy
1. Click **Deploy site**.
2. Netlify will build the app and deploy it.
3. The `netlify.toml` automatically handles SPA routing by redirecting all paths to `index.html`.

> **Note:** Never commit `.env` or `.env.local` files containing your real Supabase keys to the repository. Only `.env.example` should be tracked.
