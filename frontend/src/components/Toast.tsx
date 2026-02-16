import { useNotifications } from '../contexts/NotificationContext';
import { useNavigate } from 'react-router-dom';
import type { Notification } from '../types';
import './Toast.css';

interface ToastItemProps {
  id: string;
  type: 'success' | 'error' | 'info' | 'notification';
  title: string;
  message: string;
  notification?: Notification;
  onClose: () => void;
  onNavigate?: () => void;
}

function ToastItem({ type, title, message, notification, onClose, onNavigate }: ToastItemProps) {
  const handleClick = () => {
    if (notification?.data?.action_url) {
      onNavigate?.();
    }
  };

  return (
    <div
      className={`toast toast-${type}`}
      onClick={handleClick}
      role={type === 'notification' ? 'button' : 'alert'}
      tabIndex={type === 'notification' ? 0 : undefined}
    >
      <div className="toast-icon">
        {type === 'success' && (
          <svg viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        )}
        {type === 'error' && (
          <svg viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        )}
        {type === 'info' && (
          <svg viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        )}
        {type === 'notification' && (
          <svg viewBox="0 0 20 20" fill="currentColor">
            <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
          </svg>
        )}
      </div>
      <div className="toast-content">
        <div className="toast-title">{title}</div>
        <div className="toast-message">{message}</div>
      </div>
      <button
        className="toast-close"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label="Close notification"
      >
        <svg viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>
    </div>
  );
}

export function ToastContainer() {
  const { toasts, removeToast, markAsRead } = useNotifications();
  const navigate = useNavigate();

  const handleNavigate = async (notification?: Notification) => {
    if (notification?.data?.action_url) {
      // Mark as read first
      await markAsRead(notification.id);
      // Navigate
      navigate(notification.data.action_url);
    }
  };

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          {...toast}
          onClose={() => removeToast(toast.id)}
          onNavigate={() => handleNavigate(toast.notification)}
        />
      ))}
    </div>
  );
}
