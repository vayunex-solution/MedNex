'use strict';

const jwt = require('jsonwebtoken');
const ApiResponse = require('../../shared/response/ApiResponse');
const userRepository = require('./user.repository');

const getJwks = (req, res) => {
  // Expose a public JWKS representation for the platform keys
  // For HS256 (symmetric), we expose a symmetric key definition (oct type)
  const jwks = {
    keys: [
      {
        kty: 'oct',
        k: Buffer.from(process.env.JWT_SECRET || 'npc_super_secret_jwt_key_2026').toString('base64url'),
        alg: 'HS256',
        kid: 'npc-default-hs256-key',
        use: 'sig'
      }
    ]
  };

  return res.json(jwks);
};

const introspectToken = async (req, res) => {
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ active: false, error: 'Token is required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'npc_super_secret_jwt_key_2026');
    
    // Retrieve user and status to confirm they are active
    const user = await userRepository.findOne({ id: decoded.id, isDeleted: false });
    if (!user || !user.isActive) {
      return res.json({ active: false, error: 'User is inactive or deleted' });
    }

    return res.json({
      active: true,
      scope: decoded.role || 'user',
      client_id: decoded.clientId || 'npc-core',
      sub: decoded.email,
      exp: decoded.exp,
      user: {
        id: user.id,
        uuid: user.uuid,
        name: user.name,
        email: user.email,
        role: user.role
      },
      tenantId: decoded.tenantId || null,
      businessId: decoded.businessId || null,
      branchId: decoded.branchId || null
    });
  } catch (err) {
    return res.json({ active: false, error: err.message });
  }
};

module.exports = {
  getJwks,
  introspectToken
};
