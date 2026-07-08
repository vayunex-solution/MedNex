'use strict';

const { BadRequestError } = require('../errors/AppError');

const STATES = {
  // Common states
  PROVISIONING: 'provisioning',
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  ARCHIVED: 'archived',
  DELETED: 'deleted',

  // User-specific states
  PENDING: 'pending',
  EMAIL_PENDING: 'email_pending',
  PHONE_PENDING: 'phone_pending',
  MFA_PENDING: 'mfa_pending',
  LOCKED: 'locked',
};

const TRANSITION_MATRIX = {
  [STATES.PROVISIONING]: [STATES.ACTIVE],
  [STATES.ACTIVE]: [STATES.SUSPENDED, STATES.ARCHIVED, STATES.DELETED, STATES.LOCKED],
  [STATES.SUSPENDED]: [STATES.ACTIVE, STATES.ARCHIVED, STATES.DELETED],
  [STATES.ARCHIVED]: [STATES.ACTIVE, STATES.DELETED],
  [STATES.DELETED]: [STATES.ACTIVE], // Supporting restore directly back to active

  // User-specific state transitions
  [STATES.PENDING]: [STATES.ACTIVE, STATES.SUSPENDED, STATES.DELETED],
  [STATES.EMAIL_PENDING]: [STATES.ACTIVE, STATES.SUSPENDED, STATES.DELETED],
  [STATES.PHONE_PENDING]: [STATES.ACTIVE, STATES.SUSPENDED, STATES.DELETED],
  [STATES.MFA_PENDING]: [STATES.ACTIVE, STATES.SUSPENDED, STATES.DELETED],
  [STATES.LOCKED]: [STATES.ACTIVE, STATES.SUSPENDED, STATES.DELETED],
};

class LifecycleManager {
  static validateTransition(currentStatus, targetStatus) {
    const allowed = TRANSITION_MATRIX[currentStatus] || [];
    const normalizedTarget = targetStatus === 'restore' ? STATES.ACTIVE : targetStatus;

    if (!allowed.includes(normalizedTarget)) {
      throw new BadRequestError(
        `Invalid state transition: Cannot change status from '${currentStatus}' to '${targetStatus}'`,
        'INVALID_STATE_TRANSITION'
      );
    }

    return normalizedTarget;
  }

  static getTimestampsForState(status) {
    const now = new Date();
    const updates = { status };

    if (status === STATES.ACTIVE) {
      updates.isActive = true;
      updates.isDeleted = false;
      updates.activatedAt = now;
      updates.archivedAt = null;
      updates.deletedAt = null;
    } else if (status === STATES.SUSPENDED) {
      updates.isActive = false;
      updates.suspendedAt = now;
    } else if (status === STATES.ARCHIVED) {
      updates.isActive = false;
      updates.archivedAt = now;
    } else if (status === STATES.DELETED) {
      updates.isActive = false;
      updates.isDeleted = true;
      updates.deletedAt = now;
    }

    return updates;
  }
}

module.exports = LifecycleManager;
