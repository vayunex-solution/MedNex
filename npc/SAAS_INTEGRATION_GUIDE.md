# NPC SaaS Integration Checklist
### Vayunex Nex Platform Core — Integration Guide for SaaS Developers

---

## Tumhe Kya Milega (NPC Admin se)

Ye credentials admin console se generate hoke tumhare paas aayenge:

```
NPC_BASE_URL     = https://sdk.vayunexsolution.com/api/v1
NPC_CLIENT_ID    = nex_sdk_xxxxx...
NPC_CLIENT_SECRET = nex_secret_xxxxx...
```

---

## Step 1 — Apne Backend mein Environment Variables Set Karo

```bash
# .env
NPC_BASE_URL=https://sdk.vayunexsolution.com/api/v1
NPC_CLIENT_ID=nex_sdk_xxxxxxxxxxxxxxxx
NPC_CLIENT_SECRET=nex_secret_xxxxxxxxxxxxxxxxxxxxxxxxxx
NPC_WEBHOOK_SECRET=webhook_secret_from_npc_admin
NPC_APP_UUID=your-app-uuid-from-npc
```

---

## Step 2 — Tenant Data Store Karo

Jab NPC se tenant signup aaye, apne DB mein save karo:

```sql
-- Apni users/businesses table mein ye column zaroor rakhna:
ALTER TABLE businesses ADD COLUMN npc_tenant_uuid VARCHAR(36) UNIQUE;
ALTER TABLE users ADD COLUMN npc_user_uuid VARCHAR(36) UNIQUE;
```

---

## Step 3 — Webhook Endpoint Banao

```javascript
// routes/npc.js
const express = require('express');
const crypto = require('crypto');
const router = express.Router();

// Verify NPC webhook signature
function verifySignature(body, signature) {
  const secret = process.env.NPC_WEBHOOK_SECRET;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(body))
    .digest('hex');
  return `sha256=${expected}` === signature;
}

router.post('/webhook', express.json(), async (req, res) => {
  // Signature verify karo
  const sig = req.headers['x-npc-signature'];
  if (!verifySignature(req.body, sig)) {
    return res.status(401).json({ error: 'Invalid NPC signature' });
  }

  const { event, data } = req.body;
  
  try {
    switch (event) {
      
      case 'tenant.activated': {
        // Naya customer activated — apne DB mein create karo
        const { tenant } = data;
        await Business.create({
          name: tenant.name,
          email: tenant.email,
          npc_tenant_uuid: tenant.uuid,
          status: 'active'
        });
        console.log(`[NPC] Tenant activated: ${tenant.name}`);
        break;
      }
      
      case 'tenant.suspended': {
        await Business.update(
          { status: 'suspended' },
          { where: { npc_tenant_uuid: data.tenant.uuid } }
        );
        break;
      }
      
      case 'user.created': {
        // Naya user — apne DB mein link karo
        const { user } = data;
        await User.create({
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          npc_user_uuid: user.uuid,
          role: user.role
        });
        break;
      }
      
      case 'user.suspended': {
        await User.update(
          { isActive: false },
          { where: { npc_user_uuid: data.user.uuid } }
        );
        break;
      }
      
      case 'application.health_alert': {
        // NPC ne alert diya — apna monitoring check karo
        console.error('[NPC ALERT] Health score dropped:', data.healthScore);
        break;
      }
      
      default:
        console.log(`[NPC] Unknown event: ${event}`);
    }
    
    res.json({ received: true, event });
  } catch (err) {
    console.error('[NPC Webhook Error]', err);
    res.status(500).json({ error: 'Internal processing error' });
  }
});

module.exports = router;
```

---

## Step 4 — NPC JWT Token Verify Karo

Agar NPC kisi request mein token pass kare, aisa verify karo:

```javascript
const jwt = require('jsonwebtoken');

// NPC issued token verify karo
function verifyNpcToken(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('No token provided');
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    // NPC ka JWT_SECRET use karo (NPC team se lo)
    const payload = jwt.verify(token, process.env.NPC_JWT_PUBLIC_KEY);
    return payload;
    // payload mein hoga: { id, uuid, email, role, tenantUuid, sessionId }
  } catch {
    throw new Error('Invalid or expired NPC token');
  }
}
```

---

## Step 5 — Health Ping Endpoint (Compulsory)

NPC tumhare backend ko regular ping karta hai. Ye endpoint zaroor banao:

```javascript
// GET /api/npc/health
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'YourSaaSName',
    version: '1.0.0'
  });
});
```

---

## Step 6 — NPC Ko Register Karo (Admin Console)

Ye admin (Vayunex team) karega:

1. NPC Admin Console → Applications → Register Application
2. Tumhara App UUID milega
3. Tumhare webhook URL register karenge:
   ```
   https://yourapp.com/api/npc/webhook
   ```
4. SDK Credentials generate hoge aur tumhe denge

---

## API Calls jo Tumhare Backend se NPC ko Karne Pad Sakte Hain

```javascript
const axios = require('axios');

const npc = axios.create({
  baseURL: process.env.NPC_BASE_URL,
  headers: { Authorization: `Bearer ${process.env.NPC_ADMIN_TOKEN}` }
});

// Tenant ka status check karo
const getTenantStatus = async (tenantUuid) => {
  const res = await npc.get(`/platform/tenants/${tenantUuid}`);
  return res.data.data.status; // 'active' | 'suspended' | 'archived'
};

// User ki details lo
const getNpcUser = async (userUuid) => {
  const res = await npc.get(`/platform/users/${userUuid}`);
  return res.data.data;
};

// Tenant suspend karo (billing failure pe)
const suspendTenant = async (tenantUuid, reason) => {
  await npc.post(`/platform/tenants/${tenantUuid}/suspend`, { reason });
};
```

---

## Supported Webhook Events (Complete List)

| Event | Tab Aata Hai |
|-------|-------------|
| `tenant.created` | Naya signup hua |
| `tenant.activated` | Email verify / manually activate |
| `tenant.suspended` | Suspend kiya gaya |
| `tenant.archived` | Archived |
| `user.created` | Naya user add hua |
| `user.suspended` | User suspend |
| `user.deleted` | User delete |
| `user.password_reset` | Password change hua |
| `application.health_alert` | Health score < 70% |

---

## Checklist Summary

```
[ ] NPC credentials apne .env mein add kiye
[ ] npc_tenant_uuid column apne DB mein add kiya
[ ] npc_user_uuid column apne DB mein add kiya
[ ] /api/npc/webhook route banaya
[ ] Webhook signature verify karna implement kiya
[ ] tenant.activated event handle kiya
[ ] user.created event handle kiya
[ ] tenant.suspended event handle kiya
[ ] /api/npc/health ping endpoint banaya
[ ] Webhook URL NPC admin ko dia
[ ] Test: POST /applications/{uuid}/connections/verify — status 200
```

---

## Support

Koi problem ho toh:
- Email: dev@vayunexsolution.com
- NPC Base URL: `https://sdk.vayunexsolution.com/api/v1`
- Health Check: `GET /api/v1/platform/health`

---

> Vayunex Nex Platform Core — SaaS Integration Guide v1.0
