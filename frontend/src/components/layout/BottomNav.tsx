import { NavLink, useLocation } from 'react-router-dom';
import { MODULE_COLORS } from '../../themes/themes';
import { useEnabledModules } from '../../hooks/useEnabledModules';

const ALL_PRIMARY = [
  { to: '/',         label: 'Home',    icon: '🏠', exact: true                                                           },
  { to: '/spending', label: 'Spend',   icon: '💰', color: MODULE_COLORS.spending.primary, moduleKey: 'spending' },
  { to: '/training', label: 'Train',   icon: '🏃', color: MODULE_COLORS.training.primary, moduleKey: 'training' },
  { to: '/books',    label: 'Books',   icon: '📚', color: MODULE_COLORS.books.primary,    moduleKey: 'books'    },
  { to: '/events',   label: 'Events',  icon: '🗓', color: MODULE_COLORS.events.primary,   moduleKey: 'events'   },
];

const ALL_MORE = [
  { to: '/work',     label: 'Work',     icon: '💼', color: MODULE_COLORS.work.primary,   moduleKey: 'work'   },
  { to: '/eating',   label: 'Eating',   icon: '🥗', color: MODULE_COLORS.eating.primary, moduleKey: 'eating' },
  { to: '/period',   label: 'Period',   icon: '🌸', color: MODULE_COLORS.period.primary, moduleKey: 'period' },
  { to: '/settings', label: 'Settings', icon: '⚙️'                                                           },
];

export default function BottomNav() {
  const location = useLocation();
  const enabledModules = useEnabledModules();

  const primaryNav = ALL_PRIMARY.filter(item => !item.moduleKey || enabledModules.has(item.moduleKey as never));
  const moreNav = ALL_MORE.filter(item => !item.moduleKey || enabledModules.has(item.moduleKey as never));

  const hasMoreActive = moreNav.some(item => location.pathname.startsWith(item.to));

  return (
    <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'var(--color-bg-card)', borderTop: '1px solid var(--color-border)', display: 'flex', alignItems: 'stretch', paddingBottom: 'env(safe-area-inset-bottom)', zIndex: 150, boxShadow: '0 -4px 20px rgba(0,0,0,0.08)' }}>
      {primaryNav.map(item => {
        const isActive = (item as { exact?: boolean }).exact ? location.pathname === item.to : location.pathname.startsWith(item.to);
        return (
          <NavLink key={item.to} to={item.to} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.15rem', padding: '0.625rem 0.25rem', textDecoration: 'none', color: isActive ? ((item as { color?: string }).color ?? 'var(--color-primary)') : 'var(--color-text-muted)', transition: 'color 0.2s' }}>
            <span style={{ fontSize: '1.3rem', transform: isActive ? 'scale(1.1)' : 'scale(1)', transition: 'transform 0.2s' }}>{item.icon}</span>
            <span style={{ fontSize: '0.62rem', fontWeight: isActive ? 600 : 400 }}>{item.label}</span>
          </NavLink>
        );
      })}

      {/* More menu */}
      {moreNav.length > 0 && (
        <div style={{ flex: 1, position: 'relative' }}>
          <details>
            <summary style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.15rem', padding: '0.625rem 0.25rem', cursor: 'pointer', color: hasMoreActive ? 'var(--color-primary)' : 'var(--color-text-muted)', listStyle: 'none', userSelect: 'none', height: '100%' }}>
              <span style={{ fontSize: '1.3rem' }}>⋯</span>
              <span style={{ fontSize: '0.62rem', fontWeight: hasMoreActive ? 600 : 400 }}>More</span>
            </summary>
            <div style={{ position: 'absolute', bottom: '100%', right: 0, background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)', padding: '0.5rem', minWidth: '150px', zIndex: 200 }}>
              {moreNav.map(item => (
                <NavLink key={item.to} to={item.to} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.625rem 0.875rem', borderRadius: 'var(--radius-sm)', textDecoration: 'none', color: location.pathname.startsWith(item.to) ? ((item as { color?: string }).color ?? 'var(--color-primary)') : 'var(--color-text)', fontSize: '0.875rem', fontWeight: 500, background: location.pathname.startsWith(item.to) ? 'var(--color-surface)' : 'transparent' }}>
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          </details>
        </div>
      )}
    </nav>
  );
}
