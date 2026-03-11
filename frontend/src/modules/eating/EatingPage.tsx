import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { eatingApi, settingsApi } from '../../api/client';
import { useApp } from '../../contexts/AppContext';
import { MODULE_COLORS } from '../../themes/themes';
import Modal from '../../components/ui/Modal';
import PlanDoneToggle from '../../components/ui/PlanDoneToggle';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import type { EatingEntry, EatingEntryType, PlanDoneStatus, Category } from '../../types';

const COLOR = MODULE_COLORS.eating;

const DEFAULT_CATEGORIES = [
  { name: 'No Sugar', key: 'no_sugar', color: '#F472B6' },
  { name: 'No Flour', key: 'no_flour', color: '#FBBF24' },
  { name: 'No Meat', key: 'no_meat', color: '#34D399' },
  { name: 'Vegan', key: 'vegan', color: '#6EE7B7' },
  { name: 'Vegetarian', key: 'vegetarian', color: '#86EFAC' },
];

type EatingTab = 'daily_log' | 'recipes';

const EMPTY_LOG_FORM = {
  date: format(new Date(), 'yyyy-MM-dd'),
  categories: [] as string[],
  meals: [{ name: '', time: '', notes: '' }],
  notes: '', status: 'done' as PlanDoneStatus,
};

const EMPTY_RECIPE_FORM = {
  name: '', ingredients: '', instructions: '', tags: '',
};

export default function EatingPage() {
  const { notify } = useApp();
  const qc = useQueryClient();
  const [tab, setTab] = useState<EatingTab>('daily_log');
  const [showLogForm, setShowLogForm] = useState(false);
  const [showRecipeForm, setShowRecipeForm] = useState(false);
  const [editingLog, setEditingLog] = useState<EatingEntry | null>(null);
  const [editingRecipe, setEditingRecipe] = useState<EatingEntry | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EatingEntry | null>(null);
  const [expandedRecipe, setExpandedRecipe] = useState<string | null>(null);
  const [logForm, setLogForm] = useState(EMPTY_LOG_FORM);
  const [recipeForm, setRecipeForm] = useState(EMPTY_RECIPE_FORM);
  const [tagFilter, setTagFilter] = useState('');

  const { data: settings = [] } = useQuery<Category[]>({
    queryKey: ['settings', 'categories', 'eating'],
    queryFn: () => settingsApi.getCategories('eating'),
  });

  const dietCategories = settings.length > 0
    ? settings.map(s => ({ name: s.name, key: s.name.toLowerCase().replace(/\s+/g, '_'), color: s.color ?? '#22C55E' }))
    : DEFAULT_CATEGORIES;

  const { data: logs = [] } = useQuery<EatingEntry[]>({
    queryKey: ['eating', 'logs'],
    queryFn: () => eatingApi.getAll({ entryType: 'daily_log' }),
  });

  const { data: recipes = [] } = useQuery<EatingEntry[]>({
    queryKey: ['eating', 'recipes'],
    queryFn: () => eatingApi.getRecipes(),
  });

  const createMut = useMutation({
    mutationFn: (data: Partial<EatingEntry>) => eatingApi.create(data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['eating'] });
      notify(vars.entryType === 'recipe' ? 'Recipe saved! 🍽️' : 'Day logged! 🥗');
      setShowLogForm(false); setShowRecipeForm(false);
      setEditingLog(null); setEditingRecipe(null);
    },
    onError: (err: Error) => notify(err.message, 'error'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<EatingEntry> }) => eatingApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['eating'] });
      notify('Updated!');
      setShowLogForm(false); setShowRecipeForm(false);
    },
    onError: (err: Error) => notify(err.message, 'error'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => eatingApi.remove(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['eating'] }); notify('Deleted'); },
    onError: (err: Error) => notify(err.message, 'error'),
  });

  function openEditLog(e: EatingEntry) {
    setEditingLog(e);
    setLogForm({
      date: e.date ?? format(new Date(), 'yyyy-MM-dd'),
      categories: e.categories ?? [],
      meals: e.meals && e.meals.length > 0 ? e.meals : [{ name: '', time: '', notes: '' }],
      notes: e.notes ?? '',
      status: e.status ?? 'done',
    });
    setShowLogForm(true);
  }

  function openEditRecipe(e: EatingEntry) {
    setEditingRecipe(e);
    setRecipeForm({
      name: e.name ?? '',
      ingredients: e.ingredients?.join('\n') ?? '',
      instructions: e.instructions ?? '',
      tags: e.tags?.join(', ') ?? '',
    });
    setShowRecipeForm(true);
  }

  function handleSaveLog() {
    const payload: Partial<EatingEntry> = {
      entryType: 'daily_log', date: logForm.date, categories: logForm.categories,
      meals: logForm.meals.filter(m => m.name.trim()),
      notes: logForm.notes || undefined, status: logForm.status,
    };
    editingLog?._id ? updateMut.mutate({ id: editingLog._id, data: payload }) : createMut.mutate(payload);
  }

  function handleSaveRecipe() {
    const payload: Partial<EatingEntry> = {
      entryType: 'recipe', name: recipeForm.name,
      ingredients: recipeForm.ingredients.split('\n').map(s => s.trim()).filter(Boolean),
      instructions: recipeForm.instructions || undefined,
      tags: recipeForm.tags.split(',').map(s => s.trim()).filter(Boolean),
    };
    editingRecipe?._id ? updateMut.mutate({ id: editingRecipe._id, data: payload }) : createMut.mutate(payload);
  }

  function toggleCategory(key: string) {
    setLogForm(f => ({
      ...f,
      categories: f.categories.includes(key)
        ? f.categories.filter(c => c !== key)
        : [...f.categories, key],
    }));
  }

  function addMeal() {
    setLogForm(f => ({ ...f, meals: [...f.meals, { name: '', time: '', notes: '' }] }));
  }

  function removeMeal(idx: number) {
    setLogForm(f => ({ ...f, meals: f.meals.filter((_, i) => i !== idx) }));
  }

  const filteredRecipes = tagFilter
    ? recipes.filter(r => r.tags?.some(t => t.toLowerCase().includes(tagFilter.toLowerCase())))
    : recipes;

  const allTags = [...new Set(recipes.flatMap(r => r.tags ?? []))];

  // Streak calculation
  const sortedLogs = [...logs].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
  const logDates = new Set(sortedLogs.map(l => l.date));
  let streak = 0;
  let d = new Date();
  while (logDates.has(format(d, 'yyyy-MM-dd'))) {
    streak++;
    d = new Date(d.getTime() - 86400000);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header */}
      <div style={{
        background: `linear-gradient(135deg, ${COLOR.primary} 0%, ${COLOR.dark} 100%)`,
        borderRadius: 'var(--radius-xl)', padding: '1.5rem',
        color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.35rem' }}>🥗 Eating & Nutrition</h2>
          <p style={{ margin: '0.25rem 0 0', opacity: 0.85, fontSize: '0.875rem' }}>
            {streak > 0 ? `🔥 ${streak}-day logging streak` : `${logs.length} days logged`} · {recipes.length} recipes
          </p>
        </div>
        <button className="btn" onClick={() => { if (tab === 'daily_log') { setEditingLog(null); setLogForm(EMPTY_LOG_FORM); setShowLogForm(true); } else { setEditingRecipe(null); setRecipeForm(EMPTY_RECIPE_FORM); setShowRecipeForm(true); } }} style={{ background: 'white', color: COLOR.dark, fontWeight: 600 }}>
          + {tab === 'daily_log' ? 'Log Day' : 'Add Recipe'}
        </button>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab ${tab === 'daily_log' ? 'active' : ''}`} onClick={() => setTab('daily_log')}>🥗 Daily Log</button>
        <button className={`tab ${tab === 'recipes' ? 'active' : ''}`} onClick={() => setTab('recipes')}>🍽️ Recipes</button>
      </div>

      {/* Daily Log */}
      {tab === 'daily_log' && (
        logs.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state-icon">🥗</span>
            <p>No days logged yet</p>
            <button className="btn btn-primary btn-sm" onClick={() => { setEditingLog(null); setLogForm(EMPTY_LOG_FORM); setShowLogForm(true); }}>Log today</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {sortedLogs.map(log => (
              <div key={log._id} className="card">
                <div className="card-body" style={{ padding: '1rem 1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.625rem' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                        📅 {log.date ? format(parseISO(log.date), 'EEEE, MMM d') : '—'}
                      </div>
                      {log.categories && log.categories.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginTop: '0.375rem' }}>
                          {log.categories.map(cat => {
                            const cfg = dietCategories.find(c => c.key === cat);
                            return (
                              <span key={cat} style={{
                                padding: '0.15rem 0.5rem', borderRadius: '999px',
                                background: (cfg?.color ?? '#ccc') + '25',
                                border: `1px solid ${cfg?.color ?? '#ccc'}60`,
                                fontSize: '0.72rem', fontWeight: 600,
                                color: cfg?.color ?? 'var(--color-text)',
                              }}>
                                {cfg?.name ?? cat}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span className={`badge status-badge ${log.status ?? 'done'}`}>{log.status ?? 'done'}</span>
                      <button className="btn btn-icon btn-ghost btn-sm" onClick={() => openEditLog(log)}>✏️</button>
                      <button className="btn btn-icon btn-ghost btn-sm" style={{ color: '#DC2626' }} onClick={() => setDeleteTarget(log)}>🗑</button>
                    </div>
                  </div>
                  {log.meals && log.meals.length > 0 && (
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {log.meals.map((meal, i) => (
                        <span key={i} style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', background: 'var(--color-surface)', padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                          {meal.time && `${meal.time} · `}{meal.name}
                        </span>
                      ))}
                    </div>
                  )}
                  {log.notes && <p style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', margin: '0.375rem 0 0' }}>{log.notes}</p>}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Recipes */}
      {tab === 'recipes' && (
        <>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Filter by tag:</span>
            <button className={`btn btn-sm ${!tagFilter ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTagFilter('')}>All</button>
            {allTags.map(tag => (
              <button key={tag} className={`btn btn-sm ${tagFilter === tag ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTagFilter(tag)}>{tag}</button>
            ))}
          </div>
          {filteredRecipes.length === 0 ? (
            <div className="empty-state">
              <span className="empty-state-icon">🍽️</span>
              <p>No recipes yet</p>
              <button className="btn btn-primary btn-sm" onClick={() => { setEditingRecipe(null); setRecipeForm(EMPTY_RECIPE_FORM); setShowRecipeForm(true); }}>Add a recipe</button>
            </div>
          ) : (
            <div className="grid-auto">
              {filteredRecipes.map(recipe => {
                const isExpanded = expandedRecipe === recipe._id;
                return (
                  <div key={recipe._id} className="card">
                    <div className="card-body" style={{ padding: '1rem 1.25rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                        <h4 style={{ margin: 0, fontSize: '0.95rem' }}>🍽️ {recipe.name}</h4>
                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                          <button className="btn btn-icon btn-ghost btn-sm" onClick={() => openEditRecipe(recipe)}>✏️</button>
                          <button className="btn btn-icon btn-ghost btn-sm" style={{ color: '#DC2626' }} onClick={() => setDeleteTarget(recipe)}>🗑</button>
                        </div>
                      </div>
                      {recipe.tags && recipe.tags.length > 0 && (
                        <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                          {recipe.tags.map(tag => (
                            <span key={tag} className="badge" style={{ background: COLOR.soft, color: COLOR.text, border: `1px solid ${COLOR.primary}40` }}>{tag}</span>
                          ))}
                        </div>
                      )}
                      <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
                        {recipe.ingredients?.length ?? 0} ingredients
                      </div>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => setExpandedRecipe(isExpanded ? null : recipe._id!)}
                        style={{ fontSize: '0.8rem', padding: '0.25rem 0' }}
                      >
                        {isExpanded ? '▲ Hide' : '▼ View Recipe'}
                      </button>
                      {isExpanded && (
                        <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--color-border)' }}>
                          {recipe.ingredients && recipe.ingredients.length > 0 && (
                            <div style={{ marginBottom: '0.75rem' }}>
                              <div style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.25rem' }}>Ingredients:</div>
                              <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>
                                {recipe.ingredients.map((ing, i) => <li key={i}>{ing}</li>)}
                              </ul>
                            </div>
                          )}
                          {recipe.instructions && (
                            <div>
                              <div style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.25rem' }}>Instructions:</div>
                              <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--color-text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{recipe.instructions}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Log Day Modal */}
      <Modal isOpen={showLogForm} onClose={() => { setShowLogForm(false); setEditingLog(null); }} title={editingLog ? 'Edit Day Log' : 'Log Day'} size="lg"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => { setShowLogForm(false); setEditingLog(null); }}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSaveLog} disabled={createMut.isPending || updateMut.isPending}>Save</button>
          </>
        }
      >
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Date *</label>
            <input type="date" className="form-input" value={logForm.date} onChange={e => setLogForm(f => ({ ...f, date: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Status</label>
            <PlanDoneToggle status={logForm.status} onChange={s => setLogForm(f => ({ ...f, status: s }))} />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Dietary Categories</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {dietCategories.map(cat => {
              const isSelected = logForm.categories.includes(cat.key);
              return (
                <button key={cat.key} type="button" onClick={() => toggleCategory(cat.key)} style={{
                  padding: '0.3rem 0.75rem', borderRadius: '999px', border: `1.5px solid ${cat.color}`,
                  background: isSelected ? cat.color : 'transparent',
                  color: isSelected ? 'white' : cat.color,
                  fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'inherit',
                }}>
                  {cat.name}
                </button>
              );
            })}
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Meals</label>
          {logForm.meals.map((meal, idx) => (
            <div key={idx} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'flex-start' }}>
              <input className="form-input" value={meal.name} onChange={e => setLogForm(f => ({ ...f, meals: f.meals.map((m, i) => i === idx ? { ...m, name: e.target.value } : m) }))} placeholder="Meal name (e.g. Breakfast)" style={{ flex: 2 }} />
              <input type="time" className="form-input" value={meal.time} onChange={e => setLogForm(f => ({ ...f, meals: f.meals.map((m, i) => i === idx ? { ...m, time: e.target.value } : m) }))} style={{ flex: 1 }} />
              {logForm.meals.length > 1 && (
                <button type="button" className="btn btn-icon btn-ghost" style={{ color: '#DC2626', flexShrink: 0 }} onClick={() => removeMeal(idx)}>✕</button>
              )}
            </div>
          ))}
          <button type="button" className="btn btn-ghost btn-sm" onClick={addMeal}>+ Add meal</button>
        </div>
        <div className="form-group">
          <label className="form-label">Notes</label>
          <textarea className="form-textarea" value={logForm.notes} onChange={e => setLogForm(f => ({ ...f, notes: e.target.value }))} placeholder="How did you eat today?" rows={2} />
        </div>
      </Modal>

      {/* Recipe Modal */}
      <Modal isOpen={showRecipeForm} onClose={() => { setShowRecipeForm(false); setEditingRecipe(null); }} title={editingRecipe ? 'Edit Recipe' : 'Add Recipe'} size="lg"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => { setShowRecipeForm(false); setEditingRecipe(null); }}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSaveRecipe} disabled={!recipeForm.name || createMut.isPending || updateMut.isPending}>Save Recipe</button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">Recipe Name *</label>
          <input className="form-input" value={recipeForm.name} onChange={e => setRecipeForm(f => ({ ...f, name: e.target.value }))} placeholder="Delicious salad..." />
        </div>
        <div className="form-group">
          <label className="form-label">Tags (comma-separated)</label>
          <input className="form-input" value={recipeForm.tags} onChange={e => setRecipeForm(f => ({ ...f, tags: e.target.value }))} placeholder="salad, quick, vegetarian" />
        </div>
        <div className="form-group">
          <label className="form-label">Ingredients (one per line)</label>
          <textarea className="form-textarea" value={recipeForm.ingredients} onChange={e => setRecipeForm(f => ({ ...f, ingredients: e.target.value }))} placeholder={"200g spinach\n1 avocado\n2 tbsp olive oil"} rows={5} />
        </div>
        <div className="form-group">
          <label className="form-label">Instructions</label>
          <textarea className="form-textarea" value={recipeForm.instructions} onChange={e => setRecipeForm(f => ({ ...f, instructions: e.target.value }))} placeholder="Step by step..." rows={4} />
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={() => deleteTarget?._id && deleteMut.mutate(deleteTarget._id)} title="Delete Entry" message="Remove this entry?" />
    </div>
  );
}
