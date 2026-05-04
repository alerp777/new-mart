# 🚀 AJKMart - Complete Startup Guide

## Current Status

✅ **API Server**: Running on `http://localhost:4000`  
✅ **Database**: Connected to Neon PostgreSQL  
✅ **Health Check**: Passing (`/api/health` responds with `{"status":"ok","db":"ok"}`  
✅ **Configuration**: Complete environment setup done  

---

## 🎯 Quick Start (2 Minutes)

### 1. Set Up Environment (First Time Only)
```bash
bash permanent-setup.sh
cp .env artifacts/api-server/.env
```

### 2. Start All Services
```bash
# Option A: From root (runs all at once)
pnpm run codespace-start

# Option B: Start individual services
cd artifacts/api-server && pnpm run dev     # API server (port 4000)
```

### 3. Verify Everything Works
```bash
# Test API health
curl http://localhost:4000/api/health

# Expected response
# {"status":"ok","db":"ok","timestamp":"...","serverEpoch":...}
```

---

## 📋 Service Ports

| Service | Port | URL | Status |
|---------|------|-----|--------|
| **API Server** | 4000 | `http://localhost:4000` | ✅ Running |
| **Admin Panel** | 5173 | `http://localhost:5173/admin` | 🟡 Check logs |
| **Vendor App** | 21463 | `http://localhost:21463/vendor` | 🟡 Check logs |
| **Rider App** | 22969 | `http://localhost:22969/rider` | 🟡 Check logs |
| **Customer App (Expo)** | 19006 | `http://localhost:19006` | 🟡 Check logs |
| **Mockup Sandbox** | 8081 | `http://localhost:8081/__mockup` | 🟡 Check logs |

---

## 🔐 Security & Secrets

### Encryption
- **Method**: AES-256-CBC
- **Password**: `Khan@123.com`
- **Encrypted File**: `.env.enc`
- **Commands**:
  ```bash
  # Decrypt
  node scripts/decrypt.mjs
  
  # Encrypt (after making changes)
  node scripts/encrypt.mjs
  ```

### Environment Variables Included
```env
# Database
DATABASE_URL=postgresql://neondb_owner:...@ep-solitary-credit...

# Authentication
JWT_SECRET=PUkuIh+8NSn80k68j1sAR1zPGtK7xryE8LTbaM6hGA...
ADMIN_JWT_SECRET=QOHAcA0Y3m6yyQ1jW8FnQu995T5e8XupSnhKch6SF8RIK...
ADMIN_REFRESH_SECRET=xs3F!d9#2kL@qW8^mY5&zR7*vT6nC4bV1_aP0eJ8hG3...
VENDOR_JWT_SECRET=v3nd0rS3cr3t#2025!L0ngEn0ughF0rJWT1234567890...
RIDER_JWT_SECRET=r1d3rK3y!Secur3P@ssw0rdL0ngStr1ngF0rJWT...

# APIs & Keys
GEMINI_API_KEY=AIzaSyDdujmMRDG4_z0z8zG908_f4jNHACg9EHk
VAPID_PUBLIC_KEY=BKn6gUMFchM8LAv6OUfXoBKnnKkViTRl0jSY7LcOn3fTYu...
VAPID_PRIVATE_KEY=b3egnGyDJYSVsOB4z-PGhf5YbGeuVKcHtNpJPQ-r-eM

# Server
PORT=4000
NODE_ENV=development
```

---

## 🐛 Troubleshooting

### Issue: "Cannot Reach Server" Error in Admin Panel

**Symptom**: Admin panel shows error when trying to connect to `/api/health`

**Root Cause**: API server environment not properly configured

**Fix**:
```bash
# 1. Check if API server is running
curl http://localhost:4000/api/health

# 2. If no response, restart it
cd artifacts/api-server
pnpm run dev

# 3. If DATABASE_URL error, run setup
bash permanent-setup.sh
cp .env artifacts/api-server/.env

# 4. Restart again
cd artifacts/api-server && pnpm run dev
```

### Issue: "DATABASE_URL must be set" Error

**Solution**:
```bash
bash permanent-setup.sh
cp .env artifacts/api-server/.env

# Verify DATABASE_URL exists
grep DATABASE_URL .env
```

### Issue: ADMIN_JWT_SECRET Not Set

**Solution**: Same as above (permanent-setup.sh creates all required secrets)

### Issue: Port Already in Use

**Solution** - Ports 4000-23000 are in use:
```bash
# Check what's using port 4000
lsof -i :4000

# Kill process if needed
kill -9 <PID>

# Or use fallback (set in .env)
PORT=4001 pnpm run dev
```

### Issue: Admin Panel Can't Connect to API

**Checklist**:
- ☐ API server running: `curl http://localhost:4000/health`
- ☐ Proxy correct in admin vite.config.ts (should be `http://127.0.0.1:4000`)
- ☐ Admin dev server running (port 5173)
- ☐ No CORS errors in browser console
- ☐ Both on same network (Codespace)

---

## 📁 Project Structure

```
/workspaces/new-mart/
├── .env                          ← Main environment config (encrypted backup in .env.enc)
├── package.json                  ← Root workspace config
├── pnpm-workspace.yaml           ← Monorepo settings
│
├── artifacts/                    ← All applications
│   ├── api-server/               ← Backend API (Express, port 4000)
│   │   ├── src/
│   │   │   ├── routes/          ← API endpoints
│   │   │   ├── services/        ← Business logic
│   │   │   └── index.ts         ← Server entry point
│   │   └── package.json
│   │
│   ├── admin/                    ← Admin dashboard (React, port 5173)
│   │   ├── src/
│   │   │   ├── pages/           ← Admin pages
│   │   │   └── hooks/           ← Custom hooks (checkApiHealth)
│   │   └── vite.config.ts       ← Proxy to API
│   │
│   ├── vendor-app/               ← Vendor portal (React, port 21463)
│   ├── rider-app/                ← Rider app (React, port 22969)
│   ├── ajkmart/                  ← Customer app (Expo, port 19006)
│   └── mockup-sandbox/           ← Mockup server (port 8081)
│
├── lib/                          ← Shared libraries
│   ├── db/                       ← Database layer (@workspace/db)
│   │   ├── src/
│   │   │   ├── connection-url.ts ← Loads DATABASE_URL
│   │   │   └── schema/           ← Drizzle schemas
│   │   └── drizzle.config.ts
│   │
│   ├── api-client-react/         ← API client hooks
│   ├── auth-utils/               ← Auth helpers
│   ├── phone-utils/              ← Phone number handling
│   └── i18n/                     ← Translations
│
├── scripts/                      ← Utility scripts
│   ├── launchers/
│   │   └── start.mjs             ← Main launcher
│   ├── decrypt.mjs               ← Decrypt .env.enc
│   └── encrypt.mjs               ← Encrypt .env
│
├── deploy/                       ← Deployment configs
├── docs/                         ← Documentation
└── README.md                     ← This file
```

---

## 🔨 Common Commands

### Development
```bash
# Start all services (monorepo)
pnpm run codespace-start

# Start individual service
cd artifacts/api-server && pnpm run dev
cd artifacts/admin && pnpm run dev

# Stop all
Ctrl+C in the terminal
```

### Database
```bash
# Push schema changes
cd artifacts/api-server
pnpm exec drizzle-kit push

# View database
psql $DATABASE_URL
```

### Environment
```bash
# Decrypt .env.enc
node scripts/decrypt.mjs

# Encrypt .env (after changes)
node scripts/encrypt.mjs
```

### Build
```bash
# Build API server
cd artifacts/api-server && pnpm run build

# Build admin panel
cd artifacts/admin && pnpm run build
```

### Type Checking
```bash
# Check TypeScript in api-server
cd artifacts/api-server && pnpm run typecheck

# Check all workspaces
pnpm run typecheck --recursive
```

---

## 📊 Health Check Dashboard

### Check API Server Health
```bash
curl http://localhost:4000/api/health | jq .
```

Example response:
```json
{
  "status": "ok",
  "uptime": 142.567,
  "db": "ok",
  "timestamp": "2026-05-04T06:26:01.234Z",
  "serverEpoch": 1714827961
}
```

### Check Schema Drift (Admin Only)
```bash
curl -X GET http://localhost:4000/api/health/schema-drift \
  -H "Authorization: Bearer <admin_token>"
```

---

## 🚨 Emergency Restart

If things go wrong:

```bash
# 1. Kill all Node processes
pkill -f node

# 2. Clear cache
rm -rf artifacts/*/node_modules/.vite
rm -rf artifacts/*/dist

# 3. Reinstall dependencies  
pnpm install

# 4. Restart setup
bash permanent-setup.sh
cp .env artifacts/api-server/.env

# 5. Start fresh
pnpm run codespace-start
```

---

## 📚 Documentation

- [API Server Setup Guide](./API_SERVER_SETUP_GUIDE.md) - Detailed API setup
- [Encryption Guide](./scripts/decrypt.mjs) - How to manage secrets
- [Permanent Setup](./permanent-setup.sh) - See what it configures

---

## 🎓 Key Concepts

### Database Connection
The app uses **Neon PostgreSQL** (serverless, connection pooled).
- Connection URL in `DATABASE_URL` env var
- Loaded via `@workspace/db` package
- Drizzle ORM for queries

### Authentication
Multiple JWT secrets for different apps:
- `JWT_SECRET` - General user auth
- `ADMIN_JWT_SECRET` - Admin panel (min 32 chars)
- `VENDOR_JWT_SECRET` - Vendor app
- `RIDER_JWT_SECRET` - Rider app

### API Proxy
Development proxies `/api/*` requests through the API server:
- Admin: `http://127.0.0.1:5173/api` → `http://127.0.0.1:4000/api`
- Vendor: `http://127.0.0.1:21463/api` → `http://127.0.0.1:4000/api`
- Each app's vite.config.ts handles this

---

## 📞 Support

For issues, check:
1. `.env` exists with `DATABASE_URL`
2. API server running: `curl http://localhost:4000/api/health`
3. Check logs in terminal where services started
4. See API_SERVER_SETUP_GUIDE.md for detailed troubleshooting

---

**Last Updated**: May 4, 2026  
**Status**: ✅ Production Ready  
**Encryption**: AES-256-CBC (Khan@123.com)
