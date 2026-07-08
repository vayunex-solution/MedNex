# Nex Platform Core (NPC) — Complete Developer Guide

> **Version:** 1.0.0 | **Base Domain:** `sdk.vayunexsolution.com` | **Local:** `http://localhost:5001`

---

## Table of Contents

1. [NPC Kya Hai?](#1-npc-kya-hai)
2. [Architecture Overview](#2-architecture-overview)
3. [Setup Guide (Local Dev)](#3-setup-guide-local-dev)
4. [Admin Console Setup](#4-admin-console-setup)
5. [Apna SaaS NPC Se Connect Karo](#5-apna-saas-npc-se-connect-karo)
6. [Authentication APIs](#6-authentication-apis)
7. [Tenant Provisioning APIs](#7-tenant-provisioning-apis-saas-developers)
8. [Application Registry APIs](#8-application-registry-apis-admin-only)
9. [User Management APIs](#9-user-management-apis)
10. [Business & Branch APIs](#10-business--branch-apis)
11. [SDK Integration Guide](#11-sdk-integration-guide)
12. [Webhooks](#12-webhooks)
13. [API Response Format](#13-api-response-format)
14. [Error Codes](#14-error-codes)
15. [Rate Limits](#15-rate-limits)
16. [Naya SaaS Product Add Karna](#16-naya-saas-product-add-karna)

---

## 1. NPC Kya Hai?

**Nex Platform Core (NPC)** ek **central control plane** hai jo Vayunex Solution ke saare SaaS products ko ek jagah manage karta hai.

```
┌─────────────────────────────────────────────────┐
│              NPC (Control Plane)                │
│          sdk.vayunexsolution.com                │
│                                                 │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐   │
│  │  Auth     │  │  Tenants  │  │  Users    │   │
│  │  Engine   │  │  Manager  │  │  Engine   │   │
│  └───────────┘  └───────────┘  └───────────┘   │
│                                                 │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐   │
│  │  Webhooks │  │  API Keys │  │  Audit    │   │
│  │  Gateway  │  │  Manager  │  │  Logs     │   │
│  └───────────┘  └───────────┘  └───────────┘   │
└────────────────────────┬────────────────────────┘
                         │ SDK / REST API
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
    ┌─────────┐    ┌─────────┐    ┌─────────┐
    │ MedNex  │    │HotelNex │    │  Any    │
    │  SaaS   │    │  SaaS   │    │  SaaS   │
    └─────────┘    └─────────┘    └─────────┘
```

### NPC Kya Karta Hai?
- ✅ **Centralized Auth** — Ek login se multiple SaaS products
- ✅ **Tenant Management** — Customers (businesses) ko onboard karo
- ✅ **User Lifecycle** — Create, activate, suspend, delete users
- ✅ **Application Registry** — Registered SaaS products ka full control
- ✅ **SDK Credentials** — SaaS backends ke liye JWT keys
- ✅ **Webhooks** — Real-time events push karo SaaS backends ko
- ✅ **API Keys** — Programmatic access for automation
- ✅ **Audit Logs** — Har action ki complete trail
- ✅ **Health Monitoring** — SaaS apps ki health track karo

---

## 2. Architecture Overview

```
npc/
├── backend/                   # NPC Backend (Node.js + Express)
│   ├── src/
│   │   ├── routes/            # API Routes (v1.js, platform.js, authV1.js)
│   │   ├── platform/
│   │   │   ├── identity/      # Auth Engine (login, sessions, tokens)
│   │   │   ├── tenant/        # Tenant Provisioning
│   │   │   ├── user/          # User Management
│   │   │   ├── business/      # Business Management
│   │   │   ├── branch/        # Branch Management
│   │   │   ├── application/   # Application Registry (Phase 5.1)
│   │   │   ├── audit/         # Audit Logs
│   │   │   └── health/        # Platform Health
│   │   ├── shared/
│   │   │   ├── database/
│   │   │   │   └── migrations/ # All DB migrations
│   │   │   └── providers/      # Email, SMS providers
│   │   └── middleware/         # Auth, Rate Limit, Idempotency
│   └── scripts/               # Seed scripts
└── npc-admin/                 # Admin Console (React + Vite)
    └── src/
        ├── pages/             # Dashboard, Users, Applications, etc.
        ├── services/          # API service layer
        └── stores/            # Zustand state management
```

### Tech Stack
| Layer | Technology |
|-------|------------|
| Runtime | Node.js 22+ |
| Framework | Express.js |
| Database | MySQL 8+ via Sequelize |
| Auth | JWT (Access + Refresh token pair) |
| Password | bcrypt |
| Admin UI | React 18 + Vite + TailwindCSS |
| Email | Nodemailer (SMTP) |

---

## 3. Setup Guide (Local Dev)

### Prerequisites
- Node.js v18+
- MySQL 8+
- npm 9+

### Step 1 — Clone & Install

```bash
# NPC Backend
cd npc/backend
npm install

# NPC Admin Console
cd npc-admin
npm install
```

### Step 2 — Environment Setup

```bash
# npc/backend/.env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=npc_platform
DB_USER=root
DB_PASSWORD=yourpassword

JWT_SECRET=your-super-secret-jwt-key-minimum-32-chars
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=another-secret-for-refresh-tokens
JWT_REFRESH_EXPIRES_IN=7d

PORT=5001
NODE_ENV=development

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@email.com
SMTP_PASS=yourapppassword
EMAIL_FROM=noreply@vayunexsolution.com
```

### Step 3 — Database Migration

```bash
cd npc/backend
npm run migrate
```

> Ye saari `plat_*` tables create karega database mein.

### Step 4 — Seed Super Admin

```bash
npm run seed
# Ya directly:
node scripts/seed_admin.js
```

Default credentials:
- Email: `admin@npc.com`
- Password: `Admin@123`

### Step 5 — Start Servers

```bash
# Backend (port 5001)
cd npc/backend
npm run dev

# Admin Console (port 3100)
cd npc-admin
npm run dev
```

### Step 6 — Verify

```bash
curl http://localhost:5001/api/v1/platform/health
# Response: { "success": true, "data": { "status": "healthy" } }
```

---

## 4. Admin Console Setup

Admin console kholo: `http://localhost:3100`

| Field | Value |
|-------|-------|
| Email | `admin@npc.com` |
| Password | `Admin@123` |

Admin console se kar sakte ho:
- 📋 Application Registry — SaaS products register karo
- 👥 Users — Platform users manage karo
- 🏢 Tenants / Businesses / Branches
- 🔑 API Keys — Programmatic access
- 📊 Dashboard — Platform stats
- 🔍 Audit Logs — Full activity trail
- ⚙️ Settings

---

## 5. Apna SaaS NPC Se Connect Karo

Ye 4 steps follow karo:

### Step 1 — NPC Me Application Register Karo

Admin console mein jao → Applications → **Register Application**

Ya API se:
```bash
POST /api/v1/platform/applications
Authorization: Bearer {admin_token}

{
  "name": "MyNewSaaS",
  "slug": "mynewsaas",
  "description": "My SaaS Product description",
  "category": "Healthcare",        # Healthcare / Hospitality / Fintech / SaaS Suite
  "environment": "production",     # production / staging / development
  "productionUrl": "https://mynewsaas.com",
  "manifest": {
    "version": "1.0.0",
    "capabilities": ["auth", "billing", "webhooks"],
    "dependencies": [],
    "requiredScopes": ["user:read", "tenant:read"]
  }
}
```

**Response dega:**
```json
{
  "success": true,
  "data": {
    "uuid": "abc123-...",
    "name": "MyNewSaaS",
    "status": "active"
  }
}
```

### Step 2 — SDK Credentials Lo

```bash
POST /api/v1/platform/applications/{uuid}/sdk
Authorization: Bearer {admin_token}
```

**Response:**
```json
{
  "data": {
    "clientId": "nex_sdk_abc123...",
    "clientSecret": "nex_secret_xyz789..."
  }
}
```

> ⚠️ **Secret sirf ek baar show hoga. Save kar lo.**

### Step 3 — Apne Backend Mein Token Verify Karo

Jab NPC se koi request aaye (webhook, ya user NPC se aaye), token verify karo:

```javascript
// Node.js example
const jwt = require('jsonwebtoken');

function verifyNpcToken(token) {
  try {
    const payload = jwt.verify(token, process.env.NPC_JWT_SECRET);
    return payload;
  } catch (err) {
    throw new Error('Invalid NPC token');
  }
}
```

### Step 4 — Apne Backend Mein Tenant Signup Hook Lagao

Jab koi naya tenant NPC ke through signup karta hai, toh NPC webhook fire karta hai apke endpoint pe:

```javascript
// Express Route — Webhook receive karo
app.post('/npc/webhook', express.json(), (req, res) => {
  const signature = req.headers['x-npc-signature'];
  // Signature verify karo (HMAC-SHA256)
  
  const { event, data } = req.body;
  
  switch (event) {
    case 'tenant.activated':
      // Apne DB mein tenant create karo
      await createTenantLocally(data.tenant);
      break;
    case 'user.created':
      // Apne DB mein user create karo  
      await createUserLocally(data.user);
      break;
    case 'tenant.suspended':
      await suspendTenantLocally(data.tenant.uuid);
      break;
  }
  
  res.json({ received: true });
});
```

---

## 6. Authentication APIs

**Base URL:** `POST /api/v1/auth/`

> 🔓 Ye APIs **public** hain — koi auth header nahi chahiye.

---

### `POST /api/v1/auth/login`

NPC platform mein login karo.

**Request:**
```json
{
  "email": "admin@npc.com",
  "password": "Admin@123"
}
```

**Response (Single Workspace):**
```json
{
  "success": true,
  "data": {
    "user": {
      "uuid": "abc123",
      "email": "admin@npc.com",
      "role": "super_admin",
      "firstName": "Super",
      "lastName": "Admin"
    },
    "accessToken": "eyJhbGciOi...",
    "refreshToken": "eyJhbGciOi...",
    "expiresIn": 900
  }
}
```

**Response (Multiple Workspaces — select karna padega):**
```json
{
  "success": true,
  "data": {
    "requiresWorkspaceSelection": true,
    "tempToken": "temp_abc123",
    "memberships": [
      { "uuid": "ws-1", "name": "MedNex", "role": "admin" },
      { "uuid": "ws-2", "name": "HotelNex", "role": "viewer" }
    ]
  }
}
```

---

### `POST /api/v1/auth/select-workspace`

Jab multiple workspaces ho.

```json
{
  "tempToken": "temp_abc123",
  "membershipUuid": "ws-1"
}
```

---

### `POST /api/v1/auth/refresh`

Access token refresh karo.

```json
{
  "refreshToken": "eyJhbGciOi..."
}
```

**Response:**
```json
{
  "data": {
    "accessToken": "eyJhbGciOi...",
    "refreshToken": "eyJhbGciOi..."
  }
}
```

---

### `POST /api/v1/auth/logout`

🔒 **Auth required**

```
Authorization: Bearer {accessToken}
```

---

### `POST /api/v1/auth/password-reset/request`

```json
{ "email": "user@example.com" }
```

---

### `POST /api/v1/auth/password-reset/reset`

```json
{
  "token": "reset_token_from_email",
  "newPassword": "NewSecurePass@123"
}
```

---

## 7. Tenant Provisioning APIs (SaaS Developers)

> **Tenant** = Aapka customer jo aapka SaaS use karta hai (e.g., ek pharmacy store).

### `POST /api/v1/platform/tenants/signup`

> 🔓 **Public API** — SaaS ke landing page se call karo

Naya customer NPC ke through register karata hai.

```json
{
  "businessName": "Ram Medical Store",
  "ownerEmail": "ram@example.com",
  "ownerPassword": "SecurePass@123",
  "ownerFirstName": "Ram",
  "ownerLastName": "Sharma",
  "phone": "+919876543210",
  "plan": "starter",
  "applicationSlug": "mednex"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Account created. Please verify your email.",
  "data": {
    "tenantUuid": "ten-abc123",
    "userUuid": "usr-xyz789",
    "status": "email_pending"
  }
}
```

---

### Protected Tenant APIs
> 🔒 `Authorization: Bearer {admin_token}` — Super Admin only

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/platform/tenants` | Saare tenants list karo |
| `GET` | `/api/v1/platform/tenants/:uuid` | Ek tenant ki details |
| `POST` | `/api/v1/platform/tenants` | Manually tenant create karo |
| `PUT` | `/api/v1/platform/tenants/:uuid` | Tenant update karo |
| `POST` | `/api/v1/platform/tenants/:uuid/activate` | Activate karo |
| `POST` | `/api/v1/platform/tenants/:uuid/suspend` | Suspend karo |
| `POST` | `/api/v1/platform/tenants/:uuid/archive` | Archive karo |
| `GET` | `/api/v1/platform/tenants/:uuid/health` | Health check |
| `GET` | `/api/v1/platform/tenants/:uuid/summary` | Full summary |

---

## 8. Application Registry APIs (Admin Only)

> 🔒 Sab APIs — `Authorization: Bearer {admin_token}`

### Register a New Application

```bash
POST /api/v1/platform/applications

{
  "name": "HotelNex",
  "slug": "hotelnex",
  "description": "Enterprise PMS & Point of Sales system",
  "category": "Hospitality",
  "environment": "staging",
  "productionUrl": "https://hotel.vayunexsolution.com",
  "manifest": {
    "version": "1.0.0",
    "capabilities": ["auth", "billing"],
    "requiredScopes": ["user:read", "tenant:read", "billing:write"]
  }
}
```

### All Application Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/platform/applications` | Saari registered apps |
| `POST` | `/api/v1/platform/applications` | Naya app register karo |
| `GET` | `/api/v1/platform/applications/:uuid` | App details |
| `PUT` | `/api/v1/platform/applications/:uuid` | App update karo |
| `DELETE` | `/api/v1/platform/applications/:uuid` | App remove karo |
| `GET` | `/api/v1/platform/applications/capabilities` | Platform capabilities |
| `GET` | `/api/v1/platform/applications/:uuid/health` | App health score |
| `GET` | `/api/v1/platform/applications/:uuid/analytics` | API analytics |
| `GET` | `/api/v1/platform/applications/:uuid/logs` | Telemetry logs |

### API Keys

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/platform/applications/:uuid/api-keys` | Naya API key generate |
| `GET` | `/api/v1/platform/applications/:uuid/api-keys` | Keys list karo |
| `DELETE` | `/api/v1/platform/applications/:uuid/api-keys/:keyUuid` | Key revoke karo |

**API Key Create Request:**
```json
{
  "name": "Production Integration Key",
  "environment": "production",
  "scopes": ["user:read", "tenant:read", "webhook:write"],
  "expiresInDays": 365
}
```

### SDK Credentials

```bash
# Generate
POST /api/v1/platform/applications/:uuid/sdk

# Get existing
GET /api/v1/platform/applications/:uuid/sdk
```

**Response:**
```json
{
  "data": {
    "clientId": "nex_sdk_abc123",
    "clientSecret": "nex_secret_xyz789",
    "environment": "production"
  }
}
```

### Webhooks

```bash
POST /api/v1/platform/applications/:uuid/webhooks
```

```json
{
  "url": "https://mynewsaas.com/api/npc/webhook",
  "environment": "production",
  "events": [
    "tenant.created",
    "tenant.activated",
    "tenant.suspended",
    "user.created",
    "user.suspended"
  ]
}
```

### Feature Flags

```bash
# List flags
GET /api/v1/platform/applications/:uuid/feature-flags

# Set a flag
PUT /api/v1/platform/applications/:uuid/feature-flags
```

```json
{
  "key": "enable_gst_calculator",
  "value": "true",
  "description": "Enable GST auto computation on invoices"
}
```

### Rate Limits

```bash
# View
GET /api/v1/platform/applications/:uuid/rate-limits

# Update
PUT /api/v1/platform/applications/:uuid/rate-limits
```

```json
{
  "requestsPerMinute": 1000,
  "requestsPerHour": 50000,
  "burstLimit": 2000
}
```

### Domains

```bash
POST /api/v1/platform/applications/:uuid/domains
```

```json
{
  "domain": "mynewsaas.vayunexsolution.com",
  "environment": "production"
}
```

### Secret Rotation

```bash
POST /api/v1/platform/applications/:uuid/secrets/rotate

{ "type": "sdk_secret", "itemUuid": "cred-uuid" }
```

> ⚠️ Rotate karne ke baad apne SaaS backend mein nayi secret update karo — purana ek ghante mein expire ho jaayega.

---

## 9. User Management APIs

> 🔒 All require Admin token

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/platform/users` | Saare users list karo |
| `GET` | `/api/v1/platform/users/:uuid` | User by UUID |
| `POST` | `/api/v1/platform/users` | Naya user create |
| `PUT` | `/api/v1/platform/users/:uuid` | User update |
| `DELETE` | `/api/v1/platform/users/:uuid` | User delete |
| `POST` | `/api/v1/platform/users/:uuid/activate` | Activate |
| `POST` | `/api/v1/platform/users/:uuid/suspend` | Suspend |
| `PUT` | `/api/v1/platform/users/:uuid/profile` | Profile update |
| `PUT` | `/api/v1/platform/users/:uuid/preferences` | Preferences |
| `POST` | `/api/v1/platform/users/:uuid/reset-password` | Password reset |
| `POST` | `/api/v1/platform/users/:uuid/force-password-reset` | Force reset |
| `GET` | `/api/v1/platform/users/:uuid/audits` | User audit trail |
| `GET` | `/api/v1/platform/users/:uuid/devices` | Active devices |
| `GET` | `/api/v1/platform/users/:uuid/activities` | Activity log |

**Bulk Operations:**

```bash
POST /api/v1/platform/users/bulk-activate
POST /api/v1/platform/users/bulk-suspend
POST /api/v1/platform/users/bulk-delete
POST /api/v1/platform/users/bulk-assign-role

{ "uuids": ["uuid1", "uuid2", "uuid3"] }
```

**Create User:**
```json
{
  "email": "newuser@example.com",
  "password": "SecurePass@123",
  "firstName": "Raj",
  "lastName": "Kumar",
  "role": "admin",
  "phone": "+919876543210"
}
```

---

## 10. Business & Branch APIs

### Businesses

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/platform/businesses` | List businesses |
| `GET` | `/api/v1/platform/businesses/:uuid` | Business details |
| `POST` | `/api/v1/platform/businesses` | Create business |
| `PUT` | `/api/v1/platform/businesses/:uuid` | Update |
| `DELETE` | `/api/v1/platform/businesses/:uuid` | Delete |
| `POST` | `/api/v1/platform/businesses/:uuid/activate` | Activate |
| `POST` | `/api/v1/platform/businesses/:uuid/suspend` | Suspend |
| `POST` | `/api/v1/platform/businesses/:uuid/restore` | Restore |
| `PUT` | `/api/v1/platform/businesses/:uuid/settings` | Settings update |
| `PUT` | `/api/v1/platform/businesses/:uuid/branding` | Branding update |
| `GET` | `/api/v1/platform/businesses/:uuid/health` | Health check |
| `GET` | `/api/v1/platform/businesses/:uuid/summary` | Full summary |

### Branches

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/platform/branches` | List all branches |
| `GET` | `/api/v1/platform/branches/:uuid` | Branch details |
| `POST` | `/api/v1/platform/branches` | Create branch |
| `PUT` | `/api/v1/platform/branches/:uuid` | Update branch |
| `DELETE` | `/api/v1/platform/branches/:uuid` | Delete branch |
| `POST` | `/api/v1/platform/branches/:uuid/activate` | Activate |
| `POST` | `/api/v1/platform/branches/:uuid/suspend` | Suspend |
| `POST` | `/api/v1/platform/branches/:uuid/restore` | Restore |
| `PUT` | `/api/v1/platform/branches/:uuid/settings` | Settings |
| `PUT` | `/api/v1/platform/branches/:uuid/branding` | Branding |

---

## 11. SDK Integration Guide

### SaaS Backend Mein NPC SDK Setup

NPC abhi official npm package nahi deta — REST API se integrate karo. Future mein `@vayunex/npc-sdk` release hoga.

### Step-by-step Node.js Integration

```javascript
// npc.client.js — Apne SaaS backend mein ye file banao

const axios = require('axios');

class NPCClient {
  constructor({ baseUrl, clientId, clientSecret }) {
    this.baseUrl = baseUrl; // https://sdk.vayunexsolution.com/api/v1
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.token = null;
  }

  async authenticate() {
    const res = await axios.post(`${this.baseUrl}/auth/login`, {
      email: process.env.NPC_ADMIN_EMAIL,
      password: process.env.NPC_ADMIN_PASSWORD
    });
    this.token = res.data.data.accessToken;
    return this.token;
  }

  async request(method, path, data = null) {
    if (!this.token) await this.authenticate();
    return axios({
      method,
      url: `${this.baseUrl}${path}`,
      data,
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // Tenant create karo
  async createTenant(payload) {
    return this.request('POST', '/platform/tenants', payload);
  }

  // Tenant activate karo
  async activateTenant(uuid) {
    return this.request('POST', `/platform/tenants/${uuid}/activate`);
  }

  // User details lo
  async getUser(uuid) {
    return this.request('GET', `/platform/users/${uuid}`);
  }
}

module.exports = new NPCClient({
  baseUrl: process.env.NPC_BASE_URL,
  clientId: process.env.NPC_CLIENT_ID,
  clientSecret: process.env.NPC_CLIENT_SECRET
});
```

**.env for your SaaS Backend:**
```bash
NPC_BASE_URL=https://sdk.vayunexsolution.com/api/v1
NPC_CLIENT_ID=nex_sdk_abc123...
NPC_CLIENT_SECRET=nex_secret_xyz789...
NPC_ADMIN_EMAIL=admin@npc.com
NPC_ADMIN_PASSWORD=Admin@123
```

---

## 12. Webhooks

NPC apke endpoint pe ye events push karta hai:

### Supported Events

| Event | Trigger |
|-------|---------|
| `tenant.created` | Naya tenant registered |
| `tenant.activated` | Tenant email verified / manually activated |
| `tenant.suspended` | Tenant suspended |
| `tenant.archived` | Tenant archived |
| `user.created` | Naya user added |
| `user.suspended` | User suspended |
| `user.deleted` | User deleted |
| `user.password_reset` | Password changed |
| `application.health_alert` | Health score drops below 70% |

### Webhook Payload Format

```json
{
  "event": "tenant.activated",
  "applicationUuid": "app-uuid-here",
  "timestamp": "2026-07-08T09:00:00Z",
  "data": {
    "tenant": {
      "uuid": "ten-abc123",
      "name": "Ram Medical Store",
      "email": "ram@example.com",
      "status": "active"
    }
  },
  "signature": "sha256=abc123..."
}
```

### Signature Verify Karo

```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  return `sha256=${expected}` === signature;
}

// Route mein use karo
app.post('/npc/webhook', (req, res) => {
  const valid = verifyWebhookSignature(
    req.body,
    req.headers['x-npc-signature'],
    process.env.NPC_WEBHOOK_SECRET
  );
  
  if (!valid) return res.status(401).json({ error: 'Invalid signature' });
  
  // Event handle karo
  handleNPCEvent(req.body);
  res.json({ received: true });
});
```

---

## 13. API Response Format

NPC har response ek consistent format mein deta hai:

### Success Response

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... },
  "meta": {
    "requestId": "uuid",
    "correlationId": "uuid",
    "timestamp": "2026-07-08T09:00:00Z",
    "apiVersion": "1.0.0"
  }
}
```

### Error Response

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    { "field": "email", "message": "Invalid email format" }
  ],
  "meta": {
    "requestId": "uuid",
    "timestamp": "2026-07-08T09:00:00Z"
  }
}
```

### Paginated List Response

```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

## 14. Error Codes

| HTTP Status | Meaning | Common Cause |
|-------------|---------|--------------|
| `200` | OK | Success |
| `201` | Created | Resource created |
| `400` | Bad Request | Validation fail, missing fields |
| `401` | Unauthorized | Token missing / expired |
| `403` | Forbidden | Role permission nahi hai |
| `404` | Not Found | Resource exist nahi karta |
| `409` | Conflict | Duplicate entry (email already exists) |
| `422` | Unprocessable | Business logic error (e.g., can't activate archived tenant) |
| `429` | Too Many Requests | Rate limit hit |
| `500` | Server Error | Internal error — check server logs |

### Auth Error Codes

| Error Code | Description |
|------------|-------------|
| `INVALID_CREDENTIALS` | Email/Password galat |
| `EMAIL_NOT_VERIFIED` | Email verify nahi hua |
| `ACCOUNT_SUSPENDED` | Account suspend hai |
| `TOKEN_EXPIRED` | Access token expire ho gaya, refresh karo |
| `REFRESH_TOKEN_INVALID` | Re-login karo |
| `RATE_LIMIT_EXCEEDED` | 10 min wait karo |

---

## 15. Rate Limits

| Endpoint Type | Limit |
|---------------|-------|
| Login | 5 attempts / 10 min |
| Password Reset | 3 requests / hour |
| General API | 1000 req / min |
| Webhook delivery | 3 retries with exponential backoff |

---

## 16. Naya SaaS Product Add Karna

### Admin ke liye (NPC Admin Console se)

1. `http://localhost:3100` → Login
2. **Applications** → **Register Application**
3. Details fill karo (name, slug, category, URL, manifest)
4. **Confirm & Onboard**
5. App UUID copy karo
6. **Applications → App → SDK tab** → Generate SDK Credentials
7. Credentials dusre SaaS developer ko do

### SaaS Developer ke liye (Kya Karna Padega)

1. NPC se milega:
   - `NPC_CLIENT_ID` = `nex_sdk_abc123...`
   - `NPC_CLIENT_SECRET` = `nex_secret_xyz789...`
   - `NPC_BASE_URL` = `https://sdk.vayunexsolution.com/api/v1`

2. Apne backend mein implement karo:

```
✅ POST /npc/webhook        — NPC events receive karo
✅ Tenant create flow       — NPC tenant UUID apne DB mein store karo
✅ User sync                — NPC user UUID se apne user table link karo
✅ JWT verify               — NPC issued tokens verify karo
✅ Health ping endpoint     — NPC ko respond karo (200 OK)
```

3. Webhook register karo NPC mein:

```bash
POST /api/v1/platform/applications/{your_app_uuid}/webhooks
{
  "url": "https://yourapp.com/api/npc/webhook",
  "environment": "production",
  "events": ["tenant.activated", "user.created"]
}
```

4. Test karo:

```bash
POST /api/v1/platform/applications/{uuid}/connections/verify
{
  "type": "webhook",
  "itemUuid": "webhook-uuid"
}
```

---

## Health Check

```bash
GET /api/v1/platform/health
```

```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "version": "1.0.0",
    "database": "connected",
    "uptime": "2d 4h 32m"
  }
}
```

---

## Support & Contact

| Resource | Link |
|----------|------|
| Admin Console | `http://localhost:3100` |
| API Base URL | `http://localhost:5001/api/v1` |
| Email | dev@vayunexsolution.com |
| Platform | `sdk.vayunexsolution.com` |

---

> **Built by Vayunex Solution** — Nex Platform Core v1.0.0
