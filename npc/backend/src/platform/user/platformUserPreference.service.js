'use strict';

const userRepository = require('./user.repository');
const userPreferenceRepository = require('./userPreference.repository');
const userNotificationPreferenceRepository = require('./userNotificationPreference.repository');
const { NotFoundError } = require('../../shared/errors/AppError');
const auditService = require('../audit/audit.service');
const RequestContext = require('../../shared/core/context');

class PlatformUserPreferenceService {
  /**
   * Bulk upsert User preferences config settings
   */
  async updatePreferences(userUuid, preferencesArray) {
    const user = await userRepository.findOne({ uuid: userUuid, isDeleted: false });
    if (!user) {
      throw new NotFoundError('User not found', 'USER_NOT_FOUND');
    }

    for (const pref of preferencesArray) {
      const existing = await userPreferenceRepository.findOne({
        userId: user.id,
        key: pref.key,
      });

      if (existing) {
        await userPreferenceRepository.update(existing.id, {
          value: pref.value,
          datatype: pref.datatype || existing.datatype,
          category: pref.category || existing.category,
          scope: pref.scope || existing.scope,
        });
      } else {
        await userPreferenceRepository.create({
          userId: user.id,
          key: pref.key,
          value: pref.value,
          datatype: pref.datatype || 'string',
          category: pref.category || 'general',
          scope: pref.scope || 'user',
        });
      }
    }

    auditService.logPlatformAction(
      RequestContext.userId,
      'user:preferences_updated',
      'user',
      `User configuration preferences updated for user ${user.email}`
    );

    return await userPreferenceRepository.findMany({ userId: user.id });
  }

  /**
   * Bulk upsert User notification channel preferences
   */
  async updateNotificationPreferences(userUuid, preferencesArray) {
    const user = await userRepository.findOne({ uuid: userUuid, isDeleted: false });
    if (!user) {
      throw new NotFoundError('User not found', 'USER_NOT_FOUND');
    }

    for (const notif of preferencesArray) {
      const existing = await userNotificationPreferenceRepository.findOne({
        userId: user.id,
        channel: notif.channel,
      });

      if (existing) {
        await userNotificationPreferenceRepository.update(existing.id, {
          isEnabled: notif.isEnabled,
          category: notif.category || existing.category,
        });
      } else {
        await userNotificationPreferenceRepository.create({
          userId: user.id,
          channel: notif.channel,
          category: notif.category || 'general',
          isEnabled: notif.isEnabled,
        });
      }
    }

    auditService.logPlatformAction(
      RequestContext.userId,
      'user:notification_preferences_updated',
      'user',
      `User notification preferences updated for user ${user.email}`
    );

    return await userNotificationPreferenceRepository.findMany({ userId: user.id });
  }
}

module.exports = new PlatformUserPreferenceService();
