import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, isToday, parseISO, differenceInDays } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { dashboardApi } from '../api/client';
import CalendarView from '../components/calendar/CalendarView';
import { MODULE_COLORS } from '../themes/themes';
import type { DashboardData, EventEntry, TrainingEntry } from '../types';

// ─── Quick Stats Card ────────────────────────────────────────────────────────
function QuickStatCard({ icon, label, value, color }: { icon: string; label: string; value: string | number; color: string }) {
  return (
    <div style={{
      background: 'var(--color-bg-card)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)',
      padding: '1rem 1.25rem',
      display: 'flex',
      alignItems: 'center',
      gap: '0.875rem',
      boxShadow: 'var(--shadow-sm)',
    }}>
      <div style={{ width: '44px', height: '44px', borderRadius: 'var(--radius-md)', background: color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.35rem', flexShrink: 0 }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text)', lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.125rem' }}>{label}</div>
      </div>
    </div>
  );
}

// ─── Quote Card ──────────────────────────────────────────────────────────────
function QuoteCard({ quote }: { quote: DashboardData['dailyQuote'] }) {
  if (!quote) return null;
  return (
    <div style={{
      background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)',
      borderRadius: 'var(--radius-xl)',
      padding: '1.5rem',
      color: 'white',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{ fontSize: '3rem', position: 'absolute', top: '-0.5rem', left: '0.75rem', opacity: 0.2, lineHeight: 1, fontFamily: 'serif' }}>"</div>
      <p style={{ fontSize: '1rem', fontStyle: 'italic', lineHeight: 1.6, margin: 0, position: 'relative', zIndex: 1, paddingLeft: '1.5rem' }}>
        {quote.text}
      </p>
      {quote.author && (
        <p style={{ fontSize: '0.8rem', opacity: 0.85, marginTop: '0.625rem', marginBottom: 0, position: 'relative', zIndex: 1, paddingLeft: '1.5rem' }}>
          — {quote.author}
        </p>
      )}
    </div>
  );
}

// ─── Upcoming Events ─────────────────────────────────────────────────────────
function UpcomingEvents({ events }: { events: EventEntry[] }) {
  const navigate = useNavigate();
  const EVENT_ICONS: Record<string, string> = {
    birthday: '🎂', vacation: '✈️', appointment: '📅', reminder: '⏰', holiday: '🎉', other: '📌',
  };

  if (!events.length) return (
    <div className="empty-state" style={{ padding: '1.5rem' }}>
      <span style={{ fontSize: '2rem' }}>📅</span>
      <p style={{ fontSize: '0.85rem' }}>No upcoming events</p>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {events.slice(0, 6).map(event => {
        const daysUntil = differenceInDays(parseISO(event.date), new Date());
        const isUrgent = daysUntil <= 3;
        return (
          <div key={event._id} style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            padding: '0.75rem 0.875rem',
            borderRadius: 'var(--radius-md)',
            background: isUrgent ? MODULE_COLORS.events.soft : 'var(--color-surface)',
            border: `1px solid ${isUrgent ? MODULE_COLORS.events.primary + '40' : 'var(--color-border)'}`,
          }}>
            <span style={{ fontSize: '1.25rem' }}>{EVENT_ICONS[event.eventType] ?? '📌'}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{event.name}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                {format(parseISO(event.date), 'MMM d')}
                {event.time && ` • ${event.time}`}
              </div>
            </div>
            <span style={{
              fontSize: '0.7rem', fontWeight: 600, padding: '0.2rem 0.5rem',
              borderRadius: '999px',
              background: daysUntil === 0 ? MODULE_COLORS.events.primary : isUrgent ? MODULE_COLORS.events.soft : 'var(--color-border)',
              color: daysUntil === 0 ? 'white' : isUrgent ? MODULE_COLORS.events.text : 'var(--color-text-muted)',
            }}>
              {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil}d`}
            </span>
          </div>
        );
      })}
      {events.length > 6 && (
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/events')} style={{ alignSelf: 'center' }}>
          View all {events.length} events →
        </button>
      )}
    </div>
  );
}

// ─── Today Summary ───────────────────────────────────────────────────────────
function TodaySummary({ data }: { data: DashboardData }) {
  const navigate = useNavigate();

  const modules = [
    {
      key: 'training', label: 'Workouts', to: '/training', icon: '🏃',
      count: data.todayTrainings.length, color: MODULE_COLORS.training.primary,
      detail: data.todayTrainings[0] ? `${data.todayTrainings[0].activityType}` : null,
    },
    {
      key: 'work', label: 'Work', to: '/work', icon: '💼',
      count: data.todayWork.length, color: MODULE_COLORS.work.primary,
      detail: data.todayWork[0] ? data.todayWork[0].locationType : null,
    },
    {
      key: 'eating', label: 'Meals', to: '/eating', icon: '🥗',
      count: data.todayEating.length, color: MODULE_COLORS.eating.primary,
      detail: null,
    },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
      {modules.map(mod => (
        <button
          key={mod.key}
          onClick={() => navigate(mod.to)}
          style={{
            background: mod.count > 0 ? mod.color + '15' : 'var(--color-surface)',
            border: `1px solid ${mod.count > 0 ? mod.color + '40' : 'var(--color-border)'}`,
            borderRadius: 'var(--radius-lg)',
            padding: '1rem',
            cursor: 'pointer',
            textAlign: 'left',
            fontFamily: 'inherit',
            transition: 'all 0.2s',
          }}
        >
          <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{mod.icon}</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: mod.count > 0 ? mod.color : 'var(--color-text-muted)', lineHeight: 1 }}>
            {mod.count}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '0.125rem' }}>{mod.label}</div>
          {mod.detail && <div style={{ fontSize: '0.7rem', color: mod.color, marginTop: '0.25rem', fontWeight: 500, textTransform: 'capitalize' }}>{mod.detail}</div>}
        </button>
      ))}
    </div>
  );
}

// ─── Module Quick Access ──────────────────────────────────────────────────────
function ModuleGrid() {
  const navigate = useNavigate();
  const modules = [
    { to: '/spending', label: 'Spending', icon: '💰', color: MODULE_COLORS.spending.primary, soft: MODULE_COLORS.spending.soft },
    { to: '/training', label: 'Training', icon: '🏃', color: MODULE_COLORS.training.primary, soft: MODULE_COLORS.training.soft },
    { to: '/books',    label: 'Books',    icon: '📚', color: MODULE_COLORS.books.primary,    soft: MODULE_COLORS.books.soft },
    { to: '/events',   label: 'Events',   icon: '🗓', color: MODULE_COLORS.events.primary,   soft: MODULE_COLORS.events.soft },
    { to: '/work',     label: 'Work',     icon: '💼', color: MODULE_COLORS.work.primary,     soft: MODULE_COLORS.work.soft },
    { to: '/eating',   label: 'Eating',   icon: '🥗', color: MODULE_COLORS.eating.primary,   soft: MODULE_COLORS.eating.soft },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
      {modules.map(mod => (
        <button
          key={mod.to}
          onClick={() => navigate(mod.to)}
          style={{
            background: mod.soft,
            border: `1px solid ${mod.color}30`,
            borderRadius: 'var(--radius-lg)',
            padding: '1.125rem 0.75rem',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.375rem',
            fontFamily: 'inherit',
            transition: 'all 0.2s',
          }}
        >
          <span style={{ fontSize: '1.75rem' }}>{mod.icon}</span>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: mod.color }}>{mod.label}</span>
        </button>
      ))}
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: () => dashboardApi.get(),
    refetchInterval: 5 * 60 * 1000,
  });

  const todayStr = format(new Date(), 'EEEE, MMMM d, yyyy');

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="spinner" />
        <span>Loading your day…</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Greeting */}
      <div>
        <h1 style={{ fontSize: 'clamp(1.35rem, 4vw, 1.75rem)', fontWeight: 700, margin: 0 }}>
          Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'} ✨
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', margin: '0.25rem 0 0', fontSize: '0.9rem' }}>{todayStr}</p>
      </div>

      {/* Daily Quote */}
      {data?.dailyQuote && <QuoteCard quote={data.dailyQuote} />}

      {/* Today's Summary */}
      <div>
        <h3 style={{ marginBottom: '0.75rem', fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Today's Activity
        </h3>
        {data && <TodaySummary data={data} />}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1.2fr)', gap: '1.5rem', alignItems: 'start' }}>
        {/* Calendar */}
        <div>
          <CalendarView onDayClick={(day, items) => setSelectedDay(day)} />
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Upcoming Events */}
          <div className="card">
            <div className="card-header">
              <h3 style={{ margin: 0, fontSize: '0.95rem' }}>🗓 Upcoming</h3>
            </div>
            <div className="card-body" style={{ paddingTop: '0.75rem' }}>
              {data && <UpcomingEvents events={data.upcomingEvents} />}
            </div>
          </div>

          {/* Quick Access */}
          <div className="card">
            <div className="card-header">
              <h3 style={{ margin: 0, fontSize: '0.95rem' }}>🚀 Quick Access</h3>
            </div>
            <div className="card-body" style={{ paddingTop: '0.75rem' }}>
              <ModuleGrid />
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .dashboard-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
