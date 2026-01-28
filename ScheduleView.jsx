// ============================================================================
// Schedule View Component
// ============================================================================

import React, { memo, useMemo, useCallback } from 'react';
import { ArrowLeft, ArrowRight, Calendar, List, Clock, MapPin, Plus } from 'lucide-react';
import { SCHEDULE_MODES, SCHEDULE_PERIODS } from './constants.js';
import { colors, styles, spacing, borderRadius, typography, withOpacity} from './theme.js';
import { formatDate } from './utils.js';
import { Badge, Card, Button } from './components/ui.jsx';

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
    // Month
    const start = new Date(base.getFullYear(), base.getMonth(), 1);
    const end = new Date(base.getFullYear(), base.getMonth() + 1, 0);
    const days = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      days.push(new Date(d));
    }
    return days;
  }, [scheduleDate, scheduleView]);

  // Filter reservations for current date range
  const filteredReservations = useMemo(() => {
    const startRange = scheduleDates[0].toISOString().split('T')[0];
    const endRange = scheduleDates[scheduleDates.length - 1].toISOString().split('T')[0];
    return allReservations.filter(r => r.start <= endRange && r.end >= startRange);
  }, [allReservations, scheduleDates]);

  const navigate = useCallback((dir) => {
    const d = new Date(scheduleDate);
    if (scheduleView === SCHEDULE_PERIODS.DAY) d.setDate(d.getDate() + dir);
    else if (scheduleView === SCHEDULE_PERIODS.WEEK) d.setDate(d.getDate() + dir * 7);
    else d.setMonth(d.getMonth() + dir);
    setScheduleDate(d.toISOString().split('T')[0]);
  }, [scheduleDate, scheduleView, setScheduleDate]);

  const today = new Date().toISOString().split('T')[0];
  const isMonth = scheduleView === SCHEDULE_PERIODS.MONTH;
  const isDay = scheduleView === SCHEDULE_PERIODS.DAY;

  return (
    <>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: spacing[4], 
        flexWrap: 'wrap', 
        gap: spacing[3] 
      }}>
        <h2 style={{ margin: 0, color: colors.textPrimary }}>Schedule</h2>

        <div style={{ display: 'flex', gap: spacing[2], alignItems: 'center', flexWrap: 'wrap' }}>
          {/* New Reservation Button */}
          {onAddReservation && (
            <Button onClick={onAddReservation} icon={Plus}>New</Button>
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
                padding: `${spacing[2]}px ${spacing[3]}px` 
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
                padding: `${spacing[2]}px ${spacing[3]}px` 
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
                  padding: `${spacing[2]}px ${spacing[3]}px` 
                }}
              >
                {v}
              </button>
            ))}
          </div>

          {/* Navigation */}
          <div style={{ display: 'flex', gap: spacing[1], alignItems: 'center' }}>
            <Button variant="secondary" onClick={() => navigate(-1)} icon={ArrowLeft} size="sm" />
            <input type="date" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} style={{ ...styles.input, width: 'auto', padding: `${spacing[2]}px ${spacing[2]}px` }} />
            <Button variant="secondary" onClick={() => navigate(1)} icon={ArrowRight} size="sm" />
          </div>
        </div>
      </div>

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
            ) : filteredReservations.map(r => (
              <div key={r.id} onClick={() => onViewReservation(r, r.item)} style={{ display: 'flex', alignItems: 'center', gap: spacing[4], padding: `${spacing[4]}px ${spacing[4]}px`, borderBottom: `1px solid ${colors.borderLight}`, cursor: 'pointer' }}>
                {r.item.image ? (
                  <img src={r.item.image} alt="" style={{ width: 50, height: 50, borderRadius: borderRadius.md, objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: 50, height: 50, borderRadius: borderRadius.md, background: `${withOpacity(colors.primary, 15)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.textMuted, fontSize: typography.fontSize.xs }}>No img</div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: spacing[2], marginBottom: spacing[1], flexWrap: 'wrap' }}>
                    <Badge text={r.item.id} color={colors.primary} />
                    <Badge text={r.projectType || 'Project'} color={colors.accent2} />
                  </div>
                  <div style={{ fontWeight: typography.fontWeight.medium, color: colors.textPrimary, marginBottom: spacing[1] }}>{r.project}</div>
                  <div style={{ fontSize: typography.fontSize.sm, color: colors.textMuted }}>{r.item.name} • {r.user}</div>
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
      {scheduleMode === SCHEDULE_MODES.CALENDAR && (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: isMonth ? 'repeat(7, minmax(0, 1fr))' : isDay ? '1fr' : 'repeat(7, minmax(0, 1fr))', 
          gap: isMonth ? spacing[1] : spacing[3],
        }}>
          {scheduleDates.map((dt, idx) => {
            const ds = dt.toISOString().split('T')[0];
            const isToday = ds === today;
            const events = (inventory || []).flatMap(i => (i.reservations || []).filter(r => r.start <= ds && r.end >= ds).map(r => ({ ...r, item: i })));

            return (
              <Card key={idx} padding={false} style={{ 
                minHeight: isMonth ? 80 : isDay ? 300 : 160, 
                borderColor: isToday ? colors.primary : undefined,
                overflow: 'hidden',
              }}>
                <div style={{ 
                  padding: isMonth ? `${spacing[1]}px ${spacing[2]}px` : `${spacing[2]}px ${spacing[3]}px`, 
                  borderBottom: `1px solid ${colors.borderLight}`, 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  background: isToday ? `${withOpacity(colors.primary, 15)}` : undefined 
                }}>
                  <span style={{ fontSize: isMonth ? typography.fontSize.xs : typography.fontSize.sm, color: colors.textMuted, textTransform: 'uppercase' }}>{dt.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                  <span style={{ fontSize: isMonth ? typography.fontSize.sm : typography.fontSize.md, fontWeight: typography.fontWeight.semibold, color: isToday ? colors.primary : colors.textPrimary }}>{dt.getDate()}</span>
                </div>
                <div style={{ 
                  padding: isMonth ? spacing[1] : spacing[2], 
                  overflowY: 'auto', 
                  overflowX: 'hidden',
                  maxHeight: isDay ? 260 : isMonth ? 50 : 110 
                }}>
                  {events.map((e, i) => (
                    <div 
                      key={i} 
                      onClick={() => onViewReservation(e, e.item)} 
                      title={`${e.item.name}${e.project ? ` - ${e.project}` : ''}`}
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
                        {e.item.name}
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
            );
          })}
        </div>
      )}
    </>
  );
}

export default memo(ScheduleView);
