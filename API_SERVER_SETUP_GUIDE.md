# API Server Setup & Troubleshooting Guide

## Issue: "Cannot Reach Server - The admin panel could not connect to the API server"

### ✅ Root Cause & Fix Applied

The API server couldn't start because critical environment variables were missing:
- `DATABASE_URL` (PostgreSQL connection)
- `ADMIN_JWT_SECRET` (authentication)
- Other JWT secrets

### Solution Steps

#### 1. **Complete Environment Setup** (One-time)
```bash
bash permanent-setup.sh
```
This creates a complete `.env` file with:
- `DATABASE_URL` pointing to Neon PostgreSQL
- All JWT secrets (ADMIN_JWT_SECRET, VENDOR_JWT_SECRET, RIDER_JWT_SECRET)
- VAPID keys for push notifications
- API keys (Gemini, etc.)

#### 2. **Propagate .env to API Server**
```bash
cp .env artifacts/api-server/.env
```
The API server imports from `@workspace/db` which uses dotenv to load environment variables. The .env must exist in the api-server directory.

#### 3. **Start the API Server**

**Option A: Using pnpm (recommended)**
```bash
cd artifacts/api-server
pnpm run dev
```

**Option B: Direct tsx**
```bash
cd artifacts/api-server  
pnpm exec tsx --enable-source-maps ./src/index.ts
```

### ✅ Verify It Works

Test the health endpoint:
```bash
curl http://localhost:4000/api/health
```

Expected response:
```json
{
  "status": "ok",
  "uptime": 12.345,
  "db": "ok",
  "timestamp": "2026-05-04T06:26:01...",
  "serverEpoch": 1714827961
}
```

---

## Port Configuration

| Service | Port | Environment Var | Notes |
|---------|------|-----------------|-------|
| API Server | 4000 | `PORT` in .env | Primary backend |
| Admin Panel | 5173 | `ADMIN_DEV_PORT` | Vite dev server |
| Vendor App | 21463 | `VENDOR_DEV_PORT` | Vite dev server |
| Rider App | 22969 | `RIDER_DEV_PORT` | Vite dev server |

**Admin Panel Proxy**: The admin Vite config proxies `/api/*` to `http://127.0.0.1:8080` by default. 
> **ISSUE**: This doesn't match the API server port (4000). The API server app.ts actually serves at the proxied path.

---

## Environment Variables Required

### Critical (API Server Won't Start Without These)
- `DATABASE_URL` - PostgreSQL connection string
- `ADMIN_JWT_SECRET` - Min 32 chars, used for admin authentication
- `JWT_SECRET` - For general app auth
- `PORT` - Server port (default: 4000)

### Important (Features Won't Work Without These)
- `ADMIN_REFRESH_SECRET` - Admin token refresh
- `VENDOR_JWT_SECRET` - Vendor app auth
- `RIDER_JWT_SECRET` - Rider app auth
- `ERROR_REPORT_HMAC_SECRET` - Error report verification
- `VAPID_PRIVATE_KEY` / `VAPID_PUBLIC_KEY` - Push notifications

### Optional
- `GEMINI_API_KEY` - For AI features
- `REDIS_URL` - Rate limiting (defaults to in-memory)
- `NODE_ENV` - 'development' | 'production'

---

## Troubleshooting

### Problem: "DATABASE_URL, APP_DATABASE_URL, or NEON_DATABASE_URL must be set"
**Solution**: Run `bash permanent-setup.sh` and copy .env to api-server

### Problem: "ADMIN_JWT_SECRET environment variable is not set"
**Solution**: Same as above

### Problem: Admin can't reach /api/health
**Check**:
1. API server is running: `curl http://localhost:4000/api/health`
2. Admin's .env or vite config has correct API proxy target
3. Both are on the same Codespace/host

### Problem: Database migration fails  
**Check**:
1. DATABASE_URL is valid and accessible
2. Neon PostgreSQL cluster is reachable: `psql $DATABASE_URL -c "SELECT 1"`
3. Run manually: `cd artifacts/api-server && pnpm exec drizzle-kit push`

---

## Current Configuration

**Password**: Khan@123.com
**Encrypted File**: `.env.enc` (AES-256-CBC)
**Encryption Script**: `node scripts/decrypt.mjs`

To re-encrypt after changes:
```bash
node scripts/encrypt.mjs
```

---

## Full Startup Script

```bash
#!/bin/bash
set -e

# 1. Set up environment
bash permanent-setup.sh

# 2. Copy to api-server
cp .env artifacts/api-server/.env

# 3. Start API server
cd artifacts/api-server
pnpm run dev
```

Run this from the repo root.
