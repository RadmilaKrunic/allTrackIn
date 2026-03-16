import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi, habitsApi } from '../api/client';
import { useApp } from '../contexts/AppContext';
import { useTheme } from '../contexts/ThemeContext';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { PeriodSettingsSection } from '../modules/period/PeriodPage';
import { MODULE_COLORS } from '../themes/themes';
import type { Category, Quote, ModuleKey, HabitDefinition } from '../types';

const ALL_MODULES: ModuleKey[] = ['events', 'todo', 'work', 'eating', 'training', 'spending', 'period', 'books', 'habits'];
const MODULES = ['events', 'work', 'eating', 'training', 'spending'];
const MODULE_ICONS: Record<string, string> = {
  events: '🗓', todo: '✅', work: '💼', eating: '🥗', training: '🏃', spending: '💰', period: '🌸', books: '📚', habits: '🎯',
};

// ─── Categories Section ──────────────────────────────────────────────────────
function CategoriesSection() {
  const { notify } = useApp();
  const qc = useQueryClient();
  const [activeModule, setActiveModule] = useState(MODULES[0]);
  const [showAdd, setShowAdd] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [form, setForm] = useState({ name: '', color: '#C77DB5', icon: '' });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['settings', 'categories', activeModule],
    queryFn: () => settingsApi.getCategories(activeModule),
  });

  const createMut = useMutation({
    mutationFn: (data: Partial<Category>) => settingsApi.createCategory({ ...data, module: activeModule }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings', 'categories'] });
      notify('Category added');
      setShowAdd(false);
      setForm({ name: '', color: '#C77DB5', icon: '' });
    },
    onError: (err: Error) => notify(err.message, 'error'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => settingsApi.deleteCategory(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings', 'categories'] });
      notify('Category deleted');
    },
    onError: (err: Error) => notify(err.message, 'error'),
  });

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="modal-title">🏷️ Categories</h3>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>+ Add</button>
      </div>
      <div className="card-body">
        <div className="filter-tabs">
          {MODULES.map(mod => (
            <button
              key={mod}
              onClick={() => setActiveModule(mod)}
              className={`btn btn-sm ${activeModule === mod ? 'btn-primary' : 'btn-secondary'}`}
            >
              {MODULE_ICONS[mod]} {mod.charAt(0).toUpperCase() + mod.slice(1)}
            </button>
          ))}
        </div>

        {categories.length === 0 ? (
          <div className="empty-state" style={{ padding: '1.5rem' }}>
            <span style={{ fontSize: '1.75rem' }}>🏷️</span>
            <p className="text-sm">No categories yet for {activeModule}</p>
          </div>
        ) : (
          <div className="category-list">
            {categories.map((cat: Category) => (
              <div key={cat._id} className="category-badge" style={{ background: cat.color + '20', borderColor: (cat.color ?? '#ccc') + '40' }}>
                {cat.icon && <span>{cat.icon}</span>}
                <span className="category-badge-name">{cat.name}</span>
                <button
                  className="btn btn-icon btn-ghost category-badge-del"
                  onClick={() => setDeleteTarget(cat)}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal
        isOpen={showAdd}
        onClose={() => setShowAdd(false)}
        title={`Add category to ${activeModule}`}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={() => createMut.mutate(form)} disabled={!form.name}>
              Add Category
            </button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">Name *</label>
          <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Food, Transport..." />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Color</label>
            <div className="color-input-row">
              <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} className="color-input-swatch" />
              <input className="form-input" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Icon (emoji)</label>
            <input className="form-input" value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} placeholder="🏷️" />
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget?._id && deleteMut.mutate(deleteTarget._id)}
        title="Delete Category"
        message={`Delete "${deleteTarget?.name}"? This won't affect existing entries.`}
      />
    </div>
  );
}

// ─── Quotes Section ──────────────────────────────────────────────────────────
function QuotesSection() {
  const { notify } = useApp();
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Quote | null>(null);
  const [form, setForm] = useState({ text: '', author: '' });

  const { data: quotes = [] } = useQuery<Quote[]>({
    queryKey: ['settings', 'quotes'],
    queryFn: settingsApi.getQuotes,
  });

  const createMut = useMutation({
    mutationFn: (data: Partial<Quote>) => settingsApi.createQuote(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings', 'quotes'] });
      notify('Quote added ✨');
      setShowAdd(false);
      setForm({ text: '', author: '' });
    },
    onError: (err: Error) => notify(err.message, 'error'),
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => settingsApi.updateQuote(id, { active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings', 'quotes'] }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => settingsApi.deleteQuote(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings', 'quotes'] });
      notify('Quote deleted');
    },
    onError: (err: Error) => notify(err.message, 'error'),
  });

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="modal-title">✨ Affirmations & Quotes</h3>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>+ Add</button>
      </div>
      <div className="card-body">
        <p className="section-desc">These quotes appear daily on your dashboard.</p>

        {quotes.length === 0 ? (
          <div className="empty-state" style={{ padding: '1.5rem' }}>
            <span style={{ fontSize: '1.75rem' }}>✨</span>
            <p className="text-sm">Add your first affirmation</p>
          </div>
        ) : (
          <div className="quote-list">
            {quotes.map((quote: Quote) => (
              <div key={quote._id} className="quote-item" style={{ background: quote.active !== false ? 'var(--color-surface)' : 'var(--color-bg-secondary)', opacity: quote.active !== false ? 1 : 0.5 }}>
                <span className="quote-item-icon">✨</span>
                <div className="quote-item-content">
                  <p className="quote-text-block">"{quote.text}"</p>
                  {quote.author && <p className="quote-author-text">— {quote.author}</p>}
                </div>
                <div className="quote-actions">
                  <button
                    className="btn btn-icon btn-ghost"
                    title={quote.active !== false ? 'Disable' : 'Enable'}
                    onClick={() => quote._id && toggleMut.mutate({ id: quote._id, active: !(quote.active !== false) })}
                    style={{ fontSize: '0.9rem' }}
                  >
                    {quote.active !== false ? '👁' : '🚫'}
                  </button>
                  <button
                    className="btn btn-icon btn-ghost btn-delete"
                    onClick={() => setDeleteTarget(quote)}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal
        isOpen={showAdd}
        onClose={() => setShowAdd(false)}
        title="Add Affirmation / Quote"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={() => createMut.mutate(form)} disabled={!form.text}>
              Add Quote
            </button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">Quote / Affirmation *</label>
          <textarea
            className="form-textarea"
            value={form.text}
            onChange={e => setForm(f => ({ ...f, text: e.target.value }))}
            placeholder="I am strong, capable, and worthy of all good things..."
            rows={3}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Author (optional)</label>
          <input className="form-input" value={form.author} onChange={e => setForm(f => ({ ...f, author: e.target.value }))} placeholder="Unknown" />
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget?._id && deleteMut.mutate(deleteTarget._id)}
        title="Delete Quote"
        message="Remove this quote from your dashboard rotation?"
      />
    </div>
  );
}

// ─── Theme Section ───────────────────────────────────────────────────────────
function ThemeSection() {
  const { currentTheme, setCurrentTheme, themes } = useTheme();

  const THEME_PREVIEWS: Record<string, { bg: string; accent: string; emoji: string }> = {
    pastel:  { bg: '#FDF8FC', accent: '#C77DB5', emoji: '🌸' },
    spring:  { bg: '#F2FAF5', accent: '#2A8C57', emoji: '🌿' },
    summer:  { bg: '#FFFBF0', accent: '#F0B429', emoji: '☀️' },
    autumn:  { bg: '#FDF6F0', accent: '#C0622A', emoji: '🍂' },
    winter:  { bg: '#F0F4F8', accent: '#3A80B8', emoji: '❄️' },
    nature:  { bg: '#F5F2EC', accent: '#6B7A50', emoji: '🌲' },
    luxury:  { bg: '#0E0A12', accent: '#C8A44A', emoji: '✨' },
  };

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="modal-title">🎨 Appearance</h3>
      </div>
      <div className="card-body">
        <p className="section-desc">Choose your style mood:</p>
        <div className="theme-grid">
          {Object.entries(themes).map(([key, theme]) => {
            const preview = THEME_PREVIEWS[key];
            const isActive = currentTheme === key;
            return (
              <button
                key={key}
                onClick={() => setCurrentTheme(key)}
                className="theme-btn"
                style={{
                  borderColor: isActive ? (preview?.accent ?? 'var(--color-primary)') : 'var(--color-border)',
                  background: preview?.bg ?? '#fff',
                  boxShadow: isActive ? `0 0 0 3px ${preview?.accent ?? 'var(--color-primary)'}30` : 'none',
                }}
              >
                <span className="theme-emoji">{preview?.emoji ?? '🎨'}</span>
                <div className="theme-accent-bar" style={{ background: preview?.accent ?? '#ccc' }} />
                <span className="theme-name" style={{ fontWeight: isActive ? 700 : 400, color: preview?.accent ?? '#333' }}>
                  {theme.name}
                </span>
                {isActive && <span className="theme-active-badge" style={{ color: preview?.accent ?? '#333' }}>✓ Active</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Module Toggles Section ───────────────────────────────────────────────────
function ModuleTogglesSection() {
  const { notify } = useApp();
  const qc = useQueryClient();

  const { data: prefs } = useQuery({
    queryKey: ['settings', 'preferences'],
    queryFn: settingsApi.getPreferences,
  });

  const updateMut = useMutation({
    mutationFn: settingsApi.updatePreferences,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['settings', 'preferences'] }); notify('Module visibility saved', 'success'); },
    onError: (err: Error) => notify(err.message, 'error'),
  });

  const MODULE_LABELS: Record<string, string> = {
    events: 'Events & Notes', todo: 'To-Do Lists', work: 'Work', eating: 'Eating',
    training: 'Training', spending: 'Spending', period: 'Period Tracker', books: 'Reading', habits: 'Habit Tracker',
  };

  const enabled: ModuleKey[] = prefs?.enabledModules ?? ALL_MODULES;

  function toggle(mod: ModuleKey) {
    const next = enabled.includes(mod)
      ? enabled.filter(m => m !== mod)
      : [...enabled, mod];
    updateMut.mutate({ enabledModules: next });
  }

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="modal-title">🔲 Modules</h3>
      </div>
      <div className="card-body">
        <p className="section-desc">
          Choose which modules appear in the navigation. Disabled modules are hidden but data is preserved.
        </p>
        <div className="module-list">
          {ALL_MODULES.map(mod => {
            const isOn = enabled.includes(mod);
            const color = MODULE_COLORS[mod]?.primary ?? 'var(--color-primary)';
            return (
              <div key={mod} className="module-item" style={{ background: isOn ? MODULE_COLORS[mod]?.soft ?? 'var(--color-surface)' : 'var(--color-bg-secondary)', borderColor: isOn ? color + '40' : 'var(--color-border)', opacity: isOn ? 1 : 0.6 }}>
                <div className="module-item-label">
                  <span className="module-item-icon">{MODULE_ICONS[mod]}</span>
                  <span className="module-item-name" style={{ color: isOn ? color : 'var(--color-text-muted)' }}>{MODULE_LABELS[mod]}</span>
                </div>
                <button
                  onClick={() => toggle(mod)}
                  className="toggle-switch"
                  style={{ background: isOn ? color : 'var(--color-border)' }}
                >
                  <span className="toggle-knob" style={{ left: isOn ? '23px' : '3px' }} />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Habits Section ───────────────────────────────────────────────────────────
const HABIT_COLORS = ['#0EA5E9', '#6366F1', '#22C55E', '#F97316', '#EF4444', '#A855F7', '#EC4899', '#F59E0B'];

type HabitFormValue = { name: string; icon: string; color: string };

function HabitForm({ value, onChange }: { value: HabitFormValue; onChange: (v: HabitFormValue) => void }) {
  return (
    <>
      <div className="form-group">
        <label className="form-label">Habit name *</label>
        <input className="form-input" value={value.name} onChange={e => onChange({ ...value, name: e.target.value })} placeholder="e.g. Drink water, Exercise, Meditate..." />
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Icon (emoji)</label>
          <input className="form-input" value={value.icon} onChange={e => onChange({ ...value, icon: e.target.value })} placeholder="💧" />
        </div>
        <div className="form-group">
          <label className="form-label">Color</label>
          <div className="habit-color-picker">
            {HABIT_COLORS.map(c => (
              <button
                key={c}
                onClick={() => onChange({ ...value, color: c })}
                className={`habit-color-btn${value.color === c ? ' selected' : ''}`}
                style={{ background: c }}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function HabitsSection() {
  const { notify } = useApp();
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [editTarget, setEditTarget] = useState<HabitDefinition | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<HabitDefinition | null>(null);
  const [form, setForm] = useState({ name: '', icon: '', color: HABIT_COLORS[0] });

  const { data: habits = [] } = useQuery<HabitDefinition[]>({
    queryKey: ['habits'],
    queryFn: () => habitsApi.getAll(),
  });

  const createMut = useMutation({
    mutationFn: (data: Partial<HabitDefinition>) => habitsApi.create({ active: true, ...data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['habits'] });
      notify('Habit added');
      setShowAdd(false);
      setForm({ name: '', icon: '', color: HABIT_COLORS[0] });
    },
    onError: (err: Error) => notify(err.message, 'error'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<HabitDefinition> }) => habitsApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['habits'] });
      notify('Habit updated');
      setEditTarget(null);
    },
    onError: (err: Error) => notify(err.message, 'error'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => habitsApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['habits'] });
      notify('Habit deleted');
    },
    onError: (err: Error) => notify(err.message, 'error'),
  });

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="modal-title">🎯 Habit Tracker</h3>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>+ Add Habit</button>
      </div>
      <div className="card-body">
        <p className="section-desc">Define habits to track daily. Each habit shows a streak of consecutive days completed.</p>

        {habits.length === 0 ? (
          <div className="empty-state" style={{ padding: '1.5rem' }}>
            <span style={{ fontSize: '1.75rem' }}>🎯</span>
            <p className="text-sm">No habits defined yet</p>
          </div>
        ) : (
          <div className="habits-list">
            {habits.map(habit => {
              const color = habit.color ?? HABIT_COLORS[0];
              const isOn = habit.active !== false;
              return (
                <div key={habit._id} className="settings-habit-item" style={{ background: isOn ? color + '15' : 'var(--color-bg-secondary)', borderColor: isOn ? color + '40' : 'var(--color-border)', opacity: isOn ? 1 : 0.6 }}>
                  {habit.icon && <span className="settings-habit-icon">{habit.icon}</span>}
                  <span className="settings-habit-name" style={{ color: isOn ? color : 'var(--color-text-muted)' }}>
                    {habit.name}
                  </span>
                  <div className="settings-habit-actions">
                    <button
                      className="btn btn-icon btn-ghost"
                      style={{ fontSize: '0.85rem' }}
                      onClick={() => {
                        setEditTarget(habit);
                        setForm({ name: habit.name, icon: habit.icon ?? '', color: habit.color ?? HABIT_COLORS[0] });
                      }}
                    >
                      ✏️
                    </button>
                    <button
                      className="btn btn-icon btn-ghost"
                      style={{ fontSize: '0.85rem' }}
                      onClick={() => habit._id && updateMut.mutate({ id: habit._id, data: { active: !isOn } })}
                      title={isOn ? 'Disable' : 'Enable'}
                    >
                      {isOn ? '👁' : '🚫'}
                    </button>
                    <button
                      className="btn btn-icon btn-ghost btn-delete"
                      onClick={() => setDeleteTarget(habit)}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Modal
        isOpen={showAdd}
        onClose={() => setShowAdd(false)}
        title="Add Habit"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={() => createMut.mutate(form)} disabled={!form.name}>
              Add Habit
            </button>
          </>
        }
      >
        <HabitForm value={form} onChange={setForm} />
      </Modal>

      <Modal
        isOpen={!!editTarget}
        onClose={() => setEditTarget(null)}
        title="Edit Habit"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setEditTarget(null)}>Cancel</button>
            <button
              className="btn btn-primary"
              disabled={!form.name}
              onClick={() => editTarget?._id && updateMut.mutate({ id: editTarget._id, data: form })}
            >
              Save
            </button>
          </>
        }
      >
        <HabitForm value={form} onChange={setForm} />
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget?._id && deleteMut.mutate(deleteTarget._id)}
        title="Delete Habit"
        message={`Delete "${deleteTarget?.name}"? This will also remove all log data for this habit.`}
      />
    </div>
  );
}

// ─── Settings Page ────────────────────────────────────────────────────────────
export default function Settings() {
  return (
    <div className="settings-page">
      <div>
        <h2 className="settings-title">⚙️ Settings</h2>
        <p className="settings-desc">Manage categories, themes, and app preferences.</p>
      </div>
      <ThemeSection />
      <ModuleTogglesSection />
      <PeriodSettingsSection />
      <HabitsSection />
      <QuotesSection />
      <CategoriesSection />
    </div>
  );
}
