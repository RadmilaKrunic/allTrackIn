import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  format, startOfMonth, endOfMonth, getDay, eachDayOfInterval,
  addMonths, subMonths,
} from 'date-fns';
import { spendingApi } from '../../api/client';
import { useApp } from '../../contexts/AppContext';
import { MODULE_COLORS } from '../../themes/themes';
import type { SpendingEntry, TransactionType, PlanDoneStatus } from '../../types';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import PlanDoneToggle from '../../components/ui/PlanDoneToggle';

const COLOR = MODULE_COLORS.spending;

// ─── Helpers ────────────────────────────────────────────────────────────────

function today() {
  return new Date().toISOString().slice(0, 10);
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function formatDate(dateStr?: string) {
  if (!dateStr) return '—';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function transactionIcon(type?: TransactionType) {
  if (type === 'expense') return '💸';
  if (type === 'income') return '💰';
  if (type === 'saving') return '🏦';
  return '💳';
}

function StatusBadge({ status }: { status: PlanDoneStatus }) {
  return (
    <span className={`status-badge ${status}`}>
      {status === 'plan' ? '📋 Plan' : '✓ Done'}
    </span>
  );
}

// ─── Transaction Form ────────────────────────────────────────────────────────

interface TransactionFormData {
  date: string;
  amount: string;
  transactionType: TransactionType;
  category: string;
  description: string;
  status: PlanDoneStatus;
}

const EMPTY_TRANSACTION: TransactionFormData = {
  date: today(),
  amount: '',
  transactionType: 'expense',
  category: '',
  description: '',
  status: 'plan',
};

interface TransactionFormProps {
  initial?: TransactionFormData;
  onSubmit: (data: TransactionFormData) => void;
  onCancel: () => void;
  loading: boolean;
  submitLabel: string;
}

function TransactionForm({ initial = EMPTY_TRANSACTION, onSubmit, onCancel, loading, submitLabel }: TransactionFormProps) {
  const [form, setForm] = useState<TransactionFormData>(initial);
  const [errors, setErrors] = useState<Partial<Record<keyof TransactionFormData, string>>>({});

  const set = <K extends keyof TransactionFormData>(key: K, val: TransactionFormData[K]) =>
    setForm(prev => ({ ...prev, [key]: val }));

  function validate(): boolean {
    const e: typeof errors = {};
    if (!form.date) e.date = 'Date is required';
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0)
      e.amount = 'Enter a valid amount';
    if (!form.category.trim()) e.category = 'Category is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (validate()) onSubmit(form);
  }

  return (
    <form onSubmit={handleSubmit}>
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
          <label className="form-label">Amount *</label>
          <input
            className="form-input"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={form.amount}
            onChange={e => set('amount', e.target.value)}
          />
          {errors.amount && <span style={{ color: '#DC2626', fontSize: '0.78rem' }}>{errors.amount}</span>}
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Type</label>
          <select
            className="form-select"
            value={form.transactionType}
            onChange={e => set('transactionType', e.target.value as TransactionType)}
          >
            <option value="expense">💸 Expense</option>
            <option value="income">💰 Income</option>
            <option value="saving">🏦 Saving</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Category *</label>
          <input
            className="form-input"
            type="text"
            placeholder="e.g. Food, Rent…"
            value={form.category}
            onChange={e => set('category', e.target.value)}
          />
          {errors.category && <span style={{ color: '#DC2626', fontSize: '0.78rem' }}>{errors.category}</span>}
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Description</label>
        <input
          className="form-input"
          type="text"
          placeholder="Optional note…"
          value={form.description}
          onChange={e => set('description', e.target.value)}
        />
      </div>

      <div className="form-group">
        <label className="form-label">Status</label>
        <PlanDoneToggle status={form.status} onChange={s => set('status', s)} />
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        <button
          type="submit"
          className="btn btn-primary"
          style={{ background: COLOR.primary }}
          disabled={loading}
        >
          {loading ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  );
}

// ─── Fixed Bill Form ─────────────────────────────────────────────────────────

interface FixedFormData {
  dayOfMonth: string;
  amount: string;
  category: string;
  description: string;
  status: PlanDoneStatus;
}

const EMPTY_FIXED: FixedFormData = {
  dayOfMonth: '1',
  amount: '',
  category: '',
  description: '',
  status: 'plan',
};

interface FixedFormProps {
  initial?: FixedFormData;
  onSubmit: (data: FixedFormData) => void;
  onCancel: () => void;
  loading: boolean;
  submitLabel: string;
}

function FixedForm({ initial = EMPTY_FIXED, onSubmit, onCancel, loading, submitLabel }: FixedFormProps) {
  const [form, setForm] = useState<FixedFormData>(initial);
  const [errors, setErrors] = useState<Partial<Record<keyof FixedFormData, string>>>({});

  const set = <K extends keyof FixedFormData>(key: K, val: FixedFormData[K]) =>
    setForm(prev => ({ ...prev, [key]: val }));

  function validate(): boolean {
    const e: typeof errors = {};
    const day = Number(form.dayOfMonth);
    if (!form.dayOfMonth || isNaN(day) || day < 1 || day > 31)
      e.dayOfMonth = 'Enter a valid day (1-31)';
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0)
      e.amount = 'Enter a valid amount';
    if (!form.category.trim()) e.category = 'Category is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (validate()) onSubmit(form);
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Day of Month *</label>
          <input
            className="form-input"
            type="number"
            min="1"
            max="31"
            placeholder="1"
            value={form.dayOfMonth}
            onChange={e => set('dayOfMonth', e.target.value)}
          />
          {errors.dayOfMonth && <span style={{ color: '#DC2626', fontSize: '0.78rem' }}>{errors.dayOfMonth}</span>}
        </div>
        <div className="form-group">
          <label className="form-label">Amount *</label>
          <input
            className="form-input"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={form.amount}
            onChange={e => set('amount', e.target.value)}
          />
          {errors.amount && <span style={{ color: '#DC2626', fontSize: '0.78rem' }}>{errors.amount}</span>}
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Category *</label>
        <input
          className="form-input"
          type="text"
          placeholder="e.g. Rent, Netflix…"
          value={form.category}
          onChange={e => set('category', e.target.value)}
        />
        {errors.category && <span style={{ color: '#DC2626', fontSize: '0.78rem' }}>{errors.category}</span>}
      </div>

      <div className="form-group">
        <label className="form-label">Description</label>
        <input
          className="form-input"
          type="text"
          placeholder="Optional note…"
          value={form.description}
          onChange={e => set('description', e.target.value)}
        />
      </div>

      <div className="form-group">
        <label className="form-label">Status</label>
        <PlanDoneToggle status={form.status} onChange={s => set('status', s)} />
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        <button
          type="submit"
          className="btn btn-primary"
          style={{ background: COLOR.primary }}
          disabled={loading}
        >
          {loading ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  );
}

// ─── Product Form ─────────────────────────────────────────────────────────────

interface ProductFormData {
  name: string;
  price: string;
  unit: string;
  category: string;
  status: PlanDoneStatus;
}

const EMPTY_PRODUCT: ProductFormData = {
  name: '',
  price: '',
  unit: '',
  category: '',
  status: 'plan',
};

interface ProductFormProps {
  initial?: ProductFormData;
  onSubmit: (data: ProductFormData) => void;
  onCancel: () => void;
  loading: boolean;
  submitLabel: string;
}

function ProductForm({ initial = EMPTY_PRODUCT, onSubmit, onCancel, loading, submitLabel }: ProductFormProps) {
  const [form, setForm] = useState<ProductFormData>(initial);
  const [errors, setErrors] = useState<Partial<Record<keyof ProductFormData, string>>>({});

  const set = <K extends keyof ProductFormData>(key: K, val: ProductFormData[K]) =>
    setForm(prev => ({ ...prev, [key]: val }));

  function validate(): boolean {
    const e: typeof errors = {};
    if (!form.name.trim()) e.name = 'Product name is required';
    if (form.price && (isNaN(Number(form.price)) || Number(form.price) < 0))
      e.price = 'Enter a valid price';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (validate()) onSubmit(form);
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label className="form-label">Product Name *</label>
        <input
          className="form-input"
          type="text"
          placeholder="e.g. Milk, Bread…"
          value={form.name}
          onChange={e => set('name', e.target.value)}
        />
        {errors.name && <span style={{ color: '#DC2626', fontSize: '0.78rem' }}>{errors.name}</span>}
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Price</label>
          <input
            className="form-input"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={form.price}
            onChange={e => set('price', e.target.value)}
          />
          {errors.price && <span style={{ color: '#DC2626', fontSize: '0.78rem' }}>{errors.price}</span>}
        </div>
        <div className="form-group">
          <label className="form-label">Unit</label>
          <input
            className="form-input"
            type="text"
            placeholder="e.g. kg, pcs…"
            value={form.unit}
            onChange={e => set('unit', e.target.value)}
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Category</label>
        <input
          className="form-input"
          type="text"
          placeholder="e.g. Dairy, Produce…"
          value={form.category}
          onChange={e => set('category', e.target.value)}
        />
      </div>

      <div className="form-group">
        <label className="form-label">Status</label>
        <PlanDoneToggle status={form.status} onChange={s => set('status', s)} />
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        <button
          type="submit"
          className="btn btn-primary"
          style={{ background: COLOR.primary }}
          disabled={loading}
        >
          {loading ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  );
}

// ─── Transactions Tab ─────────────────────────────────────────────────────────

function TransactionsTab() {
  const qc = useQueryClient();
  const { notify } = useApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SpendingEntry | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SpendingEntry | null>(null);

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['spending', 'transactions'],
    queryFn: () => spendingApi.getTransactions(),
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<SpendingEntry>) => spendingApi.createTransaction(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['spending', 'transactions'] });
      notify('Transaction added', 'success');
      setModalOpen(false);
    },
    onError: (err: Error) => notify(err.message, 'error'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<SpendingEntry> }) =>
      spendingApi.updateTransaction(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['spending', 'transactions'] });
      notify('Transaction updated', 'success');
      setEditing(null);
    },
    onError: (err: Error) => notify(err.message, 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => spendingApi.deleteTransaction(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['spending', 'transactions'] });
      notify('Transaction deleted', 'success');
    },
    onError: (err: Error) => notify(err.message, 'error'),
  });

  // Stats
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const monthTx = transactions.filter(t => {
    if (!t.date) return false;
    const d = new Date(t.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear && t.status === 'done';
  });
  const totalExpenses = monthTx
    .filter(t => t.transactionType === 'expense')
    .reduce((s, t) => s + t.amount, 0);
  const totalIncome = monthTx
    .filter(t => t.transactionType === 'income')
    .reduce((s, t) => s + t.amount, 0);
  const balance = totalIncome - totalExpenses;

  function handleCreate(form: TransactionFormData) {
    createMutation.mutate({
      entryType: 'transaction',
      date: form.date,
      amount: Number(form.amount),
      transactionType: form.transactionType,
      category: form.category,
      description: form.description || undefined,
      status: form.status,
    });
  }

  function handleUpdate(form: TransactionFormData) {
    if (!editing?._id) return;
    updateMutation.mutate({
      id: editing._id,
      data: {
        date: form.date,
        amount: Number(form.amount),
        transactionType: form.transactionType,
        category: form.category,
        description: form.description || undefined,
        status: form.status,
      },
    });
  }

  function openEdit(entry: SpendingEntry) {
    setEditing(entry);
  }

  function toFormData(entry: SpendingEntry): TransactionFormData {
    return {
      date: entry.date ?? today(),
      amount: String(entry.amount),
      transactionType: entry.transactionType ?? 'expense',
      category: entry.category,
      description: entry.description ?? '',
      status: entry.status,
    };
  }

  const sorted = [...transactions].sort((a, b) =>
    (b.date ?? '').localeCompare(a.date ?? '')
  );

  return (
    <>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <div className="card" style={{ padding: '1rem' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>Expenses</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#DC2626' }}>{formatCurrency(totalExpenses)}</div>
        </div>
        <div className="card" style={{ padding: '1rem' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>Income</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#16A34A' }}>{formatCurrency(totalIncome)}</div>
        </div>
        <div className="card" style={{ padding: '1rem' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>Balance</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: balance >= 0 ? '#16A34A' : '#DC2626' }}>
            {formatCurrency(balance)}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
        <button
          className="btn btn-primary"
          style={{ background: COLOR.primary }}
          onClick={() => setModalOpen(true)}
        >
          + Add Transaction
        </button>
      </div>

      {isLoading ? (
        <div className="loading-container"><div className="spinner" /></div>
      ) : sorted.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">💳</div>
          <p>No transactions yet</p>
          <button className="btn btn-primary" style={{ background: COLOR.primary }} onClick={() => setModalOpen(true)}>
            Add your first transaction
          </button>
        </div>
      ) : (
        <div>
          {sorted.map(tx => (
            <div key={tx._id} className="list-item">
              <span style={{ fontSize: '1.4rem' }}>{transactionIcon(tx.transactionType)}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{tx.category}</span>
                  <StatusBadge status={tx.status} />
                </div>
                {tx.description && (
                  <div style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginTop: '0.1rem' }}>
                    {tx.description}
                  </div>
                )}
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.1rem' }}>
                  {formatDate(tx.date)}
                </div>
              </div>
              <div style={{
                fontWeight: 700,
                fontSize: '1rem',
                color: tx.transactionType === 'income' ? '#16A34A' : tx.transactionType === 'saving' ? '#2563EB' : '#DC2626',
                whiteSpace: 'nowrap',
              }}>
                {tx.transactionType === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => openEdit(tx)}>✏️</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setDeleteTarget(tx)}>🗑️</button>
            </div>
          ))}
        </div>
      )}

      {/* Add modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Add Transaction">
        <TransactionForm
          onSubmit={handleCreate}
          onCancel={() => setModalOpen(false)}
          loading={createMutation.isPending}
          submitLabel="Add Transaction"
        />
      </Modal>

      {/* Edit modal */}
      <Modal isOpen={!!editing} onClose={() => setEditing(null)} title="Edit Transaction">
        {editing && (
          <TransactionForm
            initial={toFormData(editing)}
            onSubmit={handleUpdate}
            onCancel={() => setEditing(null)}
            loading={updateMutation.isPending}
            submitLabel="Save Changes"
          />
        )}
      </Modal>

      {/* Delete confirm */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget?._id && deleteMutation.mutate(deleteTarget._id)}
        title="Delete Transaction"
        message={`Delete "${deleteTarget?.category}" transaction? This cannot be undone.`}
      />
    </>
  );
}

// ─── Fixed Bills Tab ──────────────────────────────────────────────────────────

function FixedBillsTab() {
  const qc = useQueryClient();
  const { notify } = useApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SpendingEntry | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SpendingEntry | null>(null);

  const { data: fixed = [], isLoading } = useQuery({
    queryKey: ['spending', 'fixed'],
    queryFn: () => spendingApi.getFixed(),
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<SpendingEntry>) => spendingApi.createFixed(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['spending', 'fixed'] });
      notify('Fixed bill added', 'success');
      setModalOpen(false);
    },
    onError: (err: Error) => notify(err.message, 'error'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<SpendingEntry> }) =>
      spendingApi.updateFixed(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['spending', 'fixed'] });
      notify('Fixed bill updated', 'success');
      setEditing(null);
    },
    onError: (err: Error) => notify(err.message, 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => spendingApi.deleteFixed(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['spending', 'fixed'] });
      notify('Fixed bill deleted', 'success');
    },
    onError: (err: Error) => notify(err.message, 'error'),
  });

  const totalFixed = fixed.reduce((s, f) => s + f.amount, 0);

  function handleCreate(form: FixedFormData) {
    createMutation.mutate({
      entryType: 'fixed',
      dayOfMonth: Number(form.dayOfMonth),
      amount: Number(form.amount),
      category: form.category,
      description: form.description || undefined,
      status: form.status,
    });
  }

  function handleUpdate(form: FixedFormData) {
    if (!editing?._id) return;
    updateMutation.mutate({
      id: editing._id,
      data: {
        dayOfMonth: Number(form.dayOfMonth),
        amount: Number(form.amount),
        category: form.category,
        description: form.description || undefined,
        status: form.status,
      },
    });
  }

  function toFormData(entry: SpendingEntry): FixedFormData {
    return {
      dayOfMonth: String(entry.dayOfMonth ?? 1),
      amount: String(entry.amount),
      category: entry.category,
      description: entry.description ?? '',
      status: entry.status,
    };
  }

  const sorted = [...fixed].sort((a, b) => (a.dayOfMonth ?? 0) - (b.dayOfMonth ?? 0));

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
          Monthly total: <strong style={{ color: COLOR.dark }}>{formatCurrency(totalFixed)}</strong>
        </div>
        <button
          className="btn btn-primary"
          style={{ background: COLOR.primary }}
          onClick={() => setModalOpen(true)}
        >
          + Add Bill
        </button>
      </div>

      {isLoading ? (
        <div className="loading-container"><div className="spinner" /></div>
      ) : sorted.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🔄</div>
          <p>No recurring bills yet</p>
          <button className="btn btn-primary" style={{ background: COLOR.primary }} onClick={() => setModalOpen(true)}>
            Add your first bill
          </button>
        </div>
      ) : (
        <div>
          {sorted.map(bill => (
            <div key={bill._id} className="list-item">
              <div style={{
                width: '2.5rem', height: '2.5rem',
                borderRadius: 'var(--radius-md)',
                background: COLOR.soft,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: '0.85rem', color: COLOR.text,
                flexShrink: 0,
              }}>
                {bill.dayOfMonth}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{bill.category}</span>
                  <StatusBadge status={bill.status} />
                </div>
                {bill.description && (
                  <div style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>{bill.description}</div>
                )}
              </div>
              <div style={{ fontWeight: 700, color: '#DC2626', whiteSpace: 'nowrap' }}>
                {formatCurrency(bill.amount)}
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditing(bill)}>✏️</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setDeleteTarget(bill)}>🗑️</button>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Add Fixed Bill">
        <FixedForm
          onSubmit={handleCreate}
          onCancel={() => setModalOpen(false)}
          loading={createMutation.isPending}
          submitLabel="Add Bill"
        />
      </Modal>

      <Modal isOpen={!!editing} onClose={() => setEditing(null)} title="Edit Fixed Bill">
        {editing && (
          <FixedForm
            initial={toFormData(editing)}
            onSubmit={handleUpdate}
            onCancel={() => setEditing(null)}
            loading={updateMutation.isPending}
            submitLabel="Save Changes"
          />
        )}
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget?._id && deleteMutation.mutate(deleteTarget._id)}
        title="Delete Fixed Bill"
        message={`Delete "${deleteTarget?.category}" recurring bill? This cannot be undone.`}
      />
    </>
  );
}

// ─── Shopping Tab ─────────────────────────────────────────────────────────────

function ShoppingTab() {
  const qc = useQueryClient();
  const { notify } = useApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SpendingEntry | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SpendingEntry | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['spending', 'products'],
    queryFn: () => spendingApi.getProducts(),
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<SpendingEntry>) => spendingApi.createProduct(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['spending', 'products'] });
      notify('Product added', 'success');
      setModalOpen(false);
    },
    onError: (err: Error) => notify(err.message, 'error'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<SpendingEntry> }) =>
      spendingApi.updateProduct(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['spending', 'products'] });
      notify('Product updated', 'success');
      setEditing(null);
    },
    onError: (err: Error) => notify(err.message, 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => spendingApi.deleteProduct(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['spending', 'products'] });
      notify('Product deleted', 'success');
    },
    onError: (err: Error) => notify(err.message, 'error'),
  });

  const estimatedTotal = useMemo(() => {
    return products
      .filter(p => p._id && selected.has(p._id))
      .reduce((s, p) => s + (p.price ?? p.amount ?? 0), 0);
  }, [products, selected]);

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleGenerateList() {
    if (selected.size === 0) return;
    setGenerating(true);
    try {
      await spendingApi.createShoppingList(Array.from(selected));
      notify(`Shopping list created with ${selected.size} item(s)`, 'success');
      setSelected(new Set());
    } catch (err) {
      notify((err as Error).message, 'error');
    } finally {
      setGenerating(false);
    }
  }

  function handleCreate(form: ProductFormData) {
    createMutation.mutate({
      entryType: 'product',
      name: form.name,
      price: form.price ? Number(form.price) : undefined,
      amount: form.price ? Number(form.price) : 0,
      unit: form.unit || undefined,
      category: form.category || 'General',
      status: form.status,
    });
  }

  function handleUpdate(form: ProductFormData) {
    if (!editing?._id) return;
    updateMutation.mutate({
      id: editing._id,
      data: {
        name: form.name,
        price: form.price ? Number(form.price) : undefined,
        amount: form.price ? Number(form.price) : 0,
        unit: form.unit || undefined,
        category: form.category || 'General',
        status: form.status,
      },
    });
  }

  function toFormData(entry: SpendingEntry): ProductFormData {
    return {
      name: entry.name ?? '',
      price: entry.price != null ? String(entry.price) : '',
      unit: entry.unit ?? '',
      category: entry.category,
      status: entry.status,
    };
  }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        {selected.size > 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
              {selected.size} selected · Est. <strong style={{ color: COLOR.dark }}>{formatCurrency(estimatedTotal)}</strong>
            </span>
            <button
              className="btn btn-primary btn-sm"
              style={{ background: COLOR.primary }}
              onClick={handleGenerateList}
              disabled={generating}
            >
              {generating ? 'Generating…' : '🛒 Generate List'}
            </button>
          </div>
        ) : (
          <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
            Select products to generate a shopping list
          </span>
        )}
        <button
          className="btn btn-primary"
          style={{ background: COLOR.primary }}
          onClick={() => setModalOpen(true)}
        >
          + Add Product
        </button>
      </div>

      {isLoading ? (
        <div className="loading-container"><div className="spinner" /></div>
      ) : products.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🛒</div>
          <p>No products yet</p>
          <button className="btn btn-primary" style={{ background: COLOR.primary }} onClick={() => setModalOpen(true)}>
            Add your first product
          </button>
        </div>
      ) : (
        <div>
          {products.map(product => {
            const isSelected = product._id ? selected.has(product._id) : false;
            return (
              <div
                key={product._id}
                className="list-item"
                style={{
                  cursor: 'pointer',
                  borderColor: isSelected ? COLOR.primary : undefined,
                  background: isSelected ? COLOR.soft : undefined,
                }}
                onClick={() => product._id && toggleSelect(product._id)}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => product._id && toggleSelect(product._id)}
                  onClick={e => e.stopPropagation()}
                  style={{ width: '1.1rem', height: '1.1rem', cursor: 'pointer', accentColor: COLOR.primary }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{product.name}</span>
                    {product.unit && (
                      <span className="badge" style={{ background: COLOR.soft, color: COLOR.text }}>
                        {product.unit}
                      </span>
                    )}
                    <StatusBadge status={product.status} />
                  </div>
                  {product.category && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{product.category}</div>
                  )}
                </div>
                <div style={{ fontWeight: 600, color: 'var(--color-text)', whiteSpace: 'nowrap' }}>
                  {product.price != null ? formatCurrency(product.price) : '—'}
                </div>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={e => { e.stopPropagation(); setEditing(product); }}
                >
                  ✏️
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={e => { e.stopPropagation(); setDeleteTarget(product); }}
                >
                  🗑️
                </button>
              </div>
            );
          })}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Add Product">
        <ProductForm
          onSubmit={handleCreate}
          onCancel={() => setModalOpen(false)}
          loading={createMutation.isPending}
          submitLabel="Add Product"
        />
      </Modal>

      <Modal isOpen={!!editing} onClose={() => setEditing(null)} title="Edit Product">
        {editing && (
          <ProductForm
            initial={toFormData(editing)}
            onSubmit={handleUpdate}
            onCancel={() => setEditing(null)}
            loading={updateMutation.isPending}
            submitLabel="Save Changes"
          />
        )}
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget?._id && deleteMutation.mutate(deleteTarget._id)}
        title="Delete Product"
        message={`Delete "${deleteTarget?.name}"? This cannot be undone.`}
      />
    </>
  );
}

// ─── Calendar Tab ─────────────────────────────────────────────────────────────

function CalendarTab() {
  const [calMonth, setCalMonth] = useState(new Date());

  const { data: transactions = [] } = useQuery({
    queryKey: ['spending', 'transactions'],
    queryFn: () => spendingApi.getTransactions(),
  });

  const monthStr = format(calMonth, 'yyyy-MM');
  const monthStart = startOfMonth(calMonth);
  const monthEnd = endOfMonth(calMonth);
  const calDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const firstDow = getDay(monthStart);

  const txByDate = useMemo(() => {
    const map = new Map<string, typeof transactions>();
    transactions.forEach(tx => {
      if (!tx.date) return;
      const arr = map.get(tx.date) ?? [];
      arr.push(tx);
      map.set(tx.date, arr);
    });
    return map;
  }, [transactions]);

  const monthTotal = useMemo(() => {
    return transactions
      .filter(tx => (tx.date ?? '').startsWith(monthStr) && tx.transactionType === 'expense' && tx.status === 'done')
      .reduce((s, tx) => s + tx.amount, 0);
  }, [transactions, monthStr]);

  const todayStr = new Date().toISOString().slice(0, 10);
  const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button className="btn btn-icon btn-ghost btn-sm" onClick={() => setCalMonth(m => subMonths(m, 1))}>‹</button>
          <span style={{ fontWeight: 700, fontSize: '1rem' }}>{format(calMonth, 'MMMM yyyy')}</span>
          <button className="btn btn-icon btn-ghost btn-sm" onClick={() => setCalMonth(m => addMonths(m, 1))}>›</button>
          <button className="btn btn-ghost btn-sm" onClick={() => setCalMonth(new Date())}>Today</button>
        </div>
        <div style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
          Expenses: <strong style={{ color: '#DC2626' }}>{formatCurrency(monthTotal)}</strong>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.375rem' }}>
        {WEEK_DAYS.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-text-muted)', padding: '0.25rem 0' }}>{d}</div>
        ))}
        {Array.from({ length: firstDow }, (_, i) => <div key={`e${i}`} />)}
        {calDays.map(day => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const dayTx = txByDate.get(dateStr) ?? [];
          const dayExpenses = dayTx.filter(tx => tx.transactionType === 'expense').reduce((s, tx) => s + tx.amount, 0);
          const dayIncome = dayTx.filter(tx => tx.transactionType === 'income').reduce((s, tx) => s + tx.amount, 0);
          const isToday = dateStr === todayStr;
          const hasTx = dayTx.length > 0;
          return (
            <div key={dateStr} style={{
              minHeight: '5rem', padding: '0.375rem', borderRadius: 'var(--radius-md)',
              border: `1.5px solid ${isToday ? COLOR.primary : 'var(--color-border)'}`,
              background: isToday ? COLOR.soft : hasTx ? `${COLOR.primary}08` : 'var(--color-surface)',
            }}>
              <div style={{ fontSize: '0.75rem', fontWeight: isToday ? 700 : 500, color: isToday ? COLOR.primary : 'var(--color-text)', marginBottom: '0.25rem' }}>
                {format(day, 'd')}
              </div>
              {dayExpenses > 0 && (
                <div style={{ fontSize: '0.65rem', color: '#DC2626', fontWeight: 600, lineHeight: 1.3 }}>
                  -{formatCurrency(dayExpenses)}
                </div>
              )}
              {dayIncome > 0 && (
                <div style={{ fontSize: '0.65rem', color: '#16A34A', fontWeight: 600, lineHeight: 1.3 }}>
                  +{formatCurrency(dayIncome)}
                </div>
              )}
              {dayTx.map((tx, i) => (
                <div key={i} style={{
                  fontSize: '0.6rem', color: 'var(--color-text-muted)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  marginTop: '0.1rem',
                }}>
                  {tx.category}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type Tab = 'transactions' | 'fixed' | 'calendar' | 'products';

export default function SpendingPage() {
  const [activeTab, setActiveTab] = useState<Tab>('transactions');

  return (
    <div className="page-content">
      {/* Header strip */}
      <div style={{
        background: `linear-gradient(135deg, ${COLOR.primary}, ${COLOR.dark})`,
        borderRadius: 'var(--radius-lg)',
        padding: '1.5rem',
        marginBottom: '1.5rem',
        color: 'white',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '2rem' }}>💰</span>
          <div>
            <h1 style={{ color: 'white', fontSize: '1.5rem', marginBottom: '0.125rem' }}>Spending</h1>
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.88rem', margin: 0 }}>
              Track expenses, income, and shopping
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs mb-4">
        <button
          className={`tab ${activeTab === 'transactions' ? 'active' : ''}`}
          onClick={() => setActiveTab('transactions')}
        >
          💳 Transactions
        </button>
        <button
          className={`tab ${activeTab === 'fixed' ? 'active' : ''}`}
          onClick={() => setActiveTab('fixed')}
        >
          🔄 Fixed Bills
        </button>
        <button
          className={`tab ${activeTab === 'calendar' ? 'active' : ''}`}
          onClick={() => setActiveTab('calendar')}
        >
          📅 Calendar
        </button>
        <button
          className={`tab ${activeTab === 'products' ? 'active' : ''}`}
          onClick={() => setActiveTab('products')}
        >
          🛒 Products
        </button>
      </div>

      {/* Tab content */}
      <div className="card">
        <div className="card-body">
          {activeTab === 'transactions' && <TransactionsTab />}
          {activeTab === 'fixed' && <FixedBillsTab />}
          {activeTab === 'calendar' && <CalendarTab />}
          {activeTab === 'products' && <ShoppingTab />}
        </div>
      </div>
    </div>
  );
}
