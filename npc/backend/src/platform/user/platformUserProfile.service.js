'use strict';

const userRepository = require('./user.repository');
const userProfileRepository = require('./userProfile.repository');
const localStorageProvider = require('../../shared/storage/local.storage');
const { NotFoundError } = require('../../shared/errors/AppError');
const auditService = require('../audit/audit.service');
const RequestContext = require('../../shared/core/context');

class PlatformUserProfileService {
  /**
   * Update User Profile
   */
  async updateProfile(userUuid, profilePayload) {
    const user = await userRepository.findOne({ uuid: userUuid, isDeleted: false });
    if (!user) {
      throw new NotFoundError('User not found', 'USER_NOT_FOUND');
    }

    const profile = await userProfileRepository.findOne({ userId: user.id });
    if (!profile) {
      throw new NotFoundError('User profile not found', 'PROFILE_NOT_FOUND');
    }

    const updates = {};
    if (profilePayload.firstName !== undefined) updates.firstName = profilePayload.firstName;
    if (profilePayload.lastName !== undefined) updates.lastName = profilePayload.lastName;
    if (profilePayload.gender !== undefined) updates.gender = profilePayload.gender;
    if (profilePayload.birthDate !== undefined) updates.birthDate = profilePayload.birthDate;
    if (profilePayload.timezone !== undefined) updates.timezone = profilePayload.timezone;
    if (profilePayload.locale !== undefined) updates.locale = profilePayload.locale;
    if (profilePayload.avatarFileId !== undefined) updates.avatarFileId = profilePayload.avatarFileId;
    if (profilePayload.avatarUrl !== undefined) updates.avatarUrl = profilePayload.avatarUrl;

    await userProfileRepository.update(profile.id, updates);

    auditService.logPlatformAction(
      RequestContext.userId,
      'user:profile_updated',
      'user',
      `User profile updated for user ${user.email}`
    );

    return await userProfileRepository.findOne({ id: profile.id });
  }

  /**
   * Upload Avatar file via storage provider abstraction
   */
  async uploadAvatar(userUuid, file) {
    const user = await userRepository.findOne({ uuid: userUuid, isDeleted: false });
    if (!user) {
      throw new NotFoundError('User not found', 'USER_NOT_FOUND');
    }

    const profile = await userProfileRepository.findOne({ userId: user.id });
    if (!profile) {
      throw new NotFoundError('User profile not found', 'PROFILE_NOT_FOUND');
    }

    // Delete old avatar if present
    if (profile.avatarFileId) {
      try {
        await localStorageProvider.delete(profile.avatarFileId);
      } catch (err) {
        // Log warning but continue
      }
    }

    // Save new avatar file
    const fileId = await localStorageProvider.save(file, 'avatars');
    const url = await localStorageProvider.getUrl(fileId);

    // Update DB
    await userProfileRepository.update(profile.id, {
      avatarFileId: fileId,
      avatarUrl: url,
    });

    auditService.logPlatformAction(
      RequestContext.userId,
      'user:avatar_uploaded',
      'user',
      `Avatar uploaded successfully for user ${user.email}`
    );

    return { avatarFileId: fileId, avatarUrl: url };
  }
}

module.exports = new PlatformUserProfileService();
