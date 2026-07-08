'use strict';

const { AsyncLocalStorage } = require('async_hooks');
const storage = new AsyncLocalStorage();

class RequestContext {
  static getStore() {
    return storage.getStore() || {};
  }

  static run(store, callback) {
    return storage.run(store, callback);
  }

  static get tenantId() {
    return this.getStore().tenantId || null;
  }

  static get userId() {
    return this.getStore().userId || null;
  }

  static get branchId() {
    return this.getStore().branchId || null;
  }

  static get businessId() {
    return this.getStore().businessId || null;
  }

  static get permissions() {
    return this.getStore().permissions || [];
  }

  static get features() {
    return this.getStore().features || [];
  }

  static get correlationId() {
    return this.getStore().correlationId || null;
  }

  static set tenantId(val) {
    const store = storage.getStore();
    if (store) store.tenantId = val;
  }

  static set userId(val) {
    const store = storage.getStore();
    if (store) store.userId = val;
  }

  static set branchId(val) {
    const store = storage.getStore();
    if (store) store.branchId = val;
  }

  static set businessId(val) {
    const store = storage.getStore();
    if (store) store.businessId = val;
  }

  static set permissions(val) {
    const store = storage.getStore();
    if (store) store.permissions = val;
  }

  static set features(val) {
    const store = storage.getStore();
    if (store) store.features = val;
  }

  static set correlationId(val) {
    const store = storage.getStore();
    if (store) store.correlationId = val;
  }
}

module.exports = RequestContext;
