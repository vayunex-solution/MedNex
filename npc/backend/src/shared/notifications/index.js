'use strict';

const NotificationProvider = require('./notification.provider');
const logger = require('../logger');

class LocalNotificationProvider extends NotificationProvider {
  async sendEmail(to, subject, body, options = {}) {
    logger.info(`[Notification - Email] To: ${to} | Subject: ${subject}`);
    logger.debug(`[Notification - Email Body] ${body}`);
    return { success: true, provider: 'smtp_local' };
  }

  async sendSMS(to, message, options = {}) {
    logger.info(`[Notification - SMS] To: ${to} | Msg: ${message}`);
    return { success: true, provider: 'sms_local' };
  }

  async sendWhatsApp(to, message, options = {}) {
    logger.info(`[Notification - WhatsApp] To: ${to} | Msg: ${message}`);
    return { success: true, provider: 'whatsapp_local' };
  }
}

const localNotificationProvider = new LocalNotificationProvider();
module.exports = localNotificationProvider;
