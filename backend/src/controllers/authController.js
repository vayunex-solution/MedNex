'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { success, badRequest, unauthorized } = require('../helpers/response');

const generateTokens = (user) => {
  const payload = { id: user.id, email: user.email, role: user.role };
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '1d' });
  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' });
  return { accessToken, refreshToken };
};

const login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return badRequest(res, 'Email and password are required');

  // Use raw SQL to get user — avoids Sequelize model column mismatch with production DB
  const sequelize = User.sequelize;
  const [rows] = await sequelize.query(
    'SELECT * FROM users WHERE email = ? AND isDeleted = 0 LIMIT 1',
    { replacements: [email] }
  );
  const user = rows[0];
  if (!user) return unauthorized(res, 'Invalid credentials');

  // Check status field (production DB uses status, not isActive)
  if (user.status && user.status !== 'active') {
    return unauthorized(res, 'Account is inactive or suspended');
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return unauthorized(res, 'Invalid credentials');

  // For non-super_admin, skip tenant check for now (plat_user_memberships may have data issues)
  // super_admin bypasses this check entirely
  if (user.role !== 'super_admin' && user.role !== 'admin') {
    try {
      const memberships = await sequelize.query(
        `SELECT m.id, t.isActive, t.status 
         FROM plat_user_memberships m
         JOIN plat_tenants t ON m.tenantId = t.id
         WHERE m.userId = ? AND m.status = 'active'`,
        { replacements: [user.id], type: sequelize.QueryTypes.SELECT }
      );
      if (!memberships || memberships.length === 0) {
        return unauthorized(res, 'User has no active organization memberships');
      }
    } catch (e) {
      // If membership check fails, allow login for now
    }
  }

  const { accessToken, refreshToken } = generateTokens(user);

  // Only update refreshToken if the column exists
  try {
    await sequelize.query(
      'UPDATE users SET refreshToken = ? WHERE id = ?',
      { replacements: [refreshToken, user.id] }
    );
  } catch (e) {
    // refreshToken column may not exist — ignore
  }

  return success(res, {
    accessToken,
    refreshToken,
    user: { id: user.id, name: user.name, email: user.email, role: user.role, phone: user.phone },
  }, 'Login successful');
};

const refreshToken = async (req, res) => {
  const { refreshToken: token } = req.body;
  if (!token) return badRequest(res, 'Refresh token required');
  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    // Use raw SQL to avoid column mismatch
    const sequelize = User.sequelize;
    const [rows] = await sequelize.query(
      'SELECT * FROM users WHERE id = ? AND isDeleted = 0 LIMIT 1',
      { replacements: [decoded.id] }
    );
    const user = rows[0];
    if (!user) return unauthorized(res, 'Invalid refresh token');

    // Block suspended users from getting a new token
    if (user.status && user.status !== 'active') {
      return unauthorized(res, 'User account is suspended or inactive');
    }

    const tokens = generateTokens(user);
    // Try to update refreshToken, ignore if column doesn't exist
    try {
      await sequelize.query('UPDATE users SET refreshToken = ? WHERE id = ?', {
        replacements: [tokens.refreshToken, user.id]
      });
    } catch (e) { /* ignore */ }
    return success(res, tokens, 'Token refreshed');
  } catch (err) {
    return unauthorized(res, 'Invalid or expired refresh token');
  }
};


const logout = async (req, res) => {
  try {
    await User.sequelize.query('UPDATE users SET refreshToken = NULL WHERE id = ?', {
      replacements: [req.user.id]
    });
  } catch (e) { /* ignore */ }
  return success(res, null, 'Logged out successfully');
};

const getMe = async (req, res) => {
  const [rows] = await User.sequelize.query(
    'SELECT id, uuid, name, email, role, phone FROM users WHERE id = ? AND isDeleted = 0 LIMIT 1',
    { replacements: [req.user.id] }
  );
  const user = rows[0];
  return success(res, user);
};

const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findByPk(req.user.id);
  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) return badRequest(res, 'Current password is incorrect');
  const hashed = await bcrypt.hash(newPassword, 12);
  await user.update({ password: hashed });
  return success(res, null, 'Password changed successfully');
};

module.exports = { login, refreshToken, logout, getMe, changePassword };
