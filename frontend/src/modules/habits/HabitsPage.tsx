import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, subDays, parseISO } from 'date-fns';
import { habitsApi } from '../../api/client';
import { MODULE_COLORS } from '../../themes/themes';
import type { HabitDefinition, HabitLog } from '../../types';

const COLOR = MODULE_COLORS.habits;

function calcStreak(logs: HabitLog[], habitId: string, todayStr: string): number {
  const doneSet = new Set(
    logs.filter(l => l.habitId === habitId && l.done).map(l => l.date)
  );
  let streak = 0;
  const d = new Date();
  if (!doneSet.has(todayStr)) d.setDate(d.getDate() - 1);
  while (true) {
    const ds = format(d, 'yyyy-MM-dd');
    if (!doneSet.has(ds)) break;
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

function WeekDots({ logs, habitId, color }: { logs: HabitLog[]; habitId: string; color: string }) {
  const today = new Date();
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = subDays(today, 6 - i);
    const ds = format(d, 'yyyy-MM-dd');
    const done = logs.some(l => l.habitId === habitId && l.date === ds && l.done);
    return { ds, done, label: format(d, 'EEE')[0] };
  });

  return (
    <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
      {days.map(({ ds, done, label }) => (
        <div key={ds} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.1rem' }}>
          <div style={{
            width: '20px', height: '20px', borderRadius: '50%',
            background: done ? color : 'var(--color-border)',
            border: `1px solid ${done ? color : 'var(--color-border)'}`,
            transition: 'background 0.2s',
          }} />
          <span style={{ fontSize: '0.55rem', color: 'var(--color-text-muted)' }}>{label}</span>
        </div>
      ))}
    </div>
  );
}

function HabitCard({
  habit, logs, todayStr, onToggle,
}: {
  habit: HabitDefinition;
  logs: HabitLog[];
  todayStr: string;
  onToggle: (habitId: string, done: boolean) => void;
}) {
  const color = habit.color ?? COLOR.primary;
  const done = logs.some(l => l.habitId === habit._id && l.date === todayStr && l.done);
  const streak = useMemo(() => calcStreak(logs, habit._id!, todayStr), [logs, habit._id, todayStr]);

  return (
    <div style={{
      background: 'var(--color-bg-card)',
      borderRadius: 'var(--radius-md)',
      border: `1px solid ${done ? color + '60' : 'var(--color-border)'}`,
      padding: '1rem',
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
      transition: 'all 0.2s',
      boxShadow: done ? `0 0 0 2px ${color}20` : 'none',
    }}>
      {/* Done toggle */}
      <button
        onClick={() => onToggle(habit._id!, !done)}
        style={{
          width: '40px', height: '40px', borderRadius: '50%', border: `2px solid ${color}`,
          background: done ? color : 'transparent',
          cursor: 'pointer', flexShrink: 0, fontSize: '1.1rem',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.2s',
        }}
      >
        {done ? '✓' : ''}
      </button>

      {/* Icon + name */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem' }}>
          {habit.icon && <span style={{ fontSize: '1.1rem' }}>{habit.icon}</span>}
          <span style={{
            fontWeight: 600, fontSize: '0.95rem',
            color: done ? color : 'var(--color-text)',
            textDecoration: done ? 'line-through' : 'none',
            opacity: done ? 0.8 : 1,
          }}>
            {habit.name}
          </span>
          {streak > 0 && (
            <span style={{
              fontSize: '0.7rem', fontWeight: 700, color: '#F97316',
              background: '#FFF7ED', border: '1px solid #FED7AA',
              borderRadius: '999px', padding: '0.1rem 0.4rem',
            }}>
              🔥 {streak}
            </span>
          )}
        </div>
        <WeekDots logs={logs} habitId={habit._id!} color={color} />
      </div>
    </div>
  );
}

export default function HabitsPage() {
  const qc = useQueryClient();
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  // fetch all habit definitions
  const { data: habits = [] } = useQuery<HabitDefinition[]>({
    queryKey: ['habits'],
    queryFn: () => habitsApi.getAll(),
  });

  // fetch logs for last 90 days for streak calculation
  const startDate = format(subDays(new Date(), 90), 'yyyy-MM-dd');
  const { data: logs = [] } = useQuery<HabitLog[]>({
    queryKey: ['habits', 'logs'],
    queryFn: () => habitsApi.getLogs({ startDate, endDate: todayStr }),
  });

  const toggleMut = useMutation({
    mutationFn: ({ habitId, done }: { habitId: string; done: boolean }) =>
      habitsApi.toggleLog(todayStr, habitId, done),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['habits', 'logs'] }),
  });

  const activeHabits = habits.filter(h => h.active !== false);
  const todayLogs = logs.filter(l => l.date === todayStr);
  const doneToday = todayLogs.filter(l => l.done).length;
  const totalToday = activeHabits.length;
  const pct = totalToday > 0 ? Math.round((doneToday / totalToday) * 100) : 0;

  const [showDone, setShowDone] = useState(true);

  const visibleHabits = showDone
    ? activeHabits
    : activeHabits.filter(h => !logs.some(l => l.habitId === h._id && l.date === todayStr && l.done));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header */}
      <div style={{
        background: COLOR.soft, borderRadius: 'var(--radius-lg)',
        padding: '1.25rem 1.5rem',
        border: `1px solid ${COLOR.primary}30`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h2 style={{ margin: 0, color: COLOR.text, fontSize: '1.3rem' }}>🎯 Habits</h2>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: COLOR.text, opacity: 0.7 }}>
              {format(new Date(), 'EEEE, MMMM d')}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: COLOR.primary }}>
              {doneToday}/{totalToday}
            </div>
            <div style={{ fontSize: '0.75rem', color: COLOR.text, opacity: 0.7 }}>completed today</div>
          </div>
        </div>

        {totalToday > 0 && (
          <div style={{ marginTop: '0.875rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
              <span style={{ fontSize: '0.75rem', color: COLOR.text, opacity: 0.7 }}>Daily progress</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: COLOR.primary }}>{pct}%</span>
            </div>
            <div style={{ height: '8px', background: `${COLOR.primary}20`, borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${pct}%`,
                background: pct === 100 ? '#22C55E' : COLOR.primary,
                borderRadius: '4px', transition: 'width 0.4s ease',
              }} />
            </div>
            {pct === 100 && (
              <p style={{ margin: '0.5rem 0 0', fontSize: '0.82rem', color: '#16A34A', fontWeight: 600 }}>
                🎉 All habits done for today!
              </p>
            )}
          </div>
        )}
      </div>

      {activeHabits.length === 0 ? (
        <div className="empty-state">
          <span style={{ fontSize: '2.5rem' }}>🎯</span>
          <p>No habits yet. Add habits in Settings to start tracking.</p>
        </div>
      ) : (
        <>
          {/* Filter toggle */}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              onClick={() => setShowDone(true)}
              className={`btn btn-sm ${showDone ? 'btn-primary' : 'btn-secondary'}`}
            >
              All ({totalToday})
            </button>
            <button
              onClick={() => setShowDone(false)}
              className={`btn btn-sm ${!showDone ? 'btn-primary' : 'btn-secondary'}`}
            >
              Pending ({totalToday - doneToday})
            </button>
          </div>

          {/* Habits list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {visibleHabits.map(habit => (
              <HabitCard
                key={habit._id}
                habit={habit}
                logs={logs}
                todayStr={todayStr}
                onToggle={(habitId, done) => toggleMut.mutate({ habitId, done })}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
