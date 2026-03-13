import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  format, startOfWeek, addDays, startOfMonth, endOfMonth,
  getDay, eachDayOfInterval,
} from 'date-fns';
import type { TrainingEntry, ActivityType, PlanDoneStatus } from '../../types';
import { trainingApi } from '../../api/client';
import { useApp } from '../../contexts/AppContext';
import { MODULE_COLORS } from '../../themes/themes';
import Modal from '../../components/ui/Modal';
import PlanDoneToggle from '../../components/ui/PlanDoneToggle';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

const C = MODULE_COLORS.training;

const ACTIVITY_OPTIONS: Array<{ value: ActivityType; label: string; icon: string }> = [
  { value: 'running',  label: 'Running',  icon: '🏃' },
  { value: 'walking',  label: 'Walking',  icon: '🚶' },
  { value: 'gym',      label: 'Gym',      icon: '🏋️' },
  { value: 'cycling',  label: 'Cycling',  icon: '🚴' },
  { value: 'yoga',     label: 'Yoga',     icon: '🧘' },
  { value: 'swimming', label: 'Swimming', icon: '🏊' },
  { value: 'other',    label: 'Other',    icon: '⚡' },
];

function activityMeta(type: ActivityType) {
  return ACTIVITY_OPTIONS.find(a => a.value === type) ?? { icon: '⚡', label: type };
}

function getTodayStr() { return new Date().toISOString().slice(0, 10); }

function smartStatus(dateStr: string): PlanDoneStatus {
  return dateStr > getTodayStr() ? 'plan' : 'done';
}

function formatDateShort(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  });
}

function formatDuration(mins?: number): string {
  if (!mins) return '—';
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

// ─── Form State ───────────────────────────────────────────────────────────────

interface WorkoutFormState {
  date: string;
  activityType: ActivityType;
  duration: string;
  distance: string;
  pace: string;
  workoutType: string;
  notes: string;
  status: PlanDoneStatus;
}

function makeEmptyForm(dateStr?: string): WorkoutFormState {
  const d = dateStr ?? getTodayStr();
  return { date: d, activityType: 'running', duration: '', distance: '', pace: '', workoutType: '', notes: '', status: smartStatus(d) };
}

// ─── Workout Form ─────────────────────────────────────────────────────────────

interface WorkoutFormProps {
  form: WorkoutFormState;
  onChange: (form: WorkoutFormState) => void;
  errors: Partial<Record<keyof WorkoutFormState, string>>;
}

function WorkoutForm({ form, onChange, errors }: WorkoutFormProps) {
  function set<K extends keyof WorkoutFormState>(key: K, value: WorkoutFormState[K]) {
    onChange({ ...form, [key]: value });
  }
  function handleDateChange(d: string) {
    onChange({ ...form, date: d, status: smartStatus(d) });
  }

  const showDistancePace = form.activityType === 'running' || form.activityType === 'walking';
  const showWorkoutType = form.activityType === 'gym';

  return (
    <div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Date *</label>
          <input className="form-input" type="date" value={form.date} onChange={e => handleDateChange(e.target.value)} />
          {errors.date && <span style={{ color: '#DC2626', fontSize: '0.78rem' }}>{errors.date}</span>}
        </div>
        <div className="form-group">
          <label className="form-label">Status</label>
          <PlanDoneToggle status={form.status} onChange={s => set('status', s)} />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Activity *</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.4rem' }}>
          {ACTIVITY_OPTIONS.map(a => {
            const sel = form.activityType === a.value;
            return (
              <button key={a.value} type="button" onClick={() => set('activityType', a.value)} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem',
                padding: '0.5rem 0.25rem', borderRadius: 'var(--radius-sm)',
                border: `2px solid ${sel ? C.primary : 'var(--color-border)'}`,
                background: sel ? C.soft : 'var(--color-bg-card)',
                color: sel ? C.text : 'var(--color-text-secondary)',
                fontWeight: sel ? 600 : 400, cursor: 'pointer', fontFamily: 'inherit',
                fontSize: '0.72rem', transition: 'all 0.15s',
              }}>
                <span style={{ fontSize: '1.2rem' }}>{a.icon}</span>
                {a.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Duration (min)</label>
          <input className="form-input" type="number" min="1" placeholder="45" value={form.duration} onChange={e => set('duration', e.target.value)} />
          {errors.duration && <span style={{ color: '#DC2626', fontSize: '0.78rem' }}>{errors.duration}</span>}
        </div>
        {showWorkoutType && (
          <div className="form-group">
            <label className="form-label">Workout Type</label>
            <input className="form-input" type="text" placeholder="Upper body, Legs…" value={form.workoutType} onChange={e => set('workoutType', e.target.value)} />
          </div>
        )}
      </div>

      {showDistancePace && (
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Distance (km)</label>
            <input className="form-input" type="number" step="0.01" min="0" placeholder="5.0" value={form.distance} onChange={e => set('distance', e.target.value)} />
            {errors.distance && <span style={{ color: '#DC2626', fontSize: '0.78rem' }}>{errors.distance}</span>}
          </div>
          <div className="form-group">
            <label className="form-label">Pace (min/km)</label>
            <input className="form-input" type="text" placeholder="5:30" value={form.pace} onChange={e => set('pace', e.target.value)} />
          </div>
        </div>
      )}

      <div className="form-group">
        <label className="form-label">Notes</label>
        <textarea className="form-textarea" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="How did it go?" />
      </div>
    </div>
  );
}

// ─── Week View ────────────────────────────────────────────────────────────────

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function TrainingWeekView({ weekDates, todayS, entryByDate, onAdd, onEdit }: {
  weekDates: Date[];
  todayS: string;
  entryByDate: Map<string, TrainingEntry[]>;
  onAdd: (ds: string) => void;
  onEdit: (e: TrainingEntry) => void;
}) {
  return (
    <div className="card">
      <div className="card-body" style={{ padding: '1rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem' }}>
          {weekDates.map((d, i) => {
            const ds = format(d, 'yyyy-MM-dd');
            const entries = entryByDate.get(ds) ?? [];
            const isToday = ds === todayS;
            const isPast = ds < todayS;
            return (
              <div key={ds} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem',
                padding: '0.625rem 0.25rem', borderRadius: 'var(--radius-md)', minHeight: 110,
                border: `2px solid ${isToday ? C.primary : entries.length > 0 ? C.primary + '50' : 'var(--color-border)'}`,
                background: isToday ? C.soft : entries.length > 0 ? C.soft : 'var(--color-bg)',
                opacity: isPast && entries.length === 0 ? 0.45 : 1, justifyContent: 'flex-start',
              }}>
                <span style={{ fontSize: '0.65rem', fontWeight: 600, color: isToday ? C.primary : 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{DAY_NAMES[i]}</span>
                <span style={{ fontSize: '1rem', fontWeight: 700, color: isToday ? C.primary : 'var(--color-text)', lineHeight: 1 }}>{d.getDate()}</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', width: '100%', alignItems: 'center', flex: 1 }}>
                  {entries.slice(0, 2).map(e => {
                    const meta = activityMeta(e.activityType);
                    return (
                      <button key={e._id} onClick={() => onEdit(e)} style={{
                        border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px', padding: '0.1rem',
                      }}>
                        <span style={{ fontSize: '1.2rem' }}>{meta.icon}</span>
                        <span style={{ fontSize: '0.58rem', color: C.text, fontWeight: 600 }}>{meta.label}</span>
                        {e.duration && <span style={{ fontSize: '0.55rem', color: 'var(--color-text-muted)' }}>{formatDuration(e.duration)}</span>}
                        <span className={`status-badge ${e.status}`} style={{ fontSize: '0.55rem', padding: '0.05rem 0.25rem' }}>{e.status}</span>
                      </button>
                    );
                  })}
                  {entries.length > 2 && <span style={{ fontSize: '0.6rem', color: C.text }}>+{entries.length - 2}</span>}
                  {entries.length === 0 && (
                    <button onClick={() => onAdd(ds)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--color-border)', fontSize: '1.25rem', marginTop: '0.25rem', fontFamily: 'inherit' }}>+</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TrainingPage() {
  const { notify } = useApp();
  const qc = useQueryClient();
  const todayS = getTodayStr();

  const [view, setView] = useState<'week' | 'list'>('week');
  const [weekRef, setWeekRef] = useState(() => new Date());
  const [statsMonth, setStatsMonth] = useState(() => new Date());
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TrainingEntry | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TrainingEntry | null>(null);
  const [form, setForm] = useState<WorkoutFormState>(makeEmptyForm());
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof WorkoutFormState, string>>>({});
  const [filter, setFilter] = useState<ActivityType | 'all'>('all');

  const { data: allEntries = [], isLoading } = useQuery<TrainingEntry[]>({
    queryKey: ['training'],
    queryFn: () => trainingApi.getAll(),
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<TrainingEntry>) => trainingApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['training'] }); notify('Workout logged! 💪', 'success'); closeModal(); },
    onError: (err: Error) => notify(err.message, 'error'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TrainingEntry> }) => trainingApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['training'] }); notify('Workout updated', 'success'); closeModal(); },
    onError: (err: Error) => notify(err.message, 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => trainingApi.remove(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['training'] }); notify('Workout deleted', 'success'); },
    onError: (err: Error) => notify(err.message, 'error'),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: PlanDoneStatus }) => trainingApi.update(id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['training'] }),
    onError: (err: Error) => notify(err.message, 'error'),
  });

  function openAdd(dateStr?: string) {
    setEditingEntry(null);
    setForm(makeEmptyForm(dateStr));
    setFormErrors({});
    setModalOpen(true);
  }

  function openEdit(entry: TrainingEntry) {
    setEditingEntry(entry);
    setForm({
      date: entry.date, activityType: entry.activityType, status: entry.status,
      duration: entry.duration != null ? String(entry.duration) : '',
      distance: entry.distance != null ? String(entry.distance) : '',
      pace: entry.pace ?? '', workoutType: entry.workoutType ?? '', notes: entry.notes ?? '',
    });
    setFormErrors({});
    setModalOpen(true);
  }

  function closeModal() { setModalOpen(false); setEditingEntry(null); setFormErrors({}); }

  function validate(): boolean {
    const e: Partial<Record<keyof WorkoutFormState, string>> = {};
    if (!form.date) e.date = 'Date is required';
    if (form.duration && (isNaN(Number(form.duration)) || Number(form.duration) <= 0)) e.duration = 'Enter a valid duration';
    setFormErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    const showDistPace = form.activityType === 'running' || form.activityType === 'walking';
    const payload: Partial<TrainingEntry> = {
      date: form.date, activityType: form.activityType, status: form.status,
      duration: form.duration ? parseInt(form.duration, 10) : undefined,
      notes: form.notes.trim() || undefined,
      distance: showDistPace && form.distance ? parseFloat(form.distance) : undefined,
      pace: showDistPace && form.pace ? form.pace.trim() : undefined,
      workoutType: form.activityType === 'gym' && form.workoutType ? form.workoutType.trim() : undefined,
    };
    editingEntry?._id ? updateMutation.mutate({ id: editingEntry._id, data: payload }) : createMutation.mutate(payload);
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  const entryByDate = useMemo(() => {
    const map = new Map<string, TrainingEntry[]>();
    for (const e of allEntries) {
      if (!map.has(e.date)) map.set(e.date, []);
      map.get(e.date)!.push(e);
    }
    return map;
  }, [allEntries]);

  const trainingStreak = useMemo(() => {
    let streak = 0;
    const d = new Date();
    if (!entryByDate.has(todayS)) d.setDate(d.getDate() - 1);
    while (true) {
      const ds = format(d, 'yyyy-MM-dd');
      if (!entryByDate.has(ds)) break;
      streak++;
      d.setDate(d.getDate() - 1);
    }
    return streak;
  }, [entryByDate, todayS]);

  const weekDates = useMemo(() => {
    const monday = startOfWeek(weekRef, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  }, [weekRef]);

  const monthStats = useMemo(() => {
    const monthStr = format(statsMonth, 'yyyy-MM');
    const monthEntries = allEntries.filter(e => e.date.startsWith(monthStr));
    const totalWorkouts = monthEntries.length;
    const totalMins = monthEntries.reduce((s, e) => s + (e.duration ?? 0), 0);
    const counts: Partial<Record<ActivityType, number>> = {};
    for (const e of monthEntries) counts[e.activityType] = (counts[e.activityType] ?? 0) + 1;
    return { totalWorkouts, totalMins, counts };
  }, [allEntries, statsMonth]);

  const calendarDays = useMemo(() =>
    eachDayOfInterval({ start: startOfMonth(statsMonth), end: endOfMonth(statsMonth) }),
    [statsMonth]
  );
  const calPadStart = getDay(startOfMonth(statsMonth));

  const displayed = useMemo(() => {
    const base = filter === 'all' ? allEntries : allEntries.filter(e => e.activityType === filter);
    return [...base].sort((a, b) => b.date.localeCompare(a.date));
  }, [allEntries, filter]);

  return (
    <div className="page-content">
      {/* Header */}
      <div style={{
        background: C.soft,
        border: `1px solid ${C.primary}30`,
        borderRadius: 'var(--radius-xl)', padding: '1.5rem', marginBottom: '1.25rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '2.5rem' }}>🏃</span>
          <div>
            <h1 style={{ margin: 0, color: C.primary, fontSize: 'clamp(1.25rem, 3vw, 1.75rem)' }}>Training & Fitness</h1>
            <p style={{ margin: '0.25rem 0 0', color: C.text, fontSize: '0.875rem' }}>
              {monthStats.totalWorkouts} workout{monthStats.totalWorkouts !== 1 ? 's' : ''} · {
                monthStats.totalMins >= 60
                  ? `${Math.floor(monthStats.totalMins / 60)}h ${monthStats.totalMins % 60}m`
                  : `${monthStats.totalMins}m`} this month
              {trainingStreak > 0 && <span style={{ marginLeft: '0.5rem' }}>· 🔥 {trainingStreak}-day streak</span>}
            </p>
          </div>
        </div>
        <button className="btn" onClick={() => openAdd()} style={{ background: C.primary, color: 'white', fontWeight: 600 }}>
          + Log Workout
        </button>
      </div>

      {/* Stats + Calendar row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
        <div className="card">
          <div className="card-header">
            <h3 style={{ margin: 0, fontSize: '0.95rem' }}>📊 Stats</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setStatsMonth(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}>‹</button>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, minWidth: 90, textAlign: 'center' }}>{format(statsMonth, 'MMM yyyy')}</span>
              <button className="btn btn-ghost btn-sm" onClick={() => setStatsMonth(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}>›</button>
            </div>
          </div>
          <div className="card-body">
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
              <div style={{ padding: '0.35rem 0.65rem', borderRadius: 'var(--radius-sm)', background: C.soft, border: `1px solid ${C.primary}30` }}>
                <span style={{ fontWeight: 700, fontSize: '1rem', color: C.primary }}>{monthStats.totalWorkouts}</span>
                <span style={{ fontSize: '0.72rem', color: C.text, marginLeft: '0.3rem' }}>workouts</span>
              </div>
              <div style={{ padding: '0.35rem 0.65rem', borderRadius: 'var(--radius-sm)', background: C.soft, border: `1px solid ${C.primary}30` }}>
                <span style={{ fontWeight: 700, fontSize: '1rem', color: C.primary }}>
                  {monthStats.totalMins >= 60 ? `${Math.floor(monthStats.totalMins / 60)}h` : `${monthStats.totalMins}m`}
                </span>
                <span style={{ fontSize: '0.72rem', color: C.text, marginLeft: '0.3rem' }}>active</span>
              </div>
              {trainingStreak > 0 && (
                <div style={{ padding: '0.35rem 0.65rem', borderRadius: 'var(--radius-sm)', background: '#FEF9C3', border: '1px solid #FDE047' }}>
                  <span style={{ fontWeight: 700, fontSize: '1rem', color: '#A16207' }}>🔥 {trainingStreak}</span>
                  <span style={{ fontSize: '0.72rem', color: '#A16207', marginLeft: '0.3rem' }}>day streak</span>
                </div>
              )}
            </div>
            {(Object.entries(monthStats.counts) as [ActivityType, number][]).sort((a, b) => b[1] - a[1]).map(([type, count]) => {
              const meta = activityMeta(type);
              const pct = monthStats.totalWorkouts > 0 ? Math.round((count / monthStats.totalWorkouts) * 100) : 0;
              return (
                <div key={type} style={{ marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                    <span style={{ fontSize: '0.8rem' }}>{meta.icon} {meta.label}</span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: C.primary }}>{count} · {pct}%</span>
                  </div>
                  <div style={{ height: '6px', background: 'var(--color-border)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: C.primary, borderRadius: '3px', transition: 'width 0.4s' }} />
                  </div>
                </div>
              );
            })}
            {monthStats.totalWorkouts === 0 && <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', textAlign: 'center', padding: '0.5rem 0' }}>No workouts this month</p>}
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3 style={{ margin: 0, fontSize: '0.95rem' }}>📅 Training Calendar</h3></div>
          <div style={{ padding: '0.75rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '4px' }}>
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                <div key={i} style={{ textAlign: 'center', fontSize: '0.65rem', color: 'var(--color-text-muted)', padding: '2px 0' }}>{d}</div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
              {Array.from({ length: calPadStart }).map((_, i) => <div key={`p${i}`} />)}
              {calendarDays.map(day => {
                const ds = format(day, 'yyyy-MM-dd');
                const dayEntries = entryByDate.get(ds) ?? [];
                const isToday = ds === todayS;
                return (
                  <button key={ds} onClick={() => dayEntries.length > 0 ? openEdit(dayEntries[0]) : openAdd(ds)}
                    title={dayEntries.map(e => activityMeta(e.activityType).label).join(', ') || 'Click to log'}
                    style={{
                      aspectRatio: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      borderRadius: '4px', border: isToday ? `2px solid ${C.primary}` : 'none',
                      background: dayEntries.length > 0 ? C.soft : 'var(--color-surface)',
                      cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.65rem',
                      color: isToday ? C.primary : 'var(--color-text)', fontWeight: isToday ? 700 : 400,
                    }}>
                    {format(day, 'd')}
                    {dayEntries.length > 0 && <span style={{ fontSize: '0.6rem' }}>{activityMeta(dayEntries[0].activityType).icon}</span>}
                    {dayEntries.length > 1 && <span style={{ fontSize: '0.55rem', color: C.text }}>+{dayEntries.length - 1}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* View Tabs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <div className="tabs" style={{ minWidth: 200 }}>
          <button className={`tab ${view === 'week' ? 'active' : ''}`} onClick={() => setView('week')}>📅 Week View</button>
          <button className={`tab ${view === 'list' ? 'active' : ''}`} onClick={() => setView('list')}>📋 All Entries</button>
        </div>
        {view === 'week' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setWeekRef(d => addDays(d, -7))}>‹</button>
            <span style={{ fontWeight: 600, fontSize: '0.875rem', minWidth: 200, textAlign: 'center' }}>
              {format(startOfWeek(weekRef, { weekStartsOn: 1 }), 'MMM d')} – {format(addDays(startOfWeek(weekRef, { weekStartsOn: 1 }), 6), 'MMM d, yyyy')}
            </span>
            <button className="btn btn-ghost btn-sm" onClick={() => setWeekRef(d => addDays(d, 7))}>›</button>
            <button className="btn btn-secondary btn-sm" onClick={() => setWeekRef(new Date())}>This Week</button>
          </div>
        )}
        {view === 'list' && (
          <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
            <button className={`btn btn-sm ${filter === 'all' ? 'btn-primary' : 'btn-secondary'}`} style={filter === 'all' ? { background: C.primary } : {}} onClick={() => setFilter('all')}>All</button>
            {ACTIVITY_OPTIONS.map(a => (
              <button key={a.value} className={`btn btn-sm ${filter === a.value ? 'btn-primary' : 'btn-secondary'}`} style={filter === a.value ? { background: C.primary } : {}} onClick={() => setFilter(a.value)}>
                {a.icon} {a.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="loading-container"><div className="spinner" /><span>Loading…</span></div>
      ) : view === 'week' ? (
        <TrainingWeekView weekDates={weekDates} todayS={todayS} entryByDate={entryByDate} onAdd={openAdd} onEdit={openEdit} />
      ) : displayed.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">{filter === 'all' ? '🏃' : activityMeta(filter as ActivityType).icon}</div>
          <p style={{ fontWeight: 600 }}>No workouts yet</p>
          <button className="btn btn-primary btn-sm" onClick={() => openAdd()} style={{ background: C.primary }}>Log your first workout</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {displayed.map(entry => {
            const meta = activityMeta(entry.activityType);
            return (
              <div key={entry._id} style={{
                display: 'flex', alignItems: 'stretch', background: 'var(--color-bg-card)',
                border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden',
              }}>
                <div style={{ width: 4, background: C.primary, flexShrink: 0 }} />
                <div style={{ flex: 1, padding: '0.875rem 1rem', display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                  <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: 'var(--radius-md)', background: C.soft, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', flexShrink: 0 }}>
                    {meta.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{meta.label}</span>
                      {entry.workoutType && <span style={{ fontSize: '0.78rem', padding: '0.15rem 0.5rem', borderRadius: '999px', background: C.soft, color: C.text, border: `1px solid ${C.primary}40` }}>{entry.workoutType}</span>}
                      <button className={`status-badge ${entry.status}`} onClick={() => entry._id && toggleStatusMutation.mutate({ id: entry._id, status: entry.status === 'plan' ? 'done' : 'plan' })} style={{ cursor: 'pointer', border: 'none', fontFamily: 'inherit' }}>
                        {entry.status === 'plan' ? '📋 Plan' : '✓ Done'}
                      </button>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.2rem' }}>
                      <span>📅 {formatDateShort(entry.date)}</span>
                      {entry.duration != null && <span>⏱ {formatDuration(entry.duration)}</span>}
                      {entry.distance != null && <span>📏 {entry.distance}km</span>}
                      {entry.pace && <span>💨 {entry.pace}/km</span>}
                    </div>
                    {entry.notes && <p style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', margin: '0.25rem 0 0' }}>{entry.notes}</p>}
                  </div>
                  <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
                    <button className="btn btn-ghost btn-sm btn-icon" onClick={() => openEdit(entry)}>✏️</button>
                    <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setDeleteTarget(entry)}>🗑️</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={closeModal} title={editingEntry ? 'Edit Workout' : 'Log Workout'} size="md"
        footer={<>
          <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={isSaving} style={{ background: C.primary }}>
            {isSaving ? 'Saving…' : editingEntry ? 'Save Changes' : 'Log Workout'}
          </button>
        </>}
      >
        <WorkoutForm form={form} onChange={setForm} errors={formErrors} />
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)}
        onConfirm={() => { if (deleteTarget?._id) deleteMutation.mutate(deleteTarget._id); }}
        title="Delete Workout"
        message={`Delete this ${deleteTarget ? activityMeta(deleteTarget.activityType).label.toLowerCase() : 'workout'} session?`}
        confirmLabel="Delete" variant="danger"
      />
    </div>
  );
}
