import type { PlanDoneStatus } from '../../types';

interface Props {
  status: PlanDoneStatus;
  onChange: (status: PlanDoneStatus) => void;
}

const BTN_BASE: React.CSSProperties = {
  padding: '0.375rem 0.875rem',
  borderRadius: 'calc(var(--radius-md) - 2px)',
  border: 'none',
  fontSize: '0.8rem',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.2s',
  fontFamily: 'inherit',
};

export default function PlanDoneToggle({ status, onChange }: Props) {
  return (
    <div style={{
      display: 'flex', gap: '0.375rem',
      background: 'var(--color-surface)',
      padding: '0.25rem',
      borderRadius: 'var(--radius-md)',
      border: '1px solid var(--color-border)',
    }}>
      <button
        type="button"
        onClick={() => onChange('plan')}
        style={{
          ...BTN_BASE,
          background: status === 'plan' ? '#EFF6FF' : 'transparent',
          color: status === 'plan' ? '#1D4ED8' : 'var(--color-text-secondary)',
          boxShadow: status === 'plan' ? 'var(--shadow-sm)' : 'none',
        }}
      >
        📋 Plan
      </button>
      <button
        type="button"
        onClick={() => onChange('done')}
        style={{
          ...BTN_BASE,
          background: status === 'done' ? '#F0FDF4' : 'transparent',
          color: status === 'done' ? '#15803D' : 'var(--color-text-secondary)',
          boxShadow: status === 'done' ? 'var(--shadow-sm)' : 'none',
        }}
      >
        ✓ Done
      </button>
    </div>
  );
}
