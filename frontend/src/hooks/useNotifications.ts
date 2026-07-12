import { useEffect, useRef, useCallback, useState } from 'react';
import { store } from '../redux/store';
import api from '../services/api';

export interface AppNotification {
  id: number;
  type: 'sale' | 'purchase' | 'low_stock' | 'expiry' | 'system' | 'update';
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

interface UseNotificationsReturn {
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  markRead: (id: number) => Promise<void>;
  markAllRead: () => Promise<void>;
  clearAll: () => Promise<void>;
  deleteOne: (id: number) => Promise<void>;
  refetch: () => Promise<void>;
}

// Derive SSE base URL from VITE_API_URL (strip /api suffix if present)
const getSSEBase = () => {
  const url = import.meta.env.VITE_API_URL || '/api';
  return url.endsWith('/api') ? url.slice(0, -4) : url.replace(/\/api$/, '');
};

export const useNotifications = (): UseNotificationsReturn => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const esRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/notifications?limit=50');
      const data: AppNotification[] = res.data?.data || [];
      setNotifications(data);
      setUnreadCount(data.filter((n) => !n.isRead).length);
    } catch {
      /* silent — user might not be logged in yet */
    } finally {
      setLoading(false);
    }
  }, []);

  const connectSSE = useCallback(() => {
    const token = store.getState().auth?.accessToken;
    if (!token) return;

    if (esRef.current) esRef.current.close();

    const base = getSSEBase();
    const url = `${base}/api/notifications/stream?token=${encodeURIComponent(token)}`;
    const es = new EventSource(url);
    esRef.current = es;

    es.addEventListener('connected', () => {
      fetchAll();
    });

    es.addEventListener('notification', (e) => {
      try {
        const notif: AppNotification = JSON.parse(e.data);
        setNotifications((prev) => [notif, ...prev]);
        setUnreadCount((prev) => prev + 1);
        // Native browser notification
        if (typeof window !== 'undefined' && 'Notification' in window && window.Notification.permission === 'granted') {
          new window.Notification(notif.title, { body: notif.message, icon: '/favicon.ico' });
        }
      } catch { /* */ }
    });

    es.addEventListener('unread_count', (e) => {
      try {
        const { count } = JSON.parse(e.data);
        setUnreadCount(count);
      } catch { /* */ }
    });

    es.onerror = () => {
      es.close();
      esRef.current = null;
      // Auto-reconnect after 10 s
      reconnectTimerRef.current = setTimeout(connectSSE, 10000);
    };
  }, [fetchAll]);

  useEffect(() => {
    // Request browser notification permission once
    if (typeof window !== 'undefined' && 'Notification' in window && window.Notification.permission === 'default') {
      window.Notification.requestPermission();
    }

    fetchAll();
    connectSSE();

    return () => {
      if (esRef.current) { esRef.current.close(); esRef.current = null; }
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const markRead = async (id: number) => {
    await api.put(`/notifications/${id}/read`);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const markAllRead = async () => {
    await api.put('/notifications/read-all');
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  const clearAll = async () => {
    await api.delete('/notifications/clear-all');
    setNotifications([]);
    setUnreadCount(0);
  };

  const deleteOne = async (id: number) => {
    await api.delete(`/notifications/${id}`);
    setNotifications((prev) => {
      const updated = prev.filter((n) => n.id !== id);
      setUnreadCount(updated.filter((n) => !n.isRead).length);
      return updated;
    });
  };

  return { notifications, unreadCount, loading, markRead, markAllRead, clearAll, deleteOne, refetch: fetchAll };
};
