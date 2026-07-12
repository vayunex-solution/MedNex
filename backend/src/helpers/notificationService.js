'use strict';
/**
 * notificationService.js
 * Central service to create and broadcast notifications.
 * Uses SSE (Server-Sent Events) instead of WebSockets — fully compatible with cPanel/Apache Passenger.
 */

const Notification = require('../models/Notification');

// In-memory map of active SSE clients: userId -> [res, res, ...]
const clients = new Map();

/**
 * Register a new SSE client for a user
 */
const addClient = (userId, res) => {
  if (!clients.has(userId)) clients.set(userId, []);
  clients.get(userId).push(res);
};

/**
 * Remove an SSE client when connection closes
 */
const removeClient = (userId, res) => {
  if (!clients.has(userId)) return;
  const updated = clients.get(userId).filter(r => r !== res);
  if (updated.length === 0) clients.delete(userId);
  else clients.set(userId, updated);
};

/**
 * Send SSE message to a specific user
 */
const sendToUser = (userId, event, data) => {
  const userClients = clients.get(String(userId)) || clients.get(Number(userId)) || [];
  userClients.forEach(res => {
    try {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    } catch (_) { /* ignore broken pipes */ }
  });
};

/**
 * Broadcast SSE message to all connected clients
 */
const broadcast = (event, data) => {
  clients.forEach((clientList) => {
    clientList.forEach(res => {
      try {
        res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      } catch (_) { /* ignore */ }
    });
  });
};

/**
 * Create a notification and push it via SSE immediately
 * @param {object} opts { userId, type, title, message, link }
 * userId = null → broadcast to all
 */
const createNotification = async (opts) => {
  const { userId = null, type = 'system', title, message, link = null } = opts;
  const notif = await Notification.create({ userId, type, title, message, link });

  const payload = {
    id: notif.id,
    type: notif.type,
    title: notif.title,
    message: notif.message,
    link: notif.link,
    isRead: false,
    createdAt: notif.createdAt,
  };

  if (userId) {
    sendToUser(userId, 'notification', payload);
  } else {
    broadcast('notification', payload);
  }

  return notif;
};

module.exports = { addClient, removeClient, createNotification, sendToUser, broadcast };
