import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isToday as fnsIsToday } from 'date-fns';
import { periodApi } from '../../api/client';
import { useApp } from '../../contexts/AppContext';
import { MODULE_COLORS } from '../../themes/themes';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import type { PeriodEntry, PeriodSettings, PeriodPredictions } from '../../types';

const C = MODULE_COLORS.period;

const SYMPTOMS = ['Cramps', 'Headache', 'Bloating', 'Back pain', 'Mood swings', 'Fatigue', 'Nausea', 'Tender breasts'];
const MOODS = ['😊 Happy', '😢 Sad', '😤 Irritable', '😴 Tired', '😌 Calm', '😰 Anxious', '🥰 Loving', '😐 Neutral'];

function todayStr() { return new Date().toISOString().slice(0, 10); }

function formatDate(d: string) {
  if (!d) return '';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b + 'T00:00:00').getTime() - new Date(a + 'T00:00:00').getTime()) / 86400000);
}

function daysUntil(d: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.round((new Date(d + 'T00:00:00').getTime() - today.getTime()) / 86400000);
}

interface EntryForm {
  startDate: string;
  endDate: string;
  bleedingDays: string;
  symptoms: string[];
  mood: string;
  notes: string;
}

const EMPTY_FORM: EntryForm = {
  startDate: todayStr(), endDate: '', bleedingDays: '', symptoms: [], mood: '', notes: '',
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PeriodPage() {
  const { notify } = useApp();
  const qc = useQueryClient();

  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<PeriodEntry | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PeriodEntry | null>(null);
  const [statsMonth, setStatsMonth] = useState(new Date());
  const [form, setForm] = useState<EntryForm>({ ...EMPTY_FORM });

  const { data: entries = [], isLoading } = useQuery<PeriodEntry[]>({
    queryKey: ['period'],
    queryFn: () => periodApi.getAll(),
  });

  const { data: predictions } = useQuery<PeriodPredictions>({
    queryKey: ['period', 'predictions'],
    queryFn: () => periodApi.getPredictions(),
  });

  const createMut = useMutation({
    mutationFn: (data: Partial<PeriodEntry>) => periodApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['period'] }); notify('Period logged', 'success'); setAddOpen(false); setForm({ ...EMPTY_FORM }); },
    onError: (err: Error) => notify(err.message, 'error'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<PeriodEntry> }) => periodApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['period'] }); notify('Entry updated', 'success'); setEditing(null); },
    onError: (err: Error) => notify(err.message, 'error'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => periodApi.remove(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['period'] }); notify('Entry deleted', 'success'); },
    onError: (err: Error) => notify(err.message, 'error'),
  });

  function formToPayload(f: EntryForm): Partial<PeriodEntry> {
    return {
      startDate: f.startDate,
      ...(f.endDate && { endDate: f.endDate }),
      ...(f.bleedingDays && { bleedingDays: Number(f.bleedingDays) }),
      ...(f.symptoms.length && { symptoms: f.symptoms }),
      ...(f.mood && { mood: f.mood }),
      ...(f.notes.trim() && { notes: f.notes.trim() }),
    };
  }

  function handleSave() {
    if (!form.startDate) { notify('Start date is required', 'error'); return; }
    createMut.mutate(formToPayload(form));
  }

  function handleUpdate() {
    if (!editing?._id) return;
    updateMut.mutate({ id: editing._id, data: formToPayload(form) });
  }

  function openEdit(entry: PeriodEntry) {
    setEditing(entry);
    setForm({
      startDate: entry.startDate, endDate: entry.endDate ?? '',
      bleedingDays: entry.bleedingDays ? String(entry.bleedingDays) : '',
      symptoms: entry.symptoms ?? [], mood: entry.mood ?? '', notes: entry.notes ?? '',
    });
  }

  const sorted = useMemo(() => [...entries].sort((a, b) => b.startDate.localeCompare(a.startDate)), [entries]);

  // Compute average cycle from history
  const avgCycle = predictions?.averageCycleLength ?? 28;
  const avgBleeding = predictions?.averageBleedingDays ?? 5;
  const lastStart = predictions?.lastPeriodStart;
  const nextPrediction = predictions?.predictions?.[0];

  // Phase info: are we in period, in follicular, near ovulation, in luteal?
  const today = todayStr();
  let phaseLabel = '';
  let phaseColor = C.primary;
  let phaseDays: number | null = null;

  if (lastStart) {
    const dayOfCycle = daysBetween(lastStart, today) + 1;
    if (dayOfCycle <= avgBleeding) {
      phaseLabel = 'Menstruation';
      phaseColor = C.primary;
      phaseDays = avgBleeding - dayOfCycle + 1;
    } else if (dayOfCycle <= Math.round(avgCycle * 0.45)) {
      phaseLabel = 'Follicular Phase';
      phaseColor = '#F59E0B';
      phaseDays = Math.round(avgCycle * 0.45) - dayOfCycle + 1;
    } else if (dayOfCycle <= Math.round(avgCycle * 0.55)) {
      phaseLabel = 'Ovulation';
      phaseColor = '#10B981';
      phaseDays = Math.round(avgCycle * 0.55) - dayOfCycle + 1;
    } else if (dayOfCycle <= avgCycle) {
      phaseLabel = 'Luteal Phase';
      phaseColor = '#8B5CF6';
      phaseDays = nextPrediction ? daysUntil(nextPrediction.startDate) : null;
    }
  }

  return (
    <div className="page-content">
      {/* Header */}
      <div style={{
        background: C.primary + '1A',
        border: `1px solid ${C.primary}30`,
        borderRadius: 'var(--radius-xl)', padding: '1.5rem', marginBottom: '1.5rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '2.5rem' }}>🌸</span>
          <div>
            <h1 style={{ margin: 0, color: C.primary, fontSize: 'clamp(1.25rem, 3vw, 1.75rem)' }}>Period Tracker</h1>
            <p style={{ margin: '0.25rem 0 0', color: C.text, fontSize: '0.875rem' }}>
              Track your menstrual cycle and predict upcoming periods
            </p>
          </div>
        </div>
        <button className="btn btn-primary" style={{ background: C.primary, color: 'white', fontWeight: 600 }} onClick={() => { setForm({ ...EMPTY_FORM }); setAddOpen(true); }}>
          + Log Period
        </button>
      </div>

      {/* Stats + Calendar row */}
      <div className="grid-2" style={{ marginBottom: '1.25rem' }}>
        {/* Stats card */}
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
            {/* Phase chip */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.875rem' }}>
              {phaseLabel ? (
                <div style={{ padding: '0.35rem 0.65rem', borderRadius: 'var(--radius-sm)', background: phaseColor + '20', border: `1px solid ${phaseColor}40` }}>
                  <span style={{ fontWeight: 700, fontSize: '0.9rem', color: phaseColor }}>{phaseLabel}</span>
                  {phaseDays !== null && phaseDays >= 0 && (
                    <span style={{ fontSize: '0.72rem', color: phaseColor, marginLeft: '0.3rem', opacity: 0.8 }}>
                      {phaseLabel.includes('Menstruation') ? `${phaseDays}d left` : `${phaseDays}d`}
                    </span>
                  )}
                </div>
              ) : (
                <div style={{ padding: '0.35rem 0.65rem', borderRadius: 'var(--radius-sm)', background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                  <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>Log a period to see phase</span>
                </div>
              )}
              <div style={{ padding: '0.35rem 0.65rem', borderRadius: 'var(--radius-sm)', background: C.soft, border: `1px solid ${C.primary}30` }}>
                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: C.primary }}>{entries.length}</span>
                <span style={{ fontSize: '0.72rem', color: C.text, marginLeft: '0.3rem' }}>cycles</span>
              </div>
            </div>

            {/* Cycle stats bars */}
            {[
              { label: 'Avg cycle', value: avgCycle, max: 40, unit: 'd', color: C.primary },
              { label: 'Avg bleeding', value: avgBleeding, max: 10, unit: 'd', color: '#F472B6' },
            ].map(({ label, value, max, unit, color }) => (
              <div key={label} style={{ marginBottom: '0.625rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>{label}</span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color }}>{value}{unit}</span>
                </div>
                <div style={{ height: '6px', background: 'var(--color-border)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(100, (value / max) * 100)}%`, height: '100%', background: color, borderRadius: '3px', transition: 'width 0.4s' }} />
                </div>
              </div>
            ))}

            {/* Next period */}
            {nextPrediction && (
              <div style={{ marginTop: '0.75rem', padding: '0.75rem', borderRadius: 'var(--radius-md)', background: C.soft, border: `1px solid ${C.primary}40` }}>
                <div style={{ fontSize: '0.72rem', color: C.text, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.25rem' }}>Next Period</div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: C.primary }}>{formatDate(nextPrediction.startDate)}</div>
                <div style={{ fontSize: '0.75rem', color: C.text, marginTop: '0.1rem' }}>
                  {daysUntil(nextPrediction.startDate) > 0 ? `In ${daysUntil(nextPrediction.startDate)} days` : daysUntil(nextPrediction.startDate) === 0 ? 'Today!' : 'Overdue'}
                  {' · '}ends ~{formatDate(nextPrediction.endDate)}
                </div>
              </div>
            )}

            {/* Upcoming predictions list */}
            {predictions && predictions.predictions.length > 1 && (
              <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                {predictions.predictions.slice(1, 4).map((p, i) => {
                  const du = daysUntil(p.startDate);
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.4rem 0.6rem', borderRadius: 'var(--radius-sm)', background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                      <span style={{ fontSize: '0.78rem' }}>{formatDate(p.startDate)}</span>
                      <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>{du < 0 ? 'Past' : `In ${du}d`}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {entries.length === 0 && (
              <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', textAlign: 'center', padding: '0.5rem 0' }}>No cycles logged yet</p>
            )}
          </div>
        </div>

        {/* Calendar card */}
        <PeriodCalendar entries={entries} month={statsMonth} onPrevMonth={() => setStatsMonth(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))} onNextMonth={() => setStatsMonth(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))} onToday={() => setStatsMonth(new Date())} />
      </div>

      {/* History */}
      <div className="card">
        <div className="card-header">
          <h3 style={{ margin: 0, fontSize: '0.95rem' }}>📋 History</h3>
        </div>
        <div className="card-body">
          {isLoading ? (
            <div className="loading-container"><div className="spinner" /></div>
          ) : sorted.length === 0 ? (
            <div className="empty-state" style={{ padding: '1.5rem' }}>
              <div className="empty-state-icon">🌸</div>
              <p>No periods logged yet</p>
              <button className="btn btn-primary" style={{ background: C.primary }} onClick={() => { setForm({ ...EMPTY_FORM }); setAddOpen(true); }}>Log your first period</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {sorted.map((entry, idx) => {
                const nextEntry = sorted[idx - 1]; // sorted desc, so prev in time is idx+1
                const prevEntry = sorted[idx + 1];
                const cycleLen = prevEntry ? daysBetween(prevEntry.startDate, entry.startDate) : null;
                const bleedLen = entry.endDate ? daysBetween(entry.startDate, entry.endDate) + 1 : entry.bleedingDays ?? null;
                return (
                  <div key={entry._id} className="list-item">
                    <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '50%', background: C.soft, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}>
                      🌸
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{formatDate(entry.startDate)}{entry.endDate && ` → ${formatDate(entry.endDate)}`}</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginTop: '0.25rem' }}>
                        {bleedLen && (
                          <span className="badge" style={{ background: C.soft, color: C.text, fontSize: '0.7rem' }}>{bleedLen}d bleeding</span>
                        )}
                        {cycleLen && (
                          <span className="badge" style={{ background: 'var(--color-surface)', color: 'var(--color-text-secondary)', fontSize: '0.7rem' }}>cycle: {cycleLen}d</span>
                        )}
                        {entry.mood && <span className="badge" style={{ fontSize: '0.7rem' }}>{entry.mood}</span>}
                        {entry.symptoms?.map(s => <span key={s} className="badge" style={{ fontSize: '0.7rem' }}>{s}</span>)}
                      </div>
                      {entry.notes && <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>{entry.notes}</div>}
                    </div>
                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(entry)}>✏️</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setDeleteTarget(entry)}>🗑️</button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Add Modal */}
      <Modal isOpen={addOpen} onClose={() => setAddOpen(false)} title="Log Period" size="md"
        footer={<>
          <button className="btn btn-secondary" onClick={() => setAddOpen(false)}>Cancel</button>
          <button className="btn btn-primary" style={{ background: C.primary }} onClick={handleSave} disabled={createMut.isPending}>
            {createMut.isPending ? 'Saving…' : 'Log Period'}
          </button>
        </>}
      >
        <PeriodForm form={form} onChange={setForm} />
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={!!editing} onClose={() => setEditing(null)} title="Edit Entry" size="md"
        footer={<>
          <button className="btn btn-secondary" onClick={() => setEditing(null)}>Cancel</button>
          <button className="btn btn-primary" style={{ background: C.primary }} onClick={handleUpdate} disabled={updateMut.isPending}>
            {updateMut.isPending ? 'Saving…' : 'Save Changes'}
          </button>
        </>}
      >
        <PeriodForm form={form} onChange={setForm} />
      </Modal>

      <ConfirmDialog isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget?._id && deleteMut.mutate(deleteTarget._id)}
        title="Delete Entry" message="Delete this period entry?" confirmLabel="Delete" variant="danger" />
    </div>
  );
}

// ─── Period Calendar ──────────────────────────────────────────────────────────

const WEEK_DAYS_SHORT = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function PeriodCalendar({ entries, month, onPrevMonth, onNextMonth, onToday }: {
  entries: PeriodEntry[];
  month: Date;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
}) {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const padStart = getDay(monthStart);

  function isPeriodDay(ds: string): boolean {
    return entries.some(e => {
      if (!e.startDate) return false;
      const end = e.endDate ?? e.startDate;
      return ds >= e.startDate && ds <= end;
    });
  }

  return (
    <div className="card">
      <div className="card-header">
        <h3 style={{ margin: 0, fontSize: '0.95rem' }}>📅 Period Calendar</h3>
      </div>
      <div style={{ padding: '0.75rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '4px' }}>
          {WEEK_DAYS_SHORT.map(d => (
            <div key={d} style={{ textAlign: 'center', fontSize: '0.65rem', color: 'var(--color-text-muted)', padding: '2px 0' }}>{d}</div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
          {Array.from({ length: padStart }).map((_, i) => <div key={`p${i}`} />)}
          {days.map(day => {
            const ds = format(day, 'yyyy-MM-dd');
            const isPeriod = isPeriodDay(ds);
            const isCurrentDay = fnsIsToday(day);
            return (
              <button
                key={ds}
                style={{
                  aspectRatio: '1', display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  borderRadius: '4px',
                  border: isCurrentDay ? `2px solid ${C.primary}` : 'none',
                  background: isPeriod ? C.soft : 'var(--color-surface)',
                  cursor: 'default', fontFamily: 'inherit',
                  fontSize: '0.65rem',
                  color: isCurrentDay ? C.primary : 'var(--color-text)',
                  fontWeight: isCurrentDay ? 700 : 400,
                }}
              >
                {format(day, 'd')}
                {isPeriod && <span style={{ fontSize: '0.6rem' }}>🌸</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Period Settings Panel (embedded on this page) ────────────────────────────

export function PeriodSettingsSection() {
  const { notify } = useApp();
  const qc = useQueryClient();

  const { data: settings } = useQuery<PeriodSettings>({
    queryKey: ['period', 'settings'],
    queryFn: () => periodApi.getSettings(),
  });

  const [form, setForm] = useState<{ cycleLength: string; bleedingDays: string; lastPeriodStart: string }>({
    cycleLength: '', bleedingDays: '', lastPeriodStart: '',
  });
  const [saved, setSaved] = useState(false);

  // Sync form when settings load
  useState(() => {
    if (settings) setForm({
      cycleLength: String(settings.averageCycleLength ?? 28),
      bleedingDays: String(settings.averageBleedingDays ?? 5),
      lastPeriodStart: settings.lastPeriodStart ?? '',
    });
  });

  const updateMut = useMutation({
    mutationFn: (data: Partial<PeriodSettings>) => periodApi.updateSettings(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['period'] }); notify('Period settings saved', 'success'); setSaved(true); setTimeout(() => setSaved(false), 2000); },
    onError: (err: Error) => notify(err.message, 'error'),
  });

  function handleSave() {
    const cl = Number(form.cycleLength);
    const bd = Number(form.bleedingDays);
    if (cl < 15 || cl > 60) { notify('Cycle length should be 15–60 days', 'error'); return; }
    if (bd < 1 || bd > 15) { notify('Bleeding days should be 1–15', 'error'); return; }
    updateMut.mutate({
      averageCycleLength: cl,
      averageBleedingDays: bd,
      ...(form.lastPeriodStart && { lastPeriodStart: form.lastPeriodStart }),
    });
  }

  const C = MODULE_COLORS.period;

  return (
    <div className="card">
      <div className="card-header">
        <h3 style={{ margin: 0, fontSize: '1rem', color: C.text }}>🌸 Period Settings</h3>
      </div>
      <div className="card-body">
        <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
          These defaults are used for cycle predictions. They update automatically as you log more cycles.
        </p>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Average Cycle Length (days)</label>
            <input className="form-input" type="number" min="15" max="60" placeholder="28"
              value={form.cycleLength}
              onChange={e => setForm(f => ({ ...f, cycleLength: e.target.value }))}
            />
            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Typical: 21–35 days</span>
          </div>
          <div className="form-group">
            <label className="form-label">Average Bleeding Days</label>
            <input className="form-input" type="number" min="1" max="15" placeholder="5"
              value={form.bleedingDays}
              onChange={e => setForm(f => ({ ...f, bleedingDays: e.target.value }))}
            />
            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Typical: 3–7 days</span>
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Last Period Start Date</label>
          <input className="form-input" type="date" value={form.lastPeriodStart}
            onChange={e => setForm(f => ({ ...f, lastPeriodStart: e.target.value }))} />
          <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Used as base for predictions if no logged cycles</span>
        </div>
        <button className="btn btn-primary" style={{ background: C.primary }} onClick={handleSave} disabled={updateMut.isPending}>
          {updateMut.isPending ? 'Saving…' : saved ? '✓ Saved!' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}

// ─── Period Entry Form ────────────────────────────────────────────────────────

function PeriodForm({ form, onChange }: { form: EntryForm; onChange: (f: EntryForm) => void }) {
  function set<K extends keyof EntryForm>(key: K, val: EntryForm[K]) { onChange({ ...form, [key]: val }); }

  function toggleSymptom(s: string) {
    const next = form.symptoms.includes(s) ? form.symptoms.filter(x => x !== s) : [...form.symptoms, s];
    set('symptoms', next);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Start Date *</label>
          <input className="form-input" type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">End Date <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>(optional)</span></label>
          <input className="form-input" type="date" value={form.endDate} min={form.startDate} onChange={e => set('endDate', e.target.value)} />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Bleeding Days <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>(if no end date)</span></label>
        <input className="form-input" type="number" min="1" max="15" placeholder="5" value={form.bleedingDays} onChange={e => set('bleedingDays', e.target.value)} />
      </div>

      <div className="form-group">
        <label className="form-label">Symptoms</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
          {SYMPTOMS.map(s => (
            <button key={s} type="button" onClick={() => toggleSymptom(s)} style={{
              padding: '0.3rem 0.625rem', borderRadius: '999px', fontFamily: 'inherit', fontSize: '0.78rem', cursor: 'pointer',
              border: `1px solid ${form.symptoms.includes(s) ? C.primary : 'var(--color-border)'}`,
              background: form.symptoms.includes(s) ? C.soft : 'var(--color-surface)',
              color: form.symptoms.includes(s) ? C.primary : 'var(--color-text-secondary)',
              fontWeight: form.symptoms.includes(s) ? 600 : 400,
            }}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Mood</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
          {MOODS.map(m => (
            <button key={m} type="button" onClick={() => set('mood', form.mood === m ? '' : m)} style={{
              padding: '0.3rem 0.625rem', borderRadius: '999px', fontFamily: 'inherit', fontSize: '0.78rem', cursor: 'pointer',
              border: `1px solid ${form.mood === m ? C.primary : 'var(--color-border)'}`,
              background: form.mood === m ? C.soft : 'var(--color-surface)',
              color: form.mood === m ? C.primary : 'var(--color-text-secondary)',
              fontWeight: form.mood === m ? 600 : 400,
            }}>
              {m}
            </button>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Notes</label>
        <textarea className="form-textarea" rows={3} placeholder="Any additional notes…" value={form.notes} onChange={e => set('notes', e.target.value)} />
      </div>
    </div>
  );
}
