import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: C.text }}>🌸 Period Tracker</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginBottom: 0 }}>
            Track your menstrual cycle and predict upcoming periods
          </p>
        </div>
        <button className="btn btn-primary" style={{ background: C.primary }} onClick={() => { setForm({ ...EMPTY_FORM }); setAddOpen(true); }}>
          + Log Period
        </button>
      </div>

      {/* Phase + Predictions cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.875rem', marginBottom: '1.5rem' }}>
        {/* Current Phase */}
        <div className="card" style={{ padding: '1.125rem 1.25rem' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginBottom: '0.375rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Current Phase</div>
          {phaseLabel ? (
            <>
              <div style={{ fontWeight: 700, fontSize: '1.05rem', color: phaseColor }}>{phaseLabel}</div>
              {phaseDays !== null && phaseDays >= 0 && (
                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                  {phaseLabel.includes('Menstruation') ? `${phaseDays}d remaining` : `${phaseDays}d until next phase`}
                </div>
              )}
            </>
          ) : (
            <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Log a period to see phase</div>
          )}
        </div>

        {/* Average Cycle */}
        <div className="card" style={{ padding: '1.125rem 1.25rem' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginBottom: '0.375rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Avg Cycle</div>
          <div style={{ fontWeight: 700, fontSize: '1.35rem', color: C.primary }}>{avgCycle}<span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--color-text-muted)' }}> days</span></div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.125rem' }}>{avgBleeding}d bleeding avg</div>
        </div>

        {/* Next Period */}
        {nextPrediction && (
          <div className="card" style={{ padding: '1.125rem 1.25rem', borderColor: C.primary + '40', background: C.soft }}>
            <div style={{ fontSize: '0.72rem', color: C.text, marginBottom: '0.375rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Next Period</div>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: C.primary }}>{formatDate(nextPrediction.startDate)}</div>
            <div style={{ fontSize: '0.75rem', color: C.text, marginTop: '0.125rem' }}>
              {daysUntil(nextPrediction.startDate) > 0 ? `In ${daysUntil(nextPrediction.startDate)} days` : daysUntil(nextPrediction.startDate) === 0 ? 'Today!' : 'Overdue'}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>ends ~{formatDate(nextPrediction.endDate)}</div>
          </div>
        )}

        {/* Cycle count */}
        <div className="card" style={{ padding: '1.125rem 1.25rem' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginBottom: '0.375rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Logged Cycles</div>
          <div style={{ fontWeight: 700, fontSize: '1.35rem', color: C.primary }}>{entries.length}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.125rem' }}>periods tracked</div>
        </div>
      </div>

      {/* Future predictions */}
      {predictions && predictions.predictions.length > 1 && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-header"><h3 style={{ margin: 0, fontSize: '0.95rem', color: C.text }}>🔮 Upcoming Predictions</h3></div>
          <div className="card-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {predictions.predictions.map((p, i) => {
                const du = daysUntil(p.startDate);
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', background: i === 0 ? C.soft : 'var(--color-surface)', border: `1px solid ${i === 0 ? C.primary + '40' : 'var(--color-border)'}` }}>
                    <div style={{ width: '2rem', height: '2rem', borderRadius: '50%', background: C.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '0.8rem', flexShrink: 0 }}>
                      {p.cycleNumber}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{formatDate(p.startDate)} → {formatDate(p.endDate)}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>~{daysBetween(p.startDate, p.endDate) + 1} days</div>
                    </div>
                    <span style={{ fontSize: '0.78rem', fontWeight: 600, padding: '0.2rem 0.6rem', borderRadius: '999px', background: du <= 7 ? C.primary : 'var(--color-border)', color: du <= 7 ? 'white' : 'var(--color-text-muted)' }}>
                      {du < 0 ? 'Past due' : du === 0 ? 'Today' : `In ${du}d`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

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
