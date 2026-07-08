export interface AuditLog {
  id: number;
  uuid: string;
  userId: number;
  action: string;
  module: string;
  details: string;
  ipAddress: string | null;
  userAgent: string | null;
  correlationId: string | null;
  beforeValue: Record<string, unknown> | null;
  afterValue: Record<string, unknown> | null;
  operationReason: string | null;
  recordHash: string | null;
  previousHash: string | null;
  createdAt: string;
}

export interface BackgroundJob {
  uuid: string;
  queue: string;
  taskName: string;
  payload: Record<string, unknown>;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'dead';
  attempts: number;
  maxAttempts: number;
  runAt: string;
  lockedUntil: string | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface HealthCheckResult {
  status: 'UP' | 'DOWN' | 'DEGRADED';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  checks: Record<string, {
    status: string;
    [key: string]: unknown;
  }>;
  metrics: {
    cache?: {
      hits: number;
      misses: number;
      hitRate: number;
    };
    queue?: {
      completed: number;
      failed: number;
      dead: number;
    };
    business?: Record<string, unknown>;
    telemetry?: Record<string, unknown>;
    [key: string]: unknown;
  };
}

export interface DashboardStats {
  counts: {
    totalTenants: number;
    activeTenants: number;
    totalBusinesses: number;
    totalBranches: number;
    totalUsers: number;
    activeSessions: number;
  };
  health: {
    nodeVersion: string;
    platformUptime: number;
    memoryUsage: Record<string, unknown>;
    environment: string;
    timestamp: string;
  };
  recentActivity: {
    platform: AuditLog[];
    tenant: AuditLog[];
  };
  activity?: {
    labels: string[];
    data: number[];
  };
}
