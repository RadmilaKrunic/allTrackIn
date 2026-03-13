import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO, differenceInDays } from 'date-fns';
import { useNavigate, type NavigateFunction } from 'react-router-dom';
import { dashboardApi, notesApi } from '../api/client';
import CalendarView from '../components/calendar/CalendarView';
import { MODULE_COLORS } from '../themes/themes';
import { useApp } from '../contexts/AppContext';
import type { DashboardData, EventEntry, TrainingEntry, NoteEntry } from '../types';

// ─── Quick Stats Card ────────────────────────────────────────────────────────
function QuickStatCard({ icon, label, value, color }: { icon: string; label: string; value: string | number; color: string }) {
  return (
    <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.875rem', boxShadow: 'var(--shadow-sm)' }}>
      <div style={{ width: '44px', height: '44px', borderRadius: 'var(--radius-md)', background: color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.35rem', flexShrink: 0 }}>{icon}</div>
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
    <div style={{ background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)', borderRadius: 'var(--radius-xl)', padding: '1.5rem', color: 'white', position: 'relative', overflow: 'hidden' }}>
      <div style={{ fontSize: '3rem', position: 'absolute', top: '-0.5rem', left: '0.75rem', opacity: 0.2, lineHeight: 1, fontFamily: 'serif' }}>"</div>
      <p style={{ fontSize: '1rem', fontStyle: 'italic', lineHeight: 1.6, margin: 0, position: 'relative', zIndex: 1, paddingLeft: '1.5rem' }}>{quote.text}</p>
      {quote.author && <p style={{ fontSize: '0.8rem', opacity: 0.85, marginTop: '0.625rem', marginBottom: 0, position: 'relative', zIndex: 1, paddingLeft: '1.5rem' }}>— {quote.author}</p>}
    </div>
  );
}

// ─── Upcoming Events ─────────────────────────────────────────────────────────
function UpcomingEvents({ events }: { events: EventEntry[] }) {
  const navigate = useNavigate();
  const EVENT_ICONS: Record<string, string> = { birthday: '🎂', vacation: '✈️', appointment: '📅', reminder: '⏰', holiday: '🎉', other: '📌' };
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
          <div key={event._id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 0.875rem', borderRadius: 'var(--radius-md)', background: isUrgent ? MODULE_COLORS.events.soft : 'var(--color-surface)', border: `1px solid ${isUrgent ? MODULE_COLORS.events.primary + '40' : 'var(--color-border)'}` }}>
            <span style={{ fontSize: '1.25rem' }}>{EVENT_ICONS[event.eventType] ?? '📌'}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{event.name}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{format(parseISO(event.date), 'MMM d')}{event.time && ` • ${event.time}`}</div>
            </div>
            <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '0.2rem 0.5rem', borderRadius: '999px', background: daysUntil === 0 ? MODULE_COLORS.events.primary : isUrgent ? MODULE_COLORS.events.soft : 'var(--color-border)', color: daysUntil === 0 ? 'white' : isUrgent ? MODULE_COLORS.events.text : 'var(--color-text-muted)' }}>
              {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil}d`}
            </span>
          </div>
        );
      })}
      {events.length > 6 && (
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/events')} style={{ alignSelf: 'center' }}>View all {events.length} events →</button>
      )}
    </div>
  );
}

// ─── Today Summary ───────────────────────────────────────────────────────────
function TodaySummary({ data }: { data: DashboardData }) {
  const navigate = useNavigate();
  const modules = [
    { key: 'training', label: 'Workouts', to: '/training', icon: '🏃', count: data.todayTrainings.length, color: MODULE_COLORS.training.primary, detail: data.todayTrainings[0]?.activityType ?? null },
    { key: 'work',     label: 'Work',     to: '/work',     icon: '💼', count: data.todayWork.length,     color: MODULE_COLORS.work.primary,     detail: data.todayWork[0]?.locationType ?? null },
    { key: 'eating',   label: 'Meals',    to: '/eating',   icon: '🥗', count: data.todayEating.length,   color: MODULE_COLORS.eating.primary,   detail: null },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
      {modules.map(mod => (
        <button key={mod.key} onClick={() => navigate(mod.to)} style={{ background: mod.count > 0 ? mod.color + '15' : 'var(--color-surface)', border: `1px solid ${mod.count > 0 ? mod.color + '40' : 'var(--color-border)'}`, borderRadius: 'var(--radius-lg)', padding: '1rem', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{mod.icon}</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: mod.count > 0 ? mod.color : 'var(--color-text-muted)', lineHeight: 1 }}>{mod.count}</div>
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
    { to: '/events',   label: 'Events',   icon: '🗓', color: MODULE_COLORS.events.primary,   soft: MODULE_COLORS.events.soft },
    { to: '/todo',     label: 'To-Do',    icon: '✅', color: MODULE_COLORS.todo.primary,     soft: MODULE_COLORS.todo.soft },
    { to: '/work',     label: 'Work',     icon: '💼', color: MODULE_COLORS.work.primary,     soft: MODULE_COLORS.work.soft },
    { to: '/eating',   label: 'Eating',   icon: '🥗', color: MODULE_COLORS.eating.primary,   soft: MODULE_COLORS.eating.soft },
    { to: '/training', label: 'Training', icon: '🏃', color: MODULE_COLORS.training.primary, soft: MODULE_COLORS.training.soft },
    { to: '/spending', label: 'Spending', icon: '💰', color: MODULE_COLORS.spending.primary, soft: MODULE_COLORS.spending.soft },
    { to: '/period',   label: 'Period',   icon: '🌸', color: MODULE_COLORS.period.primary,   soft: MODULE_COLORS.period.soft },
    { to: '/books',    label: 'Reading',  icon: '📚', color: MODULE_COLORS.books.primary,    soft: MODULE_COLORS.books.soft },
    { to: '/habits',   label: 'Habits',   icon: '🎯', color: MODULE_COLORS.habits.primary,   soft: MODULE_COLORS.habits.soft },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
      {modules.map(mod => (
        <button key={mod.to} onClick={() => navigate(mod.to)} style={{ background: mod.soft, border: `1px solid ${mod.color}30`, borderRadius: 'var(--radius-lg)', padding: '1.125rem 0.75rem', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.375rem', fontFamily: 'inherit' }}>
          <span style={{ fontSize: '1.75rem' }}>{mod.icon}</span>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: mod.color }}>{mod.label}</span>
        </button>
      ))}
    </div>
  );
}

// ─── Day Flyout ───────────────────────────────────────────────────────────────

type AnyItem = Record<string, unknown> & { module?: string; date?: string; startDate?: string };

const EVENT_ICONS: Record<string, string> = { birthday: '🎂', vacation: '✈️', appointment: '📅', reminder: '⏰', holiday: '🎉', other: '📌' };
const ACTIVITY_ICONS: Record<string, string> = { running: '🏃', walking: '🚶', gym: '🏋️', cycling: '🚴', yoga: '🧘', swimming: '🏊', other: '💪' };

const MODULE_ROUTE: Record<string, string> = {
  events: '/events',
  notes: '/events',
  todo: '/todo',
  training: '/training',
  spending: '/spending',
  work: '/work',
  eating: '/eating',
  period: '/period',
  books: '/books',
};

function DayFlyout({
  day, items, onClose, onAddNote,
}: { day: Date; items: AnyItem[]; onClose: () => void; onAddNote: (date: string) => void }) {
  const navigate = useNavigate();
  const dateStr = format(day, 'yyyy-MM-dd');
  const displayDate = format(day, 'EEEE, MMMM d, yyyy');

  const byModule: Record<string, AnyItem[]> = {};
  for (const item of items) {
    const mod = item.module ?? 'other';
    if (!byModule[mod]) byModule[mod] = [];
    byModule[mod].push(item);
  }

  const sections: { key: string; label: string; icon: string; color: string }[] = [
    { key: 'events',   label: 'Events',      icon: '🗓',  color: MODULE_COLORS.events.primary   },
    { key: 'notes',    label: 'Notes',        icon: '📝',  color: MODULE_COLORS.notes.primary    },
    { key: 'training', label: 'Training',     icon: '🏃',  color: MODULE_COLORS.training.primary },
    { key: 'spending', label: 'Spending',     icon: '💰',  color: MODULE_COLORS.spending.primary },
    { key: 'work',     label: 'Work',         icon: '💼',  color: MODULE_COLORS.work.primary     },
    { key: 'eating',   label: 'Eating',       icon: '🥗',  color: MODULE_COLORS.eating.primary   },
    { key: 'period',   label: 'Period',       icon: '🌸',  color: MODULE_COLORS.period.primary   },
  ];

  const hasAnything = items.length > 0;

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 300, backdropFilter: 'blur(2px)' }} />

      {/* Panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(420px, 100vw)',
        background: 'var(--color-bg-card)', borderLeft: '1px solid var(--color-border)',
        zIndex: 301, overflowY: 'auto', display: 'flex', flexDirection: 'column',
        boxShadow: 'var(--shadow-lg)',
        animation: 'slideInRight 0.22s ease',
      }}>
        {/* Header */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1rem' }}>{displayDate}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.125rem' }}>
              {items.length} entr{items.length !== 1 ? 'ies' : 'y'} across modules
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ fontSize: '1.1rem', padding: '0.25rem 0.5rem' }}>✕</button>
        </div>

        {/* Add Note button */}
        <div style={{ padding: '0.875rem 1.5rem', borderBottom: '1px solid var(--color-border)', flexShrink: 0 }}>
          <button className="btn btn-primary" style={{ background: MODULE_COLORS.notes.primary, width: '100%' }}
            onClick={() => onAddNote(dateStr)}>
            📝 Add Note for this day
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, padding: '1rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {!hasAnything && (
            <div className="empty-state" style={{ padding: '2rem 0' }}>
              <div className="empty-state-icon">📭</div>
              <p>Nothing recorded for this day</p>
            </div>
          )}

          {sections.map(({ key, label, icon, color }) => {
            const modItems = byModule[key];
            if (!modItems?.length) return null;
            return (
              <div key={key}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} />
                  <span style={{ fontWeight: 600, fontSize: '0.85rem', color }}>{icon} {label}</span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginLeft: 'auto' }}>{modItems.length}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                  {modItems.map((item, idx) => (
                    <FlyoutItem key={(item._id as string) ?? idx} item={item} module={key} navigate={navigate} onClose={onClose} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <style>{`@keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
    </>
  );
}

function str(v: unknown): string { return v != null ? String(v) : ''; }

function FlyoutItem({ item, module: mod, navigate, onClose }: { item: AnyItem; module: string; navigate: NavigateFunction; onClose: () => void }) {
  const color = MODULE_COLORS[mod]?.primary ?? '#999';
  const soft = MODULE_COLORS[mod]?.soft ?? 'var(--color-surface)';
  const route = MODULE_ROUTE[mod];

  let content: React.ReactNode = null;

  if (mod === 'events') {
    content = (
      <>
        <span>{EVENT_ICONS[str(item.eventType) || 'other']}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{str(item.name)}</div>
          {!!item.time && <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>⏰ {str(item.time)}</div>}
          {!!item.location && <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>📍 {str(item.location)}</div>}
        </div>
      </>
    );
  } else if (mod === 'notes') {
    content = (
      <div style={{ flex: 1, minWidth: 0 }}>
        {!!item.title && <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.2rem' }}>{str(item.title)}</div>}
        <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--color-text-secondary)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {str(item.text)}
        </p>
      </div>
    );
  } else if (mod === 'training') {
    const dur = item.duration ? `${item.duration}min` : '';
    const dist = item.distance ? ` · ${item.distance}km` : '';
    content = (
      <>
        <span>{ACTIVITY_ICONS[str(item.activityType) || 'other']}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: '0.85rem', textTransform: 'capitalize' }}>{str(item.activityType)}</div>
          {(dur || dist) && <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{dur}{dist}</div>}
        </div>
      </>
    );
  } else if (mod === 'spending') {
    const amount = Number(item.amount ?? 0);
    const isIncome = item.transactionType === 'income';
    content = (
      <>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{str(item.category)}</div>
          {!!item.description && <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{str(item.description)}</div>}
        </div>
        <span style={{ fontWeight: 700, fontSize: '0.9rem', color: isIncome ? '#16A34A' : '#DC2626' }}>
          {isIncome ? '+' : '-'}{amount.toFixed(2)}
        </span>
      </>
    );
  } else if (mod === 'work') {
    content = (
      <>
        <span>💼</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: '0.85rem', textTransform: 'capitalize' }}>{str(item.locationType)}</div>
          {!!item.startTime && <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{str(item.startTime)}{item.endTime ? ` - ${str(item.endTime)}` : ''}</div>}
        </div>
      </>
    );
  } else if (mod === 'eating') {
    content = (
      <>
        <span>🥗</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: '0.85rem', textTransform: 'capitalize' }}>{str(item.entryType).replace('_', ' ')}</div>
          {!!item.notes && <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{str(item.notes)}</div>}
        </div>
      </>
    );
  } else if (mod === 'period') {
    content = (
      <>
        <span>🌸</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>Period start</div>
          {!!item.endDate && <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>→ {str(item.endDate)}</div>}
        </div>
      </>
    );
  } else {
    content = <div style={{ flex: 1, fontSize: '0.85rem' }}>Entry</div>;
  }

  return (
    <button
      onClick={() => { if (route) { onClose(); navigate(route); } }}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: '0.625rem',
        padding: '0.625rem 0.75rem', borderRadius: 'var(--radius-md)',
        background: soft, border: `1px solid ${color}25`, fontSize: '0.875rem',
        width: '100%', textAlign: 'left', cursor: route ? 'pointer' : 'default',
        fontFamily: 'inherit', transition: 'filter 0.15s',
      }}
      onMouseEnter={e => { if (route) (e.currentTarget as HTMLElement).style.filter = 'brightness(0.96)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = ''; }}
    >
      {content}
      {route && <span style={{ marginLeft: 'auto', color, fontSize: '0.75rem', opacity: 0.6, flexShrink: 0, alignSelf: 'center' }}>→</span>}
    </button>
  );
}

// ─── Add Note Quick Modal ─────────────────────────────────────────────────────

function AddNoteModal({ date, onClose }: { date: string; onClose: () => void }) {
  const { notify } = useApp();
  const qc = useQueryClient();
  const [form, setForm] = useState({ title: '', text: '' });

  const createMut = useMutation({
    mutationFn: (data: Partial<NoteEntry>) => notesApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notes'] });
      qc.invalidateQueries({ queryKey: ['calendar'] });
      notify('Note added', 'success');
      onClose();
    },
    onError: (err: Error) => notify(err.message, 'error'),
  });

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 400, backdropFilter: 'blur(2px)' }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 'min(480px, 95vw)', background: 'var(--color-bg-card)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-lg)', zIndex: 401, padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0 }}>📝 Add Note — {format(parseISO(date), 'MMM d, yyyy')}</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <div className="form-group">
          <label className="form-label">Title <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>(optional)</span></label>
          <input className="form-input" placeholder="Note title…" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
        </div>
        <div className="form-group">
          <label className="form-label">Note *</label>
          <textarea className="form-textarea" rows={5} placeholder="Write your note here…" value={form.text} onChange={e => setForm(f => ({ ...f, text: e.target.value }))} style={{ resize: 'vertical' }} />
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" style={{ background: MODULE_COLORS.notes.primary }}
            onClick={() => { if (!form.text.trim()) { notify('Note text required', 'error'); return; } createMut.mutate({ date, title: form.title.trim() || undefined, text: form.text.trim() }); }}
            disabled={createMut.isPending}>
            {createMut.isPending ? 'Saving…' : 'Add Note'}
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const [flyoutDay, setFlyoutDay] = useState<{ day: Date; items: Array<Record<string, unknown>> } | null>(null);
  const [addNoteDate, setAddNoteDate] = useState<string | null>(null);

  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: () => dashboardApi.get(),
    refetchInterval: 5 * 60 * 1000,
  });

  const todayStr = format(new Date(), 'EEEE, MMMM d, yyyy');

  function handleDayClick(day: Date, items: Array<Record<string, unknown>>) {
    setFlyoutDay({ day, items });
  }

  function handleAddNoteFromFlyout(date: string) {
    setFlyoutDay(null);
    setAddNoteDate(date);
  }

  if (isLoading) {
    return <div className="loading-container"><div className="spinner" /><span>Loading your day…</span></div>;
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

      {data?.dailyQuote && <QuoteCard quote={data.dailyQuote} />}

      <div>
        <h3 style={{ marginBottom: '0.75rem', fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Today's Activity</h3>
        {data && <TodaySummary data={data} />}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1.2fr)', gap: '1.5rem', alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <CalendarView onDayClick={handleDayClick} />
          <div className="card">
            <div className="card-header"><h3 style={{ margin: 0, fontSize: '0.95rem' }}>🚀 Quick Access</h3></div>
            <div className="card-body" style={{ paddingTop: '0.75rem' }}>
              <ModuleGrid />
            </div>
          </div>
        </div>
        <div>
          <div className="card">
            <div className="card-header"><h3 style={{ margin: 0, fontSize: '0.95rem' }}>🗓 Upcoming</h3></div>
            <div className="card-body" style={{ paddingTop: '0.75rem' }}>
              {data && <UpcomingEvents events={data.upcomingEvents} />}
            </div>
          </div>
        </div>
      </div>

      {flyoutDay && (
        <DayFlyout
          day={flyoutDay.day}
          items={flyoutDay.items as Array<Record<string, unknown> & { module?: string }>}
          onClose={() => setFlyoutDay(null)}
          onAddNote={handleAddNoteFromFlyout}
        />
      )}

      {addNoteDate && (
        <AddNoteModal date={addNoteDate} onClose={() => setAddNoteDate(null)} />
      )}
    </div>
  );
}
