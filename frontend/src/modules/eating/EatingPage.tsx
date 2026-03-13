import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  format, parseISO, startOfWeek, addDays,
  startOfMonth, endOfMonth, getDay, eachDayOfInterval, addMonths, subMonths,
} from 'date-fns';
import { eatingApi, settingsApi } from '../../api/client';
import { useApp } from '../../contexts/AppContext';
import { MODULE_COLORS } from '../../themes/themes';
import Modal from '../../components/ui/Modal';
import PlanDoneToggle from '../../components/ui/PlanDoneToggle';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import type { EatingEntry, PlanDoneStatus, Category } from '../../types';

const COLOR = MODULE_COLORS.eating;

const DEFAULT_DIET_CATS = [
  { name: 'No Sugar', key: 'no_sugar', color: '#F472B6' },
  { name: 'No Flour', key: 'no_flour', color: '#FBBF24' },
  { name: 'No Meat', key: 'no_meat', color: '#34D399' },
  { name: 'Vegan', key: 'vegan', color: '#6EE7B7' },
  { name: 'Vegetarian', key: 'vegetarian', color: '#86EFAC' },
];

type EatingTab = 'diet' | 'meals' | 'recipes';
type DietView = 'week' | 'list';

function getTodayStr() { return format(new Date(), 'yyyy-MM-dd'); }
function smartStatus(dateStr: string): PlanDoneStatus {
  return dateStr > getTodayStr() ? 'plan' : 'done';
}

interface DietFormState {
  date: string;
  categories: string[];
  notes: string;
  status: PlanDoneStatus;
}
interface MealFormState {
  date: string;
  meals: { name: string; time: string; notes: string }[];
  notes: string;
  status: PlanDoneStatus;
}
interface RecipeFormState {
  name: string; ingredients: string; instructions: string; tags: string;
}

function makeDietForm(dateStr?: string): DietFormState {
  const d = dateStr ?? getTodayStr();
  return { date: d, categories: [], notes: '', status: smartStatus(d) };
}
function makeMealForm(dateStr?: string): MealFormState {
  const d = dateStr ?? getTodayStr();
  return { date: d, meals: [{ name: '', time: '', notes: '' }], notes: '', status: smartStatus(d) };
}
const EMPTY_RECIPE: RecipeFormState = { name: '', ingredients: '', instructions: '', tags: '' };

const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function DietWeekView({
  weekStart, entries, dietCats, onDayClick,
}: {
  weekStart: Date;
  entries: EatingEntry[];
  dietCats: { name: string; key: string; color: string }[];
  onDayClick: (dateStr: string) => void;
}) {
  const entryByDate = useMemo(() => {
    const map = new Map<string, EatingEntry[]>();
    entries.forEach(e => {
      if (!e.date) return;
      const arr = map.get(e.date) ?? [];
      arr.push(e);
      map.set(e.date, arr);
    });
    return map;
  }, [entries]);

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.375rem',
    }}>
      {WEEK_DAYS.map(d => (
        <div key={d} style={{ textAlign: 'center', fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-text-muted)', padding: '0.25rem 0' }}>{d}</div>
      ))}
      {days.map(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const dayEntries = entryByDate.get(dateStr) ?? [];
        const isToday = dateStr === getTodayStr();
        const dots = dayEntries.flatMap(e => e.categories ?? []).slice(0, 4);
        return (
          <div
            key={dateStr}
            onClick={() => onDayClick(dateStr)}
            style={{
              minHeight: '4.5rem', padding: '0.375rem', borderRadius: 'var(--radius-md)',
              border: `1.5px solid ${isToday ? COLOR.primary : 'var(--color-border)'}`,
              background: isToday ? COLOR.soft : 'var(--color-surface)',
              cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '0.2rem',
            }}
          >
            <div style={{ fontSize: '0.75rem', fontWeight: isToday ? 700 : 500, color: isToday ? COLOR.primary : 'var(--color-text)' }}>
              {format(day, 'd')}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.15rem' }}>
              {dots.map((cat, i) => {
                const cfg = dietCats.find(c => c.key === cat);
                return (
                  <span key={i} style={{
                    width: '0.55rem', height: '0.55rem', borderRadius: '50%',
                    background: cfg?.color ?? '#999', display: 'inline-block',
                  }} title={cfg?.name ?? cat} />
                );
              })}
            </div>
            {dayEntries.length > 0 && (
              <div style={{ fontSize: '0.6rem', color: 'var(--color-text-muted)' }}>
                {dayEntries.length} entr{dayEntries.length === 1 ? 'y' : 'ies'}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function EatingPage() {
  const { notify } = useApp();
  const qc = useQueryClient();
  const [tab, setTab] = useState<EatingTab>('diet');

  // Diet tab state
  const [dietView, setDietView] = useState<DietView>('week');
  const [statsMonth, setStatsMonth] = useState(new Date());
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [showDietForm, setShowDietForm] = useState(false);
  const [editingDiet, setEditingDiet] = useState<EatingEntry | null>(null);
  const [dietForm, setDietForm] = useState<DietFormState>(makeDietForm());

  // Meals tab state
  const [showMealForm, setShowMealForm] = useState(false);
  const [editingMeal, setEditingMeal] = useState<EatingEntry | null>(null);
  const [mealForm, setMealForm] = useState<MealFormState>(makeMealForm());

  // Recipes tab state
  const [showRecipeForm, setShowRecipeForm] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<EatingEntry | null>(null);
  const [recipeForm, setRecipeForm] = useState<RecipeFormState>(EMPTY_RECIPE);
  const [expandedRecipe, setExpandedRecipe] = useState<string | null>(null);
  const [tagFilter, setTagFilter] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<EatingEntry | null>(null);

  // Settings categories
  const { data: settings = [] } = useQuery<Category[]>({
    queryKey: ['settings', 'categories', 'eating'],
    queryFn: () => settingsApi.getCategories('eating'),
  });
  const dietCats = settings.length > 0
    ? settings.map(s => ({ name: s.name, key: s.name.toLowerCase().replace(/\s+/g, '_'), color: s.color ?? '#22C55E' }))
    : DEFAULT_DIET_CATS;

  // Data queries
  const { data: dietEntries = [] } = useQuery<EatingEntry[]>({
    queryKey: ['eating', 'diet'],
    queryFn: () => eatingApi.getAll({ entryType: 'diet_log' }),
  });
  const { data: mealEntries = [] } = useQuery<EatingEntry[]>({
    queryKey: ['eating', 'meals'],
    queryFn: () => eatingApi.getAll({ entryType: 'daily_log' }),
  });
  const { data: recipes = [] } = useQuery<EatingEntry[]>({
    queryKey: ['eating', 'recipes'],
    queryFn: () => eatingApi.getRecipes(),
  });

  // Mutations
  const createMut = useMutation({
    mutationFn: (data: Partial<EatingEntry>) => eatingApi.create(data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['eating'] });
      const msg = vars.entryType === 'recipe' ? 'Recipe saved! 🍽️' : vars.entryType === 'diet_log' ? 'Diet logged! 🥗' : 'Meals logged!';
      notify(msg);
      setShowDietForm(false); setShowMealForm(false); setShowRecipeForm(false);
      setEditingDiet(null); setEditingMeal(null); setEditingRecipe(null);
    },
    onError: (err: Error) => notify(err.message, 'error'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<EatingEntry> }) => eatingApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['eating'] });
      notify('Updated!');
      setShowDietForm(false); setShowMealForm(false); setShowRecipeForm(false);
    },
    onError: (err: Error) => notify(err.message, 'error'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => eatingApi.remove(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['eating'] }); notify('Deleted'); },
    onError: (err: Error) => notify(err.message, 'error'),
  });

  // Diet tab handlers
  function openAddDiet(dateStr?: string) {
    setEditingDiet(null);
    setDietForm(makeDietForm(dateStr));
    setShowDietForm(true);
  }
  function openEditDiet(e: EatingEntry) {
    setEditingDiet(e);
    setDietForm({
      date: e.date ?? getTodayStr(),
      categories: e.categories ?? [],
      notes: e.notes ?? '',
      status: e.status ?? 'done',
    });
    setShowDietForm(true);
  }
  function handleSaveDiet() {
    const payload: Partial<EatingEntry> = {
      entryType: 'diet_log', date: dietForm.date,
      categories: dietForm.categories,
      notes: dietForm.notes || undefined,
      status: dietForm.status,
    };
    editingDiet?._id ? updateMut.mutate({ id: editingDiet._id, data: payload }) : createMut.mutate(payload);
  }
  function toggleDietCategory(key: string) {
    setDietForm(f => ({
      ...f,
      categories: f.categories.includes(key)
        ? f.categories.filter(c => c !== key)
        : [...f.categories, key],
    }));
  }

  // Meal tab handlers
  function openAddMeal(dateStr?: string) {
    setEditingMeal(null);
    setMealForm(makeMealForm(dateStr));
    setShowMealForm(true);
  }
  function openEditMeal(e: EatingEntry) {
    setEditingMeal(e);
    setMealForm({
      date: e.date ?? getTodayStr(),
      meals: e.meals && e.meals.length > 0
        ? e.meals.map(m => ({ name: m.name, time: m.time ?? '', notes: m.notes ?? '' }))
        : [{ name: '', time: '', notes: '' }],
      notes: e.notes ?? '',
      status: e.status ?? 'done',
    });
    setShowMealForm(true);
  }
  function handleSaveMeal() {
    const payload: Partial<EatingEntry> = {
      entryType: 'daily_log', date: mealForm.date,
      meals: mealForm.meals.filter(m => m.name.trim()),
      notes: mealForm.notes || undefined,
      status: mealForm.status,
    };
    editingMeal?._id ? updateMut.mutate({ id: editingMeal._id, data: payload }) : createMut.mutate(payload);
  }
  function addMealRow() { setMealForm(f => ({ ...f, meals: [...f.meals, { name: '', time: '', notes: '' }] })); }
  function removeMealRow(idx: number) { setMealForm(f => ({ ...f, meals: f.meals.filter((_, i) => i !== idx) })); }

  // Recipe handlers
  function openAddRecipe() { setEditingRecipe(null); setRecipeForm(EMPTY_RECIPE); setShowRecipeForm(true); }
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
  function handleSaveRecipe() {
    const payload: Partial<EatingEntry> = {
      entryType: 'recipe', name: recipeForm.name,
      ingredients: recipeForm.ingredients.split('\n').map(s => s.trim()).filter(Boolean),
      instructions: recipeForm.instructions || undefined,
      tags: recipeForm.tags.split(',').map(s => s.trim()).filter(Boolean),
    };
    editingRecipe?._id ? updateMut.mutate({ id: editingRecipe._id, data: payload }) : createMut.mutate(payload);
  }

  // Stats
  const monthStr = format(statsMonth, 'yyyy-MM');
  const monthDietEntries = dietEntries.filter(e => (e.date ?? '').startsWith(monthStr));
  const catCounts = dietCats.map(cat => ({
    ...cat,
    count: monthDietEntries.filter(e => e.categories?.includes(cat.key)).length,
  }));
  const daysInMonth = eachDayOfInterval({ start: startOfMonth(statsMonth), end: endOfMonth(statsMonth) }).length;
  const totalDietDays = new Set(monthDietEntries.map(e => e.date)).size;

  // Mini calendar data
  const calMonthStart = startOfMonth(statsMonth);
  const calMonthEnd = endOfMonth(statsMonth);
  const calDays = eachDayOfInterval({ start: calMonthStart, end: calMonthEnd });
  const firstDow = getDay(calMonthStart);
  const dietByDate = useMemo(() => {
    const map = new Map<string, EatingEntry[]>();
    dietEntries.forEach(e => {
      if (!e.date) return;
      const arr = map.get(e.date) ?? [];
      arr.push(e);
      map.set(e.date, arr);
    });
    return map;
  }, [dietEntries]);

  // Sorted meal entries
  const sortedMeals = [...mealEntries].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));

  // Recipes
  const filteredRecipes = tagFilter
    ? recipes.filter(r => r.tags?.some(t => t.toLowerCase().includes(tagFilter.toLowerCase())))
    : recipes;
  const allTags = [...new Set(recipes.flatMap(r => r.tags ?? []))];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header */}
      <div style={{
        background: COLOR.soft,
        border: `1px solid ${COLOR.primary}30`,
        borderRadius: 'var(--radius-xl)', padding: '1.5rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '2.5rem' }}>🥗</span>
          <div>
            <h1 style={{ margin: 0, color: COLOR.primary, fontSize: 'clamp(1.25rem, 3vw, 1.75rem)' }}>Eating & Nutrition</h1>
            <p style={{ margin: '0.25rem 0 0', color: COLOR.text, fontSize: '0.875rem' }}>
              {totalDietDays} diet days this month · {mealEntries.length} meal logs · {recipes.length} recipes
            </p>
          </div>
        </div>
        <button className="btn" onClick={() => {
          if (tab === 'diet') openAddDiet();
          else if (tab === 'meals') openAddMeal();
          else openAddRecipe();
        }} style={{ background: COLOR.primary, color: 'white', fontWeight: 600 }}>
          + {tab === 'diet' ? 'Log Diet' : tab === 'meals' ? 'Log Meals' : 'Add Recipe'}
        </button>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab ${tab === 'diet' ? 'active' : ''}`} onClick={() => setTab('diet')}>🥦 Diet</button>
        <button className={`tab ${tab === 'meals' ? 'active' : ''}`} onClick={() => setTab('meals')}>🍽️ Meals</button>
        <button className={`tab ${tab === 'recipes' ? 'active' : ''}`} onClick={() => setTab('recipes')}>📖 Recipes</button>
      </div>

      {/* ── DIET TAB ─────────────────────────────── */}
      {tab === 'diet' && (
        <>
          {settings.length === 0 && (
            <div style={{
              padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)',
              background: COLOR.soft, border: `1px solid ${COLOR.primary}40`,
              fontSize: '0.82rem', color: 'var(--color-text-secondary)',
            }}>
              💡 Using default diet categories. Add custom categories in <strong>Settings → Categories</strong>.
            </div>
          )}

          {/* Stats + Mini Calendar row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            {/* Stats card */}
            <div className="card">
              <div className="card-body" style={{ padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>📊 Stats</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    <button className="btn btn-icon btn-ghost btn-sm" onClick={() => setStatsMonth(m => subMonths(m, 1))}>‹</button>
                    <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>{format(statsMonth, 'MMM yyyy')}</span>
                    <button className="btn btn-icon btn-ghost btn-sm" onClick={() => setStatsMonth(m => addMonths(m, 1))}>›</button>
                  </div>
                </div>
                <div style={{ marginBottom: '0.5rem' }}>
                  <span className="badge" style={{ background: COLOR.soft, color: COLOR.text, border: `1px solid ${COLOR.primary}40` }}>
                    {totalDietDays} / {daysInMonth} days logged
                  </span>
                </div>
                {catCounts.map(cat => (
                  <div key={cat.key} style={{ marginBottom: '0.4rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.15rem' }}>
                      <span style={{ color: cat.color, fontWeight: 600 }}>● {cat.name}</span>
                      <span style={{ color: 'var(--color-text-muted)' }}>{cat.count}d</span>
                    </div>
                    <div style={{ height: '4px', borderRadius: '999px', background: 'var(--color-border)' }}>
                      <div style={{
                        height: '100%', borderRadius: '999px',
                        background: cat.color,
                        width: `${daysInMonth > 0 ? Math.round((cat.count / daysInMonth) * 100) : 0}%`,
                        transition: 'width 0.3s',
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Mini calendar card */}
            <div className="card">
              <div className="card-body" style={{ padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>📅 {format(statsMonth, 'MMMM yyyy')}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.125rem', textAlign: 'center' }}>
                  {WEEK_DAYS.map(d => (
                    <div key={d} style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--color-text-muted)', padding: '0.2rem 0' }}>{d[0]}</div>
                  ))}
                  {Array.from({ length: firstDow }, (_, i) => <div key={`e${i}`} />)}
                  {calDays.map(day => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const dayDietEntries = dietByDate.get(dateStr) ?? [];
                    const isToday = dateStr === getTodayStr();
                    const hasDiet = dayDietEntries.length > 0;
                    const dots = dayDietEntries.flatMap(e => e.categories ?? []).slice(0, 3);
                    return (
                      <div
                        key={dateStr}
                        onClick={() => openAddDiet(dateStr)}
                        style={{
                          padding: '0.15rem', borderRadius: 'var(--radius-sm)',
                          background: isToday ? COLOR.soft : hasDiet ? `${COLOR.primary}12` : 'transparent',
                          border: isToday ? `1.5px solid ${COLOR.primary}` : '1.5px solid transparent',
                          cursor: 'pointer', minHeight: '1.8rem',
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.1rem',
                        }}
                      >
                        <span style={{ fontSize: '0.65rem', fontWeight: isToday ? 700 : 400, color: isToday ? COLOR.primary : 'var(--color-text)' }}>
                          {format(day, 'd')}
                        </span>
                        <div style={{ display: 'flex', gap: '0.1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                          {dots.map((cat, i) => {
                            const cfg = dietCats.find(c => c.key === cat);
                            return <span key={i} style={{ width: '0.35rem', height: '0.35rem', borderRadius: '50%', background: cfg?.color ?? '#999' }} />;
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Week/List toggle */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="tabs" style={{ flex: 1 }}>
              <button className={`tab ${dietView === 'week' ? 'active' : ''}`} onClick={() => setDietView('week')}>Week</button>
              <button className={`tab ${dietView === 'list' ? 'active' : ''}`} onClick={() => setDietView('list')}>List</button>
            </div>
            {dietView === 'week' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <button className="btn btn-icon btn-ghost btn-sm" onClick={() => setWeekStart(w => addDays(w, -7))}>‹</button>
                <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>
                  {format(weekStart, 'MMM d')} – {format(addDays(weekStart, 6), 'MMM d')}
                </span>
                <button className="btn btn-icon btn-ghost btn-sm" onClick={() => setWeekStart(w => addDays(w, 7))}>›</button>
                <button className="btn btn-ghost btn-sm" onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}>Today</button>
              </div>
            )}
          </div>

          {dietView === 'week' && (
            <div className="card">
              <div className="card-body" style={{ padding: '1rem' }}>
                <DietWeekView
                  weekStart={weekStart}
                  entries={dietEntries}
                  dietCats={dietCats}
                  onDayClick={openAddDiet}
                />
              </div>
            </div>
          )}

          {dietView === 'list' && (
            dietEntries.length === 0 ? (
              <div className="empty-state">
                <span className="empty-state-icon">🥦</span>
                <p>No diet entries yet</p>
                <button className="btn btn-primary btn-sm" onClick={() => openAddDiet()}>Log today</button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {[...dietEntries].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '')).map(entry => (
                  <div key={entry._id} className="card">
                    <div className="card-body" style={{ padding: '1rem 1.25rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                            📅 {entry.date ? format(parseISO(entry.date), 'EEEE, MMM d') : '—'}
                          </div>
                          {entry.categories && entry.categories.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginTop: '0.375rem' }}>
                              {entry.categories.map(cat => {
                                const cfg = dietCats.find(c => c.key === cat);
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
                          {entry.notes && <p style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', margin: '0.375rem 0 0' }}>{entry.notes}</p>}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span className={`badge status-badge ${entry.status ?? 'done'}`}>{entry.status ?? 'done'}</span>
                          <button className="btn btn-icon btn-ghost btn-sm" onClick={() => openEditDiet(entry)}>✏️</button>
                          <button className="btn btn-icon btn-ghost btn-sm" style={{ color: '#DC2626' }} onClick={() => setDeleteTarget(entry)}>🗑</button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </>
      )}

      {/* ── MEALS TAB ─────────────────────────────── */}
      {tab === 'meals' && (
        sortedMeals.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state-icon">🍽️</span>
            <p>No meal logs yet</p>
            <button className="btn btn-primary btn-sm" onClick={() => openAddMeal()}>Log meals</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {sortedMeals.map(log => (
              <div key={log._id} className="card">
                <div className="card-body" style={{ padding: '1rem 1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.625rem' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                      📅 {log.date ? format(parseISO(log.date), 'EEEE, MMM d') : '—'}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span className={`badge status-badge ${log.status ?? 'done'}`}>{log.status ?? 'done'}</span>
                      <button className="btn btn-icon btn-ghost btn-sm" onClick={() => openEditMeal(log)}>✏️</button>
                      <button className="btn btn-icon btn-ghost btn-sm" style={{ color: '#DC2626' }} onClick={() => setDeleteTarget(log)}>🗑</button>
                    </div>
                  </div>
                  {log.meals && log.meals.length > 0 && (
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {log.meals.map((meal, i) => (
                        <span key={i} style={{
                          fontSize: '0.78rem', color: 'var(--color-text-secondary)',
                          background: 'var(--color-surface)', padding: '0.2rem 0.5rem',
                          borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)',
                        }}>
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

      {/* ── RECIPES TAB ─────────────────────────────── */}
      {tab === 'recipes' && (
        <>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Filter:</span>
            <button className={`btn btn-sm ${!tagFilter ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTagFilter('')}>All</button>
            {allTags.map(tag => (
              <button key={tag} className={`btn btn-sm ${tagFilter === tag ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTagFilter(tag)}>{tag}</button>
            ))}
          </div>
          {filteredRecipes.length === 0 ? (
            <div className="empty-state">
              <span className="empty-state-icon">📖</span>
              <p>No recipes yet</p>
              <button className="btn btn-primary btn-sm" onClick={openAddRecipe}>Add a recipe</button>
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

      {/* Diet Log Modal */}
      <Modal isOpen={showDietForm} onClose={() => { setShowDietForm(false); setEditingDiet(null); }} title={editingDiet ? 'Edit Diet Entry' : 'Log Diet'} size="md"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => { setShowDietForm(false); setEditingDiet(null); }}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSaveDiet} disabled={createMut.isPending || updateMut.isPending}>Save</button>
          </>
        }
      >
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Date *</label>
            <input type="date" className="form-input" value={dietForm.date}
              onChange={e => setDietForm(f => ({ ...f, date: e.target.value, status: smartStatus(e.target.value) }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Status</label>
            <PlanDoneToggle status={dietForm.status} onChange={s => setDietForm(f => ({ ...f, status: s }))} />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Diet Categories</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
            {dietCats.map(cat => {
              const isSelected = dietForm.categories.includes(cat.key);
              return (
                <button key={cat.key} type="button" onClick={() => toggleDietCategory(cat.key)} style={{
                  padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)',
                  border: `1.5px solid ${cat.color}`,
                  background: isSelected ? cat.color + '20' : 'var(--color-surface)',
                  color: isSelected ? cat.color : 'var(--color-text)',
                  fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '0.4rem',
                  fontFamily: 'inherit', transition: 'all 0.15s',
                  outline: isSelected ? `2px solid ${cat.color}` : 'none',
                }}>
                  <span style={{ width: '0.65rem', height: '0.65rem', borderRadius: '50%', background: cat.color, display: 'inline-block', flexShrink: 0 }} />
                  {cat.name}
                </button>
              );
            })}
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Notes</label>
          <textarea className="form-textarea" value={dietForm.notes} onChange={e => setDietForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any notes about today's diet..." rows={2} />
        </div>
      </Modal>

      {/* Meal Log Modal */}
      <Modal isOpen={showMealForm} onClose={() => { setShowMealForm(false); setEditingMeal(null); }} title={editingMeal ? 'Edit Meal Log' : 'Log Meals'} size="lg"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => { setShowMealForm(false); setEditingMeal(null); }}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSaveMeal} disabled={createMut.isPending || updateMut.isPending}>Save</button>
          </>
        }
      >
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Date *</label>
            <input type="date" className="form-input" value={mealForm.date}
              onChange={e => setMealForm(f => ({ ...f, date: e.target.value, status: smartStatus(e.target.value) }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Status</label>
            <PlanDoneToggle status={mealForm.status} onChange={s => setMealForm(f => ({ ...f, status: s }))} />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Meals</label>
          {mealForm.meals.map((meal, idx) => (
            <div key={idx} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'flex-start' }}>
              <input className="form-input" value={meal.name}
                onChange={e => setMealForm(f => ({ ...f, meals: f.meals.map((m, i) => i === idx ? { ...m, name: e.target.value } : m) }))}
                placeholder="Meal name" style={{ flex: 2 }} />
              <input type="time" className="form-input" value={meal.time}
                onChange={e => setMealForm(f => ({ ...f, meals: f.meals.map((m, i) => i === idx ? { ...m, time: e.target.value } : m) }))}
                style={{ flex: 1 }} />
              {mealForm.meals.length > 1 && (
                <button type="button" className="btn btn-icon btn-ghost" style={{ color: '#DC2626', flexShrink: 0 }} onClick={() => removeMealRow(idx)}>✕</button>
              )}
            </div>
          ))}
          <button type="button" className="btn btn-ghost btn-sm" onClick={addMealRow}>+ Add meal</button>
        </div>
        <div className="form-group">
          <label className="form-label">Notes</label>
          <textarea className="form-textarea" value={mealForm.notes} onChange={e => setMealForm(f => ({ ...f, notes: e.target.value }))} placeholder="How did you eat today?" rows={2} />
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
