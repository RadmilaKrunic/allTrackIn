import type { PlanDoneStatus } from '../../types';

interface Props {
  status: PlanDoneStatus;
  onChange: (status: PlanDoneStatus) => void;
}

export default function PlanDoneToggle({ status, onChange }: Props) {
  return (
    <div className="plan-done-toggle">
      <button
        type="button"
        onClick={() => onChange('plan')}
        className={`plan-done-btn${status === 'plan' ? ' plan-active' : ''}`}
      >
        📋 Plan
      </button>
      <button
        type="button"
        onClick={() => onChange('done')}
        className={`plan-done-btn${status === 'done' ? ' done-active' : ''}`}
      >
        ✓ Done
      </button>
    </div>
  );
}
