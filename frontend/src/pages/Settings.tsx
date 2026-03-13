import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '../api/client';
import { useApp } from '../contexts/AppContext';
import { useTheme } from '../contexts/ThemeContext';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { PeriodSettingsSection } from '../modules/period/PeriodPage';
import { MODULE_COLORS } from '../themes/themes';
import type { Category, Quote, ModuleKey } from '../types';

const ALL_MODULES: ModuleKey[] = ['events', 'todo', 'work', 'eating', 'training', 'spending', 'period', 'books'];
const MODULES = ['events', 'work', 'eating', 'training', 'spending'];
const MODULE_ICONS: Record<string, string> = {
  events: '🗓', todo: '✅', work: '💼', eating: '🥗', training: '🏃', spending: '💰', period: '🌸', books: '📚',
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
        <h3 style={{ margin: 0, fontSize: '1rem' }}>🏷️ Categories</h3>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>+ Add</button>
      </div>
      <div className="card-body">
        {/* Module tabs */}
        <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
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

        {/* Category list */}
        {categories.length === 0 ? (
          <div className="empty-state" style={{ padding: '1.5rem' }}>
            <span style={{ fontSize: '1.75rem' }}>🏷️</span>
            <p style={{ fontSize: '0.85rem' }}>No categories yet for {activeModule}</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {categories.map((cat: Category) => (
              <div key={cat._id} style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.375rem 0.75rem',
                borderRadius: '999px',
                background: cat.color + '20',
                border: `1px solid ${cat.color ?? '#ccc'}40`,
              }}>
                {cat.icon && <span>{cat.icon}</span>}
                <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--color-text)' }}>{cat.name}</span>
                <button
                  className="btn btn-icon btn-ghost"
                  style={{ padding: '0.1rem 0.2rem', fontSize: '0.7rem', color: 'var(--color-text-muted)', width: '18px', height: '18px' }}
                  onClick={() => setDeleteTarget(cat)}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add modal */}
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
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                style={{ width: '40px', height: '36px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: '2px', cursor: 'pointer' }}
              />
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
        <h3 style={{ margin: 0, fontSize: '1rem' }}>✨ Affirmations & Quotes</h3>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>+ Add</button>
      </div>
      <div className="card-body">
        <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
          These quotes appear daily on your dashboard.
        </p>

        {quotes.length === 0 ? (
          <div className="empty-state" style={{ padding: '1.5rem' }}>
            <span style={{ fontSize: '1.75rem' }}>✨</span>
            <p style={{ fontSize: '0.85rem' }}>Add your first affirmation</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {quotes.map((quote: Quote) => (
              <div key={quote._id} style={{
                padding: '0.875rem 1rem',
                borderRadius: 'var(--radius-md)',
                background: quote.active !== false ? 'var(--color-surface)' : 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border)',
                opacity: quote.active !== false ? 1 : 0.5,
                display: 'flex', gap: '0.75rem', alignItems: 'flex-start',
              }}>
                <span style={{ fontSize: '1.25rem', flexShrink: 0 }}>✨</span>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: '0.875rem', fontStyle: 'italic', lineHeight: 1.5 }}>"{quote.text}"</p>
                  {quote.author && <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>— {quote.author}</p>}
                </div>
                <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
                  <button
                    className="btn btn-icon btn-ghost"
                    title={quote.active !== false ? 'Disable' : 'Enable'}
                    onClick={() => quote._id && toggleMut.mutate({ id: quote._id, active: !(quote.active !== false) })}
                    style={{ fontSize: '0.9rem' }}
                  >
                    {quote.active !== false ? '👁' : '🚫'}
                  </button>
                  <button
                    className="btn btn-icon btn-ghost"
                    style={{ color: '#DC2626', fontSize: '0.75rem' }}
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
    spring:  { bg: '#FFF9F0', accent: '#E8708A', emoji: '🌺' },
    summer:  { bg: '#FFFBF0', accent: '#F0B429', emoji: '☀️' },
    autumn:  { bg: '#FDF6F0', accent: '#C0622A', emoji: '🍂' },
    winter:  { bg: '#F0F4F8', accent: '#3A80B8', emoji: '❄️' },
    nature:  { bg: '#F5F2EC', accent: '#6B7A50', emoji: '🌿' },
    luxury:  { bg: '#0E0A12', accent: '#C8A44A', emoji: '✨' },
  };

  return (
    <div className="card">
      <div className="card-header">
        <h3 style={{ margin: 0, fontSize: '1rem' }}>🎨 Appearance</h3>
      </div>
      <div className="card-body">
        <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
          Choose your style mood:
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.75rem' }}>
          {Object.entries(themes).map(([key, theme]) => {
            const preview = THEME_PREVIEWS[key];
            const isActive = currentTheme === key;
            return (
              <button
                key={key}
                onClick={() => setCurrentTheme(key)}
                style={{
                  padding: '0.875rem',
                  borderRadius: 'var(--radius-lg)',
                  border: `2px solid ${isActive ? preview?.accent ?? 'var(--color-primary)' : 'var(--color-border)'}`,
                  background: preview?.bg ?? '#fff',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.2s',
                  boxShadow: isActive ? `0 0 0 3px ${preview?.accent ?? 'var(--color-primary)'}30` : 'none',
                  fontFamily: 'inherit',
                }}
              >
                <span style={{ fontSize: '1.5rem' }}>{preview?.emoji ?? '🎨'}</span>
                <div style={{ width: '100%', height: '6px', borderRadius: '3px', background: preview?.accent ?? '#ccc' }} />
                <span style={{ fontSize: '0.72rem', fontWeight: isActive ? 700 : 400, color: preview?.accent ?? '#333' }}>
                  {theme.name}
                </span>
                {isActive && <span style={{ fontSize: '0.65rem', color: preview?.accent ?? '#333', fontWeight: 600 }}>✓ Active</span>}
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
    training: 'Training', spending: 'Spending', period: 'Period Tracker', books: 'Reading',
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
        <h3 style={{ margin: 0, fontSize: '1rem' }}>🔲 Modules</h3>
      </div>
      <div className="card-body">
        <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
          Choose which modules appear in the navigation. Disabled modules are hidden but data is preserved.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {ALL_MODULES.map(mod => {
            const isOn = enabled.includes(mod);
            const color = MODULE_COLORS[mod]?.primary ?? 'var(--color-primary)';
            return (
              <div key={mod} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', background: isOn ? MODULE_COLORS[mod]?.soft ?? 'var(--color-surface)' : 'var(--color-bg-secondary)', border: `1px solid ${isOn ? color + '40' : 'var(--color-border)'}`, opacity: isOn ? 1 : 0.6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '1.25rem' }}>{MODULE_ICONS[mod]}</span>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem', color: isOn ? color : 'var(--color-text-muted)' }}>{MODULE_LABELS[mod]}</span>
                </div>
                <button
                  onClick={() => toggle(mod)}
                  style={{
                    width: '44px', height: '24px', borderRadius: '12px', border: 'none', cursor: 'pointer',
                    background: isOn ? color : 'var(--color-border)',
                    position: 'relative', transition: 'background 0.2s', flexShrink: 0,
                  }}
                >
                  <span style={{
                    position: 'absolute', top: '3px', left: isOn ? '23px' : '3px',
                    width: '18px', height: '18px', borderRadius: '50%', background: 'white',
                    transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  }} />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Settings Page ────────────────────────────────────────────────────────────
export default function Settings() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '800px' }}>
      <div>
        <h2 style={{ margin: 0 }}>⚙️ Settings</h2>
        <p style={{ color: 'var(--color-text-muted)', marginTop: '0.25rem', fontSize: '0.875rem' }}>
          Manage categories, themes, and app preferences.
        </p>
      </div>
      <ThemeSection />
      <ModuleTogglesSection />
      <PeriodSettingsSection />
      <QuotesSection />
      <CategoriesSection />
    </div>
  );
}
