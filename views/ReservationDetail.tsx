// ============================================================================
// Reservation Detail Component
// ============================================================================

import { memo } from 'react';
import { ArrowLeft, Calendar, MapPin, Phone, Mail, User, FileText, Edit, Trash2, MessageSquare, Package } from 'lucide-react';
import { colors, styles, spacing, borderRadius, typography, withOpacity} from '../theme';
import { formatDate, getStatusColor, getTodayISO } from '../utils';
import { Badge, Card, CardHeader, Button } from '../components/ui';
import NotesSection from '../components/NotesSection';

// Extracted static styles
const mapLinkStyle = {
  ...styles.btnSec,
  flex: 1,
  textDecoration: 'none',
  textAlign: 'center' as const,
  justifyContent: 'center',
  fontSize: typography.fontSize.sm,
};

const contactLinkStyle = {
  ...styles.flexCenter,
  gap: spacing[3],
  padding: spacing[3],
  background: `${withOpacity(colors.primary, 8)}`,
  borderRadius: borderRadius.lg,
  color: colors.textPrimary,
  textDecoration: 'none',
};

// Map widget with embedded OpenStreetMap
const MapWidget = memo(function MapWidget({ location }) {
  if (!location) {
    return (
      <div style={{ ...styles.flexColCenter, width: '100%', height: 200, background: `${withOpacity(colors.primary, 10)}`, borderRadius: borderRadius.xl, border: `1px solid ${colors.border}` }}>
        <MapPin size={32} color={colors.textMuted} />
        <p style={{ ...styles.textSmMuted, marginTop: spacing[2] }}>No location specified</p>
      </div>
    );
  }

  // Encode location for map services
  const encodedLocation = encodeURIComponent(location);
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedLocation}`;
  const appleMapsUrl = `https://maps.apple.com/?q=${encodedLocation}`;
  
  // Use Google Maps embed (free with limitations) or OpenStreetMap iframe
  // Google Maps static embed with search
  const googleMapsEmbed = `https://www.google.com/maps?q=${encodedLocation}&output=embed`;
  
  return (
    <div style={{ width: '100%', borderRadius: borderRadius.xl, overflow: 'hidden', border: `1px solid ${colors.border}` }}>
      {/* Map display area - using Google Maps embed */}
      <div style={{ width: '100%', height: 200, background: colors.bgLight, position: 'relative' }}>
        <iframe
          src={googleMapsEmbed}
          style={{ width: '100%', height: '100%', border: 'none' }}
          title="Location Map"
          loading="lazy"
          allowFullScreen
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
      {/* Action buttons */}
      <div style={{ ...styles.flexCenter, padding: spacing[3], background: colors.bgMedium, gap: spacing[2] }}>
        <a 
          href={googleMapsUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          style={mapLinkStyle}
        >
          Open in Google Maps
        </a>
        <a 
          href={appleMapsUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          style={mapLinkStyle}
        >
          Open in Apple Maps
        </a>
      </div>
    </div>
  );
}); 

function ReservationDetail({ reservation, item, onBack, onEdit, onDelete, onAddNote, onReplyNote, onDeleteNote, user, onViewItem }) {
  if (!reservation || !item) return null;

  // Get all items in this reservation (for multi-item reservations)
  const items = reservation.items || [item];
  const itemCount = reservation.itemCount || 1;
  
  const isOverdue = reservation.dueBack && reservation.dueBack < getTodayISO() && item.status === 'checked-out';

  return (
    <>
      <button onClick={onBack} style={{ ...styles.btnSec, marginBottom: spacing[5], border: 'none', background: 'none', padding: 0, color: colors.textSecondary }}>
        <ArrowLeft size={18} /> Back
      </button>

      <div className="responsive-two-col" style={{ display: 'grid', gap: spacing[6] }}>
        {/* Main Content */}
        <div>
          {/* Header */}
          <Card style={{ marginBottom: spacing[5] }}>
            <div style={{ ...styles.flexWrap, gap: spacing[2], marginBottom: spacing[3] }}>
              {itemCount > 1 ? (
                <Badge text={`${itemCount} items`} color={colors.primary} />
              ) : (
                <Badge text={item.id} color={colors.primary} />
              )}
              <Badge text={reservation.projectType || 'Project'} color={colors.accent2} />
              {isOverdue && <Badge text="OVERDUE" color={colors.danger} />}
            </div>
            <h1 style={{ ...styles.heading, margin: `0 0 ${spacing[2]}px`, fontSize: typography.fontSize['3xl'] }}>{reservation.project}</h1>
            <p style={{ color: colors.textSecondary, margin: `0 0 ${spacing[4]}px` }}>
              {itemCount > 1 
                ? `${itemCount} items reserved`
                : `${item.name} - ${item.brand}`
              }
            </p>
            <div style={{ ...styles.flexCenter, gap: spacing[3] }}>
              <Button variant="secondary" onClick={onEdit} icon={Edit}>Edit Reservation</Button>
              <Button variant="secondary" danger onClick={onDelete} icon={Trash2}>Cancel</Button>
            </div>
          </Card>

          {/* Schedule & Location */}
          <Card style={{ marginBottom: spacing[5] }}>
            <h3 style={{ ...styles.heading, ...styles.flexCenter, margin: `0 0 ${spacing[4]}px`, fontSize: typography.fontSize.md, gap: spacing[2] }}><Calendar size={16} /> Schedule & Location</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing[4], marginBottom: spacing[5] }}>
              <div style={{ background: `${withOpacity(colors.primary, 10)}`, padding: spacing[4], borderRadius: borderRadius.lg }}>
                <div style={{ ...styles.textXsMuted, textTransform: 'uppercase', marginBottom: spacing[1] }}>Start Date</div>
                <div style={{ ...styles.subheading, fontSize: typography.fontSize.md }}>{formatDate(reservation.start)}</div>
              </div>
              <div style={{ background: `${withOpacity(colors.primary, 10)}`, padding: spacing[4], borderRadius: borderRadius.lg }}>
                <div style={{ ...styles.textXsMuted, textTransform: 'uppercase', marginBottom: spacing[1] }}>End Date / Due Back</div>
                <div style={{ ...styles.subheading, fontSize: typography.fontSize.md, color: isOverdue ? colors.danger : colors.textPrimary }}>{formatDate(reservation.end || reservation.dueBack)}{isOverdue && ' (OVERDUE)'}</div>
              </div>
            </div>
            <MapWidget location={reservation.location} />
          </Card>

          {/* Contact */}
          <Card>
            <h3 style={{ ...styles.heading, ...styles.flexCenter, margin: `0 0 ${spacing[4]}px`, fontSize: typography.fontSize.md, gap: spacing[2] }}><User size={16} /> Contact Information</h3>
            <div style={{ ...styles.flexCol, gap: spacing[3] }}>
              <div style={{ ...styles.flexCenter, gap: spacing[3] }}>
                <div style={{ ...styles.flexColCenter, width: 40, height: 40, borderRadius: borderRadius.md, background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent1})`, fontWeight: typography.fontWeight.semibold, color: colors.textPrimary }}>{reservation.user?.charAt(0) || '?'}</div>
                <div><div style={styles.subheading}>{reservation.user}</div><div style={styles.textSmMuted}>Reserved By</div></div>
              </div>
              {reservation.contactPhone && (
                <a href={`tel:${reservation.contactPhone}`} style={contactLinkStyle}>
                  <Phone size={18} color={colors.primary} /><span>{reservation.contactPhone}</span>
                </a>
              )}
              {reservation.contactEmail && (
                <a href={`mailto:${reservation.contactEmail}`} style={contactLinkStyle}>
                  <Mail size={18} color={colors.primary} /><span>{reservation.contactEmail}</span>
                </a>
              )}
              {!reservation.contactPhone && !reservation.contactEmail && (
                <p style={styles.textSmMuted}>No contact information provided</p>
              )}
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div style={{ ...styles.flexCol, gap: spacing[4] }}>
          {/* Equipment */}
          <Card padding={false}>
            <CardHeader title={itemCount > 1 ? `Equipment (${itemCount})` : "Equipment"} icon={Package} />
            <div style={{ ...styles.flexCol, padding: spacing[4], gap: spacing[3] }}>
              {items.map((itm, idx) => (
                <div 
                  key={itm.id}
                  style={{
                    ...styles.flexCenter,
                    gap: spacing[3],
                    padding: spacing[3],
                    background: withOpacity(colors.primary, 8),
                    borderRadius: borderRadius.lg,
                    cursor: onViewItem ? 'pointer' : 'default'
                  }}
                  onClick={() => onViewItem && onViewItem(itm.id)}
                >
                  {itm.image ? (
                    <img src={itm.image} alt="" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: borderRadius.md }} />
                  ) : (
                    <div style={{ ...styles.flexColCenter, width: 60, height: 60, background: withOpacity(colors.primary, 15), borderRadius: borderRadius.md, color: colors.textMuted }}>
                      <Package size={24} />
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ ...styles.subheading, marginBottom: spacing[1] }}>{itm.name}</div>
                    <div style={{ ...styles.textSmMuted, marginBottom: spacing[1] }}>{itm.brand} • {itm.category}</div>
                    <div style={{ ...styles.flexCenter, gap: spacing[1] }}>
                      <Badge text={itm.id} color={colors.primary} size="sm" />
                      <Badge text={itm.status} color={getStatusColor(itm.status)} size="sm" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Project Details */}
          <Card padding={false}>
            <CardHeader title="Project Details" icon={FileText} />
            <div style={{ padding: spacing[4] }}>
              <div style={{ marginBottom: spacing[3] }}>
                <div style={{ ...styles.textXsMuted, textTransform: 'uppercase', marginBottom: spacing[1] }}>Project Type</div>
                <div style={{ fontSize: typography.fontSize.base, color: colors.textPrimary }}>{reservation.projectType || 'Not specified'}</div>
              </div>
              <div>
                <div style={{ ...styles.textXsMuted, textTransform: 'uppercase', marginBottom: spacing[1] }}>Project Name</div>
                <div style={{ fontSize: typography.fontSize.base, color: colors.textPrimary }}>{reservation.project}</div>
              </div>
            </div>
          </Card>

          {/* Notes */}
          <Card>
            <h3 style={{ ...styles.heading, ...styles.flexCenter, margin: `0 0 ${spacing[4]}px`, fontSize: typography.fontSize.md, gap: spacing[2] }}>
              <MessageSquare size={16} /> Notes
              {(reservation.notes || []).filter(n => !n.deleted).length > 0 && (
                <Badge text={`${(reservation.notes || []).filter(n => !n.deleted).length}`} color={colors.primary} size="xs" />
              )}
            </h3>
            <NotesSection notes={reservation.notes || []} onAddNote={onAddNote} onReply={onReplyNote} onDelete={onDeleteNote} user={user} />
          </Card>
        </div>
      </div>
    </>
  );
}

export default memo(ReservationDetail);
