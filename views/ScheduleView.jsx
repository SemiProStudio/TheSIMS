// ============================================================================
// Schedule View Component
// ============================================================================

import { memo, useMemo, useCallback } from 'react';
import { ArrowLeft, ArrowRight, Calendar, List, Clock, MapPin, Plus, Package, Loader, User } from 'lucide-react';
import { SCHEDULE_MODES, SCHEDULE_PERIODS } from '../constants.js';
import { colors, styles, spacing, borderRadius, typography, withOpacity} from '../theme.js';
import { formatDate } from '../utils';
import { Badge, Card, Button, PageHeader } from '../components/ui.jsx';
import { DatePicker } from '../components/DatePicker.jsx';
import { useData } from '../contexts/DataContext.js';

// Helper: compact date range like "Jun 7–10" or "Jun 7 – Jul 2"
function shortDateRange(start, end) {
  if (!start || !end) return '';
  const s = new Date(start + 'T00:00:00');
  const e = new Date(end + 'T00:00:00');
  if (isNaN(s) || isNaN(e)) return '';
  const sMonth = s.toLocaleDateString('en-US', { month: 'short' });
  const eMonth = e.toLocaleDateString('en-US', { month: 'short' });
  if (start === end) return `${sMonth} ${s.getDate()}`;
  if (sMonth === eMonth) return `${sMonth} ${s.getDate()}\u2013${e.getDate()}`;
  return `${sMonth} ${s.getDate()} \u2013 ${eMonth} ${e.getDate()}`;
}

const DAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function ScheduleView({
  inventory,
  scheduleView,
  setScheduleView,
  scheduleDate,
  setScheduleDate,
  scheduleMode,
  setScheduleMode,
  onViewItem: _onViewItem,
  onViewReservation,
  onAddReservation
}) {
  const { tier2Loaded } = useData();

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
      const key = `${r.project || 'unnamed'}_${r.start}_${r.end}`;
      if (!groups[key]) {
        groups[key] = { ...r, items: [r.item], itemCount: 1 };
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
      // Start from beginning of week (Sunday)
      const weekStart = new Date(base);
      weekStart.setDate(base.getDate() - base.getDay());
      return [...Array(7)].map((_, i) => {
        const d = new Date(weekStart);
        d.setDate(weekStart.getDate() + i);
        return d;
      });
    }
    // Month - always show 6 complete weeks (42 days) for consistent height
    const firstOfMonth = new Date(base.getFullYear(), base.getMonth(), 1);
    const start = new Date(firstOfMonth);
    start.setDate(start.getDate() - start.getDay());
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
  const isWeek = scheduleView === SCHEDULE_PERIODS.WEEK;
  const isDay = scheduleView === SCHEDULE_PERIODS.DAY;

  // ============================================================================
  // Shared event card renderer
  // ============================================================================
  const renderEventCard = (ev, viewType) => {
    const isMulti = ev.itemCount > 1;
    const itemLabel = isMulti ? `${ev.itemCount} items` : (ev.items[0]?.name || 'Unknown');
    const dateRange = shortDateRange(ev.start, ev.end);

    if (viewType === 'month') {
      // Month: compact single-line with date range left-aligned
      return (
        <div
          key={`${ev.project}-${ev.start}-${ev.items[0]?.id}`}
          onClick={(e) => { e.stopPropagation(); onViewReservation(ev, ev.items[0]); }}
          title={`${itemLabel}${ev.project ? ` \u2013 ${ev.project}` : ''} (${dateRange})`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            background: withOpacity(colors.primary, 12),
            borderLeft: `3px solid ${colors.primary}`,
            borderRadius: borderRadius.sm,
            padding: `2px ${spacing[1]}px`,
            marginBottom: 2,
            cursor: 'pointer',
            overflow: 'hidden',
            transition: 'background 120ms ease',
          }}
          onMouseEnter={e => e.currentTarget.style.background = withOpacity(colors.primary, 22)}
          onMouseLeave={e => e.currentTarget.style.background = withOpacity(colors.primary, 12)}
        >
          <span style={{
            fontSize: 10,
            color: colors.primary,
            fontWeight: typography.fontWeight.medium,
            flexShrink: 0,
            minWidth: 0,
          }}>
            {dateRange}
          </span>
          <span style={{
            fontSize: typography.fontSize.xs,
            fontWeight: typography.fontWeight.medium,
            color: colors.textPrimary,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: 1,
            minWidth: 0,
          }}>
            {ev.project || itemLabel}
          </span>
        </div>
      );
    }

    if (viewType === 'week') {
      // Week: date range on left, then project/item info
      return (
        <div
          key={`${ev.project}-${ev.start}-${ev.items[0]?.id}`}
          onClick={() => onViewReservation(ev, ev.items[0])}
          title={`${itemLabel}${ev.project ? ` \u2013 ${ev.project}` : ''}`}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: spacing[2],
            background: withOpacity(colors.primary, 10),
            borderLeft: `3px solid ${colors.primary}`,
            borderRadius: borderRadius.sm,
            padding: `${spacing[2]}px ${spacing[2]}px`,
            marginBottom: spacing[1],
            cursor: 'pointer',
            transition: 'background 120ms ease',
          }}
          onMouseEnter={e => e.currentTarget.style.background = withOpacity(colors.primary, 20)}
          onMouseLeave={e => e.currentTarget.style.background = withOpacity(colors.primary, 10)}
        >
          {/* Date range column */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            flexShrink: 0,
            minWidth: 70,
            color: colors.primary,
            fontSize: typography.fontSize.xs,
            fontWeight: typography.fontWeight.medium,
          }}>
            <Clock size={10} style={{ flexShrink: 0 }} />
            {dateRange}
          </div>
          {/* Content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.medium,
              color: colors.textPrimary,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {ev.project || itemLabel}
            </div>
            <div style={{
              fontSize: typography.fontSize.xs,
              color: colors.textMuted,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {isMulti ? itemLabel : (ev.items[0]?.name || '')}
              {ev.user ? ` \u00b7 ${ev.user}` : ''}
            </div>
          </div>
        </div>
      );
    }

    // Day view: full vertical card with all details
    return (
      <div
        key={`${ev.project}-${ev.start}-${ev.items[0]?.id}`}
        onClick={() => onViewReservation(ev, ev.items[0])}
        style={{
          display: 'flex',
          gap: spacing[3],
          background: withOpacity(colors.primary, 8),
          borderLeft: `3px solid ${colors.primary}`,
          borderRadius: borderRadius.md,
          padding: spacing[3],
          cursor: 'pointer',
          transition: 'background 120ms ease',
        }}
        onMouseEnter={e => e.currentTarget.style.background = withOpacity(colors.primary, 16)}
        onMouseLeave={e => e.currentTarget.style.background = withOpacity(colors.primary, 8)}
      >
        {/* Thumbnail */}
        <div style={{ flexShrink: 0 }}>
          {ev.items[0]?.image ? (
            <img src={ev.items[0].image} alt="" style={{ width: 48, height: 48, borderRadius: borderRadius.md, objectFit: 'cover' }} />
          ) : (
            <div style={{ width: 48, height: 48, borderRadius: borderRadius.md, background: withOpacity(colors.primary, 15), display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.textMuted }}>
              <Package size={18} />
            </div>
          )}
        </div>
        {/* Details */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2], marginBottom: spacing[1], flexWrap: 'wrap' }}>
            <span style={{ fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.semibold, color: colors.textPrimary }}>
              {ev.project || 'Reservation'}
            </span>
            {ev.projectType && <Badge text={ev.projectType} color={colors.accent2} size="xs" />}
            {isMulti && <Badge text={`${ev.itemCount} items`} color={colors.primary} size="xs" />}
          </div>
          <div style={{ fontSize: typography.fontSize.sm, color: colors.textSecondary, marginBottom: spacing[1] }}>
            {isMulti
              ? `${ev.items[0]?.name || 'Unknown'} + ${ev.itemCount - 1} more`
              : (ev.items[0]?.name || 'Unknown')
            }
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing[3], fontSize: typography.fontSize.xs, color: colors.textMuted }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Clock size={11} style={{ color: colors.primary }} />
              {formatDate(ev.start)} &ndash; {formatDate(ev.end)}
            </span>
            {ev.user && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <User size={11} />
                {ev.user}
              </span>
            )}
            {ev.location && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <MapPin size={11} />
                {ev.location.length > 30 ? ev.location.substring(0, 30) + '...' : ev.location}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Header — no back button; Day is a normal view toggle */}
      <PageHeader
        title="Schedule"
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
              <div style={{ padding: spacing[10], textAlign: 'center', color: colors.textMuted, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: spacing[2] }}>
                {!tier2Loaded ? (
                  <><Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Loading reservations...</>
                ) : (
                  'No reservations in this period'
                )}
              </div>
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
                      : `${r.items[0]?.name || 'Unknown'} \u00b7 ${r.user}`
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

      {/* ================================================================== */}
      {/* Calendar View — Month                                              */}
      {/* ================================================================== */}
      {scheduleMode === SCHEDULE_MODES.CALENDAR && isMonth && (() => {
        const currentMonth = new Date(scheduleDate).getMonth();
        return (
          <div>
            {/* Day-of-week header row */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
              gap: spacing[1],
              marginBottom: spacing[1],
            }}>
              {DAY_HEADERS.map(day => (
                <div key={day} style={{
                  textAlign: 'center',
                  fontSize: typography.fontSize.xs,
                  fontWeight: typography.fontWeight.semibold,
                  color: colors.textMuted,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  padding: `${spacing[1]}px 0`,
                }}>
                  {day}
                </div>
              ))}
            </div>
            {/* Calendar grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
              gridAutoRows: '110px',
              gap: spacing[1],
            }}>
              {scheduleDates.map((dt, idx) => {
                const ds = formatDateStr(dt);
                const isToday = ds === todayStr;
                const isOutsideMonth = dt.getMonth() !== currentMonth;
                const events = groupedReservations.filter(r => r.start <= ds && r.end >= ds);

                return (
                  <div
                    key={idx}
                    onClick={() => { setScheduleDate(ds); setScheduleView(SCHEDULE_PERIODS.DAY); }}
                    style={{
                      height: '100%',
                      background: colors.bgCard,
                      border: `1px solid ${isToday ? colors.primary : colors.borderLight}`,
                      borderRadius: borderRadius.md,
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                      opacity: isOutsideMonth ? 0.35 : 1,
                      cursor: 'pointer',
                      transition: 'border-color 150ms ease, box-shadow 150ms ease',
                    }}
                    onMouseEnter={e => { if (!isToday) e.currentTarget.style.borderColor = withOpacity(colors.primary, 50); }}
                    onMouseLeave={e => { if (!isToday) e.currentTarget.style.borderColor = colors.borderLight; }}
                  >
                    {/* Date number */}
                    <div style={{
                      padding: `${spacing[1]}px ${spacing[2]}px`,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: isToday ? withOpacity(colors.primary, 12) : undefined,
                    }}>
                      <span style={{
                        fontSize: typography.fontSize.sm,
                        fontWeight: isToday ? typography.fontWeight.bold : typography.fontWeight.medium,
                        color: isToday ? colors.primary : colors.textPrimary,
                      }}>
                        {dt.getDate()}
                      </span>
                      {events.length > 0 && (
                        <span style={{
                          fontSize: 9,
                          fontWeight: typography.fontWeight.semibold,
                          color: colors.primary,
                          background: withOpacity(colors.primary, 15),
                          borderRadius: 8,
                          padding: '1px 5px',
                        }}>
                          {events.length}
                        </span>
                      )}
                    </div>
                    {/* Events */}
                    <div style={{ padding: `0 ${spacing[1]}px ${spacing[1]}px`, overflowY: 'auto', flex: 1 }}>
                      {events.map(ev => renderEventCard(ev, 'month'))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* ================================================================== */}
      {/* Calendar View — Week                                               */}
      {/* ================================================================== */}
      {scheduleMode === SCHEDULE_MODES.CALENDAR && isWeek && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
          {scheduleDates.map((dt, idx) => {
            const ds = formatDateStr(dt);
            const isToday = ds === todayStr;
            const events = groupedReservations.filter(r => r.start <= ds && r.end >= ds);

            return (
              <Card key={idx} padding={false} style={{
                borderColor: isToday ? colors.primary : undefined,
                overflow: 'hidden',
              }}>
                {/* Day header */}
                <div style={{
                  padding: `${spacing[2]}px ${spacing[3]}px`,
                  borderBottom: events.length > 0 ? `1px solid ${colors.borderLight}` : 'none',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: isToday ? withOpacity(colors.primary, 10) : undefined,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
                    <span style={{
                      fontSize: typography.fontSize.base,
                      fontWeight: typography.fontWeight.semibold,
                      color: isToday ? colors.primary : colors.textPrimary,
                    }}>
                      {dt.toLocaleDateString('en-US', { weekday: 'long' })}
                    </span>
                    <span style={{
                      fontSize: typography.fontSize.sm,
                      color: isToday ? colors.primary : colors.textMuted,
                    }}>
                      {dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  {events.length > 0 && (
                    <Badge text={`${events.length}`} color={colors.primary} size="xs" />
                  )}
                </div>
                {/* Events */}
                {events.length > 0 && (
                  <div style={{ padding: spacing[2] }}>
                    {events.map(ev => renderEventCard(ev, 'week'))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* ================================================================== */}
      {/* Calendar View — Day                                                */}
      {/* ================================================================== */}
      {scheduleMode === SCHEDULE_MODES.CALENDAR && isDay && (() => {
        const dt = scheduleDates[0];
        const ds = formatDateStr(dt);
        const isToday = ds === todayStr;
        const events = groupedReservations.filter(r => r.start <= ds && r.end >= ds);

        return (
          <Card padding={false} style={{
            borderColor: isToday ? colors.primary : undefined,
            overflow: 'hidden',
          }}>
            {/* Day header */}
            <div style={{
              padding: `${spacing[3]}px ${spacing[4]}px`,
              borderBottom: `1px solid ${colors.borderLight}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: isToday ? withOpacity(colors.primary, 10) : undefined,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
                <span style={{
                  fontSize: typography.fontSize.lg,
                  fontWeight: typography.fontWeight.semibold,
                  color: isToday ? colors.primary : colors.textPrimary,
                }}>
                  {dt.toLocaleDateString('en-US', { weekday: 'long' })}
                </span>
                <span style={{
                  fontSize: typography.fontSize.base,
                  color: isToday ? colors.primary : colors.textMuted,
                }}>
                  {dt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
              {events.length > 0 && (
                <Badge text={`${events.length} reservation${events.length > 1 ? 's' : ''}`} color={colors.primary} size="sm" />
              )}
            </div>
            {/* Events — vertical stack */}
            <div style={{ padding: spacing[3], display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
              {events.length === 0 ? (
                <div style={{
                  padding: spacing[8],
                  textAlign: 'center',
                  color: colors.textMuted,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: spacing[2],
                }}>
                  {!tier2Loaded ? (
                    <><Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Loading reservations...</>
                  ) : (
                    <>
                      <Calendar size={24} style={{ opacity: 0.4 }} />
                      No reservations for this day
                    </>
                  )}
                </div>
              ) : events.map(ev => renderEventCard(ev, 'day'))}
            </div>
          </Card>
        );
      })()}
    </>
  );
}

export default memo(ScheduleView);
