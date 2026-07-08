'use strict';

const logger = require('../logger');

let otelApi = null;
try {
  otelApi = require('@opentelemetry/api');
} catch (err) {
  logger.debug('[Telemetry] OpenTelemetry API package not detected. Using memory/console fallback.');
}

class OpenTelemetryTracker {
  constructor() {
    this.histograms = new Map();
  }

  startSpan(name, parentSpan = null) {
    if (otelApi) {
      const tracer = otelApi.trace.getTracer('nex-platform-core');
      const ctx = parentSpan ? otelApi.trace.setSpan(otelApi.context.active(), parentSpan) : undefined;
      const span = tracer.startSpan(name, undefined, ctx);
      return span;
    }
    // Mock Span
    const startTime = Date.now();
    return {
      end: () => {
        const duration = Date.now() - startTime;
        this.recordDuration(name, duration);
      },
      setStatus: () => {},
      recordException: (err) => {
        logger.error(`[Telemetry Span Error] ${name}:`, err);
      }
    };
  }

  recordDuration(name, valueMs) {
    if (otelApi) {
      // In production with OTEL meter sdk, we would bind to a histogram metric:
      // const meter = otelApi.metrics.getMeter('nex-platform-core');
      // const histogram = meter.createHistogram(name);
      // histogram.record(valueMs);
    }
    const current = this.histograms.get(name) || { count: 0, totalMs: 0, maxMs: 0 };
    current.count++;
    current.totalMs += valueMs;
    current.maxMs = Math.max(current.maxMs, valueMs);
    this.histograms.set(name, current);
  }

  getHistogramStats() {
    const stats = {};
    for (const [name, data] of this.histograms.entries()) {
      stats[name] = {
        avgMs: Math.round(data.totalMs / data.count),
        maxMs: data.maxMs,
        count: data.count
      };
    }
    return stats;
  }
}

const otelTracker = new OpenTelemetryTracker();
module.exports = otelTracker;
