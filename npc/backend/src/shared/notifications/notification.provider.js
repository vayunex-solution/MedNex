'use strict';

class NotificationProvider {
  async sendEmail(to, subject, body, options = {}) {
    throw new Error('Method not implemented');
  }

  async sendSMS(to, message, options = {}) {
    throw new Error('Method not implemented');
  }

  async sendWhatsApp(to, message, options = {}) {
    throw new Error('Method not implemented');
  }
}

module.exports = NotificationProvider;
