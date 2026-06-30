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

  const user = await User.findOne({ where: { email, isDeleted: false } });
  if (!user) return unauthorized(res, 'Invalid credentials');
  if (!user.isActive) return unauthorized(res, 'Account is inactive');

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return unauthorized(res, 'Invalid credentials');

  const { accessToken, refreshToken } = generateTokens(user);
  await user.update({ refreshToken });

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
    const user = await User.findOne({ where: { id: decoded.id, refreshToken: token, isDeleted: false } });
    if (!user) return unauthorized(res, 'Invalid refresh token');
    const tokens = generateTokens(user);
    await user.update({ refreshToken: tokens.refreshToken });
    return success(res, tokens, 'Token refreshed');
  } catch {
    return unauthorized(res, 'Invalid or expired refresh token');
  }
};

const logout = async (req, res) => {
  await User.update({ refreshToken: null }, { where: { id: req.user.id } });
  return success(res, null, 'Logged out successfully');
};

const getMe = async (req, res) => {
  const user = await User.findByPk(req.user.id, {
    attributes: { exclude: ['password', 'refreshToken'] },
  });
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
