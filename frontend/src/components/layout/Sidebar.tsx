import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';
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
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const enabledModules = useEnabledModules();

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  const navItems = allNavItems.filter(item => {
    if ('divider' in item) return true;
    if (!item.moduleKey) return true;
    return enabledModules.has(item.moduleKey as never);
  });

  return (
    <>
      {sidebarOpen && (
        <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-header">
          <div>
            <div className="sidebar-logo">✨ AllTrackIn</div>
            <div className="sidebar-tagline">Your life, beautifully tracked</div>
          </div>
          <button className="btn btn-icon btn-ghost mobile-close-btn" onClick={() => setSidebarOpen(false)}>✕</button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item, i) => {
            if ('divider' in item) return <div key={i} className="sidebar-divider" />;
            const isActive = item.exact ? location.pathname === item.to : location.pathname.startsWith(item.to);
            return (
              <NavLink key={item.to} to={item.to}
                onClick={() => { if (window.innerWidth < 768) setSidebarOpen(false); }}
                className={`sidebar-link${isActive ? ' active' : ''}`}
                style={isActive && item.color ? { borderLeftColor: item.color } : undefined}
              >
                <span className="sidebar-icon">{item.icon}</span>
                <span>{item.label}</span>
                {item.color && <span className="sidebar-dot" style={{ background: item.color }} />}
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          {user && (
            <div className="sidebar-user">
              <div className="sidebar-avatar">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="sidebar-user-info">
                <div className="sidebar-username">{user.name}</div>
                <div className="sidebar-email">{user.email}</div>
              </div>
            </div>
          )}
          <button onClick={handleLogout} className="btn btn-secondary btn-sm w-full" style={{ justifyContent: 'center' }}>
            🚪 Sign out
          </button>
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
