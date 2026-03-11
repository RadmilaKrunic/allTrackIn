import { useLocation } from 'react-router-dom';
import { useApp } from '../../contexts/AppContext';
import { useTheme } from '../../contexts/ThemeContext';

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
  const location = useLocation();

  const title = ROUTE_TITLES[location.pathname] ?? 'AllTrackIn';
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <header style={{
      height: '64px', background: 'var(--color-bg-card)',
      borderBottom: '1px solid var(--color-border)',
      display: 'flex', alignItems: 'center',
      padding: '0 1.5rem', gap: '1rem',
      position: 'sticky', top: 0, zIndex: 100, flexShrink: 0,
    }}>
      <button
        className="btn btn-icon btn-ghost mobile-menu-btn"
        onClick={() => setSidebarOpen(true)}
        aria-label="Open menu"
      >
        ☰
      </button>

      <div style={{ flex: 1 }}>
        <h2 style={{ fontSize: '1.05rem', fontWeight: 600, margin: 0, lineHeight: 1.2 }}>{title}</h2>
        <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', margin: 0 }}>{today}</p>
      </div>

      <select
        value={currentTheme}
        onChange={(e) => setCurrentTheme(e.target.value)}
        className="form-select"
        style={{ width: 'auto', fontSize: '0.78rem', padding: '0.3rem 2rem 0.3rem 0.6rem' }}
        aria-label="Theme"
      >
        {Object.entries(themes).map(([key, theme]) => (
          <option key={key} value={key}>{theme.name}</option>
        ))}
      </select>

      <style>{`
        .mobile-menu-btn { display: none; }
        @media (max-width: 767px) { .mobile-menu-btn { display: flex !important; } }
      `}</style>
    </header>
  );
}
