import { NavLink, useLocation } from 'react-router-dom';
import { useApp } from '../../contexts/AppContext';
import { MODULE_COLORS } from '../../themes/themes';
import { useEnabledModules } from '../../hooks/useEnabledModules';

interface NavItem {
  to: string;
  label: string;
  icon: string;
  exact?: boolean;
  color?: string;
  moduleKey?: string;
}

interface DividerItem { divider: true; }
type MenuItem = NavItem | DividerItem;

const allNavItems: MenuItem[] = [
  { to: '/', label: 'Dashboard', icon: '🏠', exact: true },
  { divider: true },
  { to: '/events',   label: 'Events & Notes',  icon: '🗓', color: MODULE_COLORS.events.primary,   moduleKey: 'events'   },
  { to: '/todo',     label: 'To-Do',           icon: '✅', color: MODULE_COLORS.todo.primary,     moduleKey: 'todo'     },
  { to: '/work',     label: 'Work',            icon: '💼', color: MODULE_COLORS.work.primary,     moduleKey: 'work'     },
  { to: '/eating',   label: 'Eating',          icon: '🥗', color: MODULE_COLORS.eating.primary,   moduleKey: 'eating'   },
  { to: '/training', label: 'Training',        icon: '🏃', color: MODULE_COLORS.training.primary, moduleKey: 'training' },
  { to: '/spending', label: 'Spending',        icon: '💰', color: MODULE_COLORS.spending.primary, moduleKey: 'spending' },
  { to: '/period',   label: 'Period',          icon: '🌸', color: MODULE_COLORS.period.primary,   moduleKey: 'period'   },
  { to: '/books',    label: 'Reading',         icon: '📚', color: MODULE_COLORS.books.primary,    moduleKey: 'books'    },
  { to: '/habits',   label: 'Habits',          icon: '🎯', color: MODULE_COLORS.habits.primary,   moduleKey: 'habits'   },
  { divider: true },
  { to: '/settings', label: 'Settings', icon: '⚙️' },
];

export default function Sidebar() {
  const { sidebarOpen, setSidebarOpen } = useApp();
  const location = useLocation();
  const enabledModules = useEnabledModules();

  const navItems = allNavItems.filter(item => {
    if ('divider' in item) return true;
    if (!item.moduleKey) return true;
    return enabledModules.has(item.moduleKey as never);
  });

  return (
    <>
      {sidebarOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 199, backdropFilter: 'blur(2px)' }} onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}
        style={{ width: '220px', flexShrink: 0, background: 'var(--color-bg-card)', borderRight: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', height: '100dvh', position: 'sticky', top: 0, overflowY: 'auto', zIndex: 200, transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)' }}
      >
        <div style={{ padding: '1.5rem 1.25rem 1rem', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-primary)', letterSpacing: '-0.02em' }}>✨ AllTrackIn</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '0.1rem' }}>Your life, beautifully tracked</div>
          </div>
          <button className="btn btn-icon btn-ghost mobile-close-btn" onClick={() => setSidebarOpen(false)}>✕</button>
        </div>

        <nav style={{ flex: 1, padding: '0.75rem' }}>
          {navItems.map((item, i) => {
            if ('divider' in item) return <div key={i} style={{ height: '1px', background: 'var(--color-border)', margin: '0.5rem 0.25rem' }} />;
            const isActive = item.exact ? location.pathname === item.to : location.pathname.startsWith(item.to);
            return (
              <NavLink key={item.to} to={item.to}
                onClick={() => { if (window.innerWidth < 768) setSidebarOpen(false); }}
                style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.625rem 0.875rem', borderRadius: 'var(--radius-md)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500, marginBottom: '0.125rem', background: isActive ? 'var(--color-surface)' : 'transparent', color: isActive ? 'var(--color-primary)' : 'var(--color-text-secondary)', borderLeft: isActive && item.color ? `3px solid ${item.color}` : '3px solid transparent', transition: 'all 0.15s' }}
              >
                <span style={{ fontSize: '1.1rem', width: '1.25rem', textAlign: 'center' }}>{item.icon}</span>
                <span>{item.label}</span>
                {item.color && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: item.color, marginLeft: 'auto' }} />}
              </NavLink>
            );
          })}
        </nav>

        <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid var(--color-border)', fontSize: '0.72rem', color: 'var(--color-text-muted)', textAlign: 'center' }}>
          AllTrackIn v1.0
        </div>
      </aside>

      <style>{`
        .mobile-close-btn { display: none; }
        @media (max-width: 767px) {
          .sidebar { position: fixed !important; top: 0 !important; left: 0 !important; height: 100dvh !important; transform: translateX(-100%); }
          .sidebar.sidebar-open { transform: translateX(0) !important; }
          .mobile-close-btn { display: flex !important; }
        }
      `}</style>
    </>
  );
}
