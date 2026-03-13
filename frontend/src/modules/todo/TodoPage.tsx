import { useState, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, addDays, subDays, startOfWeek } from 'date-fns';
import { todoApi } from '../../api/client';
import { useApp } from '../../contexts/AppContext';
import { MODULE_COLORS } from '../../themes/themes';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import type { TodoEntry, TodoItem } from '../../types';

const C = MODULE_COLORS.todo;

function getTodayStr() { return format(new Date(), 'yyyy-MM-dd'); }
function uid() { return Math.random().toString(36).slice(2, 10); }

// ─── Progress Bar ─────────────────────────────────────────────────────────────
function ProgressBar({ done, total }: { done: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <div style={{ flex: 1, height: '6px', borderRadius: '3px', background: 'var(--color-border)' }}>
        <div style={{ width: `${pct}%`, height: '100%', borderRadius: '3px', background: pct === 100 ? '#22C55E' : C.primary, transition: 'width 0.3s' }} />
      </div>
      <span style={{ fontSize: '0.72rem', color: pct === 100 ? '#15803D' : 'var(--color-text-muted)', fontWeight: 600, minWidth: '2.5rem', textAlign: 'right' }}>
        {done}/{total}
      </span>
    </div>
  );
}

// ─── Todo List Card ───────────────────────────────────────────────────────────
function TodoCard({
  list,
  onToggleItem,
  onAddItem,
  onDelete,
  onEditTitle,
  isToday,
}: {
  list: TodoEntry;
  onToggleItem: (listId: string, itemId: string) => void;
  onAddItem: (listId: string, text: string) => void;
  onDelete: (list: TodoEntry) => void;
  onEditTitle: (list: TodoEntry, newTitle: string) => void;
  isToday: boolean;
}) {
  const [newText, setNewText] = useState('');
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleVal, setTitleVal] = useState(list.title);
  const inputRef = useRef<HTMLInputElement>(null);

  const done = list.items.filter(i => i.done).length;
  const allDone = list.items.length > 0 && done === list.items.length;

  function submitItem() {
    const t = newText.trim();
    if (!t) return;
    onAddItem(list._id!, t);
    setNewText('');
  }

  function commitTitle() {
    setEditingTitle(false);
    if (titleVal.trim() && titleVal.trim() !== list.title) {
      onEditTitle(list, titleVal.trim());
    } else {
      setTitleVal(list.title);
    }
  }

  return (
    <div style={{
      background: 'var(--color-bg-card)',
      border: `1px solid ${isToday ? C.primary + '60' : 'var(--color-border)'}`,
      borderLeft: `4px solid ${allDone ? '#22C55E' : isToday ? C.primary : 'var(--color-border)'}`,
      borderRadius: 'var(--radius-md)',
      boxShadow: 'var(--shadow-sm)',
      overflow: 'hidden',
    }}>
      {/* Card Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.875rem 1rem', borderBottom: '1px solid var(--color-border)' }}>
        <span style={{ fontSize: '1rem' }}>{allDone ? '✅' : '📋'}</span>

        {editingTitle ? (
          <input
            ref={inputRef}
            value={titleVal}
            onChange={e => setTitleVal(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={e => { if (e.key === 'Enter') commitTitle(); if (e.key === 'Escape') { setEditingTitle(false); setTitleVal(list.title); } }}
            style={{ flex: 1, border: 'none', borderBottom: `2px solid ${C.primary}`, outline: 'none', fontSize: '0.95rem', fontWeight: 600, fontFamily: 'inherit', background: 'transparent', padding: '0.1rem 0', color: 'var(--color-text)' }}
            autoFocus
          />
        ) : (
          <button
            onClick={() => { setEditingTitle(true); setTitleVal(list.title); }}
            style={{ flex: 1, textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.95rem', fontWeight: 600, color: allDone ? '#15803D' : 'var(--color-text)', textDecoration: allDone ? 'line-through' : 'none', padding: 0 }}
          >
            {list.title}
          </button>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexShrink: 0 }}>
          <span style={{ fontSize: '0.72rem', padding: '0.15rem 0.5rem', borderRadius: '999px', background: isToday ? C.soft : 'var(--color-surface)', color: isToday ? C.primary : 'var(--color-text-muted)', border: `1px solid ${isToday ? C.primary + '40' : 'var(--color-border)'}`, fontWeight: 500 }}>
            {isToday ? 'Today' : format(new Date(list.date + 'T00:00:00'), 'MMM d')}
          </span>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={() => onDelete(list)} title="Delete list">🗑️</button>
        </div>
      </div>

      {/* Items */}
      <div style={{ padding: '0.625rem 1rem' }}>
        {list.items.length > 0 && (
          <div style={{ marginBottom: '0.625rem' }}>
            <ProgressBar done={done} total={list.items.length} />
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
          {list.items.map(item => (
            <label key={item.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem', padding: '0.375rem 0', cursor: 'pointer', userSelect: 'none' }}>
              <div
                onClick={() => onToggleItem(list._id!, item.id)}
                style={{
                  width: '18px', height: '18px', borderRadius: '4px', flexShrink: 0, marginTop: '1px',
                  border: `2px solid ${item.done ? C.primary : 'var(--color-border)'}`,
                  background: item.done ? C.primary : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                {item.done && <span style={{ color: 'white', fontSize: '0.7rem', lineHeight: 1 }}>✓</span>}
              </div>
              <span
                onClick={() => onToggleItem(list._id!, item.id)}
                style={{ fontSize: '0.875rem', color: item.done ? 'var(--color-text-muted)' : 'var(--color-text)', textDecoration: item.done ? 'line-through' : 'none', lineHeight: 1.5 }}
              >
                {item.text}
              </span>
            </label>
          ))}
        </div>

        {/* Add item inline */}
        <div style={{ display: 'flex', gap: '0.375rem', marginTop: '0.5rem' }}>
          <input
            value={newText}
            onChange={e => setNewText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') submitItem(); }}
            placeholder="Add item…"
            style={{ flex: 1, border: 'none', borderBottom: `1px solid var(--color-border)`, outline: 'none', fontSize: '0.82rem', padding: '0.3rem 0', fontFamily: 'inherit', background: 'transparent', color: 'var(--color-text)' }}
          />
          {newText.trim() && (
            <button onClick={submitItem} style={{ border: 'none', background: C.primary, color: 'white', borderRadius: 'var(--radius-sm)', padding: '0.25rem 0.625rem', cursor: 'pointer', fontSize: '0.82rem', fontFamily: 'inherit' }}>
              Add
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── New List Form ────────────────────────────────────────────────────────────
function NewListModal({ onClose, onSave }: { onClose: () => void; onSave: (title: string, date: string, items: string[]) => void }) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(getTodayStr());
  const [itemTexts, setItemTexts] = useState<string[]>(['']);

  function setItem(i: number, v: string) {
    const next = [...itemTexts];
    next[i] = v;
    // auto-add row when last is filled
    if (i === next.length - 1 && v.trim()) next.push('');
    setItemTexts(next);
  }

  function removeItem(i: number) {
    const next = itemTexts.filter((_, idx) => idx !== i);
    if (next.length === 0) next.push('');
    setItemTexts(next);
  }

  function handleSave() {
    if (!title.trim()) return;
    const items = itemTexts.map(t => t.trim()).filter(Boolean);
    onSave(title.trim(), date, items);
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 400, backdropFilter: 'blur(2px)' }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 'min(520px, 95vw)', background: 'var(--color-bg-card)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-lg)', zIndex: 401, padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0, color: C.primary }}>✅ New To-Do List</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>

        <div className="form-row">
          <div className="form-group" style={{ flex: 2 }}>
            <label className="form-label">Title *</label>
            <input className="form-input" placeholder="e.g. Shopping, Weekly Goals…" value={title} onChange={e => setTitle(e.target.value)} autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Date</label>
            <input className="form-input" type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Items</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            {itemTexts.map((text, i) => (
              <div key={i} style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }}>
                <div style={{ width: '14px', height: '14px', borderRadius: '3px', border: '2px solid var(--color-border)', flexShrink: 0 }} />
                <input
                  className="form-input"
                  placeholder={`Item ${i + 1}…`}
                  value={text}
                  onChange={e => setItem(i, e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); setItem(i, text); } if (e.key === 'Backspace' && !text && itemTexts.length > 1) removeItem(i); }}
                  style={{ flex: 1 }}
                />
                {itemTexts.length > 1 && (
                  <button onClick={() => removeItem(i)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: '1rem', padding: '0.1rem 0.25rem' }}>✕</button>
                )}
              </div>
            ))}
          </div>
          <button
            onClick={() => setItemTexts(t => [...t, ''])}
            style={{ border: 'none', background: 'none', cursor: 'pointer', color: C.primary, fontSize: '0.82rem', marginTop: '0.375rem', padding: 0, fontFamily: 'inherit' }}
          >
            + Add another item
          </button>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn" onClick={handleSave} disabled={!title.trim()} style={{ background: C.primary, color: 'white', fontWeight: 600 }}>
            Create List
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function TodoPage() {
  const { notify } = useApp();
  const qc = useQueryClient();

  const [showNew, setShowNew] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TodoEntry | null>(null);
  const [filter, setFilter] = useState<'all' | 'today' | 'pending'>('all');

  const { data: allLists = [], isLoading } = useQuery<TodoEntry[]>({
    queryKey: ['todos'],
    queryFn: () => todoApi.getAll(),
  });

  const createMut = useMutation({
    mutationFn: (data: Partial<TodoEntry>) => todoApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['todos'] }); notify('List created', 'success'); setShowNew(false); },
    onError: (err: Error) => notify(err.message, 'error'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TodoEntry> }) => todoApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['todos'] }),
    onError: (err: Error) => notify(err.message, 'error'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => todoApi.remove(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['todos'] }); notify('List deleted', 'success'); },
    onError: (err: Error) => notify(err.message, 'error'),
  });

  const todayStr = getTodayStr();

  // Stats
  const totalLists = allLists.length;
  const totalItems = allLists.reduce((s, l) => s + l.items.length, 0);
  const doneItems = allLists.reduce((s, l) => s + l.items.filter(i => i.done).length, 0);
  const todayLists = allLists.filter(l => l.date === todayStr);
  const pendingLists = allLists.filter(l => l.items.some(i => !i.done));

  const displayed = useMemo(() => {
    let base = [...allLists].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt!.localeCompare(a.createdAt!));
    if (filter === 'today') base = base.filter(l => l.date === todayStr);
    if (filter === 'pending') base = base.filter(l => l.items.some(i => !i.done));
    return base;
  }, [allLists, filter, todayStr]);

  function handleToggleItem(listId: string, itemId: string) {
    const list = allLists.find(l => l._id === listId);
    if (!list) return;
    const items = list.items.map(item => item.id === itemId ? { ...item, done: !item.done } : item);
    updateMut.mutate({ id: listId, data: { items } });
  }

  function handleAddItem(listId: string, text: string) {
    const list = allLists.find(l => l._id === listId);
    if (!list) return;
    const items = [...list.items, { id: uid(), text, done: false }];
    updateMut.mutate({ id: listId, data: { items } });
  }

  function handleEditTitle(list: TodoEntry, newTitle: string) {
    updateMut.mutate({ id: list._id!, data: { title: newTitle } });
  }

  function handleCreate(title: string, date: string, itemTexts: string[]) {
    const items: TodoItem[] = itemTexts.map(text => ({ id: uid(), text, done: false }));
    createMut.mutate({ title, date, items });
  }

  // Group by date for display
  const groupedByDate = useMemo(() => {
    const map = new Map<string, TodoEntry[]>();
    for (const list of displayed) {
      const arr = map.get(list.date) ?? [];
      arr.push(list);
      map.set(list.date, arr);
    }
    return map;
  }, [displayed]);

  const sortedDates = [...groupedByDate.keys()].sort((a, b) => b.localeCompare(a));

  return (
    <div className="page-content">
      {/* Header */}
      <div style={{ background: C.soft, border: `1px solid ${C.primary}30`, borderRadius: 'var(--radius-xl)', padding: '1.5rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '2.5rem' }}>✅</span>
          <div>
            <h1 style={{ margin: 0, color: C.primary, fontSize: 'clamp(1.25rem, 3vw, 1.75rem)' }}>To-Do Lists</h1>
            <p style={{ margin: '0.25rem 0 0', color: C.text, fontSize: '0.875rem' }}>
              {totalLists} list{totalLists !== 1 ? 's' : ''} · {doneItems}/{totalItems} items done
            </p>
          </div>
        </div>
        <button className="btn" onClick={() => setShowNew(true)} style={{ background: C.primary, color: 'white', fontWeight: 600 }}>
          + New List
        </button>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <div className="card" style={{ padding: '1rem' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>Today's lists</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: C.primary }}>{todayLists.length}</div>
        </div>
        <div className="card" style={{ padding: '1rem' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>Total items</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: C.primary }}>{totalItems}</div>
        </div>
        <div className="card" style={{ padding: '1rem' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>Done</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#15803D' }}>{doneItems}</div>
        </div>
        <div className="card" style={{ padding: '1rem' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>With pending</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: pendingLists.length > 0 ? C.primary : '#15803D' }}>{pendingLists.length}</div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="tabs" style={{ marginBottom: '1.25rem' }}>
        <button className={`tab ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>📋 All ({allLists.length})</button>
        <button className={`tab ${filter === 'today' ? 'active' : ''}`} onClick={() => setFilter('today')}>📅 Today ({todayLists.length})</button>
        <button className={`tab ${filter === 'pending' ? 'active' : ''}`} onClick={() => setFilter('pending')}>⏳ Pending ({pendingLists.length})</button>
      </div>

      {/* Lists */}
      {isLoading ? (
        <div className="loading-container"><div className="spinner" /><span>Loading…</span></div>
      ) : displayed.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">✅</div>
          <p style={{ fontWeight: 600 }}>
            {filter === 'today' ? 'No lists for today yet' : filter === 'pending' ? 'All done! 🎉' : 'No to-do lists yet'}
          </p>
          {filter !== 'pending' && (
            <button className="btn btn-sm" onClick={() => setShowNew(true)} style={{ background: C.primary, color: 'white' }}>
              Create your first list
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {sortedDates.map(date => {
            const lists = groupedByDate.get(date)!;
            const isToday = date === todayStr;
            const isYesterday = date === format(subDays(new Date(), 1), 'yyyy-MM-dd');
            const isTomorrow = date === format(addDays(new Date(), 1), 'yyyy-MM-dd');
            const label = isToday ? 'Today' : isYesterday ? 'Yesterday' : isTomorrow ? 'Tomorrow' : format(new Date(date + 'T00:00:00'), 'EEEE, MMMM d, yyyy');
            return (
              <div key={date}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.625rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.875rem', color: isToday ? C.primary : 'var(--color-text-secondary)' }}>{label}</span>
                  <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {lists.map(list => (
                    <TodoCard
                      key={list._id}
                      list={list}
                      isToday={isToday}
                      onToggleItem={handleToggleItem}
                      onAddItem={handleAddItem}
                      onDelete={setDeleteTarget}
                      onEditTitle={handleEditTitle}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showNew && (
        <NewListModal onClose={() => setShowNew(false)} onSave={handleCreate} />
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => { if (deleteTarget?._id) deleteMut.mutate(deleteTarget._id); setDeleteTarget(null); }}
        title="Delete List"
        message={`Delete "${deleteTarget?.title}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}
