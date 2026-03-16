import { NavLink, useLocation } from 'react-router-dom';
import { MODULE_COLORS } from '../../themes/themes';
import { useEnabledModules } from '../../hooks/useEnabledModules';

const ALL_PRIMARY = [
  { to: '/',       label: 'Home',    icon: '🏠', exact: true                                                         },
  { to: '/events', label: 'Events',  icon: '🗓', color: MODULE_COLORS.events.primary,   moduleKey: 'events'   },
  { to: '/todo',   label: 'To-Do',   icon: '✅', color: MODULE_COLORS.todo.primary,     moduleKey: 'todo'     },
  { to: '/work',   label: 'Work',    icon: '💼', color: MODULE_COLORS.work.primary,     moduleKey: 'work'     },
  { to: '/eating', label: 'Eating',  icon: '🥗', color: MODULE_COLORS.eating.primary,   moduleKey: 'eating'   },
];

const ALL_MORE = [
  { to: '/training', label: 'Training',  icon: '🏃', color: MODULE_COLORS.training.primary, moduleKey: 'training' },
  { to: '/spending', label: 'Spending',  icon: '💰', color: MODULE_COLORS.spending.primary, moduleKey: 'spending' },
  { to: '/period',   label: 'Period',    icon: '🌸', color: MODULE_COLORS.period.primary,   moduleKey: 'period'   },
  { to: '/books',    label: 'Reading',   icon: '📚', color: MODULE_COLORS.books.primary,    moduleKey: 'books'    },
  { to: '/habits',   label: 'Habits',    icon: '🎯', color: MODULE_COLORS.habits.primary,   moduleKey: 'habits'   },
  { to: '/settings', label: 'Settings',  icon: '⚙️'                                                               },
];

export default function BottomNav() {
  const location = useLocation();
  const enabledModules = useEnabledModules();

  const primaryNav = ALL_PRIMARY.filter(item => !item.moduleKey || enabledModules.has(item.moduleKey as never));
  const moreNav = ALL_MORE.filter(item => !item.moduleKey || enabledModules.has(item.moduleKey as never));

  const hasMoreActive = moreNav.some(item => location.pathname.startsWith(item.to));

  return (
    <nav className="bottom-nav">
      {primaryNav.map(item => {
        const isActive = (item as { exact?: boolean }).exact ? location.pathname === item.to : location.pathname.startsWith(item.to);
        const activeColor = (item as { color?: string }).color ?? 'var(--color-primary)';
        return (
          <NavLink
            key={item.to}
            to={item.to}
            className={`bottom-nav-link${isActive ? ' active' : ''}`}
            style={isActive ? { color: activeColor } : undefined}
          >
            <span className="bottom-nav-icon">{item.icon}</span>
            <span className="bottom-nav-label">{item.label}</span>
          </NavLink>
        );
      })}

      {moreNav.length > 0 && (
        <div className={`bottom-nav-more${hasMoreActive ? ' has-active' : ''}`}>
          <details>
            <summary className="bottom-nav-summary">
              <span className="bottom-nav-icon">⋯</span>
              <span className="bottom-nav-label">More</span>
            </summary>
            <div className="bottom-nav-dropdown">
              {moreNav.map(item => {
                const isActive = location.pathname.startsWith(item.to);
                const activeColor = (item as { color?: string }).color ?? 'var(--color-primary)';
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={`bottom-nav-more-link${isActive ? ' active' : ''}`}
                    style={isActive ? { color: activeColor } : undefined}
                  >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          </details>
        </div>
      )}
    </nav>
  );
}
