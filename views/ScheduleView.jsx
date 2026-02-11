// ============================================================================
// Schedule View Component
// ============================================================================

import React, { memo, useMemo, useCallback } from 'react';
import { ArrowLeft, ArrowRight, Calendar, List, Clock, MapPin, Plus, Package } from 'lucide-react';
import { SCHEDULE_MODES, SCHEDULE_PERIODS } from '../constants.js';
import { colors, styles, spacing, borderRadius, typography, withOpacity} from '../theme.js';
import { formatDate } from '../utils.js';
import { Badge, Card, Button, PageHeader } from '../components/ui.jsx';
import { DatePicker } from '../components/DatePicker.jsx';

function ScheduleView({
  inventory,
  scheduleView,
  setScheduleView,
  scheduleDate,
  setScheduleDate,
  scheduleMode,
  setScheduleMode,
  onViewItem,
  onViewReservation,
  onAddReservation
}) {
  // Get all reservations with item info
  const allReservations = useMemo(() => {
    return (inventory || [])
      .flatMap(i => (i.reservations || []).map(r => ({ ...r, item: i })))
      .sort((a, b) => new Date(a.start) - new Date(b.start));
  }, [inventory]);

  // Group reservations by project+dates (multi-item reservations)
  const groupedReservations = useMemo(() => {
    const groups = {};
    allReservations.forEach(r => {
      // Create a key based on project name, start date, and end date
      const key = `${r.project || 'unnamed'}_${r.start}_${r.end}`;
      if (!groups[key]) {
        groups[key] = {
          ...r,
          items: [r.item],
          itemCount: 1
        };
      } else {
        groups[key].items.push(r.item);
        groups[key].itemCount++;
      }
    });
    return Object.values(groups).sort((a, b) => new Date(a.start) - new Date(b.start));
  }, [allReservations]);

  // Get dates for current view
  const scheduleDates = useMemo(() => {
    const base = new Date(scheduleDate);
    if (scheduleView === SCHEDULE_PERIODS.DAY) return [base];
    if (scheduleView === SCHEDULE_PERIODS.WEEK) {
      return [...Array(7)].map((_, i) => {
        const d = new Date(base);
        d.setDate(base.getDate() + i);
        return d;
      });
    }
    // Month - always show 6 complete weeks (42 days) for consistent height
    const firstOfMonth = new Date(base.getFullYear(), base.getMonth(), 1);
    
    // Start from the Sunday of the week containing the 1st
    const start = new Date(firstOfMonth);
    start.setDate(start.getDate() - start.getDay());
    
    // Always generate exactly 42 days (6 weeks)
    const days = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      days.push(d);
    }
    return days;
  }, [scheduleDate, scheduleView]);

  // Helper to format date consistently (avoiding timezone issues)
  const formatDateStr = useCallback((date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }, []);

  // Filter grouped reservations for current date range
  const filteredReservations = useMemo(() => {
    const startRange = formatDateStr(scheduleDates[0]);
    const endRange = formatDateStr(scheduleDates[scheduleDates.length - 1]);
    return groupedReservations.filter(r => r.start <= endRange && r.end >= startRange);
  }, [groupedReservations, scheduleDates, formatDateStr]);

  const navigate = useCallback((dir) => {
    const d = new Date(scheduleDate);
    if (scheduleView === SCHEDULE_PERIODS.DAY) d.setDate(d.getDate() + dir);
    else if (scheduleView === SCHEDULE_PERIODS.WEEK) d.setDate(d.getDate() + dir * 7);
    else d.setMonth(d.getMonth() + dir);
    setScheduleDate(formatDateStr(d));
  }, [scheduleDate, scheduleView, setScheduleDate, formatDateStr]);

  const todayStr = formatDateStr(new Date());
  const isMonth = scheduleView === SCHEDULE_PERIODS.MONTH;
  const isDay = scheduleView === SCHEDULE_PERIODS.DAY;

  // Go back to month view for the current date
  const goToMonthView = useCallback(() => {
    setScheduleView(SCHEDULE_PERIODS.MONTH);
  }, [setScheduleView]);

  return (
    <>
      {/* Header */}
      <PageHeader
        title="Schedule"
        onBack={isDay && scheduleMode === SCHEDULE_MODES.CALENDAR ? goToMonthView : undefined}
        backLabel="Month"
        action={
          <div style={{ display: 'flex', gap: spacing[3], alignItems: 'center', flexWrap: 'wrap' }}>
            {/* New Reservation Button */}
            {onAddReservation && (
              <Button onClick={onAddReservation} icon={Plus} style={{ marginRight: spacing[2] }}>New</Button>
            )}

            {/* List/Calendar Toggle */}
            <div style={{ display: 'flex', background: `${withOpacity(colors.primary, 15)}`, borderRadius: borderRadius.lg }}>
              <button 
                onClick={() => setScheduleMode(SCHEDULE_MODES.LIST)} 
                title="List View" 
                style={{ 
                  ...styles.btnSec, 
                  border: 'none', 
                  background: scheduleMode === SCHEDULE_MODES.LIST ? `${withOpacity(colors.primary, 30)}` : 'transparent', 
                  color: scheduleMode === SCHEDULE_MODES.LIST ? colors.primary : colors.textSecondary,
                  padding: '12px 14px'
                }}
              >
                <List size={16} />
              </button>
              <button 
                onClick={() => setScheduleMode(SCHEDULE_MODES.CALENDAR)} 
                title="Calendar View" 
                style={{ 
                  ...styles.btnSec, 
                  border: 'none', 
                  background: scheduleMode === SCHEDULE_MODES.CALENDAR ? `${withOpacity(colors.primary, 30)}` : 'transparent', 
                  color: scheduleMode === SCHEDULE_MODES.CALENDAR ? colors.primary : colors.textSecondary,
                  padding: '12px 14px'
                }}
              >
                <Calendar size={16} />
              </button>
            </div>

            {/* Day/Week/Month Toggle */}
            <div style={{ display: 'flex', background: `${withOpacity(colors.primary, 15)}`, borderRadius: borderRadius.lg }}>
              {Object.values(SCHEDULE_PERIODS).map(v => (
                <button 
                  key={v} 
                  onClick={() => setScheduleView(v)} 
                  style={{ 
                    ...styles.btnSec, 
                    border: 'none', 
                    background: scheduleView === v ? `${withOpacity(colors.primary, 30)}` : 'transparent', 
                    color: scheduleView === v ? colors.primary : colors.textSecondary,
                    fontWeight: scheduleView === v ? typography.fontWeight.medium : typography.fontWeight.normal,
                    textTransform: 'capitalize', 
                    fontSize: typography.fontSize.sm, 
                    padding: '12px 14px'
                  }}
                >
                  {v}
                </button>
              ))}
            </div>

            {/* Navigation */}
            <div style={{ display: 'flex', gap: spacing[1], alignItems: 'center' }}>
              <Button variant="secondary" onClick={() => navigate(-1)} icon={ArrowLeft} style={{ padding: '12px 14px' }} />
              <DatePicker 
                value={scheduleDate} 
                onChange={e => setScheduleDate(e.target.value)} 
                style={{ width: '160px' }}
                showTodayButton={false}
                clearable={false}
                aria-label="Schedule date"
              />
              <Button variant="secondary" onClick={() => navigate(1)} icon={ArrowRight} style={{ padding: '12px 14px' }} />
            </div>
          </div>
        }
      />

      {/* List View */}
      {scheduleMode === SCHEDULE_MODES.LIST && (
        <Card padding={false}>
          <div style={{ padding: spacing[4], borderBottom: `1px solid ${colors.borderLight}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ color: colors.textPrimary }}>Reservations</strong>
            <span style={{ fontSize: typography.fontSize.sm, color: colors.textMuted }}>{filteredReservations.length} in this period</span>
          </div>
          <div style={{ maxHeight: 'calc(100vh - 280px)', overflowY: 'auto' }}>
            {filteredReservations.length === 0 ? (
              <div style={{ padding: spacing[10], textAlign: 'center', color: colors.textMuted }}>No reservations in this period</div>
            ) : filteredReservations.map((r, idx) => (
              <div key={`${r.project}-${r.start}-${idx}`} onClick={() => onViewReservation(r, r.items[0])} style={{ display: 'flex', alignItems: 'center', gap: spacing[4], padding: `${spacing[4]}px ${spacing[4]}px`, borderBottom: `1px solid ${colors.borderLight}`, cursor: 'pointer' }}>
                {/* Show stacked images for multi-item reservations */}
                <div style={{ position: 'relative', width: 50, height: 50, flexShrink: 0 }}>
                  {r.items.slice(0, Math.min(3, r.itemCount)).map((itm, i) => (
                    <div key={itm.id} style={{ 
                      position: i === 0 ? 'relative' : 'absolute',
                      top: i * 4,
                      left: i * 4,
                      zIndex: 3 - i,
                    }}>
                      {itm.image ? (
                        <img src={itm.image} alt="" style={{ width: 46 - i * 4, height: 46 - i * 4, borderRadius: borderRadius.md, objectFit: 'cover', border: `2px solid ${colors.bgMedium}` }} />
                      ) : (
                        <div style={{ width: 46 - i * 4, height: 46 - i * 4, borderRadius: borderRadius.md, background: withOpacity(colors.primary, 15), display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.textMuted, border: `2px solid ${colors.bgMedium}` }}>
                          <Package size={14} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: spacing[2], marginBottom: spacing[1], flexWrap: 'wrap' }}>
                    {r.itemCount > 1 ? (
                      <Badge text={`${r.itemCount} items`} color={colors.primary} />
                    ) : (
                      <Badge text={r.items[0]?.id || 'N/A'} color={colors.primary} />
                    )}
                    <Badge text={r.projectType || 'Project'} color={colors.accent2} />
                  </div>
                  <div style={{ fontWeight: typography.fontWeight.medium, color: colors.textPrimary, marginBottom: spacing[1] }}>{r.project}</div>
                  <div style={{ fontSize: typography.fontSize.sm, color: colors.textMuted }}>
                    {r.itemCount > 1 
                      ? `${r.items[0]?.name || 'Unknown'}${r.itemCount > 1 ? ` + ${r.itemCount - 1} more` : ''}`
                      : `${r.items[0]?.name || 'Unknown'} • ${r.user}`
                    }
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: spacing[1], fontSize: typography.fontSize.sm, color: colors.primary, marginBottom: spacing[1] }}><Clock size={12} />{formatDate(r.start)} - {formatDate(r.end)}</div>
                  {r.location && <div style={{ display: 'flex', alignItems: 'center', gap: spacing[1], fontSize: typography.fontSize.xs, color: colors.textMuted }}><MapPin size={10} />{r.location.substring(0, 25)}{r.location.length > 25 ? '...' : ''}</div>}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Calendar View */}
      {scheduleMode === SCHEDULE_MODES.CALENDAR && (() => {
        // Get current month for comparison (to dim days outside current month)
        const currentMonth = new Date(scheduleDate).getMonth();
        
        return (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: isMonth ? 'repeat(7, minmax(0, 1fr))' : '1fr', 
          gridAutoRows: isMonth ? '110px' : 'auto',
          gap: isMonth ? spacing[1] : spacing[3],
        }}>
          {scheduleDates.map((dt, idx) => {
            const ds = formatDateStr(dt);
            const isToday = ds === todayStr;
            const isOutsideMonth = isMonth && dt.getMonth() !== currentMonth;
            // Use grouped reservations for consistency with list view
            const events = groupedReservations.filter(r => r.start <= ds && r.end >= ds);

            // Click handler to navigate to day view
            const handleDateClick = () => {
              if (isMonth) {
                setScheduleDate(ds);
                setScheduleView(SCHEDULE_PERIODS.DAY);
              }
            };

            return (
              <div key={idx} style={{ height: '100%' }}>
              <Card padding={false} style={{ 
                height: '100%',
                minHeight: isDay ? 300 : 'auto',
                borderColor: isToday ? colors.primary : undefined,
                overflow: 'hidden',
                display: 'flex',
                opacity: isOutsideMonth ? 0.4 : 1,
                flexDirection: 'column',
              }}>
                <div 
                  onClick={handleDateClick}
                  style={{ 
                    padding: isMonth ? `${spacing[1]}px ${spacing[2]}px` : `${spacing[2]}px ${spacing[3]}px`, 
                    borderBottom: `1px solid ${colors.borderLight}`, 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: isToday ? `${withOpacity(colors.primary, 15)}` : undefined,
                    cursor: isMonth ? 'pointer' : 'default',
                    transition: 'background 150ms ease',
                  }}
                  onMouseEnter={isMonth ? (e) => { if (!isToday) e.currentTarget.style.background = `${withOpacity(colors.primary, 10)}`; } : undefined}
                  onMouseLeave={isMonth ? (e) => { if (!isToday) e.currentTarget.style.background = 'transparent'; } : undefined}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
                    <span style={{ fontSize: isMonth ? typography.fontSize.xs : typography.fontSize.base, fontWeight: typography.fontWeight.semibold, color: isToday ? colors.primary : colors.textPrimary }}>{dt.toLocaleDateString('en-US', { weekday: isMonth ? 'short' : 'long' })}</span>
                    <span style={{ fontSize: isMonth ? typography.fontSize.sm : typography.fontSize.base, color: isToday ? colors.primary : colors.textMuted }}>{dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                  </div>
                  {/* Only show badge in non-month views */}
                  {!isMonth && events.length > 0 && (
                    <Badge text={`${events.length} reservation${events.length > 1 ? 's' : ''}`} color={colors.primary} size="sm" />
                  )}
                </div>
                <div style={{ 
                  padding: isMonth ? spacing[1] : spacing[2], 
                  overflowY: 'auto', 
                  overflowX: 'hidden',
                  maxHeight: isDay ? 260 : isMonth ? 60 : 'none',
                  flex: isMonth ? 1 : 'none',
                  display: isMonth ? 'block' : 'flex',
                  flexWrap: 'wrap',
                  gap: isMonth ? 0 : spacing[2],
                }}>
                  {events.map((e, i) => (
                    <div 
                      key={i} 
                      onClick={() => onViewReservation(e, e.items[0])} 
                      title={`${e.itemCount > 1 ? `${e.itemCount} items` : e.items[0]?.name}${e.project ? ` - ${e.project}` : ''}`}
                      style={{ 
                        background: `${withOpacity(colors.primary, 20)}`, 
                        borderLeft: `3px solid ${colors.primary}`, 
                        borderRadius: borderRadius.sm, 
                        padding: isMonth ? spacing[1] : spacing[2], 
                        marginBottom: spacing[1], 
                        cursor: 'pointer',
                        overflow: 'hidden',
                      }}
                    >
                      <div style={{ 
                        fontSize: isMonth ? typography.fontSize.xs : typography.fontSize.sm, 
                        fontWeight: typography.fontWeight.medium, 
                        color: colors.textPrimary, 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis', 
                        whiteSpace: 'nowrap',
                      }}>
                        {e.itemCount > 1 ? `${e.itemCount} items` : e.items[0]?.name}
                      </div>
                      {!isMonth && (
                        <div style={{ 
                          fontSize: typography.fontSize.xs, 
                          color: colors.primary,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>
                          {e.project}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
              </div>
            );
          })}
        </div>
        );
      })()}
    </>
  );
}

export default memo(ScheduleView);
