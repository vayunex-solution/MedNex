'use strict';

const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const Notification = require('../models/Notification');
const { addClient, removeClient } = require('../helpers/notificationService');
const { success } = require('../helpers/response');

/**
 * GET /api/notifications/stream?token=<jwt>
 * SSE endpoint — authenticates via query param (EventSource cannot send custom headers)
 */
const stream = async (req, res) => {
  const token = req.query.token;
  if (!token) { res.status(401).end(); return; }

  let userId;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'nex_jwt_secret_default_key_9988');
    userId = String(decoded.id);
  } catch {
    res.status(401).end();
    return;
  }

  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  addClient(userId, res);

  // Initial confirmation
  res.write(`event: connected\ndata: ${JSON.stringify({ message: 'Connected to MedNex notifications' })}\n\n`);

  // Send unread count immediately
  const unreadCount = await Notification.count({
    where: { isRead: false, isDeleted: false, userId: { [Op.or]: [userId, null] } }
  });
  res.write(`event: unread_count\ndata: ${JSON.stringify({ count: unreadCount })}\n\n`);

  // Heartbeat every 25 seconds (proxy keepalive)
  const heartbeat = setInterval(() => {
    try { res.write(': heartbeat\n\n'); }
    catch (_) { clearInterval(heartbeat); }
  }, 25000);

  req.on('close', () => {
    clearInterval(heartbeat);
    removeClient(userId, res);
  });
};

/**
 * GET /api/notifications
 * Returns paginated notifications for current user
 */
const getAll = async (req, res) => {
  const userId = req.user.id;
  const limit = parseInt(req.query.limit) || 20;
  const offset = parseInt(req.query.offset) || 0;

  const { count, rows } = await Notification.findAndCountAll({
    where: { isDeleted: false, userId: { [Op.or]: [userId, null] } },
    order: [['createdAt', 'DESC']],
    limit,
    offset,
  });

  return res.json({ success: true, data: rows, total: count, unread: rows.filter(n => !n.isRead).length });
};

/**
 * GET /api/notifications/unread-count
 */
const getUnreadCount = async (req, res) => {
  const count = await Notification.count({
    where: { isRead: false, isDeleted: false, userId: { [Op.or]: [req.user.id, null] } }
  });
  return res.json({ success: true, data: { count } });
};

/**
 * PUT /api/notifications/:id/read
 */
const markRead = async (req, res) => {
  await Notification.update({ isRead: true }, { where: { id: req.params.id } });
  return success(res, {}, 'Marked as read');
};

/**
 * PUT /api/notifications/read-all
 */
const markAllRead = async (req, res) => {
  await Notification.update(
    { isRead: true },
    { where: { isDeleted: false, userId: { [Op.or]: [req.user.id, null] } } }
  );
  return success(res, {}, 'All notifications marked as read');
};

/**
 * DELETE /api/notifications/:id
 */
const remove = async (req, res) => {
  await Notification.update({ isDeleted: true }, { where: { id: req.params.id } });
  return success(res, {}, 'Notification deleted');
};

/**
 * DELETE /api/notifications/clear-all
 */
const clearAll = async (req, res) => {
  await Notification.update(
    { isDeleted: true },
    { where: { userId: { [Op.or]: [req.user.id, null] } } }
  );
  return success(res, {}, 'All notifications cleared');
};

module.exports = { stream, getAll, getUnreadCount, markRead, markAllRead, remove, clearAll };
