import { NavLink, useLocation } from 'react-router-dom';
import { MODULE_COLORS } from '../../themes/themes';

const PRIMARY_NAV = [
  { to: '/',         label: 'Home',   icon: '🏠', exact: true },
  { to: '/spending', label: 'Spend',  icon: '💰', color: MODULE_COLORS.spending.primary },
  { to: '/training', label: 'Train',  icon: '🏃', color: MODULE_COLORS.training.primary },
  { to: '/books',    label: 'Books',  icon: '📚', color: MODULE_COLORS.books.primary },
  { to: '/events',   label: 'Events', icon: '🗓', color: MODULE_COLORS.events.primary },
];

const MORE_NAV = [
  { to: '/work',     label: 'Work',     icon: '💼', color: MODULE_COLORS.work.primary },
  { to: '/eating',   label: 'Eating',   icon: '🥗', color: MODULE_COLORS.eating.primary },
  { to: '/settings', label: 'Settings', icon: '⚙️' },
];

export default function BottomNav() {
  const location = useLocation();
  const hasMoreActive = MORE_NAV.some(item => location.pathname.startsWith(item.to));

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      background: 'var(--color-bg-card)',
      borderTop: '1px solid var(--color-border)',
      display: 'flex', alignItems: 'stretch',
      paddingBottom: 'env(safe-area-inset-bottom)',
      zIndex: 150,
      boxShadow: '0 -4px 20px rgba(0,0,0,0.08)',
    }}>
      {PRIMARY_NAV.map(item => {
        const isActive = item.exact
          ? location.pathname === item.to
          : location.pathname.startsWith(item.to);
        return (
          <NavLink key={item.to} to={item.to} style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: '0.15rem',
            padding: '0.625rem 0.25rem',
            textDecoration: 'none',
            color: isActive ? (item.color ?? 'var(--color-primary)') : 'var(--color-text-muted)',
            transition: 'color 0.2s',
          }}>
            <span style={{ fontSize: '1.3rem', transform: isActive ? 'scale(1.1)' : 'scale(1)', transition: 'transform 0.2s' }}>
              {item.icon}
            </span>
            <span style={{ fontSize: '0.62rem', fontWeight: isActive ? 600 : 400 }}>{item.label}</span>
          </NavLink>
        );
      })}

      {/* More menu */}
      <div style={{ flex: 1, position: 'relative' }}>
        <details>
          <summary style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: '0.15rem',
            padding: '0.625rem 0.25rem', cursor: 'pointer',
            color: hasMoreActive ? 'var(--color-primary)' : 'var(--color-text-muted)',
            listStyle: 'none', userSelect: 'none', height: '100%',
          }}>
            <span style={{ fontSize: '1.3rem' }}>⋯</span>
            <span style={{ fontSize: '0.62rem', fontWeight: hasMoreActive ? 600 : 400 }}>More</span>
          </summary>
          <div style={{
            position: 'absolute', bottom: '100%', right: 0,
            background: 'var(--color-bg-card)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-lg)',
            padding: '0.5rem', minWidth: '150px', zIndex: 200,
          }}>
            {MORE_NAV.map(item => (
              <NavLink key={item.to} to={item.to} style={{
                display: 'flex', alignItems: 'center', gap: '0.625rem',
                padding: '0.625rem 0.875rem',
                borderRadius: 'var(--radius-sm)',
                textDecoration: 'none',
                color: location.pathname.startsWith(item.to) ? (item.color ?? 'var(--color-primary)') : 'var(--color-text)',
                fontSize: '0.875rem', fontWeight: 500,
                background: location.pathname.startsWith(item.to) ? 'var(--color-surface)' : 'transparent',
              }}>
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        </details>
      </div>
    </nav>
  );
}
