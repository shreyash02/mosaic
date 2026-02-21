import { createContext, useContext, useState, useEffect, useCallback, ReactNode, useMemo, useRef } from 'react';
import { api, apiEvents } from '../services/api';
import { useAuth } from './AuthContext';
import type { Notification } from '../types';

// Use same API base URL as api.ts (already includes /api)
const API_BASE_URL = import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD ? '/api' : 'http://localhost:8000/api');

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'notification';
  title: string;
  message: string;
  notification?: Notification;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  connected: boolean;
  loading: boolean;
  toasts: Toast[];
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  loadMoreNotifications: () => Promise<void>;
  hasMore: boolean;
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  refreshNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const NOTIFICATIONS_LIMIT = 20;

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load initial notifications
  const loadNotifications = useCallback(async () => {
    if (!isAuthenticated) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    try {
      const [notifResponse, countResponse] = await Promise.all([
        api.getNotifications(NOTIFICATIONS_LIMIT, 0),
        api.getUnreadNotificationCount(),
      ]);

      setNotifications(notifResponse.notifications);
      setHasMore(notifResponse.has_more);
      setUnreadCount(countResponse.count);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Load more notifications
  const loadMoreNotifications = useCallback(async () => {
    if (!isAuthenticated || !hasMore) return;

    try {
      const response = await api.getNotifications(
        NOTIFICATIONS_LIMIT,
        notifications.length
      );

      setNotifications(prev => [...prev, ...response.notifications]);
      setHasMore(response.has_more);
    } catch (error) {
      console.error('Failed to load more notifications:', error);
    }
  }, [isAuthenticated, hasMore, notifications.length]);

  // Toast management - defined before setupEventSource so it can be used
  const addToastRef = useRef<((toast: Omit<Toast, 'id'>) => void) | null>(null);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setToasts(prev => [...prev, { ...toast, id }]);

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  }, []);

  // Keep ref updated
  addToastRef.current = addToast;

  // Listen for network errors from the API interceptor
  useEffect(() => {
    const handler = (e: Event) => {
      const message = (e as CustomEvent).detail?.message || 'Connection lost. Please try again.';
      addToastRef.current?.({ type: 'error', title: 'Connection issue', message });
    };
    apiEvents.addEventListener('network-error', handler);
    return () => apiEvents.removeEventListener('network-error', handler);
  }, []);

  // Setup SSE connection
  const setupEventSource = useCallback(() => {
    if (!isAuthenticated) return;

    const token = localStorage.getItem('access_token');
    if (!token) return;

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const url = `${API_BASE_URL}/notifications/stream?token=${encodeURIComponent(token)}`;
    console.log('SSE connecting to:', url);
    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.addEventListener('connected', () => {
      setConnected(true);
      console.log('SSE connected');
    });

    eventSource.addEventListener('notification', (event) => {
      console.log('SSE notification received:', event.data);
      const notification = JSON.parse(event.data) as Notification;

      // Add to notifications list
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);

      // Show toast using ref to avoid stale closure
      addToastRef.current?.({
        type: 'notification',
        title: notification.title,
        message: notification.message,
        notification,
      });
    });

    eventSource.addEventListener('notification_deleted', (event) => {
      console.log('SSE notification_deleted received:', event.data);
      const { id } = JSON.parse(event.data) as { id: string };

      // Remove from notifications list
      setNotifications(prev => {
        const notification = prev.find(n => n.id === id);
        if (notification && !notification.read) {
          setUnreadCount(count => Math.max(0, count - 1));
        }
        return prev.filter(n => n.id !== id);
      });
    });

    // Forward space events as CustomEvents (decoupled from NotificationContext state)
    for (const evt of ['space_classify_completed', 'space_organize_started', 'space_organize_completed'] as const) {
      eventSource.addEventListener(evt, (e: MessageEvent) => {
        window.dispatchEvent(new CustomEvent(`sse:${evt}`, { detail: JSON.parse(e.data) }));
      });
    }

    eventSource.addEventListener('heartbeat', () => {
      // Keep alive - connection still active
    });

    eventSource.onerror = (e) => {
      console.error('SSE error:', e);
      setConnected(false);
      eventSource.close();
      eventSourceRef.current = null;

      // Attempt reconnect after delay
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      reconnectTimeoutRef.current = setTimeout(() => {
        if (isAuthenticated) {
          setupEventSource();
        }
      }, 5000);
    };

    return () => {
      eventSource.close();
      eventSourceRef.current = null;
    };
  }, [isAuthenticated]);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await api.markNotificationAsRead(notificationId);

      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, read: true } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    try {
      await api.markAllNotificationsAsRead();

      setNotifications(prev =>
        prev.map(n => ({ ...n, read: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  }, []);

  // Delete notification
  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      // Optimistically remove from UI
      const notification = notifications.find(n => n.id === notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      if (notification && !notification.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }

      await api.deleteNotification(notificationId);
    } catch (error) {
      console.error('Failed to delete notification:', error);
      // Refresh to restore state on error
      await loadNotifications();
    }
  }, [notifications, loadNotifications]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const refreshNotifications = useCallback(async () => {
    setLoading(true);
    await loadNotifications();
  }, [loadNotifications]);

  // Initialize when auth changes
  // Note: We intentionally exclude loadNotifications and setupEventSource from deps
  // to prevent creating multiple SSE connections on re-renders
  useEffect(() => {
    if (authLoading) return;

    loadNotifications();

    // In development (HTTP/1.1), delay SSE connection to allow initial page requests
    // to complete first. This prevents SSE from blocking other requests on the same connection.
    // In production (HTTP/2), multiplexing handles this, so no delay needed.
    let sseTimeout: ReturnType<typeof setTimeout> | null = null;
    if (isAuthenticated) {
      const delay = import.meta.env.DEV ? 2000 : 0;
      sseTimeout = setTimeout(() => {
        setupEventSource();
      }, delay);
    }

    return () => {
      if (sseTimeout) {
        clearTimeout(sseTimeout);
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAuthenticated]);

  const value = useMemo(() => ({
    notifications,
    unreadCount,
    connected,
    loading,
    toasts,
    hasMore,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    loadMoreNotifications,
    addToast,
    removeToast,
    refreshNotifications,
  }), [
    notifications,
    unreadCount,
    connected,
    loading,
    toasts,
    hasMore,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    loadMoreNotifications,
    addToast,
    removeToast,
    refreshNotifications,
  ]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

/**
 * Hook to access the notification context
 */
export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

/**
 * Hook to get unread notification count
 */
export function useUnreadCount(): number {
  const { unreadCount } = useNotifications();
  return unreadCount;
}

/**
 * Hook to add toasts from anywhere
 */
export function useToast() {
  const { addToast, removeToast } = useNotifications();
  return { addToast, removeToast };
}
