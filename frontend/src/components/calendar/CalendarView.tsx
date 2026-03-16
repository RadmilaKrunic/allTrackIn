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
        <h3 className="modal-title">{format(currentDate, 'MMMM yyyy')}</h3>
        <div className="flex gap-2">
          <button className="btn btn-ghost btn-sm" onClick={() => setCurrentDate(new Date())}>Today</button>
          <button className="btn btn-ghost btn-sm" onClick={() => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}>›</button>
        </div>
      </div>

      <div className="calendar-inner">
        <div className="calendar-weekdays">
          {WEEK_DAYS.map(d => (
            <div key={d} className="calendar-weekday">{d}</div>
          ))}
        </div>

        <div className="calendar-grid">
          {Array.from({ length: startPad }).map((_, i) => <div key={`p${i}`} />)}
          {days.map(day => {
            const items = getItemsForDay(day);
            const isCurrentDay = isToday(day);
            const moduleTypes = [...new Set(items.map(i => i.module as string).filter(m => m && DOT_MODULES.includes(m)))];

            return (
              <button
                key={day.toISOString()}
                onClick={() => onDayClick?.(day, items)}
                className={`calendar-day${isCurrentDay ? ' today' : ''}${!isCurrentDay && items.length ? ' has-items' : ''}`}
              >
                <span className="calendar-day-number">{format(day, 'd')}</span>
                {moduleTypes.length > 0 && (
                  <div className="calendar-dots">
                    {moduleTypes.slice(0, 4).map(mod => (
                      <span key={mod} className="module-dot" style={{ background: MODULE_COLORS[mod]?.primary ?? '#999' }} />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {isLoading && <div className="calendar-loading">Loading…</div>}

        <div className="calendar-legend">
          {DOT_MODULES.filter(m => m in MODULE_COLORS).map(mod => (
            <span key={mod} className="calendar-legend-item">
              <span className="module-dot" style={{ background: MODULE_COLORS[mod]?.primary }} />
              {mod.charAt(0).toUpperCase() + mod.slice(1)}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
