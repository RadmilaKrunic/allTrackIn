import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isToday } from 'date-fns';
import { dashboardApi } from '../../api/client';
import { MODULE_COLORS } from '../../themes/themes';
import type { CalendarData } from '../../types';

interface Props {
  onDayClick?: (day: Date, items: Array<Record<string, unknown>>) => void;
}

type CalendarItem = Record<string, unknown> & { module?: string; date?: string; startDate?: string };

// Modules to show dots for (not all)
const DOT_MODULES = ['spending', 'training', 'events', 'work', 'eating', 'notes', 'period'];

export default function CalendarView({ onDayClick }: Props) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  const { data: calendarData, isLoading } = useQuery<CalendarData>({
    queryKey: ['calendar', year, month],
    queryFn: () => dashboardApi.getCalendar(year, month),
  });

  const allItems = useMemo<CalendarItem[]>(() => {
    if (!calendarData) return [];
    return (Object.values(calendarData) as CalendarItem[][]).flat();
  }, [calendarData]);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPad = getDay(monthStart);

  const getItemsForDay = (day: Date): CalendarItem[] => {
    const dateStr = format(day, 'yyyy-MM-dd');
    return allItems.filter(item => item.date === dateStr || item.startDate === dateStr);
  };

  const WEEK_DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  return (
    <div className="card">
      <div className="card-header">
        <button className="btn btn-ghost btn-sm" onClick={() => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}>‹</button>
        <h3 style={{ margin: 0, fontSize: '1rem' }}>{format(currentDate, 'MMMM yyyy')}</h3>
        <div style={{ display: 'flex', gap: '0.375rem' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setCurrentDate(new Date())}>Today</button>
          <button className="btn btn-ghost btn-sm" onClick={() => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}>›</button>
        </div>
      </div>

      <div style={{ padding: '0.75rem' }}>
        {/* Weekday headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '4px' }}>
          {WEEK_DAYS.map(d => (
            <div key={d} style={{ textAlign: 'center', fontSize: '0.7rem', fontWeight: 600, color: 'var(--color-text-muted)', padding: '4px 0' }}>{d}</div>
          ))}
        </div>

        {/* Day grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
          {Array.from({ length: startPad }).map((_, i) => <div key={`p${i}`} />)}
          {days.map(day => {
            const items = getItemsForDay(day);
            const isCurrentDay = isToday(day);
            const moduleTypes = [...new Set(items.map(i => i.module as string).filter(m => m && DOT_MODULES.includes(m)))];

            return (
              <button
                key={day.toISOString()}
                onClick={() => onDayClick?.(day, items)}
                style={{
                  aspectRatio: '1', position: 'relative', display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: '2px',
                  padding: '2px',
                  borderRadius: 'var(--radius-sm)',
                  border: isCurrentDay ? '2px solid var(--color-primary)' : '1px solid transparent',
                  background: isCurrentDay ? 'var(--color-primary-light)' : items.length ? 'var(--color-surface)' : 'transparent',
                  cursor: 'pointer', fontFamily: 'inherit',
                  minHeight: '36px',
                  transition: 'all 0.15s',
                }}
              >
                <span style={{ position: 'absolute', top: '2px', left: '4px', fontSize: '0.72rem', fontWeight: isCurrentDay ? 700 : 400, color: isCurrentDay ? 'var(--color-primary-dark)' : 'var(--color-text)', lineHeight: 1 }}>
                  {format(day, 'd')}
                </span>
                {moduleTypes.length > 0 && (
                  <div style={{ display: 'flex', gap: '2px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '6px' }}>
                    {moduleTypes.slice(0, 4).map(mod => (
                      <span key={mod} style={{ width: '10px', height: '10px', borderRadius: '50%', background: MODULE_COLORS[mod]?.primary ?? '#999' }} />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {isLoading && <div style={{ textAlign: 'center', padding: '0.5rem', color: 'var(--color-text-muted)', fontSize: '0.78rem' }}>Loading…</div>}

        {/* Legend */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--color-border)' }}>
          {DOT_MODULES.filter(m => m in MODULE_COLORS).map(mod => (
            <span key={mod} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: MODULE_COLORS[mod]?.primary, display: 'inline-block', flexShrink: 0 }} />
              {mod.charAt(0).toUpperCase() + mod.slice(1)}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
