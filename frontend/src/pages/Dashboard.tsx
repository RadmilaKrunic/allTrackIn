import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO, differenceInDays } from 'date-fns';
import { useNavigate, type NavigateFunction } from 'react-router-dom';
import { dashboardApi, notesApi, todoApi, habitsApi } from '../api/client';
import CalendarView from '../components/calendar/CalendarView';
import { MODULE_COLORS } from '../themes/themes';
import { useApp } from '../contexts/AppContext';
import type { DashboardData, EventEntry, TrainingEntry, NoteEntry, TodoEntry, HabitDefinition, HabitLog } from '../types';

// ─── Quick Stats Card ────────────────────────────────────────────────────────
function QuickStatCard({ icon, label, value, color }: { icon: string; label: string; value: string | number; color: string }) {
  return (
    <div className="quick-stat-card">
      <div className="quick-stat-icon" style={{ background: color + '22' }}>{icon}</div>
      <div>
        <div className="quick-stat-value">{value}</div>
        <div className="quick-stat-label">{label}</div>
      </div>
    </div>
  );
}

// ─── Quote Card ──────────────────────────────────────────────────────────────
function QuoteCard({ quote }: { quote: DashboardData['dailyQuote'] }) {
  if (!quote) return null;
  return (
    <div className="quote-card">
      <div className="quote-mark">"</div>
      <p className="quote-text">{quote.text}</p>
      {quote.author && <p className="quote-author">— {quote.author}</p>}
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
      <p className="text-sm">No upcoming events</p>
    </div>
  );
  return (
    <div className="events-list">
      {events.slice(0, 6).map(event => {
        const daysUntil = differenceInDays(parseISO(event.date), new Date());
        const isUrgent = daysUntil <= 3;
        return (
          <div key={event._id} className="event-item" style={{ background: isUrgent ? MODULE_COLORS.events.soft : 'var(--color-surface)', borderColor: isUrgent ? MODULE_COLORS.events.primary + '40' : 'var(--color-border)' }}>
            <span className="event-icon">{EVENT_ICONS[event.eventType] ?? '📌'}</span>
            <div className="event-info">
              <div className="event-name">{event.name}</div>
              <div className="event-date">{format(parseISO(event.date), 'MMM d')}{event.time && ` • ${event.time}`}</div>
            </div>
            <span className="event-badge" style={{ background: daysUntil === 0 ? MODULE_COLORS.events.primary : isUrgent ? MODULE_COLORS.events.soft : 'var(--color-border)', color: daysUntil === 0 ? 'white' : isUrgent ? MODULE_COLORS.events.text : 'var(--color-text-muted)' }}>
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
    <div className="today-summary-grid">
      {modules.map(mod => (
        <button key={mod.key} onClick={() => navigate(mod.to)} className="today-summary-btn" style={{ background: mod.count > 0 ? mod.color + '15' : 'var(--color-surface)', borderColor: mod.count > 0 ? mod.color + '40' : 'var(--color-border)' }}>
          <div className="today-summary-icon">{mod.icon}</div>
          <div className="today-summary-count" style={{ color: mod.count > 0 ? mod.color : 'var(--color-text-muted)' }}>{mod.count}</div>
          <div className="today-summary-label">{mod.label}</div>
          {mod.detail && <div className="today-summary-detail" style={{ color: mod.color }}>{mod.detail}</div>}
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
    <div className="module-grid">
      {modules.map(mod => (
        <button key={mod.to} onClick={() => navigate(mod.to)} className="module-grid-btn" style={{ background: mod.soft, borderColor: mod.color + '30' }}>
          <span className="module-grid-icon">{mod.icon}</span>
          <span className="module-grid-label" style={{ color: mod.color }}>{mod.label}</span>
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

  return (
    <>
      <div onClick={onClose} className="flyout-backdrop" />
      <div className="flyout-panel">
        <div className="flyout-header">
          <div>
            <div className="flyout-header-title">{displayDate}</div>
            <div className="flyout-header-sub">{items.length} entr{items.length !== 1 ? 'ies' : 'y'} across modules</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ fontSize: '1.1rem', padding: '0.25rem 0.5rem' }}>✕</button>
        </div>

        <div className="flyout-add-note">
          <button className="btn btn-primary w-full" style={{ background: MODULE_COLORS.notes.primary }} onClick={() => onAddNote(dateStr)}>
            📝 Add Note for this day
          </button>
        </div>

        <div className="flyout-content">
          {items.length === 0 && (
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
                <div className="flyout-section-header">
                  <span className="flyout-section-dot" style={{ background: color }} />
                  <span className="flyout-section-label" style={{ color }}>{icon} {label}</span>
                  <span className="flyout-section-count">{modItems.length}</span>
                </div>
                <div className="flyout-section-items">
                  {modItems.map((item, idx) => (
                    <FlyoutItem key={(item._id as string) ?? idx} item={item} module={key} navigate={navigate} onClose={onClose} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
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
        <div className="flyout-item-info">
          <div className="flyout-item-title">{str(item.name)}</div>
          {!!item.time && <div className="flyout-item-sub">⏰ {str(item.time)}</div>}
          {!!item.location && <div className="flyout-item-sub">📍 {str(item.location)}</div>}
        </div>
      </>
    );
  } else if (mod === 'notes') {
    content = (
      <div className="flyout-item-body">
        {!!item.title && <div className="flyout-item-title" style={{ marginBottom: '0.2rem' }}>{str(item.title)}</div>}
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
        <div className="flyout-item-body">
          <div className="flyout-item-main" style={{ textTransform: 'capitalize' }}>{str(item.activityType)}</div>
          {(dur || dist) && <div className="flyout-item-sub">{dur}{dist}</div>}
        </div>
      </>
    );
  } else if (mod === 'spending') {
    const amount = Number(item.amount ?? 0);
    const isIncome = item.transactionType === 'income';
    content = (
      <>
        <div className="flyout-item-body">
          <div className="flyout-item-main">{str(item.category)}</div>
          {!!item.description && <div className="flyout-item-sub">{str(item.description)}</div>}
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
        <div className="flyout-item-body">
          <div className="flyout-item-main" style={{ textTransform: 'capitalize' }}>{str(item.locationType)}</div>
          {!!item.startTime && <div className="flyout-item-sub">{str(item.startTime)}{item.endTime ? ` - ${str(item.endTime)}` : ''}</div>}
        </div>
      </>
    );
  } else if (mod === 'eating') {
    content = (
      <>
        <span>🥗</span>
        <div className="flyout-item-body">
          <div className="flyout-item-main" style={{ textTransform: 'capitalize' }}>{str(item.entryType).replace('_', ' ')}</div>
          {!!item.notes && <div className="flyout-item-sub">{str(item.notes)}</div>}
        </div>
      </>
    );
  } else if (mod === 'period') {
    content = (
      <>
        <span>🌸</span>
        <div className="flyout-item-body">
          <div className="flyout-item-main">Period start</div>
          {!!item.endDate && <div className="flyout-item-sub">→ {str(item.endDate)}</div>}
        </div>
      </>
    );
  } else {
    content = <div className="flyout-item-body" style={{ fontSize: '0.85rem' }}>Entry</div>;
  }

  return (
    <button
      onClick={() => { if (route) { onClose(); navigate(route); } }}
      className="flyout-item"
      style={{ background: soft, borderColor: color + '25', cursor: route ? 'pointer' : 'default' }}
    >
      {content}
      {route && <span className="flyout-item-arrow" style={{ color }}>→</span>}
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
      <div onClick={onClose} className="centered-modal-backdrop" />
      <div className="centered-modal">
        <div className="centered-modal-header">
          <h3 style={{ margin: 0 }}>📝 Add Note — {format(parseISO(date), 'MMM d, yyyy')}</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <div className="form-group">
          <label className="form-label">Title <span className="text-muted" style={{ fontWeight: 400 }}>(optional)</span></label>
          <input className="form-input" placeholder="Note title…" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
        </div>
        <div className="form-group">
          <label className="form-label">Note *</label>
          <textarea className="form-textarea" rows={5} placeholder="Write your note here…" value={form.text} onChange={e => setForm(f => ({ ...f, text: e.target.value }))} />
        </div>
        <div className="centered-modal-footer">
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

// ─── Today's To-Do ────────────────────────────────────────────────────────────
function TodayTodos({ todos }: { todos: TodoEntry[] }) {
  const navigate = useNavigate();
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayLists = todos.filter(t => t.date === todayStr);

  if (!todayLists.length) return (
    <div className="empty-state" style={{ padding: '1.25rem' }}>
      <span style={{ fontSize: '1.75rem' }}>✅</span>
      <p className="text-sm">No to-do lists for today</p>
    </div>
  );

  return (
    <div className="card-list">
      {todayLists.map(list => {
        const total = list.items.length;
        const done = list.items.filter(i => i.done).length;
        const pct = total > 0 ? Math.round((done / total) * 100) : 0;
        const allDone = total > 0 && done === total;
        return (
          <div key={list._id} className="todo-item" style={{ background: allDone ? MODULE_COLORS.todo.soft : 'var(--color-surface)', borderColor: allDone ? MODULE_COLORS.todo.primary + '40' : 'var(--color-border)' }}>
            <div className="todo-item-header" style={{ marginBottom: total > 0 ? '0.5rem' : 0 }}>
              <span className="todo-item-title">{list.title}</span>
              <span className="todo-item-count" style={{ color: allDone ? MODULE_COLORS.todo.text : 'var(--color-text-muted)' }}>{done}/{total}</span>
            </div>
            {total > 0 && (
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${pct}%`, background: allDone ? MODULE_COLORS.todo.primary : MODULE_COLORS.todo.primary + 'aa' }} />
              </div>
            )}
          </div>
        );
      })}
      <button className="btn btn-ghost btn-sm" onClick={() => navigate('/todo')} style={{ alignSelf: 'center', marginTop: '0.125rem' }}>Open To-Do →</button>
    </div>
  );
}

// ─── Today's Habits ───────────────────────────────────────────────────────────
function TodayHabits({ habits, logs }: { habits: HabitDefinition[]; logs: HabitLog[] }) {
  const navigate = useNavigate();
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const active = habits.filter(h => h.active);
  const todayLogs = logs.filter(l => l.date === todayStr);

  if (!active.length) return (
    <div className="empty-state" style={{ padding: '1.25rem' }}>
      <span style={{ fontSize: '1.75rem' }}>🎯</span>
      <p className="text-sm">No habits configured yet</p>
    </div>
  );

  const doneCount = active.filter(h => todayLogs.some(l => l.habitId === h._id && l.done)).length;
  const pct = active.length > 0 ? Math.round((doneCount / active.length) * 100) : 0;

  return (
    <div className="flex flex-col gap-2">
      <div className="habits-header">
        <span className="habits-done-count">{doneCount}/{active.length} done today</span>
        <span className="habits-pct" style={{ color: MODULE_COLORS.habits.text }}>{pct}%</span>
      </div>
      <div className="progress-bar" style={{ marginBottom: '0.375rem' }}>
        <div className="progress-fill" style={{ width: `${pct}%`, background: MODULE_COLORS.habits.primary }} />
      </div>
      {active.map(habit => {
        const log = todayLogs.find(l => l.habitId === habit._id);
        const done = log?.done ?? false;
        const color = habit.color ?? MODULE_COLORS.habits.primary;
        return (
          <div key={habit._id} className="habit-item" style={{ background: done ? color + '15' : 'var(--color-surface)', borderColor: done ? color + '40' : 'var(--color-border)' }}>
            <span className="habit-icon">{habit.icon || '🎯'}</span>
            <span className="habit-name" style={{ color: done ? 'var(--color-text)' : 'var(--color-text-secondary)' }}>{habit.name}</span>
            <span className="habit-check">{done ? '✅' : '⬜'}</span>
          </div>
        );
      })}
      <button className="btn btn-ghost btn-sm" onClick={() => navigate('/habits')} style={{ alignSelf: 'center', marginTop: '0.125rem' }}>Open Habits →</button>
    </div>
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

  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const { data: todayTodos = [] } = useQuery<TodoEntry[]>({
    queryKey: ['todos', todayStr],
    queryFn: () => todoApi.getAll({ date: todayStr }) as Promise<TodoEntry[]>,
  });

  const { data: habitsData = [] } = useQuery<HabitDefinition[]>({
    queryKey: ['habits'],
    queryFn: () => habitsApi.getAll() as Promise<HabitDefinition[]>,
  });

  const { data: habitLogs = [] } = useQuery<HabitLog[]>({
    queryKey: ['habitLogs', todayStr],
    queryFn: () => habitsApi.getLogs({ startDate: todayStr, endDate: todayStr }) as Promise<HabitLog[]>,
  });

  const todayStr2 = format(new Date(), 'EEEE, MMMM d, yyyy');

  if (isLoading) {
    return <div className="loading-container"><div className="spinner" /><span>Loading your day…</span></div>;
  }

  return (
    <div className="dashboard">
      <div>
        <h1 className="dashboard-greeting-title">
          Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'} ✨
        </h1>
        <p className="dashboard-greeting-date">{todayStr2}</p>
      </div>

      {data?.dailyQuote && <QuoteCard quote={data.dailyQuote} />}

      <div>
        <h3 className="section-label">Today's Activity</h3>
        {data && <TodaySummary data={data} />}
      </div>

      <div className="dashboard-main">
        <div className="dashboard-col">
          <CalendarView onDayClick={(day, items) => setFlyoutDay({ day, items })} />
          <div className="card">
            <div className="card-header"><h3 className="modal-title">🚀 Quick Access</h3></div>
            <div className="card-body card-body-compact">
              <ModuleGrid />
            </div>
          </div>
        </div>
        <div className="dashboard-col">
          <div className="card">
            <div className="card-header"><h3 className="modal-title">🗓 Upcoming</h3></div>
            <div className="card-body card-body-compact">
              {data && <UpcomingEvents events={data.upcomingEvents} />}
            </div>
          </div>
          <div className="card">
            <div className="card-header"><h3 className="modal-title">✅ Today's To-Do</h3></div>
            <div className="card-body card-body-compact">
              <TodayTodos todos={todayTodos} />
            </div>
          </div>
          <div className="card">
            <div className="card-header"><h3 className="modal-title">🎯 Today's Habits</h3></div>
            <div className="card-body card-body-compact">
              <TodayHabits habits={habitsData} logs={habitLogs} />
            </div>
          </div>
        </div>
      </div>

      {flyoutDay && (
        <DayFlyout
          day={flyoutDay.day}
          items={flyoutDay.items as Array<Record<string, unknown> & { module?: string }>}
          onClose={() => setFlyoutDay(null)}
          onAddNote={(date) => { setFlyoutDay(null); setAddNoteDate(date); }}
        />
      )}

      {addNoteDate && (
        <AddNoteModal date={addNoteDate} onClose={() => setAddNoteDate(null)} />
      )}
    </div>
  );
}
