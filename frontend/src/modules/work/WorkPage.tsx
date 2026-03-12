import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO, startOfWeek, addDays, startOfMonth, endOfMonth, getDay, eachDayOfInterval } from 'date-fns';
import type { WorkEntry, WorkLocationType, PlanDoneStatus } from '../../types';
import { workApi } from '../../api/client';
import { useApp } from '../../contexts/AppContext';
import { MODULE_COLORS } from '../../themes/themes';
import Modal from '../../components/ui/Modal';
import PlanDoneToggle from '../../components/ui/PlanDoneToggle';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

const C = MODULE_COLORS.work;

const LOCATION_CONFIG: Record<WorkLocationType, { icon: string; label: string; color: string; bg: string; border: string }> = {
  home:   { icon: '🏠', label: 'Home',   color: '#15803D', bg: '#F0FDF4', border: '#86EFAC' },
  office: { icon: '🏢', label: 'Office', color: '#1D4ED8', bg: '#EFF6FF', border: '#93C5FD' },
  travel: { icon: '✈️', label: 'Travel', color: '#C2410C', bg: '#FFF7ED', border: '#FDC97A' },
  other:  { icon: '❓', label: 'Other',  color: 'var(--color-text-secondary)', bg: 'var(--color-surface)', border: 'var(--color-border)' },
};

const LOCATION_TYPES: WorkLocationType[] = ['home', 'office', 'travel', 'other'];

function smartStatus(dateStr: string): PlanDoneStatus {
  return dateStr > format(new Date(), 'yyyy-MM-dd') ? 'plan' : 'done';
}

function makeEmptyForm(dateStr?: string) {
  const d = dateStr ?? format(new Date(), 'yyyy-MM-dd');
  return {
    date: d,
    locationType: 'home' as WorkLocationType,
    tableNumber: '',
    startTime: '',
    endTime: '',
    notes: '',
    status: smartStatus(d),
  };
}

const EMPTY_FORM = makeEmptyForm();

type WorkFormState = typeof EMPTY_FORM;

export default function WorkPage() {
  const { notify } = useApp();
  const qc = useQueryClient();

  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const [view, setView] = useState<'week' | 'list'>('week');
  const [weekRef, setWeekRef] = useState(() => new Date());
  const [statsMonth, setStatsMonth] = useState(() => new Date());
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<WorkEntry | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WorkEntry | null>(null);
  const [form, setForm] = useState<WorkFormState>({ ...EMPTY_FORM });

  const { data: allEntries = [], isLoading } = useQuery<WorkEntry[]>({
    queryKey: ['work'],
    queryFn: () => workApi.getAll(),
  });

  const createMut = useMutation({
    mutationFn: (data: Partial<WorkEntry>) => workApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['work'] }); notify('Work day logged!', 'success'); closeForm(); },
    onError: (err: Error) => notify(err.message, 'error'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<WorkEntry> }) => workApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['work'] }); notify('Entry updated', 'success'); closeForm(); },
    onError: (err: Error) => notify(err.message, 'error'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => workApi.remove(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['work'] }); notify('Entry deleted', 'success'); },
    onError: (err: Error) => notify(err.message, 'error'),
  });

  const toggleStatusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: PlanDoneStatus }) => workApi.update(id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['work'] }),
    onError: (err: Error) => notify(err.message, 'error'),
  });

  function openAdd(prefill?: Partial<WorkFormState>) {
    setEditing(null);
    const dateStr = prefill?.date ?? todayStr;
    setForm({ ...makeEmptyForm(dateStr), ...prefill });
    setShowForm(true);
  }

  function openEdit(e: WorkEntry) {
    setEditing(e);
    setForm({
      date: e.date,
      locationType: e.locationType,
      tableNumber: e.tableNumber ?? '',
      startTime: e.startTime ?? '',
      endTime: e.endTime ?? '',
      notes: e.notes ?? '',
      status: e.status,
    });
    setShowForm(true);
  }

  function closeForm() { setShowForm(false); setEditing(null); }

  function handleSubmit() {
    if (!form.date) { notify('Date is required', 'error'); return; }
    const payload: Partial<WorkEntry> = {
      date: form.date,
      locationType: form.locationType,
      status: form.status,
      tableNumber: form.tableNumber || undefined,
      startTime: form.startTime || undefined,
      endTime: form.endTime || undefined,
      notes: form.notes || undefined,
    };
    editing?._id ? updateMut.mutate({ id: editing._id, data: payload }) : createMut.mutate(payload);
  }

  const isSaving = createMut.isPending || updateMut.isPending;

  // Build a date -> entry index
  const entryByDate = useMemo(() => {
    const map = new Map<string, WorkEntry>();
    for (const e of allEntries) {
      if (!map.has(e.date)) map.set(e.date, e);
    }
    return map;
  }, [allEntries]);

  // Weekly view: Mon-Sun of the weekRef date
  const weekDates = useMemo(() => {
    const monday = startOfWeek(weekRef, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  }, [weekRef]);

  // Stats for statsMonth
  const monthStats = useMemo(() => {
    const monthStart = startOfMonth(statsMonth);
    const monthEnd = endOfMonth(statsMonth);
    const allDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const workDays = allDays.filter((d) => d.getDay() !== 0 && d.getDay() !== 6).length;
    const counts: Record<WorkLocationType, number> = { home: 0, office: 0, travel: 0, other: 0 };
    let logged = 0;
    for (const d of allDays) {
      const ds = format(d, 'yyyy-MM-dd');
      const entry = entryByDate.get(ds);
      if (entry) {
        counts[entry.locationType]++;
        logged++;
      }
    }
    return { counts, logged, workDays };
  }, [entryByDate, statsMonth]);

  // Mini calendar for current stats month
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(statsMonth);
    const monthEnd = endOfMonth(statsMonth);
    return eachDayOfInterval({ start: monthStart, end: monthEnd });
  }, [statsMonth]);
  const calPadStart = getDay(startOfMonth(statsMonth)); // 0=Sun

  const sortedEntries = useMemo(() =>
    [...allEntries].sort((a, b) => b.date.localeCompare(a.date)),
    [allEntries]
  );

  return (
    <div className="page-content">
      {/* Header */}
      <div style={{
        background: `linear-gradient(135deg, ${C.primary} 0%, ${C.dark} 100%)`,
        borderRadius: 'var(--radius-xl)',
        padding: '1.5rem',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1.25rem',
        flexWrap: 'wrap',
        gap: '0.75rem',
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.35rem', color: 'white' }}>💼 Work Tracker</h2>
          <p style={{ margin: '0.25rem 0 0', opacity: 0.85, fontSize: '0.875rem' }}>
            {monthStats.counts.home} home · {monthStats.counts.office} office · {monthStats.counts.travel} travel this month
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            className="btn btn-sm"
            onClick={() => openAdd({ locationType: 'home', status: 'done' })}
            style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.3)' }}
          >
            🏠 Home Today
          </button>
          <button
            className="btn btn-sm"
            onClick={() => openAdd({ locationType: 'office', status: 'done' })}
            style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.3)' }}
          >
            🏢 Office Today
          </button>
          <button
            className="btn"
            onClick={() => openAdd()}
            style={{ background: 'white', color: C.dark, fontWeight: 600 }}
          >
            + Log Work Day
          </button>
        </div>
      </div>

      {/* Stats + Calendar row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
        {/* Monthly Stats */}
        <div className="card">
          <div className="card-header">
            <h3 style={{ margin: 0, fontSize: '0.95rem' }}>📊 Stats</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setStatsMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}>‹</button>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, minWidth: 90, textAlign: 'center' }}>
                {format(statsMonth, 'MMM yyyy')}
              </span>
              <button className="btn btn-ghost btn-sm" onClick={() => setStatsMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}>›</button>
            </div>
          </div>
          <div className="card-body">
            {/* Count chips */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
              {LOCATION_TYPES.map((loc) => {
                const cfg = LOCATION_CONFIG[loc];
                const count = monthStats.counts[loc];
                return (
                  <div key={loc} style={{
                    display: 'flex', alignItems: 'center', gap: '0.35rem',
                    background: cfg.bg, border: `1px solid ${cfg.border}`,
                    borderRadius: 'var(--radius-sm)', padding: '0.35rem 0.65rem',
                  }}>
                    <span>{cfg.icon}</span>
                    <span style={{ fontWeight: 700, fontSize: '0.95rem', color: cfg.color }}>{count}</span>
                    <span style={{ fontSize: '0.72rem', color: cfg.color, opacity: 0.8 }}>{cfg.label}</span>
                  </div>
                );
              })}
            </div>

            {/* Progress bars */}
            {LOCATION_TYPES.map((loc) => {
              const cfg = LOCATION_CONFIG[loc];
              const count = monthStats.counts[loc];
              const pct = monthStats.logged > 0 ? Math.round((count / monthStats.logged) * 100) : 0;
              if (count === 0) return null;
              return (
                <div key={loc} style={{ marginBottom: '0.625rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>{cfg.icon} {cfg.label}</span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: cfg.color }}>{count}d · {pct}%</span>
                  </div>
                  <div style={{ height: '6px', background: 'var(--color-border)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: cfg.border, borderRadius: '3px', transition: 'width 0.4s' }} />
                  </div>
                </div>
              );
            })}

            <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
              {monthStats.logged} / {monthStats.workDays} work days logged
            </div>

            {monthStats.logged === 0 && (
              <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', textAlign: 'center', padding: '0.5rem 0' }}>
                No entries this month
              </p>
            )}
          </div>
        </div>

        {/* Mini Calendar */}
        <div className="card">
          <div className="card-header"><h3 style={{ margin: 0, fontSize: '0.95rem' }}>📅 Work Calendar</h3></div>
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
                const entry = entryByDate.get(ds);
                const isToday = ds === todayStr;
                const cfg = entry ? LOCATION_CONFIG[entry.locationType] : null;
                return (
                  <button
                    key={ds}
                    onClick={() => entry ? openEdit(entry) : openAdd({ date: ds })}
                    title={entry ? `${cfg?.label}${entry.tableNumber ? ` · Table ${entry.tableNumber}` : ''}` : 'Click to log'}
                    style={{
                      aspectRatio: '1',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1px',
                      borderRadius: '4px',
                      border: isToday ? `2px solid ${C.primary}` : 'none',
                      background: cfg ? cfg.bg : 'var(--color-surface)',
                      cursor: 'pointer', fontFamily: 'inherit',
                      fontSize: '0.65rem', color: isToday ? C.primary : 'var(--color-text)',
                      fontWeight: isToday ? 700 : 400,
                    }}
                  >
                    {format(day, 'd')}
                    {cfg && <span style={{ fontSize: '0.6rem' }}>{cfg.icon}</span>}
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
          <button className={`tab ${view === 'week' ? 'active' : ''}`} onClick={() => setView('week')}>
            📅 Week View
          </button>
          <button className={`tab ${view === 'list' ? 'active' : ''}`} onClick={() => setView('list')}>
            📋 All Entries
          </button>
        </div>

        {view === 'week' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setWeekRef((d) => addDays(d, -7))}>‹</button>
            <span style={{ fontWeight: 600, fontSize: '0.875rem', minWidth: 200, textAlign: 'center' }}>
              {format(startOfWeek(weekRef, { weekStartsOn: 1 }), 'MMM d')}
              {' – '}
              {format(addDays(startOfWeek(weekRef, { weekStartsOn: 1 }), 6), 'MMM d, yyyy')}
            </span>
            <button className="btn btn-ghost btn-sm" onClick={() => setWeekRef((d) => addDays(d, 7))}>›</button>
            <button className="btn btn-secondary btn-sm" onClick={() => setWeekRef(new Date())}>This Week</button>
          </div>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="loading-container"><div className="spinner" /><span>Loading…</span></div>
      ) : view === 'week' ? (
        <WeekView
          weekDates={weekDates}
          todayStr={todayStr}
          entryByDate={entryByDate}
          onAdd={(ds) => openAdd({ date: ds })}
          onEdit={openEdit}
        />
      ) : (
        <EntriesList
          entries={sortedEntries}
          todayStr={todayStr}
          onEdit={openEdit}
          onDelete={(e) => setDeleteTarget(e)}
          onToggleStatus={(e) => e._id && toggleStatusMut.mutate({ id: e._id, status: e.status === 'plan' ? 'done' : 'plan' })}
        />
      )}

      {/* Form Modal */}
      <Modal
        isOpen={showForm}
        onClose={closeForm}
        title={editing ? 'Edit Work Day' : 'Log Work Day'}
        size="md"
        footer={
          <>
            <button className="btn btn-secondary" onClick={closeForm}>Cancel</button>
            <button
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={isSaving}
              style={{ background: C.primary }}
            >
              {isSaving ? 'Saving…' : editing ? 'Save Changes' : 'Log Day'}
            </button>
          </>
        }
      >
        <WorkForm form={form} onChange={setForm} />
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => { if (deleteTarget?._id) deleteMut.mutate(deleteTarget._id); }}
        title="Delete Entry"
        message={`Remove work log for ${deleteTarget?.date ? format(parseISO(deleteTarget.date), 'EEE, MMM d') : 'this day'}?`}
      />
    </div>
  );
}

// ─── Week View ────────────────────────────────────────────────────────────────

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface WeekViewProps {
  weekDates: Date[];
  todayStr: string;
  entryByDate: Map<string, WorkEntry>;
  onAdd: (dateStr: string) => void;
  onEdit: (entry: WorkEntry) => void;
}

function WeekView({ weekDates, todayStr, entryByDate, onAdd, onEdit }: WeekViewProps) {
  return (
    <div className="card">
      <div className="card-body" style={{ padding: '1rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem' }}>
          {weekDates.map((d, i) => {
            const ds = format(d, 'yyyy-MM-dd');
            const entry = entryByDate.get(ds);
            const isToday = ds === todayStr;
            const isPast = ds < todayStr;
            const cfg = entry ? LOCATION_CONFIG[entry.locationType] : null;

            return (
              <div
                key={ds}
                onClick={() => entry ? onEdit(entry) : onAdd(ds)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && (entry ? onEdit(entry) : onAdd(ds))}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.375rem',
                  padding: '0.75rem 0.25rem',
                  borderRadius: 'var(--radius-md)',
                  border: `2px solid ${isToday ? C.primary : cfg ? cfg.border : 'var(--color-border)'}`,
                  background: isToday ? MODULE_COLORS.work.soft : cfg ? cfg.bg : 'var(--color-bg)',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  opacity: isPast && !entry ? 0.45 : 1,
                  minHeight: 100,
                  justifyContent: 'center',
                }}
              >
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: 600,
                  color: isToday ? C.primary : 'var(--color-text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}>
                  {DAY_NAMES[i]}
                </span>
                <span style={{ fontSize: '1.1rem', fontWeight: 700, color: isToday ? C.primary : 'var(--color-text)', lineHeight: 1 }}>
                  {d.getDate()}
                </span>
                {entry && cfg ? (
                  <>
                    <span style={{ fontSize: '1.4rem' }}>{cfg.icon}</span>
                    <span style={{ fontSize: '0.65rem', fontWeight: 600, color: cfg.color, textAlign: 'center' }}>
                      {cfg.label}
                    </span>
                    {entry.tableNumber && (
                      <span style={{ fontSize: '0.6rem', color: 'var(--color-text-muted)' }}>#{entry.tableNumber}</span>
                    )}
                    {(entry.startTime || entry.endTime) && (
                      <span style={{ fontSize: '0.6rem', color: 'var(--color-text-muted)' }}>
                        {entry.startTime ?? '?'}–{entry.endTime ?? '?'}
                      </span>
                    )}
                    <span
                      className={`status-badge ${entry.status}`}
                      style={{ fontSize: '0.6rem', padding: '0.1rem 0.35rem' }}
                    >
                      {entry.status}
                    </span>
                  </>
                ) : (
                  <span style={{ fontSize: '1rem', color: 'var(--color-border)', marginTop: '0.25rem' }}>+</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Entries List ─────────────────────────────────────────────────────────────

interface EntriesListProps {
  entries: WorkEntry[];
  todayStr: string;
  onEdit: (entry: WorkEntry) => void;
  onDelete: (entry: WorkEntry) => void;
  onToggleStatus: (entry: WorkEntry) => void;
}

function EntriesList({ entries, todayStr, onEdit, onDelete, onToggleStatus }: EntriesListProps) {
  if (entries.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">💼</div>
        <p style={{ fontWeight: 600 }}>No work days logged yet</p>
        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Use the quick buttons at the top to log today.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-body">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {entries.map((entry) => {
            const cfg = LOCATION_CONFIG[entry.locationType];
            const isToday = entry.date === todayStr;
            return (
              <div
                key={entry._id}
                className="list-item"
                style={{ borderLeft: `3px solid ${cfg.border}`, background: isToday ? cfg.bg : undefined }}
              >
                <span style={{ fontSize: '1.4rem' }}>{cfg.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.875rem', color: cfg.color }}>{cfg.label}</span>
                    {entry.tableNumber && (
                      <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>🪑 Table {entry.tableNumber}</span>
                    )}
                    <span className={`badge status-badge ${entry.status}`}>{entry.status}</span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.125rem' }}>
                    <span>📅 {isToday ? 'Today' : format(parseISO(entry.date), 'EEE, MMM d')}</span>
                    {entry.startTime && <span>🕐 {entry.startTime}{entry.endTime ? `–${entry.endTime}` : ''}</span>}
                  </div>
                  {entry.notes && <p style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', margin: '0.25rem 0 0' }}>{entry.notes}</p>}
                </div>
                <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                  <button
                    className={`status-badge ${entry.status}`}
                    onClick={() => onToggleStatus(entry)}
                    style={{ cursor: 'pointer', border: 'none', fontFamily: 'inherit' }}
                  >
                    {entry.status === 'plan' ? '📋' : '✓'}
                  </button>
                  <button className="btn btn-icon btn-ghost btn-sm" onClick={() => onEdit(entry)} title="Edit">✏️</button>
                  <button className="btn btn-icon btn-ghost btn-sm" onClick={() => onDelete(entry)} title="Delete" style={{ color: '#DC2626' }}>🗑</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Work Form ────────────────────────────────────────────────────────────────

interface WorkFormProps {
  form: WorkFormState;
  onChange: (form: WorkFormState) => void;
}

function WorkForm({ form, onChange }: WorkFormProps) {
  function set<K extends keyof WorkFormState>(key: K, value: WorkFormState[K]) {
    onChange({ ...form, [key]: value });
  }

  return (
    <div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Date *</label>
          <input
            type="date"
            className="form-input"
            value={form.date}
            onChange={(e) => onChange({ ...form, date: e.target.value, status: smartStatus(e.target.value) })}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Status</label>
          <PlanDoneToggle status={form.status} onChange={(s) => set('status', s)} />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Location *</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
          {LOCATION_TYPES.map((loc) => {
            const cfg = LOCATION_CONFIG[loc];
            const selected = form.locationType === loc;
            return (
              <button
                key={loc}
                type="button"
                onClick={() => set('locationType', loc)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.625rem 0.875rem',
                  borderRadius: 'var(--radius-sm)',
                  border: `2px solid ${selected ? cfg.border : 'var(--color-border)'}`,
                  background: selected ? cfg.bg : 'var(--color-bg-card)',
                  color: selected ? cfg.color : 'var(--color-text-secondary)',
                  fontWeight: selected ? 600 : 400,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontSize: '0.875rem',
                  transition: 'all 0.15s',
                }}
              >
                <span style={{ fontSize: '1.1rem' }}>{cfg.icon}</span>
                {cfg.label}
              </button>
            );
          })}
        </div>
      </div>

      {form.locationType === 'office' && (
        <div className="form-group">
          <label className="form-label">Table / Desk Number</label>
          <input
            className="form-input"
            placeholder="e.g. A-23"
            value={form.tableNumber}
            onChange={(e) => set('tableNumber', e.target.value)}
          />
        </div>
      )}

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Start Time</label>
          <input
            type="time"
            className="form-input"
            value={form.startTime}
            onChange={(e) => set('startTime', e.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="form-label">End Time</label>
          <input
            type="time"
            className="form-input"
            value={form.endTime}
            onChange={(e) => set('endTime', e.target.value)}
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Notes</label>
        <textarea
          className="form-textarea"
          value={form.notes}
          onChange={(e) => set('notes', e.target.value)}
          placeholder="Any notes about the day…"
          rows={3}
        />
      </div>
    </div>
  );
}
