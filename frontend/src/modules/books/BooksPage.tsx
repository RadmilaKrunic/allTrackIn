import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth, getDay, eachDayOfInterval } from 'date-fns';
import type { BookEntry, BookStatus, BorrowType } from '../../types';
import { booksApi } from '../../api/client';
import { useApp } from '../../contexts/AppContext';
import { MODULE_COLORS } from '../../themes/themes';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

const C = MODULE_COLORS.books;

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<BookStatus, { icon: string; label: string; bg: string; border: string; text: string }> = {
  reading:  { icon: '📖', label: 'Reading',  bg: '#EFF6FF', border: '#BFDBFE', text: '#1D4ED8' },
  finished: { icon: '✅', label: 'Finished', bg: '#F0FDF4', border: '#BBF7D0', text: '#15803D' },
  paused:   { icon: '⏸',  label: 'Paused',   bg: '#FFFBEB', border: '#FDE68A', text: '#92400E' },
  wishlist: { icon: '💜', label: 'Wishlist', bg: C.soft,   border: C.primary + '40', text: C.text },
};

const BOOK_STATUSES: BookStatus[] = ['reading', 'finished', 'paused', 'wishlist'];

type BookTab = 'reading' | 'wishlist' | 'borrowed';

// ─── Star Rating ─────────────────────────────────────────────────────────────

interface StarRatingProps {
  value: number;
  onChange?: (v: number) => void;
  size?: string;
}

function StarRating({ value, onChange, size = '1.1rem' }: StarRatingProps) {
  const [hovered, setHovered] = useState(0);
  const display = hovered || value;

  return (
    <div style={{ display: 'flex', gap: '0.1rem' }}>
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          onClick={() => onChange?.(star === value ? 0 : star)}
          onMouseEnter={() => onChange && setHovered(star)}
          onMouseLeave={() => onChange && setHovered(0)}
          style={{
            background: 'none', border: 'none',
            cursor: onChange ? 'pointer' : 'default',
            fontSize: size, padding: '0.05rem',
            lineHeight: 1,
            transition: 'transform 0.1s',
            transform: (onChange && hovered >= star) ? 'scale(1.2)' : 'scale(1)',
          }}
          title={onChange ? `Rate ${star} star${star !== 1 ? 's' : ''}` : undefined}
        >
          {star <= display ? '⭐' : '☆'}
        </button>
      ))}
    </div>
  );
}

// ─── Form State ───────────────────────────────────────────────────────────────

interface BookFormState {
  title: string;
  author: string;
  genre: string;
  status: BookStatus;
  startDate: string;
  endDate: string;
  rating: string;
  notes: string;
  borrowType: BorrowType | '';
  borrowPerson: string;
  borrowDate: string;
}

const EMPTY_FORM: BookFormState = {
  title: '', author: '', genre: '', status: 'reading',
  startDate: '', endDate: '', rating: '', notes: '',
  borrowType: '', borrowPerson: '', borrowDate: '',
};

// ─── Book Form ────────────────────────────────────────────────────────────────

interface BookFormProps {
  form: BookFormState;
  onChange: (form: BookFormState) => void;
  errors: Partial<Record<keyof BookFormState, string>>;
}

function BookForm({ form, onChange, errors }: BookFormProps) {
  function set<K extends keyof BookFormState>(key: K, value: BookFormState[K]) {
    onChange({ ...form, [key]: value });
  }

  const showBorrowFields = form.borrowType === 'borrowed_from' || form.borrowType === 'lent_to';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <div className="form-group">
        <label className="form-label">Title *</label>
        <input
          className="form-input"
          type="text"
          placeholder="Book title…"
          value={form.title}
          onChange={e => set('title', e.target.value)}
        />
        {errors.title && <span style={{ color: '#DC2626', fontSize: '0.78rem' }}>{errors.title}</span>}
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Author</label>
          <input
            className="form-input"
            type="text"
            placeholder="Author name…"
            value={form.author}
            onChange={e => set('author', e.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Genre</label>
          <input
            className="form-input"
            type="text"
            placeholder="e.g. Fiction, Biography…"
            value={form.genre}
            onChange={e => set('genre', e.target.value)}
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Status</label>
          <select
            className="form-select"
            value={form.status}
            onChange={e => set('status', e.target.value as BookStatus)}
          >
            {BOOK_STATUSES.map(s => (
              <option key={s} value={s}>
                {STATUS_CONFIG[s].icon} {STATUS_CONFIG[s].label}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Rating (1–5 stars)</label>
          <div style={{ paddingTop: '0.5rem' }}>
            <StarRating
              value={parseInt(form.rating, 10) || 0}
              onChange={v => set('rating', v === 0 ? '' : String(v))}
              size="1.35rem"
            />
          </div>
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Start Date</label>
          <input
            className="form-input"
            type="date"
            value={form.startDate}
            onChange={e => set('startDate', e.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="form-label">End Date</label>
          <input
            className="form-input"
            type="date"
            value={form.endDate}
            min={form.startDate || undefined}
            onChange={e => set('endDate', e.target.value)}
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Borrow Type</label>
        <select
          className="form-select"
          value={form.borrowType}
          onChange={e => set('borrowType', e.target.value as BorrowType | '')}
        >
          <option value="">None</option>
          <option value="borrowed_from">📥 Borrowed from someone</option>
          <option value="lent_to">📤 Lent to someone</option>
        </select>
      </div>

      {showBorrowFields && (
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">
              {form.borrowType === 'borrowed_from' ? 'Borrowed from' : 'Lent to'} (person)
            </label>
            <input
              className="form-input"
              type="text"
              placeholder="Person's name…"
              value={form.borrowPerson}
              onChange={e => set('borrowPerson', e.target.value)}
            />
            {errors.borrowPerson && (
              <span style={{ color: '#DC2626', fontSize: '0.78rem' }}>{errors.borrowPerson}</span>
            )}
          </div>
          <div className="form-group">
            <label className="form-label">Borrow Date</label>
            <input
              className="form-input"
              type="date"
              value={form.borrowDate}
              onChange={e => set('borrowDate', e.target.value)}
            />
          </div>
        </div>
      )}

      <div className="form-group">
        <label className="form-label">Notes</label>
        <textarea
          className="form-textarea"
          rows={3}
          placeholder="Thoughts, quotes, why you want to read it…"
          value={form.notes}
          onChange={e => set('notes', e.target.value)}
        />
      </div>
    </div>
  );
}

// ─── Book Card ────────────────────────────────────────────────────────────────

interface BookCardProps {
  book: BookEntry;
  onEdit: (b: BookEntry) => void;
  onDelete: (b: BookEntry) => void;
  showBorrow?: boolean;
}

function BookCard({ book, onEdit, onDelete, showBorrow = false }: BookCardProps) {
  const statusCfg = STATUS_CONFIG[book.status];

  return (
    <div
      style={{
        display: 'flex', alignItems: 'stretch',
        background: 'var(--color-bg-card)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-sm)',
        overflow: 'hidden',
        transition: 'box-shadow 0.2s, border-color 0.2s',
      }}
    >
      {/* Left color bar */}
      <div style={{ width: 4, background: statusCfg.border.replace('40', ''), flexShrink: 0 }} />

      <div style={{ flex: 1, padding: '0.875rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
        {/* Top row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '1.1rem' }}>{statusCfg.icon}</span>
              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }} className="truncate">
                {book.title}
              </h4>
              <span style={{
                fontSize: '0.73rem', padding: '0.15rem 0.5rem',
                borderRadius: '999px',
                background: statusCfg.bg, color: statusCfg.text,
                border: `1px solid ${statusCfg.border}`,
                fontWeight: 600, whiteSpace: 'nowrap',
              }}>
                {statusCfg.label}
              </span>
            </div>
            {book.author && (
              <p style={{ margin: '0.125rem 0 0', fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                by {book.author}
              </p>
            )}
          </div>
          <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
            <button className="btn btn-ghost btn-sm btn-icon" onClick={() => onEdit(book)} title="Edit">✏️</button>
            <button className="btn btn-ghost btn-sm btn-icon" onClick={() => onDelete(book)} title="Delete">🗑️</button>
          </div>
        </div>

        {/* Meta row */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {book.genre && (
            <span style={{
              fontSize: '0.75rem', padding: '0.1rem 0.5rem',
              borderRadius: '999px',
              background: 'var(--color-surface)', color: 'var(--color-text-secondary)',
              border: '1px solid var(--color-border)', fontWeight: 500,
            }}>
              {book.genre}
            </span>
          )}
          {book.rating != null && book.rating > 0 && (
            <StarRating value={book.rating} size="0.9rem" />
          )}
          {(book.startDate || book.endDate) && (
            <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
              {book.startDate ? `📅 ${formatDateShort(book.startDate)}` : ''}
              {book.startDate && book.endDate ? ' → ' : ''}
              {book.endDate ? formatDateShort(book.endDate) : ''}
            </span>
          )}
        </div>

        {/* Borrow info */}
        {showBorrow && book.borrowType && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.375rem',
            fontSize: '0.82rem', color: 'var(--color-text-secondary)',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
            padding: '0.25rem 0.625rem',
            alignSelf: 'flex-start',
          }}>
            <span>{book.borrowType === 'borrowed_from' ? '📥' : '📤'}</span>
            <span>
              {book.borrowType === 'borrowed_from' ? 'From' : 'To'}&nbsp;
              <strong>{book.borrowPerson || '—'}</strong>
            </span>
            {book.borrowDate && (
              <span style={{ color: 'var(--color-text-muted)' }}>&middot; {formatDateShort(book.borrowDate)}</span>
            )}
          </div>
        )}

        {/* Notes */}
        {book.notes && (
          <p style={{
            fontSize: '0.82rem', color: 'var(--color-text-secondary)',
            marginBottom: 0, lineHeight: 1.5,
            overflow: 'hidden', display: '-webkit-box',
            WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          }}>
            {book.notes}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Wishlist Card ────────────────────────────────────────────────────────────

interface WishlistCardProps {
  book: BookEntry;
  onEdit: (b: BookEntry) => void;
  onDelete: (b: BookEntry) => void;
}

function WishlistCard({ book, onEdit, onDelete }: WishlistCardProps) {
  return (
    <div className="card" style={{ borderTop: `3px solid ${C.primary}` }}>
      <div style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <span style={{ fontSize: '1.25rem' }}>💜</span>
              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }} className="truncate">{book.title}</h4>
            </div>
            {book.author && (
              <p style={{ margin: '0.125rem 0 0', fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                by {book.author}
              </p>
            )}
          </div>
          <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
            <button className="btn btn-ghost btn-sm btn-icon" onClick={() => onEdit(book)}>✏️</button>
            <button className="btn btn-ghost btn-sm btn-icon" onClick={() => onDelete(book)}>🗑️</button>
          </div>
        </div>
        {book.genre && (
          <span style={{
            fontSize: '0.75rem', padding: '0.1rem 0.5rem',
            borderRadius: '999px', alignSelf: 'flex-start',
            background: C.soft, color: C.text,
            border: `1px solid ${C.primary}40`, fontWeight: 500,
          }}>
            {book.genre}
          </span>
        )}
        {book.notes && (
          <p style={{
            fontSize: '0.82rem', color: 'var(--color-text-secondary)',
            marginBottom: 0, lineHeight: 1.5,
            overflow: 'hidden', display: '-webkit-box',
            WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          }}>
            {book.notes}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateShort(dateStr: string): string {
  if (!dateStr) return '';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function BooksPage() {
  const { notify } = useApp();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<BookTab>('reading');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<BookEntry | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BookEntry | null>(null);
  const [form, setForm] = useState<BookFormState>({ ...EMPTY_FORM });
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof BookFormState, string>>>({});
  const [statsMonth, setStatsMonth] = useState(() => new Date());

  const { data: allBooks = [], isLoading } = useQuery<BookEntry[]>({
    queryKey: ['books'],
    queryFn: () => booksApi.getAll(),
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<BookEntry>) => booksApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
      notify('Book added 📚', 'success');
      closeModal();
    },
    onError: (err: Error) => notify(err.message, 'error'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<BookEntry> }) =>
      booksApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
      notify('Book updated', 'success');
      closeModal();
    },
    onError: (err: Error) => notify(err.message, 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => booksApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
      notify('Book removed', 'success');
    },
    onError: (err: Error) => notify(err.message, 'error'),
  });

  // Derived lists
  const readingBooks = useMemo(
    () => allBooks.filter(b => b.status === 'reading' || b.status === 'finished' || b.status === 'paused'),
    [allBooks]
  );
  const wishlistBooks = useMemo(() => allBooks.filter(b => b.status === 'wishlist'), [allBooks]);
  const borrowedBooks = useMemo(() => allBooks.filter(b => !!b.borrowType), [allBooks]);

  // Progress stat
  const finishedThisYear = useMemo(() => {
    const year = new Date().getFullYear().toString();
    return allBooks.filter(b => b.status === 'finished' && b.endDate?.startsWith(year)).length;
  }, [allBooks]);

  // Stats by status counts
  const statusCounts = useMemo(() => {
    const counts: Record<BookStatus, number> = { reading: 0, finished: 0, paused: 0, wishlist: 0 };
    for (const b of allBooks) {
      counts[b.status] = (counts[b.status] || 0) + 1;
    }
    return counts;
  }, [allBooks]);

  // Book events by date for the calendar
  const bookEventsByDate = useMemo(() => {
    const map = new Map<string, { type: 'start' | 'end'; book: BookEntry }[]>();
    for (const b of allBooks) {
      if (b.startDate) {
        if (!map.has(b.startDate)) map.set(b.startDate, []);
        map.get(b.startDate)!.push({ type: 'start', book: b });
      }
      if (b.endDate) {
        if (!map.has(b.endDate)) map.set(b.endDate, []);
        map.get(b.endDate)!.push({ type: 'end', book: b });
      }
    }
    return map;
  }, [allBooks]);

  // Calendar days for statsMonth
  const calendarData = useMemo(() => {
    const monthStart = startOfMonth(statsMonth);
    const monthEnd = endOfMonth(statsMonth);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const startDow = getDay(monthStart); // 0=Sun
    return { days, startDow };
  }, [statsMonth]);

  const todayStr = format(new Date(), 'yyyy-MM-dd');

  function prevMonth() {
    setStatsMonth(m => {
      const d = new Date(m);
      d.setMonth(d.getMonth() - 1);
      return d;
    });
  }

  function nextMonth() {
    setStatsMonth(m => {
      const d = new Date(m);
      d.setMonth(d.getMonth() + 1);
      return d;
    });
  }

  function openAdd() {
    setEditingBook(null);
    setForm({ ...EMPTY_FORM });
    setFormErrors({});
    setModalOpen(true);
  }

  function openEdit(book: BookEntry) {
    setEditingBook(book);
    setForm({
      title: book.title,
      author: book.author ?? '',
      genre: book.genre ?? '',
      status: book.status,
      startDate: book.startDate ?? '',
      endDate: book.endDate ?? '',
      rating: book.rating != null ? String(book.rating) : '',
      notes: book.notes ?? '',
      borrowType: book.borrowType ?? '',
      borrowPerson: book.borrowPerson ?? '',
      borrowDate: book.borrowDate ?? '',
    });
    setFormErrors({});
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingBook(null);
    setFormErrors({});
  }

  function validate(): boolean {
    const e: Partial<Record<keyof BookFormState, string>> = {};
    if (!form.title.trim()) e.title = 'Title is required';
    if ((form.borrowType === 'borrowed_from' || form.borrowType === 'lent_to') && !form.borrowPerson.trim())
      e.borrowPerson = 'Person name is required for borrow entries';
    setFormErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    const payload: Partial<BookEntry> = {
      title: form.title.trim(),
      author: form.author.trim() || undefined,
      genre: form.genre.trim() || undefined,
      status: form.status,
      startDate: form.startDate || undefined,
      endDate: form.endDate || undefined,
      rating: form.rating ? parseInt(form.rating, 10) : undefined,
      notes: form.notes.trim() || undefined,
      borrowType: (form.borrowType as BorrowType) || undefined,
      borrowPerson: form.borrowPerson.trim() || undefined,
      borrowDate: form.borrowDate || undefined,
    };
    if (editingBook?._id) {
      updateMutation.mutate({ id: editingBook._id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const totalBooks = allBooks.length;

  return (
    <div className="page-content">
      {/* Header strip */}
      <div style={{
        background: C.soft,
        border: `1px solid ${C.primary}30`,
        borderRadius: 'var(--radius-xl)',
        padding: '1.5rem',
        marginBottom: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '2.5rem' }}>📚</span>
          <div>
            <h1 style={{ margin: 0, color: C.primary, fontSize: 'clamp(1.25rem, 3vw, 1.75rem)' }}>Books & Reading</h1>
            <p style={{ margin: '0.25rem 0 0', color: C.text, fontSize: '0.875rem' }}>
              {finishedThisYear} book{finishedThisYear !== 1 ? 's' : ''} finished this year &middot;{' '}
              {wishlistBooks.length} on wishlist
            </p>
          </div>
        </div>
        <button
          className="btn"
          onClick={openAdd}
          style={{ background: C.primary, color: 'white', fontWeight: 600 }}
        >
          + Add Book
        </button>
      </div>

      {/* Stats row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
        gap: '0.75rem',
        marginBottom: '1.25rem',
      }}>
        <div className="card" style={{ padding: '1rem' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>Currently reading</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: C.dark }}>
            {allBooks.filter(b => b.status === 'reading').length}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>book{allBooks.filter(b => b.status === 'reading').length !== 1 ? 's' : ''}</div>
        </div>
        <div className="card" style={{ padding: '1rem' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>Finished {new Date().getFullYear()}</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#15803D' }}>{finishedThisYear}</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>completed</div>
        </div>
        <div className="card" style={{ padding: '1rem' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>Wishlist</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: C.dark }}>{wishlistBooks.length}</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>to read</div>
        </div>
        <div className="card" style={{ padding: '1rem' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>Borrowed</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#92400E' }}>{borrowedBooks.length}</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>tracked</div>
        </div>
      </div>

      {/* Stats by Status + Book Calendar */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '1.25rem',
        marginBottom: '1.25rem',
      }}>
        {/* LEFT: Stats by Status */}
        <div className="card" style={{ overflow: 'hidden' }}>
          {/* Card header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.875rem 1rem',
            borderBottom: '1px solid var(--color-border)',
          }}>
            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>📊 Reading Stats</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <button
                onClick={prevMonth}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--color-text-secondary)', fontSize: '1rem',
                  padding: '0.1rem 0.35rem', borderRadius: 'var(--radius-sm)',
                  lineHeight: 1,
                }}
                title="Previous month"
              >
                ‹
              </button>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontWeight: 500, minWidth: '6rem', textAlign: 'center' }}>
                {format(statsMonth, 'MMMM yyyy')}
              </span>
              <button
                onClick={nextMonth}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--color-text-secondary)', fontSize: '1rem',
                  padding: '0.1rem 0.35rem', borderRadius: 'var(--radius-sm)',
                  lineHeight: 1,
                }}
                title="Next month"
              >
                ›
              </button>
            </div>
          </div>
          {/* Card body */}
          <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {totalBooks === 0 ? (
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: 0, textAlign: 'center', padding: '0.5rem 0' }}>
                No books yet
              </p>
            ) : (
              BOOK_STATUSES.filter(s => statusCounts[s] > 0).map(s => {
                const cfg = STATUS_CONFIG[s];
                const count = statusCounts[s];
                const pct = totalBooks > 0 ? Math.round((count / totalBooks) * 100) : 0;
                return (
                  <div key={s}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <span>{cfg.icon}</span>
                        <span>{cfg.label}</span>
                      </span>
                      <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                        {count} &middot; {pct}%
                      </span>
                    </div>
                    <div style={{
                      height: '0.5rem',
                      background: 'var(--color-surface)',
                      borderRadius: '999px',
                      overflow: 'hidden',
                      border: '1px solid var(--color-border)',
                    }}>
                      <div style={{
                        height: '100%',
                        width: `${pct}%`,
                        background: cfg.text,
                        borderRadius: '999px',
                        transition: 'width 0.4s ease',
                        minWidth: pct > 0 ? '0.375rem' : '0',
                      }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT: Book Calendar */}
        <div className="card" style={{ overflow: 'hidden' }}>
          {/* Card header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.875rem 1rem',
            borderBottom: '1px solid var(--color-border)',
          }}>
            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>📅 Book Activity</span>
            <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
              {format(statsMonth, 'MMMM yyyy')}
            </span>
          </div>
          {/* Calendar body */}
          <div style={{ padding: '0.75rem 0.875rem' }}>
            {/* Day-of-week headers */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: '0.15rem',
              marginBottom: '0.25rem',
            }}>
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                <div key={d} style={{
                  textAlign: 'center',
                  fontSize: '0.68rem',
                  fontWeight: 600,
                  color: 'var(--color-text-muted)',
                  padding: '0.1rem 0',
                }}>
                  {d}
                </div>
              ))}
            </div>
            {/* Calendar grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: '0.15rem',
            }}>
              {/* Leading blank cells */}
              {Array.from({ length: calendarData.startDow }).map((_, i) => (
                <div key={`blank-${i}`} />
              ))}
              {/* Day cells */}
              {calendarData.days.map(day => {
                const dayStr = format(day, 'yyyy-MM-dd');
                const events = bookEventsByDate.get(dayStr) ?? [];
                const isToday = dayStr === todayStr;

                // Determine dominant event type (end takes priority over start)
                const hasEnd = events.some(e => e.type === 'end');
                const hasStart = events.some(e => e.type === 'start');
                const hasEvent = hasEnd || hasStart;

                let cellBg = 'var(--color-surface)';
                let cellIcon: string | null = null;
                let titleText = '';

                if (hasEnd) {
                  cellBg = '#DCFCE7'; // green-100
                  cellIcon = '✅';
                  const books = events.filter(e => e.type === 'end').map(e => e.book.title);
                  titleText = `Finished: ${books.join(', ')}`;
                } else if (hasStart) {
                  cellBg = '#DBEAFE'; // blue-100
                  cellIcon = '📖';
                  const books = events.filter(e => e.type === 'start').map(e => e.book.title);
                  titleText = `Started: ${books.join(', ')}`;
                }

                return (
                  <div
                    key={dayStr}
                    title={titleText || undefined}
                    style={{
                      aspectRatio: '1',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 'var(--radius-sm)',
                      background: hasEvent ? cellBg : 'var(--color-surface)',
                      border: isToday
                        ? `2px solid ${C.primary}`
                        : '1px solid transparent',
                      fontSize: cellIcon ? '0.7rem' : '0.72rem',
                      color: hasEvent ? (hasEnd ? '#15803D' : '#1D4ED8') : 'var(--color-text-secondary)',
                      fontWeight: isToday ? 700 : 400,
                      lineHeight: 1,
                      gap: '0.05rem',
                      cursor: hasEvent ? 'default' : 'default',
                      transition: 'background 0.15s',
                    }}
                  >
                    {cellIcon && (
                      <span style={{ fontSize: '0.65rem', lineHeight: 1 }}>{cellIcon}</span>
                    )}
                    <span>{format(day, 'd')}</span>
                  </div>
                );
              })}
            </div>
            {/* Legend */}
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.625rem', justifyContent: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <div style={{ width: '0.7rem', height: '0.7rem', borderRadius: '2px', background: '#DBEAFE', border: '1px solid #BFDBFE' }} />
                <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>📖 Started</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <div style={{ width: '0.7rem', height: '0.7rem', borderRadius: '2px', background: '#DCFCE7', border: '1px solid #BBF7D0' }} />
                <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>✅ Finished</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs mb-4">
        <button
          className={`tab ${tab === 'reading' ? 'active' : ''}`}
          onClick={() => setTab('reading')}
        >
          📖 Reading ({readingBooks.length})
        </button>
        <button
          className={`tab ${tab === 'wishlist' ? 'active' : ''}`}
          onClick={() => setTab('wishlist')}
        >
          💜 Wishlist ({wishlistBooks.length})
        </button>
        <button
          className={`tab ${tab === 'borrowed' ? 'active' : ''}`}
          onClick={() => setTab('borrowed')}
        >
          🔄 Borrowed ({borrowedBooks.length})
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="loading-container">
          <div className="spinner" />
          <span>Loading books…</span>
        </div>
      ) : tab === 'reading' ? (
        readingBooks.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📖</div>
            <p style={{ fontWeight: 600 }}>No books in your reading list</p>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
              Add books you are reading, finished, or paused.
            </p>
            <button className="btn btn-primary btn-sm" onClick={openAdd} style={{ background: C.primary }}>
              Add your first book
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {readingBooks.map(book => (
              <BookCard
                key={book._id}
                book={book}
                onEdit={openEdit}
                onDelete={b => setDeleteTarget(b)}
              />
            ))}
          </div>
        )
      ) : tab === 'wishlist' ? (
        wishlistBooks.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">💜</div>
            <p style={{ fontWeight: 600 }}>Your wishlist is empty</p>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
              Save books you want to read.
            </p>
            <button className="btn btn-primary btn-sm" onClick={openAdd} style={{ background: C.primary }}>
              Add to wishlist
            </button>
          </div>
        ) : (
          <div className="grid-auto">
            {wishlistBooks.map(book => (
              <WishlistCard
                key={book._id}
                book={book}
                onEdit={openEdit}
                onDelete={b => setDeleteTarget(b)}
              />
            ))}
          </div>
        )
      ) : (
        // Borrowed tab
        borrowedBooks.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🔄</div>
            <p style={{ fontWeight: 600 }}>No borrowed books tracked</p>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
              Track books you borrowed or lent to others.
            </p>
            <button className="btn btn-primary btn-sm" onClick={openAdd} style={{ background: C.primary }}>
              Track a borrowed book
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {/* Borrowed from others */}
            {borrowedBooks.filter(b => b.borrowType === 'borrowed_from').length > 0 && (
              <div style={{ marginBottom: '0.75rem' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem',
                }}>
                  <span style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                    📥 Borrowed from others
                  </span>
                  <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {borrowedBooks
                    .filter(b => b.borrowType === 'borrowed_from')
                    .map(book => (
                      <BookCard key={book._id} book={book} onEdit={openEdit} onDelete={b => setDeleteTarget(b)} showBorrow />
                    ))}
                </div>
              </div>
            )}
            {/* Lent to others */}
            {borrowedBooks.filter(b => b.borrowType === 'lent_to').length > 0 && (
              <div>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem',
                }}>
                  <span style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                    📤 Lent to others
                  </span>
                  <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {borrowedBooks
                    .filter(b => b.borrowType === 'lent_to')
                    .map(book => (
                      <BookCard key={book._id} book={book} onEdit={openEdit} onDelete={b => setDeleteTarget(b)} showBorrow />
                    ))}
                </div>
              </div>
            )}
          </div>
        )
      )}

      {/* Add / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editingBook ? 'Edit Book' : 'Add Book'}
        size="lg"
        footer={
          <>
            <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
            <button
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={isSaving}
              style={{ background: C.primary }}
            >
              {isSaving ? 'Saving…' : editingBook ? 'Save Changes' : 'Add Book'}
            </button>
          </>
        }
      >
        <BookForm form={form} onChange={setForm} errors={formErrors} />
      </Modal>

      {/* Confirm Delete */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => { if (deleteTarget?._id) deleteMutation.mutate(deleteTarget._id); }}
        title="Remove Book"
        message={`Remove "${deleteTarget?.title}" from your library? This cannot be undone.`}
        confirmLabel="Remove"
        variant="danger"
      />
    </div>
  );
}
