'use strict';

const crypto = require('crypto');

// In-memory set to store processed nonces (cleared periodically to prevent memory leaks)
const processedNonces = new Set();
setInterval(() => processedNonces.clear(), 300000); // Clear every 5 minutes

const verifyNpcRequest = (req, res, next) => {
  const clientId = req.headers['x-npc-client-id'];
  const signature = req.headers['x-npc-signature'];
  const timestamp = req.headers['x-npc-timestamp'];
  const nonce = req.headers['x-npc-nonce'];

  if (!clientId || !signature || !timestamp || !nonce) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Missing required X-NPC-* headers'
    });
  }

  // Validate Client ID
  console.log('[verifyNpcRequest] Expected:', process.env.NPC_CLIENT_ID, 'Received:', clientId);
  if (clientId !== process.env.NPC_CLIENT_ID) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Invalid NPC Client ID'
    });
  }

  // Prevent Replay Attacks: Check timestamp variance (max 5 minutes / 300 seconds)
  const reqTime = parseInt(timestamp, 10);
  const now = Date.now();
  if (isNaN(reqTime) || Math.abs(now - reqTime) > 300000) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Request timestamp expired or invalid'
    });
  }

  // Prevent Replay Attacks: Check nonce uniqueness
  if (processedNonces.has(nonce)) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Duplicate request nonce (potential replay attack)'
    });
  }
  processedNonces.add(nonce);

  // Verify HMAC signature
  const secret = process.env.NPC_CLIENT_SECRET;
  if (!secret) {
    return res.status(500).json({
      success: false,
      message: 'NPC_CLIENT_SECRET is not configured on this SaaS node'
    });
  }

  const rawBody = req.body ? JSON.stringify(req.body) : '';
  const signatureInput = `${timestamp}:${nonce}:${rawBody}`;
  const expectedSignature = crypto.createHmac('sha256', secret)
                                  .update(signatureInput)
                                  .digest('hex');

  if (signature !== expectedSignature) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Invalid request signature'
    });
  }

  next();
};

module.exports = verifyNpcRequest;
