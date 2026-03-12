import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO, startOfMonth, endOfMonth, getDay, eachDayOfInterval } from 'date-fns';
import type { EventEntry, EventType, PlanDoneStatus } from '../../types';
import { eventsApi } from '../../api/client';
import { useApp } from '../../contexts/AppContext';
import { MODULE_COLORS } from '../../themes/themes';
import Modal from '../../components/ui/Modal';
import PlanDoneToggle from '../../components/ui/PlanDoneToggle';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

const C = MODULE_COLORS.events;

const EVENT_ICONS: Record<EventType, string> = {
  birthday: '🎂',
  vacation: '✈️',
  appointment: '📅',
  reminder: '⏰',
  holiday: '🎉',
  other: '📌',
};

const EVENT_TYPE_COLORS: Record<EventType, { bg: string; border: string; text: string }> = {
  birthday:    { bg: '#FFF0F6', border: '#FFC9E0', text: '#BE185D' },
  vacation:    { bg: '#F0FDFA', border: '#99F6E4', text: '#0F766E' },
  appointment: { bg: '#EFF6FF', border: '#BFDBFE', text: '#1D4ED8' },
  reminder:    { bg: '#FFFBEB', border: '#FDE68A', text: '#92400E' },
  holiday:     { bg: '#F5F3FF', border: '#DDD6FE', text: '#6D28D9' },
  other:       { bg: 'var(--color-surface)', border: 'var(--color-border)', text: 'var(--color-text-secondary)' },
};

const EVENT_TYPES: EventType[] = ['birthday', 'vacation', 'appointment', 'reminder', 'holiday', 'other'];

const EMPTY_FORM: EventFormState = {
  name: '',
  date: '',
  time: '',
  endDate: '',
  eventType: 'other',
  description: '',
  location: '',
  recurring: false,
  status: 'plan',
};

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateShort(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatMonthYear(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + 'T00:00:00');
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

function groupByDate(events: EventEntry[]): Map<string, EventEntry[]> {
  const map = new Map<string, EventEntry[]>();
  for (const ev of events) {
    const key = ev.date;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(ev);
  }
  return map;
}

function smartStatus(dateStr: string): PlanDoneStatus {
  return dateStr > todayStr() ? 'plan' : 'done';
}

interface EventFormState {
  name: string;
  date: string;
  time: string;
  endDate: string;
  eventType: EventType;
  description: string;
  location: string;
  recurring: boolean;
  status: 'plan' | 'done';
}

export default function EventsPage() {
  const { notify } = useApp();
  const queryClient = useQueryClient();

  const [view, setView] = useState<'list' | 'upcoming'>('list');
  const [navYear, setNavYear] = useState(() => new Date().getFullYear());
  const [navMonth, setNavMonth] = useState(() => new Date().getMonth());
  const [statsMonth, setStatsMonth] = useState(() => new Date());
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventEntry | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EventEntry | null>(null);
  const [form, setForm] = useState<EventFormState>({ ...EMPTY_FORM });

  const { data: allEvents = [], isLoading } = useQuery<EventEntry[]>({
    queryKey: ['events'],
    queryFn: () => eventsApi.getAll(),
  });

  const { data: upcomingEvents = [] } = useQuery<EventEntry[]>({
    queryKey: ['events', 'upcoming'],
    queryFn: () => eventsApi.getUpcoming(),
    enabled: view === 'upcoming',
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<EventEntry>) => eventsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      notify('Event created', 'success');
      closeModal();
    },
    onError: (err: Error) => notify(err.message, 'error'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<EventEntry> }) => eventsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      notify('Event updated', 'success');
      closeModal();
    },
    onError: (err: Error) => notify(err.message, 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => eventsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      notify('Event deleted', 'success');
    },
    onError: (err: Error) => notify(err.message, 'error'),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'plan' | 'done' }) =>
      eventsApi.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
    onError: (err: Error) => notify(err.message, 'error'),
  });

  function openAdd(dateStr?: string) {
    const date = dateStr ?? todayStr();
    setEditingEvent(null);
    setForm({ ...EMPTY_FORM, date, status: smartStatus(date) });
    setModalOpen(true);
  }

  function openEdit(ev: EventEntry) {
    setEditingEvent(ev);
    setForm({
      name: ev.name,
      date: ev.date,
      time: ev.time ?? '',
      endDate: ev.endDate ?? '',
      eventType: ev.eventType,
      description: ev.description ?? '',
      location: ev.location ?? '',
      recurring: ev.recurring ?? false,
      status: ev.status,
    });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingEvent(null);
  }

  function handleSubmit() {
    if (!form.name.trim()) { notify('Name is required', 'error'); return; }
    if (!form.date) { notify('Date is required', 'error'); return; }
    const payload: Partial<EventEntry> = {
      name: form.name.trim(),
      date: form.date,
      eventType: form.eventType,
      status: form.status,
      ...(form.time && { time: form.time }),
      ...(form.endDate && { endDate: form.endDate }),
      ...(form.description && { description: form.description.trim() }),
      ...(form.location && { location: form.location.trim() }),
      recurring: form.recurring,
    };
    if (editingEvent?._id) {
      updateMutation.mutate({ id: editingEvent._id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  // List view: filtered by navYear/navMonth, sorted by date
  const listEvents = useMemo(() => {
    return allEvents
      .filter((ev) => {
        const d = new Date(ev.date + 'T00:00:00');
        return d.getFullYear() === navYear && d.getMonth() === navMonth;
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [allEvents, navYear, navMonth]);

  const groupedList = useMemo(() => groupByDate(listEvents), [listEvents]);
  const sortedDateKeys = useMemo(() => Array.from(groupedList.keys()).sort(), [groupedList]);

  function prevMonth() {
    if (navMonth === 0) { setNavMonth(11); setNavYear((y) => y - 1); }
    else setNavMonth((m) => m - 1);
  }

  function nextMonth() {
    if (navMonth === 11) { setNavMonth(0); setNavYear((y) => y + 1); }
    else setNavMonth((m) => m + 1);
  }

  function goToday() {
    const now = new Date();
    setNavYear(now.getFullYear());
    setNavMonth(now.getMonth());
  }

  // Stats for statsMonth
  const monthStats = useMemo(() => {
    const monthStart = startOfMonth(statsMonth);
    const monthEnd = endOfMonth(statsMonth);
    const allDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const counts: Record<EventType, number> = {
      birthday: 0, vacation: 0, appointment: 0, reminder: 0, holiday: 0, other: 0,
    };
    let total = 0;
    for (const d of allDays) {
      const ds = format(d, 'yyyy-MM-dd');
      for (const ev of allEvents) {
        if (ev.date === ds) {
          counts[ev.eventType]++;
          total++;
        }
      }
    }
    return { counts, total };
  }, [allEvents, statsMonth]);

  // Build a date -> events index for the stats month calendar
  const eventsByDate = useMemo(() => {
    const map = new Map<string, EventEntry[]>();
    for (const ev of allEvents) {
      if (!map.has(ev.date)) map.set(ev.date, []);
      map.get(ev.date)!.push(ev);
    }
    return map;
  }, [allEvents]);

  // Mini calendar days for statsMonth
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(statsMonth);
    const monthEnd = endOfMonth(statsMonth);
    return eachDayOfInterval({ start: monthStart, end: monthEnd });
  }, [statsMonth]);
  const calPadStart = getDay(startOfMonth(statsMonth)); // 0=Sun

  const today = todayStr();

  return (
    <div className="page-content">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: C.text, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            🎉 Events
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginBottom: 0 }}>
            {allEvents.length} event{allEvents.length !== 1 ? 's' : ''} total
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => openAdd()} style={{ background: C.primary }}>
          + Add Event
        </button>
      </div>

      {/* Stats + Mini Calendar row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
        {/* Monthly Stats Card */}
        <div className="card">
          <div className="card-header">
            <h3 style={{ margin: 0, fontSize: '0.95rem' }}>📊 Stats</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setStatsMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
              >‹</button>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, minWidth: 90, textAlign: 'center' }}>
                {format(statsMonth, 'MMM yyyy')}
              </span>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setStatsMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
              >›</button>
            </div>
          </div>
          <div className="card-body">
            {monthStats.total === 0 ? (
              <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', textAlign: 'center', padding: '0.5rem 0' }}>
                No events this month
              </p>
            ) : (
              <>
                {/* Count chips */}
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                  {EVENT_TYPES.map((et) => {
                    const cfg = EVENT_TYPE_COLORS[et];
                    const count = monthStats.counts[et];
                    if (count === 0) return null;
                    return (
                      <div key={et} style={{
                        display: 'flex', alignItems: 'center', gap: '0.35rem',
                        background: cfg.bg, border: `1px solid ${cfg.border}`,
                        borderRadius: 'var(--radius-sm)', padding: '0.35rem 0.65rem',
                      }}>
                        <span>{EVENT_ICONS[et]}</span>
                        <span style={{ fontWeight: 700, fontSize: '0.95rem', color: cfg.text }}>{count}</span>
                        <span style={{ fontSize: '0.72rem', color: cfg.text, opacity: 0.8 }}>
                          {et.charAt(0).toUpperCase() + et.slice(1)}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Progress bars */}
                {EVENT_TYPES.map((et) => {
                  const cfg = EVENT_TYPE_COLORS[et];
                  const count = monthStats.counts[et];
                  const pct = monthStats.total > 0 ? Math.round((count / monthStats.total) * 100) : 0;
                  if (count === 0) return null;
                  return (
                    <div key={et} style={{ marginBottom: '0.625rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>
                          {EVENT_ICONS[et]} {et.charAt(0).toUpperCase() + et.slice(1)}
                        </span>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: cfg.text }}>
                          {count} · {pct}%
                        </span>
                      </div>
                      <div style={{ height: '6px', background: 'var(--color-border)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: cfg.border, borderRadius: '3px', transition: 'width 0.4s' }} />
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>

        {/* Mini Calendar Card */}
        <div className="card">
          <div className="card-header">
            <h3 style={{ margin: 0, fontSize: '0.95rem' }}>📅 Events Calendar</h3>
          </div>
          <div style={{ padding: '0.75rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '4px' }}>
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                <div key={i} style={{ textAlign: 'center', fontSize: '0.65rem', color: 'var(--color-text-muted)', padding: '2px 0' }}>{d}</div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
              {Array.from({ length: calPadStart }).map((_, i) => <div key={`p${i}`} />)}
              {calendarDays.map((day) => {
                const ds = format(day, 'yyyy-MM-dd');
                const dayEvents = eventsByDate.get(ds);
                const firstEvent = dayEvents?.[0];
                const isToday = ds === today;
                const cfg = firstEvent ? EVENT_TYPE_COLORS[firstEvent.eventType] : null;
                return (
                  <button
                    key={ds}
                    onClick={() => firstEvent ? openEdit(firstEvent) : openAdd(ds)}
                    title={firstEvent ? `${firstEvent.name}${dayEvents && dayEvents.length > 1 ? ` +${dayEvents.length - 1} more` : ''}` : 'Click to add event'}
                    style={{
                      aspectRatio: '1',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1px',
                      borderRadius: '4px',
                      border: isToday ? `2px solid ${C.primary}` : 'none',
                      background: cfg ? cfg.bg : 'var(--color-surface)',
                      cursor: 'pointer', fontFamily: 'inherit',
                      fontSize: '0.65rem', color: isToday ? C.primary : cfg ? cfg.text : 'var(--color-text)',
                      fontWeight: isToday ? 700 : 400,
                    }}
                  >
                    {format(day, 'd')}
                    {firstEvent && <span style={{ fontSize: '0.6rem' }}>{EVENT_ICONS[firstEvent.eventType]}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* View Tabs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <div className="tabs" style={{ minWidth: 220 }}>
          <button className={`tab ${view === 'list' ? 'active' : ''}`} onClick={() => setView('list')}>
            📋 List
          </button>
          <button className={`tab ${view === 'upcoming' ? 'active' : ''}`} onClick={() => setView('upcoming')}>
            🔮 Upcoming
          </button>
        </div>

        {view === 'list' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button className="btn btn-ghost btn-sm" onClick={prevMonth}>‹</button>
            <span style={{ fontWeight: 600, fontSize: '0.95rem', minWidth: 140, textAlign: 'center' }}>
              {formatMonthYear(navYear, navMonth)}
            </span>
            <button className="btn btn-ghost btn-sm" onClick={nextMonth}>›</button>
            <button className="btn btn-secondary btn-sm" onClick={goToday}>Today</button>
          </div>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="loading-container">
          <div className="spinner" />
          <span>Loading events…</span>
        </div>
      ) : view === 'upcoming' ? (
        <UpcomingView
          events={upcomingEvents}
          today={today}
          onEdit={openEdit}
          onDelete={(ev) => setDeleteTarget(ev)}
          onToggleStatus={(ev) => ev._id && toggleStatusMutation.mutate({ id: ev._id, status: ev.status === 'plan' ? 'done' : 'plan' })}
        />
      ) : (
        <ListView
          sortedDateKeys={sortedDateKeys}
          groupedList={groupedList}
          today={today}
          onEdit={openEdit}
          onDelete={(ev) => setDeleteTarget(ev)}
          onToggleStatus={(ev) => ev._id && toggleStatusMutation.mutate({ id: ev._id, status: ev.status === 'plan' ? 'done' : 'plan' })}
        />
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editingEvent ? 'Edit Event' : 'Add Event'}
        size="md"
        footer={
          <>
            <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
            <button
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={isSaving}
              style={{ background: C.primary }}
            >
              {isSaving ? 'Saving…' : editingEvent ? 'Save Changes' : 'Add Event'}
            </button>
          </>
        }
      >
        <EventForm form={form} onChange={setForm} />
      </Modal>

      {/* Confirm Delete */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => { if (deleteTarget?._id) deleteMutation.mutate(deleteTarget._id); }}
        title="Delete Event"
        message={`Delete "${deleteTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}

// ─── List View ────────────────────────────────────────────────────────────────

interface ListViewProps {
  sortedDateKeys: string[];
  groupedList: Map<string, EventEntry[]>;
  today: string;
  onEdit: (ev: EventEntry) => void;
  onDelete: (ev: EventEntry) => void;
  onToggleStatus: (ev: EventEntry) => void;
}

function ListView({ sortedDateKeys, groupedList, today, onEdit, onDelete, onToggleStatus }: ListViewProps) {
  if (sortedDateKeys.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">🗓️</div>
        <p style={{ fontWeight: 600 }}>No events this month</p>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Add your first event with the button above.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {sortedDateKeys.map((dateKey) => {
        const events = groupedList.get(dateKey)!;
        const isToday = dateKey === today;
        const days = daysUntil(dateKey);
        const isSoon = days >= 0 && days <= 7;

        return (
          <div key={dateKey}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              marginBottom: '0.75rem',
            }}>
              <div style={{
                fontWeight: 700,
                fontSize: '0.875rem',
                color: isToday ? MODULE_COLORS.events.primary : 'var(--color-text-secondary)',
                background: isToday ? MODULE_COLORS.events.soft : 'transparent',
                padding: isToday ? '0.25rem 0.75rem' : '0.25rem 0',
                borderRadius: '999px',
                border: isToday ? `1px solid ${MODULE_COLORS.events.primary}` : 'none',
              }}>
                {isToday ? '📍 Today' : formatDate(dateKey)}
              </div>
              {isSoon && !isToday && (
                <span style={{ fontSize: '0.75rem', color: '#B45309', background: '#FFFBEB', border: '1px solid #FDE68A', padding: '0.1rem 0.5rem', borderRadius: '999px', fontWeight: 600 }}>
                  {days === 0 ? 'Today' : `In ${days}d`}
                </span>
              )}
              <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {events.map((ev) => <EventCard key={ev._id} event={ev} today={today} onEdit={onEdit} onDelete={onDelete} onToggleStatus={onToggleStatus} />)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Upcoming View ────────────────────────────────────────────────────────────

interface UpcomingViewProps {
  events: EventEntry[];
  today: string;
  onEdit: (ev: EventEntry) => void;
  onDelete: (ev: EventEntry) => void;
  onToggleStatus: (ev: EventEntry) => void;
}

function UpcomingView({ events, today, onEdit, onDelete, onToggleStatus }: UpcomingViewProps) {
  const sorted = [...events].sort((a, b) => a.date.localeCompare(b.date));
  const grouped = groupByDate(sorted);
  const keys = Array.from(grouped.keys()).sort();

  if (keys.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">🔮</div>
        <p style={{ fontWeight: 600 }}>Nothing upcoming in the next 30 days</p>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Add some events to see them here.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {keys.map((dateKey) => {
        const dayEvents = grouped.get(dateKey)!;
        const days = daysUntil(dateKey);
        const isToday = dateKey === today;
        const isSoon = days <= 7;

        return (
          <div key={dateKey}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div style={{
                fontWeight: 700,
                fontSize: '0.875rem',
                color: isToday ? MODULE_COLORS.events.primary : isSoon ? '#B45309' : 'var(--color-text-secondary)',
                background: isToday ? MODULE_COLORS.events.soft : isSoon ? '#FFFBEB' : 'transparent',
                padding: '0.25rem 0.75rem',
                borderRadius: '999px',
                border: `1px solid ${isToday ? MODULE_COLORS.events.primary : isSoon ? '#FDE68A' : 'transparent'}`,
              }}>
                {isToday ? '📍 Today' : formatDate(dateKey)}
              </div>
              {!isToday && (
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  {days === 1 ? 'Tomorrow' : `In ${days} day${days !== 1 ? 's' : ''}`}
                </span>
              )}
              <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {dayEvents.map((ev) => <EventCard key={ev._id} event={ev} today={today} onEdit={onEdit} onDelete={onDelete} onToggleStatus={onToggleStatus} />)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Event Card ───────────────────────────────────────────────────────────────

interface EventCardProps {
  event: EventEntry;
  today: string;
  onEdit: (ev: EventEntry) => void;
  onDelete: (ev: EventEntry) => void;
  onToggleStatus: (ev: EventEntry) => void;
}

function EventCard({ event, today, onEdit, onDelete, onToggleStatus }: EventCardProps) {
  const days = daysUntil(event.date);
  const isSoon = days >= 0 && days <= 7;
  const typeColors = EVENT_TYPE_COLORS[event.eventType];
  const isBirthday = event.eventType === 'birthday';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'stretch',
        background: 'var(--color-bg-card)',
        border: `1px solid ${isSoon ? '#FDE68A' : 'var(--color-border)'}`,
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-sm)',
        overflow: 'hidden',
        transition: 'box-shadow 0.2s, border-color 0.2s',
      }}
    >
      {/* Left color bar */}
      <div style={{ width: 4, background: typeColors.border, flexShrink: 0 }} />

      <div style={{ flex: 1, padding: '0.875rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
        {/* Top row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: isBirthday ? '1.25rem' : '1.1rem' }}>{EVENT_ICONS[event.eventType]}</span>
            <span style={{ fontWeight: isBirthday ? 700 : 600, fontSize: isBirthday ? '1rem' : '0.95rem', color: isBirthday ? typeColors.text : 'var(--color-text)' }}>
              {event.name}
            </span>
            <span style={{ fontSize: '0.75rem', padding: '0.15rem 0.5rem', borderRadius: '999px', background: typeColors.bg, color: typeColors.text, border: `1px solid ${typeColors.border}`, fontWeight: 600 }}>
              {event.eventType}
            </span>
            {event.recurring && (
              <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>🔁 recurring</span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
            <button className="btn btn-ghost btn-sm btn-icon" onClick={() => onEdit(event)} title="Edit">✏️</button>
            <button className="btn btn-ghost btn-sm btn-icon" onClick={() => onDelete(event)} title="Delete">🗑️</button>
          </div>
        </div>

        {/* Date/time row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
            📅 {formatDate(event.date)}
            {event.time && ` · ${event.time}`}
            {event.endDate && event.endDate !== event.date && ` → ${formatDateShort(event.endDate)}`}
          </span>
          {event.location && (
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
              📍 {event.location}
            </span>
          )}
        </div>

        {/* Description */}
        {event.description && (
          <p style={{ fontSize: '0.825rem', color: 'var(--color-text-secondary)', marginBottom: 0 }}>
            {event.description}
          </p>
        )}

        {/* Soon badge + status toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
          {isSoon && event.date >= today && (
            <span style={{ fontSize: '0.72rem', background: '#FFFBEB', color: '#92400E', border: '1px solid #FDE68A', borderRadius: '999px', padding: '0.1rem 0.5rem', fontWeight: 700 }}>
              {days === 0 ? '🔥 Today!' : `⚡ ${days}d away`}
            </span>
          )}
          <button
            className={`status-badge ${event.status}`}
            onClick={() => onToggleStatus(event)}
            style={{ cursor: 'pointer', border: 'none', fontFamily: 'inherit' }}
          >
            {event.status === 'plan' ? '📋 Plan' : '✓ Done'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Event Form ───────────────────────────────────────────────────────────────

interface EventFormProps {
  form: EventFormState;
  onChange: (form: EventFormState) => void;
}

function EventForm({ form, onChange }: EventFormProps) {
  function set<K extends keyof EventFormState>(key: K, value: EventFormState[K]) {
    onChange({ ...form, [key]: value });
  }

  function handleDateChange(d: string) {
    onChange({ ...form, date: d, status: d > new Date().toISOString().slice(0, 10) ? 'plan' : 'done' });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
      <div className="form-group">
        <label className="form-label">Event Name *</label>
        <input
          className="form-input"
          placeholder="e.g. Mom's Birthday"
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Date *</label>
          <input
            className="form-input"
            type="date"
            value={form.date}
            onChange={(e) => handleDateChange(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Time</label>
          <input
            className="form-input"
            type="time"
            value={form.time}
            onChange={(e) => set('time', e.target.value)}
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">End Date</label>
          <input
            className="form-input"
            type="date"
            value={form.endDate}
            min={form.date}
            onChange={(e) => set('endDate', e.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Event Type</label>
          <select
            className="form-select"
            value={form.eventType}
            onChange={(e) => set('eventType', e.target.value as EventType)}
          >
            {EVENT_TYPES.map((t) => (
              <option key={t} value={t}>{EVENT_ICONS[t]} {t.charAt(0).toUpperCase() + t.slice(1)}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Location</label>
        <input
          className="form-input"
          placeholder="e.g. Central Park, New York"
          value={form.location}
          onChange={(e) => set('location', e.target.value)}
        />
      </div>

      <div className="form-group">
        <label className="form-label">Description</label>
        <textarea
          className="form-textarea"
          placeholder="Add any notes or details…"
          rows={3}
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
        />
      </div>

      <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
        <input
          id="recurring-check"
          type="checkbox"
          checked={form.recurring}
          onChange={(e) => set('recurring', e.target.checked)}
          style={{ width: 16, height: 16, cursor: 'pointer', accentColor: MODULE_COLORS.events.primary }}
        />
        <label htmlFor="recurring-check" className="form-label" style={{ marginBottom: 0, cursor: 'pointer' }}>
          🔁 Recurring event
        </label>
      </div>

      <div className="form-group">
        <label className="form-label">Status</label>
        <PlanDoneToggle status={form.status} onChange={(s) => set('status', s)} />
      </div>
    </div>
  );
}
