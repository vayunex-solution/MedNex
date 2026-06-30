'use strict';

const jwt = require('jsonwebtoken');
const { unauthorized, forbidden } = require('../helpers/response');
const { User } = require('../models');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return unauthorized(res, 'Access token required');

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findOne({ where: { id: decoded.id, isDeleted: false, isActive: true } });
    if (!user) return unauthorized(res, 'User not found or inactive');

    req.user = { id: user.id, name: user.name, email: user.email, role: user.role };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') return unauthorized(res, 'Token expired');
    return unauthorized(res, 'Invalid token');
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!req.user) return unauthorized(res);
  if (!roles.includes(req.user.role)) return forbidden(res, 'Insufficient permissions');
  next();
};

module.exports = { authenticate, authorize };
