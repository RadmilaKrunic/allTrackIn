import { useApp } from '../../contexts/AppContext';

const STYLES = {
  success: { bg: '#F0FDF4', border: '#BBF7D0', text: '#15803D', icon: '✓' },
  error:   { bg: '#FEF2F2', border: '#FECACA', text: '#DC2626', icon: '✕' },
  info:    { bg: '#EFF6FF', border: '#BFDBFE', text: '#1D4ED8', icon: 'ℹ' },
  warning: { bg: '#FFFBEB', border: '#FDE68A', text: '#D97706', icon: '⚠' },
} as const;

export default function Notification() {
  const { notification } = useApp();
  if (!notification) return null;

  const s = STYLES[notification.type] ?? STYLES.info;

  return (
    <div style={{
      position: 'fixed',
      top: 'calc(1rem + env(safe-area-inset-top))',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 9999,
      background: s.bg,
      border: `1px solid ${s.border}`,
      color: s.text,
      borderRadius: '12px',
      padding: '0.875rem 1.25rem',
      boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
      display: 'flex',
      alignItems: 'center',
      gap: '0.625rem',
      maxWidth: 'min(90vw, 400px)',
      animation: 'slideDown 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
      fontSize: '0.9rem',
      fontWeight: 500,
    }}>
      <span style={{ fontWeight: 700 }}>{s.icon}</span>
      {notification.message}
    </div>
  );
}
