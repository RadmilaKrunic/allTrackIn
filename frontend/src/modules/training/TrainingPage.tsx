import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { TrainingEntry, ActivityType, PlanDoneStatus } from '../../types';
import { trainingApi } from '../../api/client';
import { useApp } from '../../contexts/AppContext';
import { MODULE_COLORS } from '../../themes/themes';
import Modal from '../../components/ui/Modal';
import PlanDoneToggle from '../../components/ui/PlanDoneToggle';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

const C = MODULE_COLORS.training;

// ─── Constants ────────────────────────────────────────────────────────────────

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

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatDateShort(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  });
}

function formatDuration(mins?: number): string {
  if (!mins) return '—';
  if (mins < 60) return `${mins} min`;
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

const EMPTY_FORM: WorkoutFormState = {
  date: todayStr(),
  activityType: 'running',
  duration: '',
  distance: '',
  pace: '',
  workoutType: '',
  notes: '',
  status: 'plan',
};

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

  const showDistancePace = form.activityType === 'running' || form.activityType === 'walking';
  const showWorkoutType = form.activityType === 'gym';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Date *</label>
          <input
            className="form-input"
            type="date"
            value={form.date}
            onChange={e => set('date', e.target.value)}
          />
          {errors.date && <span style={{ color: '#DC2626', fontSize: '0.78rem' }}>{errors.date}</span>}
        </div>
        <div className="form-group">
          <label className="form-label">Activity *</label>
          <select
            className="form-select"
            value={form.activityType}
            onChange={e => set('activityType', e.target.value as ActivityType)}
          >
            {ACTIVITY_OPTIONS.map(a => (
              <option key={a.value} value={a.value}>{a.icon} {a.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Duration (minutes)</label>
          <input
            className="form-input"
            type="number"
            min="1"
            placeholder="e.g. 45"
            value={form.duration}
            onChange={e => set('duration', e.target.value)}
          />
          {errors.duration && <span style={{ color: '#DC2626', fontSize: '0.78rem' }}>{errors.duration}</span>}
        </div>
        {showWorkoutType && (
          <div className="form-group">
            <label className="form-label">Workout Type</label>
            <input
              className="form-input"
              type="text"
              placeholder="e.g. Upper body, Legs, Full body…"
              value={form.workoutType}
              onChange={e => set('workoutType', e.target.value)}
            />
          </div>
        )}
      </div>

      {showDistancePace && (
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Distance (km)</label>
            <input
              className="form-input"
              type="number"
              step="0.01"
              min="0"
              placeholder="e.g. 5.0"
              value={form.distance}
              onChange={e => set('distance', e.target.value)}
            />
            {errors.distance && <span style={{ color: '#DC2626', fontSize: '0.78rem' }}>{errors.distance}</span>}
          </div>
          <div className="form-group">
            <label className="form-label">Pace (min/km)</label>
            <input
              className="form-input"
              type="text"
              placeholder="e.g. 5:30"
              value={form.pace}
              onChange={e => set('pace', e.target.value)}
            />
          </div>
        </div>
      )}

      <div className="form-group">
        <label className="form-label">Notes</label>
        <textarea
          className="form-textarea"
          rows={3}
          placeholder="How did it go? Any observations…"
          value={form.notes}
          onChange={e => set('notes', e.target.value)}
        />
      </div>

      <div className="form-group">
        <label className="form-label">Status</label>
        <PlanDoneToggle status={form.status} onChange={s => set('status', s)} />
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TrainingPage() {
  const { notify } = useApp();
  const queryClient = useQueryClient();

  const [filter, setFilter] = useState<ActivityType | 'all'>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TrainingEntry | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TrainingEntry | null>(null);
  const [form, setForm] = useState<WorkoutFormState>({ ...EMPTY_FORM });
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof WorkoutFormState, string>>>({});

  const { data: allEntries = [], isLoading } = useQuery<TrainingEntry[]>({
    queryKey: ['training'],
    queryFn: () => trainingApi.getAll(),
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<TrainingEntry>) => trainingApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training'] });
      notify('Workout logged! 💪', 'success');
      closeModal();
    },
    onError: (err: Error) => notify(err.message, 'error'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TrainingEntry> }) =>
      trainingApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training'] });
      notify('Workout updated', 'success');
      closeModal();
    },
    onError: (err: Error) => notify(err.message, 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => trainingApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training'] });
      notify('Workout deleted', 'success');
    },
    onError: (err: Error) => notify(err.message, 'error'),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: PlanDoneStatus }) =>
      trainingApi.update(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['training'] }),
    onError: (err: Error) => notify(err.message, 'error'),
  });

  function openAdd() {
    setEditingEntry(null);
    setForm({ ...EMPTY_FORM });
    setFormErrors({});
    setModalOpen(true);
  }

  function openEdit(entry: TrainingEntry) {
    setEditingEntry(entry);
    setForm({
      date: entry.date,
      activityType: entry.activityType,
      duration: entry.duration != null ? String(entry.duration) : '',
      distance: entry.distance != null ? String(entry.distance) : '',
      pace: entry.pace ?? '',
      workoutType: entry.workoutType ?? '',
      notes: entry.notes ?? '',
      status: entry.status,
    });
    setFormErrors({});
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingEntry(null);
    setFormErrors({});
  }

  function validate(): boolean {
    const e: Partial<Record<keyof WorkoutFormState, string>> = {};
    if (!form.date) e.date = 'Date is required';
    if (form.duration && (isNaN(Number(form.duration)) || Number(form.duration) <= 0))
      e.duration = 'Enter a valid duration in minutes';
    if ((form.activityType === 'running' || form.activityType === 'walking') &&
        form.distance && (isNaN(Number(form.distance)) || Number(form.distance) <= 0))
      e.distance = 'Enter a valid distance';
    setFormErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    const showDistancePace = form.activityType === 'running' || form.activityType === 'walking';
    const payload: Partial<TrainingEntry> = {
      date: form.date,
      activityType: form.activityType,
      status: form.status,
      duration: form.duration ? parseInt(form.duration, 10) : undefined,
      notes: form.notes.trim() || undefined,
      distance: (showDistancePace && form.distance) ? parseFloat(form.distance) : undefined,
      pace: (showDistancePace && form.pace.trim()) ? form.pace.trim() : undefined,
      workoutType: (form.activityType === 'gym' && form.workoutType.trim()) ? form.workoutType.trim() : undefined,
    };
    if (editingEntry?._id) {
      updateMutation.mutate({ id: editingEntry._id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  // Stats (this month)
  const stats = useMemo(() => {
    const now = new Date();
    const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const thisMonth = allEntries.filter(e => e.date?.startsWith(monthStr));
    const totalWorkouts = thisMonth.length;
    const totalMins = thisMonth.reduce((s, e) => s + (e.duration ?? 0), 0);
    const actCount: Partial<Record<ActivityType, number>> = {};
    for (const e of thisMonth) {
      actCount[e.activityType] = (actCount[e.activityType] ?? 0) + 1;
    }
    const mostCommon = (Object.entries(actCount) as [ActivityType, number][])
      .sort((a, b) => b[1] - a[1])[0]?.[0] as ActivityType | undefined;
    return { totalWorkouts, totalMins, mostCommon };
  }, [allEntries]);

  // Filtered + sorted by date desc
  const displayed = useMemo(() => {
    const base = filter === 'all' ? allEntries : allEntries.filter(e => e.activityType === filter);
    return [...base].sort((a, b) => b.date.localeCompare(a.date));
  }, [allEntries, filter]);

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="page-content">
      {/* Header strip */}
      <div style={{
        background: `linear-gradient(135deg, ${C.primary} 0%, ${C.dark} 100%)`,
        borderRadius: 'var(--radius-xl)',
        padding: '1.5rem',
        marginBottom: '1.5rem',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.35rem', color: 'white' }}>🏃 Training & Fitness</h2>
          <p style={{ margin: '0.25rem 0 0', color: 'rgba(255,255,255,0.85)', fontSize: '0.875rem' }}>
            {stats.totalWorkouts} workout{stats.totalWorkouts !== 1 ? 's' : ''} &middot;{' '}
            {stats.totalMins >= 60
              ? `${Math.floor(stats.totalMins / 60)}h ${stats.totalMins % 60}m`
              : `${stats.totalMins}m`} this month
          </p>
        </div>
        <button
          className="btn"
          onClick={openAdd}
          style={{ background: 'white', color: C.dark, fontWeight: 600 }}
        >
          + Log Workout
        </button>
      </div>

      {/* Stats row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: '0.75rem',
        marginBottom: '1.25rem',
      }}>
        <div className="card" style={{ padding: '1rem' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>This month</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: C.dark }}>{stats.totalWorkouts}</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>workouts</div>
        </div>
        <div className="card" style={{ padding: '1rem' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>Active time</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: C.dark }}>
            {stats.totalMins >= 60 ? `${Math.floor(stats.totalMins / 60)}h` : `${stats.totalMins}m`}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
            {stats.totalMins >= 60 && stats.totalMins % 60 > 0 ? `${stats.totalMins % 60}m extra` : 'total'}
          </div>
        </div>
        <div className="card" style={{ padding: '1rem' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>Top activity</div>
          <div style={{ fontSize: '1.5rem' }}>
            {stats.mostCommon ? activityMeta(stats.mostCommon).icon : '—'}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
            {stats.mostCommon ? activityMeta(stats.mostCommon).label : 'none yet'}
          </div>
        </div>
      </div>

      {/* Activity filter chips */}
      <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        <button
          className={`btn btn-sm ${filter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
          style={filter === 'all' ? { background: C.primary } : {}}
          onClick={() => setFilter('all')}
        >
          All
        </button>
        {ACTIVITY_OPTIONS.map(a => (
          <button
            key={a.value}
            className={`btn btn-sm ${filter === a.value ? 'btn-primary' : 'btn-secondary'}`}
            style={filter === a.value ? { background: C.primary } : {}}
            onClick={() => setFilter(a.value)}
          >
            {a.icon} {a.label}
          </button>
        ))}
      </div>

      {/* Entry list */}
      {isLoading ? (
        <div className="loading-container">
          <div className="spinner" />
          <span>Loading workouts…</span>
        </div>
      ) : displayed.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            {filter === 'all' ? '🏃' : activityMeta(filter as ActivityType).icon}
          </div>
          <p style={{ fontWeight: 600 }}>
            {filter === 'all'
              ? 'No workouts logged yet'
              : `No ${activityMeta(filter as ActivityType).label.toLowerCase()} sessions yet`}
          </p>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
            Track your first workout to get started.
          </p>
          <button className="btn btn-primary btn-sm" onClick={openAdd} style={{ background: C.primary }}>
            Log your first workout
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {displayed.map(entry => {
            const meta = activityMeta(entry.activityType);
            const showDistPace = entry.activityType === 'running' || entry.activityType === 'walking';
            return (
              <div
                key={entry._id}
                style={{
                  display: 'flex',
                  alignItems: 'stretch',
                  background: 'var(--color-bg-card)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: 'var(--shadow-sm)',
                  overflow: 'hidden',
                  transition: 'box-shadow 0.2s, border-color 0.2s',
                }}
              >
                {/* Left color bar */}
                <div style={{ width: 4, background: C.primary, flexShrink: 0 }} />

                <div style={{ flex: 1, padding: '0.875rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                  {/* Top row */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <div style={{
                        width: '2.5rem', height: '2.5rem',
                        borderRadius: 'var(--radius-md)',
                        background: C.soft,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.25rem', flexShrink: 0,
                      }}>
                        {meta.icon}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{meta.label}</span>
                          {entry.workoutType && (
                            <span style={{
                              fontSize: '0.78rem', padding: '0.15rem 0.5rem',
                              borderRadius: '999px', background: C.soft, color: C.text,
                              border: `1px solid ${C.primary}40`, fontWeight: 500,
                            }}>
                              {entry.workoutType}
                            </span>
                          )}
                          <button
                            className={`status-badge ${entry.status}`}
                            onClick={() => entry._id && toggleStatusMutation.mutate({
                              id: entry._id,
                              status: entry.status === 'plan' ? 'done' : 'plan',
                            })}
                            style={{ cursor: 'pointer', border: 'none', fontFamily: 'inherit' }}
                          >
                            {entry.status === 'plan' ? '📋 Plan' : '✓ Done'}
                          </button>
                        </div>
                        <div style={{
                          fontSize: '0.78rem', color: 'var(--color-text-muted)',
                          display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.25rem',
                        }}>
                          <span>📅 {formatDateShort(entry.date)}</span>
                          {entry.duration != null && (
                            <span>⏱ {formatDuration(entry.duration)}</span>
                          )}
                          {showDistPace && entry.distance != null && (
                            <span>📏 {entry.distance} km</span>
                          )}
                          {showDistPace && entry.pace && (
                            <span>💨 {entry.pace}/km</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
                      <button className="btn btn-ghost btn-sm btn-icon" onClick={() => openEdit(entry)} title="Edit">✏️</button>
                      <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setDeleteTarget(entry)} title="Delete">🗑️</button>
                    </div>
                  </div>
                  {entry.notes && (
                    <p style={{ fontSize: '0.825rem', color: 'var(--color-text-secondary)', marginBottom: 0, marginLeft: '3rem' }}>
                      {entry.notes}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editingEntry ? 'Edit Workout' : 'Log Workout'}
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
              {isSaving ? 'Saving…' : editingEntry ? 'Save Changes' : 'Log Workout'}
            </button>
          </>
        }
      >
        <WorkoutForm form={form} onChange={setForm} errors={formErrors} />
      </Modal>

      {/* Confirm Delete */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => { if (deleteTarget?._id) deleteMutation.mutate(deleteTarget._id); }}
        title="Delete Workout"
        message={`Delete this ${deleteTarget ? activityMeta(deleteTarget.activityType).label.toLowerCase() : 'workout'} session? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}
