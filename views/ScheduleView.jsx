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

// Stable palette for assigning colors to different reservations
const EVENT_COLORS = [
  colors.primary,
  colors.accent1,
  colors.accent2,
  colors.accent3,
  colors.accent4,
  colors.accent5,
];

function getEventColor(idx) {
  return EVENT_COLORS[idx % EVENT_COLORS.length];
}

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
      const weekStart = new Date(base);
      weekStart.setDate(base.getDate() - base.getDay());
      return [...Array(7)].map((_, i) => {
        const d = new Date(weekStart);
        d.setDate(weekStart.getDate() + i);
        return d;
      });
    }
    // Month
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

  // Helper to format date consistently
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
  // Month view: compute spanning bar segments for each reservation
  // Each reservation may span across multiple week-rows, so we split it into
  // per-row segments with { row, colStart, colSpan, isStart, isEnd, ev }
  // ============================================================================
  const monthSpanSegments = useMemo(() => {
    if (!isMonth) return [];
    const gridStartStr = formatDateStr(scheduleDates[0]);
    const gridStart = new Date(gridStartStr + 'T00:00:00');

    // For each reservation, compute which grid cells it covers
    const segments = [];
    filteredReservations.forEach((ev, evIdx) => {
      const evStart = new Date((ev.start > gridStartStr ? ev.start : gridStartStr) + 'T00:00:00');
      const evEnd = new Date(ev.end + 'T00:00:00');
      const gridEnd = new Date(formatDateStr(scheduleDates[41]) + 'T00:00:00');
      const clampedEnd = evEnd > gridEnd ? gridEnd : evEnd;

      // Walk through the span, breaking at week boundaries
      let current = new Date(evStart);
      while (current <= clampedEnd) {
        const dayOffset = Math.round((current - gridStart) / 86400000);
        const row = Math.floor(dayOffset / 7);
        const colStart = dayOffset % 7;
        // How many days left in this week row?
        const daysLeftInRow = 7 - colStart;
        const daysLeftInEvent = Math.round((clampedEnd - current) / 86400000) + 1;
        const colSpan = Math.min(daysLeftInRow, daysLeftInEvent);

        const isStart = current.getTime() === new Date(ev.start + 'T00:00:00').getTime();
        const isEnd = (dayOffset + colSpan - 1) === Math.round((clampedEnd - gridStart) / 86400000);

        segments.push({ row, colStart, colSpan, isStart, isEnd, ev, evIdx });

        // Move to start of next week row
        current = new Date(current);
        current.setDate(current.getDate() + colSpan);
      }
    });
    return segments;
  }, [isMonth, scheduleDates, filteredReservations, formatDateStr]);

  // Assign lane indices per row to avoid overlapping bars (side-effect memo: assigns seg.lane)
  const _monthLanes = useMemo(() => {
    if (!isMonth) return {};
    // Group segments by row
    const byRow = {};
    monthSpanSegments.forEach(seg => {
      if (!byRow[seg.row]) byRow[seg.row] = [];
      byRow[seg.row].push(seg);
    });
    // For each row, assign lane indices (greedy)
    const laneMap = {}; // key: `${row}-${evIdx}` → lane
    // Track lane assignments across rows for continuity
    const evLaneByRow = {};
    Object.keys(byRow).sort((a, b) => a - b).forEach(rowStr => {
      const row = Number(rowStr);
      const segs = byRow[row].sort((a, b) => a.colStart - b.colStart || b.colSpan - a.colSpan);
      const lanes = []; // lanes[i] = end column of the segment in that lane
      segs.forEach(seg => {
        // Try to reuse the same lane this event had in the previous row
        const prevRowKey = `${row - 1}-${seg.evIdx}`;
        let assignedLane = -1;
        if (laneMap[prevRowKey] !== undefined) {
          const prevLane = laneMap[prevRowKey];
          if (!lanes[prevLane] || lanes[prevLane] <= seg.colStart) {
            assignedLane = prevLane;
          }
        }
        if (assignedLane === -1) {
          // Find first available lane
          for (let i = 0; i < lanes.length; i++) {
            if (!lanes[i] || lanes[i] <= seg.colStart) {
              assignedLane = i;
              break;
            }
          }
          if (assignedLane === -1) assignedLane = lanes.length;
        }
        lanes[assignedLane] = seg.colStart + seg.colSpan;
        laneMap[`${row}-${seg.evIdx}`] = assignedLane;
        seg.lane = assignedLane;
      });
      evLaneByRow[row] = lanes.length;
    });
    return { laneMap, evLaneByRow, segments: monthSpanSegments };
  }, [isMonth, monthSpanSegments]);

  // ============================================================================
  // Week view: compute horizontal span bars
  // ============================================================================
  const weekSpanData = useMemo(() => {
    if (!isWeek) return [];
    const weekStartStr = formatDateStr(scheduleDates[0]);
    const weekEndStr = formatDateStr(scheduleDates[6]);
    const weekStart = new Date(weekStartStr + 'T00:00:00');

    return filteredReservations.map((ev, evIdx) => {
      const evStartStr = ev.start > weekStartStr ? ev.start : weekStartStr;
      const evEndStr = ev.end < weekEndStr ? ev.end : weekEndStr;
      const startDay = Math.round((new Date(evStartStr + 'T00:00:00') - weekStart) / 86400000);
      const endDay = Math.round((new Date(evEndStr + 'T00:00:00') - weekStart) / 86400000);
      const isStart = ev.start >= weekStartStr;
      const isEnd = ev.end <= weekEndStr;
      return { startDay, endDay, span: endDay - startDay + 1, isStart, isEnd, ev, evIdx };
    });
  }, [isWeek, scheduleDates, filteredReservations, formatDateStr]);

  // ============================================================================
  // Day view event card renderer
  // ============================================================================
  const renderDayEventCard = (ev) => {
    const isMulti = ev.itemCount > 1;
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
        <div style={{ flexShrink: 0 }}>
          {ev.items[0]?.image ? (
            <img src={ev.items[0].image} alt="" style={{ width: 48, height: 48, borderRadius: borderRadius.md, objectFit: 'cover' }} />
          ) : (
            <div style={{ width: 48, height: 48, borderRadius: borderRadius.md, background: withOpacity(colors.primary, 15), display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.textMuted }}>
              <Package size={18} />
            </div>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2], marginBottom: spacing[1], flexWrap: 'wrap' }}>
            <span style={{ fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.semibold, color: colors.textPrimary }}>
              {ev.project || 'Reservation'}
            </span>
            {ev.projectType && <Badge text={ev.projectType} color={colors.accent2} size="xs" />}
            {isMulti && <Badge text={`${ev.itemCount} items`} color={colors.primary} size="xs" />}
          </div>
          <div style={{ fontSize: typography.fontSize.sm, color: colors.textSecondary, marginBottom: spacing[1] }}>
            {isMulti ? `${ev.items[0]?.name || 'Unknown'} + ${ev.itemCount - 1} more` : (ev.items[0]?.name || 'Unknown')}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing[3], fontSize: typography.fontSize.xs, color: colors.textMuted }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Clock size={11} style={{ color: colors.primary }} />
              {formatDate(ev.start)} &ndash; {formatDate(ev.end)}
            </span>
            {ev.user && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><User size={11} />{ev.user}</span>}
            {ev.location && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={11} />{ev.location.length > 30 ? ev.location.substring(0, 30) + '...' : ev.location}</span>}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Header */}
      <PageHeader
        title="Schedule"
        action={
          <div style={{ display: 'flex', gap: spacing[3], alignItems: 'center', flexWrap: 'wrap' }}>
            {onAddReservation && (
              <Button onClick={onAddReservation} icon={Plus} style={{ marginRight: spacing[2] }}>New</Button>
            )}
            <div style={{ display: 'flex', background: `${withOpacity(colors.primary, 15)}`, borderRadius: borderRadius.lg }}>
              <button onClick={() => setScheduleMode(SCHEDULE_MODES.LIST)} title="List View" style={{ ...styles.btnSec, border: 'none', background: scheduleMode === SCHEDULE_MODES.LIST ? `${withOpacity(colors.primary, 30)}` : 'transparent', color: scheduleMode === SCHEDULE_MODES.LIST ? colors.primary : colors.textSecondary, padding: '12px 14px' }}>
                <List size={16} />
              </button>
              <button onClick={() => setScheduleMode(SCHEDULE_MODES.CALENDAR)} title="Calendar View" style={{ ...styles.btnSec, border: 'none', background: scheduleMode === SCHEDULE_MODES.CALENDAR ? `${withOpacity(colors.primary, 30)}` : 'transparent', color: scheduleMode === SCHEDULE_MODES.CALENDAR ? colors.primary : colors.textSecondary, padding: '12px 14px' }}>
                <Calendar size={16} />
              </button>
            </div>
            <div style={{ display: 'flex', background: `${withOpacity(colors.primary, 15)}`, borderRadius: borderRadius.lg }}>
              {Object.values(SCHEDULE_PERIODS).map(v => (
                <button key={v} onClick={() => setScheduleView(v)} style={{ ...styles.btnSec, border: 'none', background: scheduleView === v ? `${withOpacity(colors.primary, 30)}` : 'transparent', color: scheduleView === v ? colors.primary : colors.textSecondary, fontWeight: scheduleView === v ? typography.fontWeight.medium : typography.fontWeight.normal, textTransform: 'capitalize', fontSize: typography.fontSize.sm, padding: '12px 14px' }}>
                  {v}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: spacing[1], alignItems: 'center' }}>
              <Button variant="secondary" onClick={() => navigate(-1)} icon={ArrowLeft} style={{ padding: '12px 14px' }} />
              <DatePicker value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} style={{ width: '160px' }} showTodayButton={false} clearable={false} aria-label="Schedule date" />
              <Button variant="secondary" onClick={() => navigate(1)} icon={ArrowRight} style={{ padding: '12px 14px' }} />
            </div>
          </div>
        }
      />

      {/* ================================================================== */}
      {/* List View                                                          */}
      {/* ================================================================== */}
      {scheduleMode === SCHEDULE_MODES.LIST && (
        <Card padding={false}>
          <div style={{ padding: spacing[4], borderBottom: `1px solid ${colors.borderLight}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ color: colors.textPrimary }}>Reservations</strong>
            <span style={{ fontSize: typography.fontSize.sm, color: colors.textMuted }}>{filteredReservations.length} in this period</span>
          </div>
          <div style={{ maxHeight: 'calc(100vh - 280px)', overflowY: 'auto' }}>
            {filteredReservations.length === 0 ? (
              <div style={{ padding: spacing[10], textAlign: 'center', color: colors.textMuted, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: spacing[2] }}>
                {!tier2Loaded ? (<><Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Loading reservations...</>) : 'No reservations in this period'}
              </div>
            ) : filteredReservations.map((r, idx) => (
              <div key={`${r.project}-${r.start}-${idx}`} onClick={() => onViewReservation(r, r.items[0])} style={{ display: 'flex', alignItems: 'center', gap: spacing[4], padding: `${spacing[4]}px ${spacing[4]}px`, borderBottom: `1px solid ${colors.borderLight}`, cursor: 'pointer' }}>
                <div style={{ position: 'relative', width: 50, height: 50, flexShrink: 0 }}>
                  {r.items.slice(0, Math.min(3, r.itemCount)).map((itm, i) => (
                    <div key={itm.id} style={{ position: i === 0 ? 'relative' : 'absolute', top: i * 4, left: i * 4, zIndex: 3 - i }}>
                      {itm.image ? (
                        <img src={itm.image} alt="" style={{ width: 46 - i * 4, height: 46 - i * 4, borderRadius: borderRadius.md, objectFit: 'cover', border: `2px solid ${colors.bgMedium}` }} />
                      ) : (
                        <div style={{ width: 46 - i * 4, height: 46 - i * 4, borderRadius: borderRadius.md, background: withOpacity(colors.primary, 15), display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.textMuted, border: `2px solid ${colors.bgMedium}` }}><Package size={14} /></div>
                      )}
                    </div>
                  ))}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: spacing[2], marginBottom: spacing[1], flexWrap: 'wrap' }}>
                    {r.itemCount > 1 ? <Badge text={`${r.itemCount} items`} color={colors.primary} /> : <Badge text={r.items[0]?.id || 'N/A'} color={colors.primary} />}
                    <Badge text={r.projectType || 'Project'} color={colors.accent2} />
                  </div>
                  <div style={{ fontWeight: typography.fontWeight.medium, color: colors.textPrimary, marginBottom: spacing[1] }}>{r.project}</div>
                  <div style={{ fontSize: typography.fontSize.sm, color: colors.textMuted }}>
                    {r.itemCount > 1 ? `${r.items[0]?.name || 'Unknown'} + ${r.itemCount - 1} more` : `${r.items[0]?.name || 'Unknown'} \u00b7 ${r.user}`}
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
      {/* Calendar View — Month (spanning bars)                              */}
      {/* ================================================================== */}
      {scheduleMode === SCHEDULE_MODES.CALENDAR && isMonth && (() => {
        const currentMonth = new Date(scheduleDate).getMonth();
        const DATE_HEADER_H = 24;
        const BAR_H = 18;
        const BAR_GAP = 2;
        const maxLanesPerRow = {};
        // Compute max lanes per row
        monthSpanSegments.forEach(seg => {
          const lane = seg.lane ?? 0;
          maxLanesPerRow[seg.row] = Math.max(maxLanesPerRow[seg.row] || 0, lane + 1);
        });

        return (
          <div>
            {/* Day-of-week header row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: spacing[1], marginBottom: spacing[1] }}>
              {DAY_HEADERS.map(day => (
                <div key={day} style={{ textAlign: 'center', fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.semibold, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', padding: `${spacing[1]}px 0` }}>
                  {day}
                </div>
              ))}
            </div>
            {/* Calendar grid — render row by row */}
            {[0, 1, 2, 3, 4, 5].map(row => {
              const rowDates = scheduleDates.slice(row * 7, row * 7 + 7);
              const rowSegments = monthSpanSegments.filter(s => s.row === row);
              const lanes = maxLanesPerRow[row] || 0;
              const eventAreaH = lanes > 0 ? lanes * (BAR_H + BAR_GAP) + BAR_GAP : 0;
              const rowH = DATE_HEADER_H + Math.max(eventAreaH, 16);

              return (
                <div key={row} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 0, marginBottom: 1, position: 'relative', height: rowH }}>
                  {/* Day cells (background + date numbers) */}
                  {rowDates.map((dt, col) => {
                    const ds = formatDateStr(dt);
                    const isToday = ds === todayStr;
                    const isOutsideMonth = dt.getMonth() !== currentMonth;
                    return (
                      <div
                        key={col}
                        onClick={() => { setScheduleDate(ds); setScheduleView(SCHEDULE_PERIODS.DAY); }}
                        style={{
                          height: '100%',
                          background: colors.bgCard,
                          borderTop: `1px solid ${colors.borderLight}`,
                          borderRight: col < 6 ? `1px solid ${colors.borderLight}` : `1px solid ${colors.borderLight}`,
                          borderBottom: 'none',
                          borderLeft: col === 0 ? `1px solid ${colors.borderLight}` : 'none',
                          opacity: isOutsideMonth ? 0.35 : 1,
                          cursor: 'pointer',
                          position: 'relative',
                        }}
                      >
                        <div style={{
                          padding: `2px ${spacing[1]}px`,
                          display: 'flex',
                          justifyContent: 'center',
                          background: isToday ? withOpacity(colors.primary, 12) : undefined,
                        }}>
                          <span style={{
                            fontSize: typography.fontSize.xs,
                            fontWeight: isToday ? typography.fontWeight.bold : typography.fontWeight.medium,
                            color: isToday ? colors.primary : colors.textPrimary,
                          }}>
                            {dt.getDate()}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  {/* Spanning event bars (positioned absolutely over the grid) */}
                  {rowSegments.map((seg, si) => {
                    const evColor = getEventColor(seg.evIdx);
                    const ev = seg.ev;
                    const label = ev.project || (ev.itemCount > 1 ? `${ev.itemCount} items` : ev.items[0]?.name) || 'Reservation';
                    const lane = seg.lane ?? 0;
                    const top = DATE_HEADER_H + lane * (BAR_H + BAR_GAP) + BAR_GAP;
                    // Use percentages for left/width so it scales with columns
                    const leftPct = (seg.colStart / 7) * 100;
                    const widthPct = (seg.colSpan / 7) * 100;

                    return (
                      <div
                        key={`bar-${seg.evIdx}-${si}`}
                        onClick={(e) => { e.stopPropagation(); onViewReservation(ev, ev.items[0]); }}
                        title={`${label} (${shortDateRange(ev.start, ev.end)})`}
                        style={{
                          position: 'absolute',
                          top,
                          left: `calc(${leftPct}% + 2px)`,
                          width: `calc(${widthPct}% - 4px)`,
                          height: BAR_H,
                          background: withOpacity(evColor, 20),
                          borderLeft: seg.isStart ? `3px solid ${evColor}` : 'none',
                          borderRadius: seg.isStart && seg.isEnd ? borderRadius.sm
                            : seg.isStart ? `${borderRadius.sm} 0 0 ${borderRadius.sm}`
                            : seg.isEnd ? `0 ${borderRadius.sm} ${borderRadius.sm} 0`
                            : 0,
                          cursor: 'pointer',
                          overflow: 'hidden',
                          display: 'flex',
                          alignItems: 'center',
                          paddingLeft: seg.isStart ? 4 : 6,
                          paddingRight: 4,
                          zIndex: 5,
                          transition: 'background 120ms ease',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = withOpacity(evColor, 35)}
                        onMouseLeave={e => e.currentTarget.style.background = withOpacity(evColor, 20)}
                      >
                        <span style={{
                          fontSize: 10,
                          fontWeight: typography.fontWeight.medium,
                          color: colors.textPrimary,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          lineHeight: `${BAR_H}px`,
                        }}>
                          {seg.isStart ? label : `\u2026 ${label}`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* ================================================================== */}
      {/* Calendar View — Week (spanning bars)                               */}
      {/* ================================================================== */}
      {scheduleMode === SCHEDULE_MODES.CALENDAR && isWeek && (() => {
        // Assign lanes so overlapping spans don't collide
        const sorted = [...weekSpanData].sort((a, b) => a.startDay - b.startDay || b.span - a.span);
        const lanes = [];
        sorted.forEach(item => {
          let assignedLane = -1;
          for (let i = 0; i < lanes.length; i++) {
            if (lanes[i] <= item.startDay) { assignedLane = i; break; }
          }
          if (assignedLane === -1) { assignedLane = lanes.length; }
          lanes[assignedLane] = item.startDay + item.span;
          item.lane = assignedLane;
        });

        const BAR_H = 32;
        const BAR_GAP = 4;
        const totalLanes = lanes.length || 0;
        const chartHeight = totalLanes > 0 ? totalLanes * (BAR_H + BAR_GAP) + BAR_GAP + 30 : 60;

        return (
          <Card padding={false} style={{ overflow: 'hidden' }}>
            {/* Day column headers */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', borderBottom: `1px solid ${colors.borderLight}` }}>
              {scheduleDates.map((dt, idx) => {
                const ds = formatDateStr(dt);
                const isToday = ds === todayStr;
                return (
                  <div key={idx} style={{
                    padding: `${spacing[2]}px 0`,
                    textAlign: 'center',
                    background: isToday ? withOpacity(colors.primary, 10) : undefined,
                    borderRight: idx < 6 ? `1px solid ${colors.borderLight}` : 'none',
                  }}>
                    <div style={{ fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.semibold, color: isToday ? colors.primary : colors.textMuted, textTransform: 'uppercase' }}>
                      {dt.toLocaleDateString('en-US', { weekday: 'short' })}
                    </div>
                    <div style={{ fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.semibold, color: isToday ? colors.primary : colors.textPrimary }}>
                      {dt.getDate()}
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Span chart area */}
            <div style={{ position: 'relative', height: chartHeight, padding: `${BAR_GAP}px 0` }}>
              {/* Vertical day dividers */}
              {[1, 2, 3, 4, 5, 6].map(col => (
                <div key={col} style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  left: `${(col / 7) * 100}%`,
                  width: 1,
                  background: colors.borderLight,
                  zIndex: 1,
                }} />
              ))}
              {/* Today highlight column */}
              {(() => {
                const todayIdx = scheduleDates.findIndex(d => formatDateStr(d) === todayStr);
                if (todayIdx === -1) return null;
                return (
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    left: `${(todayIdx / 7) * 100}%`,
                    width: `${(1 / 7) * 100}%`,
                    background: withOpacity(colors.primary, 5),
                    zIndex: 0,
                  }} />
                );
              })()}
              {/* Reservation bars */}
              {sorted.map((item, idx) => {
                const evColor = getEventColor(item.evIdx);
                const ev = item.ev;
                const isMulti = ev.itemCount > 1;
                const label = ev.project || (isMulti ? `${ev.itemCount} items` : ev.items[0]?.name) || 'Reservation';
                const subLabel = isMulti ? `${ev.itemCount} items` : (ev.items[0]?.name || '');
                const leftPct = (item.startDay / 7) * 100;
                const widthPct = (item.span / 7) * 100;
                const top = BAR_GAP + item.lane * (BAR_H + BAR_GAP);

                return (
                  <div
                    key={`week-${idx}`}
                    onClick={() => onViewReservation(ev, ev.items[0])}
                    title={`${label} \u2013 ${shortDateRange(ev.start, ev.end)}`}
                    style={{
                      position: 'absolute',
                      top,
                      left: `calc(${leftPct}% + 3px)`,
                      width: `calc(${widthPct}% - 6px)`,
                      height: BAR_H,
                      background: withOpacity(evColor, 15),
                      borderLeft: item.isStart ? `3px solid ${evColor}` : 'none',
                      borderRadius: item.isStart && item.isEnd ? borderRadius.sm
                        : item.isStart ? `${borderRadius.sm} 0 0 ${borderRadius.sm}`
                        : item.isEnd ? `0 ${borderRadius.sm} ${borderRadius.sm} 0`
                        : 0,
                      cursor: 'pointer',
                      overflow: 'hidden',
                      display: 'flex',
                      alignItems: 'center',
                      gap: spacing[2],
                      paddingLeft: item.isStart ? spacing[2] : spacing[1],
                      paddingRight: spacing[1],
                      zIndex: 5,
                      transition: 'background 120ms ease',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = withOpacity(evColor, 30)}
                    onMouseLeave={e => e.currentTarget.style.background = withOpacity(evColor, 15)}
                  >
                    <span style={{
                      fontSize: typography.fontSize.xs,
                      fontWeight: typography.fontWeight.semibold,
                      color: colors.textPrimary,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      flex: 1,
                      minWidth: 0,
                    }}>
                      {item.isStart ? label : `\u2026 ${label}`}
                    </span>
                    {item.span >= 2 && subLabel && subLabel !== label && (
                      <span style={{
                        fontSize: 10,
                        color: colors.textMuted,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        flexShrink: 1,
                        minWidth: 0,
                      }}>
                        {subLabel}
                      </span>
                    )}
                  </div>
                );
              })}
              {/* Empty state */}
              {weekSpanData.length === 0 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: colors.textMuted, fontSize: typography.fontSize.sm }}>
                  {!tier2Loaded ? (<><Loader size={14} style={{ animation: 'spin 1s linear infinite', marginRight: 6 }} /> Loading...</>) : 'No reservations this week'}
                </div>
              )}
            </div>
          </Card>
        );
      })()}

      {/* ================================================================== */}
      {/* Calendar View — Day                                                */}
      {/* ================================================================== */}
      {scheduleMode === SCHEDULE_MODES.CALENDAR && isDay && (() => {
        const dt = scheduleDates[0];
        const ds = formatDateStr(dt);
        const isToday = ds === todayStr;
        const events = groupedReservations.filter(r => r.start <= ds && r.end >= ds);
        return (
          <Card padding={false} style={{ borderColor: isToday ? colors.primary : undefined, overflow: 'hidden' }}>
            <div style={{ padding: `${spacing[3]}px ${spacing[4]}px`, borderBottom: `1px solid ${colors.borderLight}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: isToday ? withOpacity(colors.primary, 10) : undefined }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
                <span style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, color: isToday ? colors.primary : colors.textPrimary }}>{dt.toLocaleDateString('en-US', { weekday: 'long' })}</span>
                <span style={{ fontSize: typography.fontSize.base, color: isToday ? colors.primary : colors.textMuted }}>{dt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
              </div>
              {events.length > 0 && <Badge text={`${events.length} reservation${events.length > 1 ? 's' : ''}`} color={colors.primary} size="sm" />}
            </div>
            <div style={{ padding: spacing[3], display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
              {events.length === 0 ? (
                <div style={{ padding: spacing[8], textAlign: 'center', color: colors.textMuted, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: spacing[2] }}>
                  {!tier2Loaded ? (<><Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Loading reservations...</>) : (<><Calendar size={24} style={{ opacity: 0.4 }} />No reservations for this day</>)}
                </div>
              ) : events.map(ev => renderDayEventCard(ev))}
            </div>
          </Card>
        );
      })()}
    </>
  );
}

export default memo(ScheduleView);
