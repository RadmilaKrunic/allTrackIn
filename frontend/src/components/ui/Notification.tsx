import { useApp } from '../../contexts/AppContext';

export default function Notification() {
  const { notification } = useApp();
  if (!notification) return null;

  return (
    <div className={`notification notification-${notification.type}`}>
      <span className="notification-icon">
        {{ success: '✓', error: '✕', info: 'ℹ', warning: '⚠' }[notification.type] ?? 'ℹ'}
      </span>
      {notification.message}
    </div>
  );
}
