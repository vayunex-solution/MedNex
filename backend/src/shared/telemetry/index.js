'use strict';

class TelemetryCollector {
  constructor() {
    this.metrics = {
      userRegistrations: 0,
      successfulLogins: 0,
      failedLogins: 0,
      passwordResets: 0,
      sessionRevocations: 0,
      accountLockouts: 0,
    };
  }

  increment(metricName) {
    if (this.metrics[metricName] !== undefined) {
      this.metrics[metricName]++;
    }
  }

  getMetrics() {
    return { ...this.metrics };
  }
}

const telemetryCollector = new TelemetryCollector();
module.exports = telemetryCollector;
