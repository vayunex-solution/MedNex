'use strict';

class DomainEvent {
  constructor(eventName, actorId, requestId, correlationId, payload = {}) {
    this.eventVersion = '1.0.0';
    this.eventName = eventName;
    this.occurredAt = new Date().toISOString();
    this.actorId = actorId || 'system';
    this.requestId = requestId || null;
    this.correlationId = correlationId || null;
    this.payload = payload;
  }

  serialize() {
    return JSON.stringify({
      eventVersion: this.eventVersion,
      eventName: this.eventName,
      occurredAt: this.occurredAt,
      actorId: this.actorId,
      requestId: this.requestId,
      correlationId: this.correlationId,
      payload: this.payload,
    });
  }
}

class BusinessCreatedEvent extends DomainEvent {
  constructor(actorId, requestId, correlationId, business) {
    super('BusinessCreated', actorId, requestId, correlationId, {
      businessUuid: business.uuid,
      tenantId: business.tenantId,
      name: business.name,
      slug: business.slug,
      email: business.email,
    });
  }
}

class BusinessUpdatedEvent extends DomainEvent {
  constructor(actorId, requestId, correlationId, businessUuid, updatedFields) {
    super('BusinessUpdated', actorId, requestId, correlationId, {
      businessUuid,
      updatedFields,
    });
  }
}

class BusinessArchivedEvent extends DomainEvent {
  constructor(actorId, requestId, correlationId, businessUuid) {
    super('BusinessArchived', actorId, requestId, correlationId, {
      businessUuid,
    });
  }
}

class BusinessSuspendedEvent extends DomainEvent {
  constructor(actorId, requestId, correlationId, businessUuid) {
    super('BusinessSuspended', actorId, requestId, correlationId, {
      businessUuid,
    });
  }
}

class BusinessRestoredEvent extends DomainEvent {
  constructor(actorId, requestId, correlationId, businessUuid) {
    super('BusinessRestored', actorId, requestId, correlationId, {
      businessUuid,
    });
  }
}

class BusinessDeletedEvent extends DomainEvent {
  constructor(actorId, requestId, correlationId, businessUuid) {
    super('BusinessDeleted', actorId, requestId, correlationId, {
      businessUuid,
    });
  }
}

class BranchCreatedEvent extends DomainEvent {
  constructor(actorId, requestId, correlationId, branch) {
    super('BranchCreated', actorId, requestId, correlationId, {
      branchUuid: branch.uuid,
      tenantId: branch.tenantId,
      businessId: branch.businessId,
      name: branch.name,
      slug: branch.slug,
      email: branch.email,
    });
  }
}

class BranchUpdatedEvent extends DomainEvent {
  constructor(actorId, requestId, correlationId, branchUuid, updatedFields) {
    super('BranchUpdated', actorId, requestId, correlationId, {
      branchUuid,
      updatedFields,
    });
  }
}

class BranchArchivedEvent extends DomainEvent {
  constructor(actorId, requestId, correlationId, branchUuid) {
    super('BranchArchived', actorId, requestId, correlationId, {
      branchUuid,
    });
  }
}

class BranchSuspendedEvent extends DomainEvent {
  constructor(actorId, requestId, correlationId, branchUuid) {
    super('BranchSuspended', actorId, requestId, correlationId, {
      branchUuid,
    });
  }
}

class BranchRestoredEvent extends DomainEvent {
  constructor(actorId, requestId, correlationId, branchUuid) {
    super('BranchRestored', actorId, requestId, correlationId, {
      branchUuid,
    });
  }
}

class BranchDeletedEvent extends DomainEvent {
  constructor(actorId, requestId, correlationId, branchUuid) {
    super('BranchDeleted', actorId, requestId, correlationId, {
      branchUuid,
    });
  }
}

class UserCreatedEvent extends DomainEvent {
  constructor(actorId, requestId, correlationId, user) {
    super('UserCreated', actorId, requestId, correlationId, {
      userUuid: user.uuid,
      email: user.email,
      name: user.name,
      userType: user.userType,
    });
  }
}

class UserUpdatedEvent extends DomainEvent {
  constructor(actorId, requestId, correlationId, userUuid, updatedFields) {
    super('UserUpdated', actorId, requestId, correlationId, {
      userUuid,
      updatedFields,
    });
  }
}

class UserDeletedEvent extends DomainEvent {
  constructor(actorId, requestId, correlationId, userUuid) {
    super('UserDeleted', actorId, requestId, correlationId, {
      userUuid,
    });
  }
}

class UserActivatedEvent extends DomainEvent {
  constructor(actorId, requestId, correlationId, userUuid) {
    super('UserActivated', actorId, requestId, correlationId, {
      userUuid,
    });
  }
}

class UserSuspendedEvent extends DomainEvent {
  constructor(actorId, requestId, correlationId, userUuid) {
    super('UserSuspended', actorId, requestId, correlationId, {
      userUuid,
    });
  }
}

class PasswordChangedEvent extends DomainEvent {
  constructor(actorId, requestId, correlationId, userUuid) {
    super('PasswordChanged', actorId, requestId, correlationId, {
      userUuid,
    });
  }
}

class EmailVerifiedEvent extends DomainEvent {
  constructor(actorId, requestId, correlationId, userUuid) {
    super('EmailVerified', actorId, requestId, correlationId, {
      userUuid,
    });
  }
}

class PhoneVerifiedEvent extends DomainEvent {
  constructor(actorId, requestId, correlationId, userUuid) {
    super('PhoneVerified', actorId, requestId, correlationId, {
      userUuid,
    });
  }
}

class MFAEnabledEvent extends DomainEvent {
  constructor(actorId, requestId, correlationId, userUuid) {
    super('MFAEnabled', actorId, requestId, correlationId, {
      userUuid,
    });
  }
}

class MFADisabledEvent extends DomainEvent {
  constructor(actorId, requestId, correlationId, userUuid) {
    super('MFADisabled', actorId, requestId, correlationId, {
      userUuid,
    });
  }
}

module.exports = {
  DomainEvent,
  BusinessCreatedEvent,
  BusinessUpdatedEvent,
  BusinessArchivedEvent,
  BusinessSuspendedEvent,
  BusinessRestoredEvent,
  BusinessDeletedEvent,
  BranchCreatedEvent,
  BranchUpdatedEvent,
  BranchArchivedEvent,
  BranchSuspendedEvent,
  BranchRestoredEvent,
  BranchDeletedEvent,
  UserCreatedEvent,
  UserUpdatedEvent,
  UserDeletedEvent,
  UserActivatedEvent,
  UserSuspendedEvent,
  PasswordChangedEvent,
  EmailVerifiedEvent,
  PhoneVerifiedEvent,
  MFAEnabledEvent,
  MFADisabledEvent,
};
