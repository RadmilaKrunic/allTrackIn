import { useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../../contexts/AppContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';

const ROUTE_TITLES: Record<string, string> = {
  '/':         'Dashboard',
  '/spending': 'Spending & Finance',
  '/training': 'Training & Fitness',
  '/books':    'Books & Reading',
  '/events':   'Events & Calendar',
  '/work':     'Work Tracker',
  '/eating':   'Eating & Nutrition',
  '/settings': 'Settings',
};

export default function TopBar() {
  const { setSidebarOpen } = useApp();
  const { currentTheme, setCurrentTheme, themes } = useTheme();
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const title = ROUTE_TITLES[location.pathname] ?? 'AllTrackIn';
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <header className="topbar">
      <button
        className="btn btn-icon btn-ghost mobile-menu-btn"
        onClick={() => setSidebarOpen(true)}
        aria-label="Open menu"
      >
        ☰
      </button>

      <div className="topbar-title-area">
        <h2 className="topbar-title">{title}</h2>
        <p className="topbar-date">{today}</p>
      </div>

      <select
        value={currentTheme}
        onChange={(e) => setCurrentTheme(e.target.value)}
        className="form-select topbar-theme-select"
        aria-label="Theme"
      >
        {Object.entries(themes).map(([key, theme]) => (
          <option key={key} value={key}>{theme.name}</option>
        ))}
      </select>

      {user && (
        <div className="topbar-user">
          <div className="topbar-avatar" title={`${user.name} (${user.email})`}>
            {user.name.charAt(0).toUpperCase()}
          </div>
          <button
            className="btn btn-ghost btn-sm topbar-logout"
            onClick={() => { logout(); navigate('/login', { replace: true }); }}
            title="Sign out"
            style={{ fontSize: '0.8rem' }}
          >
            🚪
          </button>
        </div>
      )}

      <style>{`
        .mobile-menu-btn { display: none; }
        @media (max-width: 767px) { .mobile-menu-btn { display: flex !important; } }
      `}</style>
    </header>
  );
}
