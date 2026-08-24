// ============================================================================
// Clients View - Client & Project Management
// ============================================================================

import { memo, useState, useCallback, useMemo, useEffect } from 'react';
import {
  Users,
  Plus,
  Building2,
  Mail,
  Phone,
  Calendar,
  ChevronRight,
  Edit2,
  Trash2,
  MapPin,
  Star,
  MessageSquare,
} from 'lucide-react';
import { colors, styles, spacing, borderRadius, typography, withOpacity } from '../theme.js';
import {
  formatDate,
  formatPhoneNumber,
  getTodayISO,
  handlePhoneInput,
  groupReservationsForSchedule,
} from '../utils';
import {
  Card,
  Button,
  SearchInput,
  Badge,
  ConfirmDialog,
  CollapsibleSection,
  PageHeader,
  EmptyState,
} from '../components/ui.jsx';
import { Select } from '../components/Select.jsx';
import { Modal, ModalHeader } from '../modals/ModalBase.jsx';
import NotesSection from '../components/NotesSection.jsx';
import LoadErrorBanner from '../components/LoadErrorBanner.jsx';
import { useData } from '../contexts/DataContext.js';
import { useNavigationContext } from '../contexts/NavigationContext.js';
import { useToast } from '../contexts/ToastContext.js';
import { usePermissions } from '../contexts/PermissionsContext.js';
import { ViewOnlyBanner } from '../contexts/PermissionsContext.jsx';
import { validateClient } from '../lib/validators.js';

import { error as logError } from '../lib/logger.js';

// Client type options
const CLIENT_TYPES = ['Individual', 'Company', 'Agency', 'Non-Profit', 'Government', 'Other'];

// ============================================================================
// Client Card Component
// ============================================================================
const ClientCard = memo(function ClientCard({ client, stats, onSelect }) {
  return (
    <Card style={{ cursor: 'pointer', position: 'relative' }} onClick={() => onSelect(client)}>
      <div style={{ display: 'flex', gap: spacing[3] }}>
        {/* Avatar */}
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: borderRadius.lg,
            background: `${withOpacity(colors.primary, 20)}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {client.type === 'Company' || client.type === 'Agency' ? (
            <Building2 size={24} color={colors.primary} />
          ) : (
            <Users size={24} color={colors.primary} />
          )}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing[2],
              marginBottom: spacing[1],
            }}
          >
            <span
              style={{
                fontWeight: typography.fontWeight.semibold,
                color: colors.textPrimary,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {client.name}
            </span>
            {client.favorite && <Star size={14} color={colors.warning} fill={colors.warning} />}
          </div>

          {client.company && client.type === 'Individual' && (
            <div
              style={{
                fontSize: typography.fontSize.xs,
                color: colors.textMuted,
                marginBottom: spacing[1],
              }}
            >
              {client.company}
            </div>
          )}

          <div style={{ display: 'flex', gap: spacing[3], flexWrap: 'wrap' }}>
            {client.email && (
              <span
                style={{
                  fontSize: typography.fontSize.xs,
                  color: colors.textSecondary,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <Mail size={12} /> {client.email}
              </span>
            )}
            {client.phone && (
              <span
                style={{
                  fontSize: typography.fontSize.xs,
                  color: colors.textSecondary,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <Phone size={12} /> {client.phone}
              </span>
            )}
          </div>
        </div>

        {/* Stats */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: spacing[1],
          }}
        >
          <Badge color={colors.primary}>{stats.totalProjects} projects</Badge>
          {stats.activeReservations > 0 && (
            <Badge color={colors.success}>{stats.activeReservations} active</Badge>
          )}
        </div>
      </div>
    </Card>
  );
});

// ============================================================================
// Client Form Modal — Uses ModalBase for consistent UI
// ============================================================================
const ClientFormModal = memo(function ClientFormModal({ client, onSave, onClose }) {
  const [formData, setFormData] = useState({
    name: client?.name || '',
    type: client?.type || 'Individual',
    company: client?.company || '',
    email: client?.email || '',
    phone: formatPhoneNumber(client?.phone) || '',
    address: client?.address || '',
    notes: client?.notes || '',
    favorite: client?.favorite || false,
  });
  const [fieldErrors, setFieldErrors] = useState({});

  const isNameEmpty = !formData.name.trim();
  const isEditing = !!client;
  const nameError = fieldErrors.name;

  const handleSubmit = (e) => {
    e.preventDefault();
    // Full validator up front (2-100 char name, email/phone formats) so the
    // save can't die on the service-side validation with no feedback
    const validation = validateClient(formData);
    if (!validation.isValid) {
      setFieldErrors(validation.errors);
      return;
    }

    // Form fields only — no client-generated ids or timestamps. The DB
    // generates CL### ids and owns created_at/updated_at; the old payload's
    // camelCase timestamps made PostgREST reject every insert and update.
    onSave({
      ...formData,
      id: client?.id,
    });
  };

  return (
    <Modal onClose={onClose} maxWidth={500}>
      <ModalHeader title={client ? 'Edit Client' : 'Add New Client'} onClose={onClose} />
      <form
        onSubmit={handleSubmit}
        style={{ padding: spacing[4], maxHeight: 'calc(90vh - 80px)', overflowY: 'auto' }}
      >
        {/* Name - Required field */}
        <div style={{ marginBottom: spacing[3] }}>
          <label style={{ ...styles.label, color: isNameEmpty ? colors.danger : undefined }}>
            Name <span style={{ color: colors.danger }}>*</span>
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => {
              setFormData((prev) => ({ ...prev, name: e.target.value }));
              setFieldErrors((prev) => ({ ...prev, name: undefined }));
            }}
            style={{ ...styles.input, borderColor: isNameEmpty ? colors.danger : colors.border }}
            placeholder="Client name"
            autoFocus
          />
          {nameError && (
            <span style={{ color: colors.danger, fontSize: typography.fontSize.xs }}>
              {nameError}
            </span>
          )}
        </div>

        {/* Type */}
        <div style={{ marginBottom: spacing[3] }}>
          <label style={styles.label}>Type</label>
          <Select
            value={formData.type}
            onChange={(e) => setFormData((prev) => ({ ...prev, type: e.target.value }))}
            options={CLIENT_TYPES.map((t) => ({ value: t, label: t }))}
            aria-label="Client type"
          />
        </div>

        {/* Company (if Individual) */}
        {formData.type === 'Individual' && (
          <div style={{ marginBottom: spacing[3] }}>
            <label style={styles.label}>Company</label>
            <input
              type="text"
              value={formData.company}
              onChange={(e) => setFormData((prev) => ({ ...prev, company: e.target.value }))}
              style={styles.input}
              placeholder="Company name (optional)"
            />
          </div>
        )}

        {/* Email & Phone */}
        <div className="responsive-form-grid" style={{ marginBottom: spacing[3] }}>
          <div>
            <label style={{ ...styles.label, color: fieldErrors.email ? colors.danger : undefined }}>
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => {
                setFormData((prev) => ({ ...prev, email: e.target.value }));
                setFieldErrors((prev) => ({ ...prev, email: undefined }));
              }}
              style={styles.input}
              placeholder="email@example.com"
            />
            {fieldErrors.email && (
              <span style={{ color: colors.danger, fontSize: typography.fontSize.xs }}>
                {fieldErrors.email}
              </span>
            )}
          </div>
          <div>
            <label style={styles.label}>Phone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) =>
                handlePhoneInput(e, (v) => setFormData((prev) => ({ ...prev, phone: v })))
              }
              style={styles.input}
              placeholder="555-123-4567"
              maxLength={12}
            />
          </div>
        </div>

        {/* Address */}
        <div style={{ marginBottom: spacing[3] }}>
          <label style={styles.label}>Address</label>
          <input
            type="text"
            value={formData.address}
            onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
            style={styles.input}
            placeholder="Street address, city, state"
          />
        </div>

        {/* Notes */}
        <div style={{ marginBottom: spacing[3] }}>
          <label style={styles.label}>Notes</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
            style={{ ...styles.input, minHeight: 80, resize: 'vertical' }}
            placeholder="Additional notes about this client"
          />
        </div>

        {/* Favorite */}
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: spacing[2],
            color: colors.textSecondary,
            fontSize: typography.fontSize.sm,
            cursor: 'pointer',
            marginBottom: spacing[4],
          }}
        >
          <input
            type="checkbox"
            checked={formData.favorite}
            onChange={(e) => setFormData((prev) => ({ ...prev, favorite: e.target.checked }))}
            style={{ accentColor: colors.primary }}
          />
          <Star size={14} /> Mark as favorite
        </label>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: spacing[2] }}>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" icon={isEditing ? Edit2 : Plus}>
            {isEditing ? 'Save Changes' : 'Add Client'}
          </Button>
        </div>
      </form>
    </Modal>
  );
});

// ============================================================================
// Client Detail View
// ============================================================================
const ClientDetailView = memo(function ClientDetailView({
  client,
  projects,
  inventory,
  onBack,
  onEdit,
  onDelete,
  onViewReservation,
  onAddNote,
  onReplyNote,
  onDeleteNote,
  canEdit = true,
}) {
  const [notesCollapsed, setNotesCollapsed] = useState(false);

  const stats = useMemo(
    () => ({
      totalProjects: projects.length,
      activeProjects: projects.filter((p) => p.end >= getTodayISO()).length,
    }),
    [projects],
  );

  const clientNotes = client.clientNotes || [];

  // Navigate to reservation detail with proper item object and back context
  const handleViewProject = useCallback(
    (project) => {
      if (!onViewReservation) return;
      const item = inventory.find((i) => i.id === project.itemId);
      onViewReservation(project, item || { id: project.itemId, name: project.itemName }, {
        clientId: client.id,
      });
    },
    [onViewReservation, inventory, client.id],
  );

  return (
    <div>
      {/* Header */}
      <button
        onClick={onBack}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: spacing[2],
          background: 'transparent',
          border: 'none',
          color: colors.textMuted,
          cursor: 'pointer',
          marginBottom: spacing[3],
          fontSize: typography.fontSize.sm,
        }}
      >
        ← Back to Clients
      </button>

      <Card style={{ marginBottom: spacing[4] }}>
        <div style={{ display: 'flex', gap: spacing[4], alignItems: 'flex-start' }}>
          {/* Avatar */}
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: borderRadius.xl,
              background: `${withOpacity(colors.primary, 20)}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {client.type === 'Company' || client.type === 'Agency' ? (
              <Building2 size={32} color={colors.primary} />
            ) : (
              <Users size={32} color={colors.primary} />
            )}
          </div>

          {/* Info */}
          <div style={{ flex: 1 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: spacing[2],
                marginBottom: spacing[2],
              }}
            >
              <h2 style={{ margin: 0, color: colors.textPrimary }}>{client.name}</h2>
              {client.favorite && <Star size={18} color={colors.warning} fill={colors.warning} />}
              <Badge>{client.type}</Badge>
            </div>

            <div
              style={{
                display: 'flex',
                gap: spacing[4],
                flexWrap: 'wrap',
                color: colors.textSecondary,
                fontSize: typography.fontSize.sm,
              }}
            >
              {client.email && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Mail size={14} /> {client.email}
                </span>
              )}
              {client.phone && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Phone size={14} /> {client.phone}
                </span>
              )}
              {client.address && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <MapPin size={14} /> {client.address}
                </span>
              )}
            </div>

            {client.notes && (
              <p
                style={{
                  margin: `${spacing[3]}px 0 0`,
                  color: colors.textMuted,
                  fontSize: typography.fontSize.sm,
                }}
              >
                {client.notes}
              </p>
            )}
          </div>

          {canEdit && (
            <div style={{ display: 'flex', gap: spacing[2], alignItems: 'center' }}>
              <Button variant="secondary" onClick={() => onEdit(client)} icon={Edit2}>
                Edit
              </Button>
              <Button
                variant="secondary"
                danger
                onClick={() => onDelete(client)}
                icon={Trash2}
                aria-label={`Delete ${client.name}`}
              />
            </div>
          )}
        </div>
      </Card>

      {/* Stats */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: spacing[3],
          marginBottom: spacing[4],
        }}
      >
        <Card style={{ textAlign: 'center', padding: spacing[4] }}>
          <div
            style={{
              fontSize: typography.fontSize['2xl'],
              fontWeight: 'bold',
              color: colors.primary,
            }}
          >
            {stats.totalProjects}
          </div>
          <div style={{ fontSize: typography.fontSize.xs, color: colors.textMuted }}>
            Total Projects
          </div>
        </Card>
        <Card style={{ textAlign: 'center', padding: spacing[4] }}>
          <div
            style={{
              fontSize: typography.fontSize['2xl'],
              fontWeight: 'bold',
              color: colors.success,
            }}
          >
            {stats.activeProjects}
          </div>
          <div style={{ fontSize: typography.fontSize.xs, color: colors.textMuted }}>
            Active or Upcoming
          </div>
        </Card>
      </div>

      {/* Notes Section */}
      <CollapsibleSection
        title="Notes"
        icon={MessageSquare}
        badge={clientNotes.filter((n) => !n.deleted).length || null}
        collapsed={notesCollapsed}
        onToggleCollapse={() => setNotesCollapsed(!notesCollapsed)}
        style={{ marginBottom: spacing[4] }}
      >
        <NotesSection
          notes={clientNotes}
          onAddNote={onAddNote}
          onReply={onReplyNote}
          onDelete={onDeleteNote}
          panelColor={colors.primary}
          readOnly={!canEdit}
        />
      </CollapsibleSection>

      {/* Project History */}
      <Card>
        <h3 style={{ margin: `0 0 ${spacing[3]}px`, color: colors.textPrimary }}>
          Project History
        </h3>

        {projects.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: spacing[6],
              color: colors.textMuted,
            }}
          >
            No projects yet
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
            {projects.map((project) => (
              <div
                key={project.id}
                onClick={() => handleViewProject(project)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing[3],
                  padding: spacing[3],
                  background: colors.bgLight,
                  borderRadius: borderRadius.md,
                  cursor: 'pointer',
                }}
              >
                <Calendar size={16} color={colors.textMuted} />
                <div style={{ flex: 1 }}>
                  <div
                    style={{ fontWeight: typography.fontWeight.medium, color: colors.textPrimary }}
                  >
                    {project.project}
                  </div>
                  <div style={{ fontSize: typography.fontSize.xs, color: colors.textMuted }}>
                    {formatDate(project.start)} – {formatDate(project.end)} •{' '}
                    {project.itemCount || 1} items
                  </div>
                </div>
                <ChevronRight size={16} color={colors.textMuted} />
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
});

// ============================================================================
// Main Clients View
// ============================================================================
function ClientsView({
  clients = [],
  inventory = [],
  dataContext: propDataContext,
  onViewReservation,
  onAddNote,
  onReplyNote,
  onDeleteNote,
  user,
  addAuditLog,
}) {
  const ctxData = useData();
  const dataContext = propDataContext || ctxData;
  const ensureClients = ctxData?.ensureClients;
  const { reservationBackView, setReservationBackView } = useNavigationContext();
  const { addToast } = useToast();
  const { canEdit } = usePermissions();
  const canEditClients = canEdit('clients');
  const [searchQuery, setSearchQuery] = useState('');
  // Lazy data starts as [] — without this flag the view can't tell "still
  // fetching" from "no clients exist" and shows a misleading empty state
  const clientsLoaded = dataContext?.clientsLoaded !== false;
  const clientsLoadFailed = Boolean(ctxData?.lazyErrors?.clients);

  // Lazy-load clients on mount
  useEffect(() => {
    ensureClients?.();
  }, [ensureClients]);

  // Restore selected client when returning from reservation detail. Clients
  // load lazily, so the target may not be in the list yet at mount — keep the
  // id pending and resolve it when the data arrives.
  const [pendingRestoreId, setPendingRestoreId] = useState(
    () => reservationBackView?.context?.clientId || null,
  );
  const [selectedClient, setSelectedClient] = useState(() => {
    const restoredClientId = reservationBackView?.context?.clientId;
    if (restoredClientId) {
      return clients.find((c) => c.id === restoredClientId) || null;
    }
    return null;
  });

  useEffect(() => {
    if (pendingRestoreId && !selectedClient) {
      const found = clients.find((c) => c.id === pendingRestoreId);
      if (found) {
        setSelectedClient(found);
        setPendingRestoreId(null);
      }
    }
  }, [clients, pendingRestoreId, selectedClient]);

  // Clear the back context after we've consumed it
  useEffect(() => {
    if (reservationBackView?.context?.clientId) {
      setReservationBackView(null);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [editingClient, setEditingClient] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, client: null });
  const [filterType, setFilterType] = useState('all');

  // Keep selectedClient in sync with clients prop (for when notes are added/updated)
  useEffect(() => {
    if (selectedClient) {
      const updatedClient = clients.find((c) => c.id === selectedClient.id);
      if (updatedClient && updatedClient !== selectedClient) {
        setSelectedClient(updatedClient);
      }
    }
  }, [clients, selectedClient]);

  // Hydrate threaded notes when a client is opened — getAll() doesn't join
  // them. The loadClientNotes patch flows into selectedClient via the sync
  // effect above. Primitive deps only (the packages notes-refetch-loop bug).
  const loadClientNotes = dataContext?.loadClientNotes;
  const selectedClientId = selectedClient?.id;
  const clientNotesLoaded = selectedClient ? selectedClient.clientNotes !== undefined : true;
  useEffect(() => {
    if (!selectedClientId || clientNotesLoaded || !loadClientNotes) return;
    loadClientNotes(selectedClientId);
  }, [selectedClientId, clientNotesLoaded, loadClientNotes]);

  // Project history: group per-item reservation rows into logical multi-item
  // reservations (shared group_id, legacy name+dates fallback) — a 5-item
  // reservation is ONE project, not five
  const getClientProjects = useCallback(
    (clientId) => {
      return groupReservationsForSchedule(inventory)
        .filter((g) => g.clientId === clientId)
        .map((g) => ({ ...g, itemId: g.items[0]?.id, itemName: g.items[0]?.name }))
        .sort((a, b) => new Date(b.start) - new Date(a.start));
    },
    [inventory],
  );

  // Get stats for a client
  const getClientStats = useCallback(
    (client) => {
      const projects = getClientProjects(client.id);
      return {
        totalProjects: projects.length,
        activeReservations: projects.filter((p) => p.end >= getTodayISO()).length,
      };
    },
    [getClientProjects],
  );

  // Filter clients — searches name, email, company, AND phone
  const filteredClients = useMemo(() => {
    let result = [...clients];

    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.name?.toLowerCase().includes(q) ||
          c.email?.toLowerCase().includes(q) ||
          c.company?.toLowerCase().includes(q) ||
          c.phone?.toLowerCase().includes(q),
      );
    }

    // Type filter
    if (filterType !== 'all') {
      if (filterType === 'favorites') {
        result = result.filter((c) => c.favorite);
      } else {
        result = result.filter((c) => c.type === filterType);
      }
    }

    // Sort: favorites first, then by name
    return result.sort((a, b) => {
      if (a.favorite && !b.favorite) return -1;
      if (!a.favorite && b.favorite) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [clients, searchQuery, filterType]);

  // Save client — persist-first: the DB write must succeed before local
  // state, the audit log, or the modal change. On failure the form stays
  // open with the user's input intact. (The old fallback patched local state
  // on failure, showing edits that reverted on reload — and every write was
  // failing: the payload carried columns PostgREST rejects.)
  const handleSaveClient = useCallback(
    async (clientData) => {
      const isExisting = !!clientData.id && clients.some((c) => c.id === clientData.id);
      if (isExisting) {
        try {
          await dataContext.updateClient(clientData.id, clientData);
        } catch (err) {
          logError('Failed to update client:', err);
          addToast('Failed to save client: ' + (err.message || 'Please try again.'), 'error');
          return;
        }
        if (selectedClient?.id === clientData.id) {
          setSelectedClient((prev) => ({ ...prev, ...clientData }));
        }
        if (addAuditLog) {
          addAuditLog({
            type: 'client_updated',
            description: `Client "${clientData.name}" updated`,
            user: user?.name || 'Unknown',
            clientId: clientData.id,
          });
        }
      } else {
        let created;
        try {
          // The DB generates the CL### id — select the RETURNED row, not the
          // local form data
          created = await dataContext.createClient(clientData);
        } catch (err) {
          logError('Failed to create client:', err);
          addToast('Failed to create client: ' + (err.message || 'Please try again.'), 'error');
          return;
        }
        if (addAuditLog) {
          addAuditLog({
            type: 'client_created',
            description: `Client "${created.name}" created`,
            user: user?.name || 'Unknown',
            clientId: created.id,
          });
        }
        setSelectedClient(created);
      }
      setShowAddModal(false);
      setEditingClient(null);
    },
    [clients, dataContext, selectedClient, addToast, addAuditLog, user],
  );

  // Returns true when the delete persisted — callers only navigate away on
  // success. Failure keeps the dialog open with an error toast.
  const handleDeleteClient = useCallback(async () => {
    const clientToDelete = deleteConfirm.client;
    if (!clientToDelete) return false;

    try {
      await dataContext.deleteClient(clientToDelete.id);
    } catch (err) {
      logError('Failed to delete client:', err);
      addToast('Failed to delete client: ' + (err.message || 'Please try again.'), 'error');
      return false;
    }

    if (addAuditLog) {
      addAuditLog({
        type: 'client_deleted',
        description: `Client "${clientToDelete.name}" deleted`,
        user: user?.name || 'Unknown',
        clientId: clientToDelete.id,
      });
    }
    setDeleteConfirm({ isOpen: false, client: null });
    return true;
  }, [deleteConfirm.client, addAuditLog, user, dataContext, addToast]);

  // Deleting a client detaches its history (FKs are SET NULL) — say so
  const deleteMessage = useMemo(() => {
    const client = deleteConfirm.client;
    if (!client) return '';
    const projectCount = getClientProjects(client.id).length;
    const hasCheckouts = inventory.some((i) => i.checkoutClientId === client.id);
    let message = `Are you sure you want to delete "${client.name}"?`;
    if (projectCount > 0) {
      message += ` ${projectCount} reservation${projectCount === 1 ? '' : 's'} will keep their history but lose the link to this client.`;
    }
    if (hasCheckouts) {
      message += ' This client currently has gear checked out.';
    }
    message += ' This cannot be undone.';
    return message;
  }, [deleteConfirm.client, getClientProjects, inventory]);

  // Detail view
  if (selectedClient) {
    return (
      <>
        {!canEditClients && <ViewOnlyBanner functionId="clients" />}
        <ClientDetailView
          client={selectedClient}
          projects={getClientProjects(selectedClient.id)}
          inventory={inventory}
          onBack={() => setSelectedClient(null)}
          onEdit={(c) => {
            setEditingClient(c);
          }}
          onDelete={(c) => {
            setDeleteConfirm({ isOpen: true, client: c });
          }}
          onViewReservation={onViewReservation}
          onAddNote={(text) => onAddNote(selectedClient.id, text)}
          onReplyNote={(parentId, text) => onReplyNote(selectedClient.id, parentId, text)}
          onDeleteNote={(noteId) => onDeleteNote(selectedClient.id, noteId)}
          canEdit={canEditClients}
        />
        {editingClient && (
          <ClientFormModal
            client={editingClient}
            onSave={handleSaveClient}
            onClose={() => setEditingClient(null)}
          />
        )}

        {/* Delete Confirmation */}
        <ConfirmDialog
          isOpen={deleteConfirm.isOpen}
          title="Delete Client"
          message={deleteMessage}
          confirmText="Delete"
          onConfirm={async () => {
            const ok = await handleDeleteClient();
            if (ok) setSelectedClient(null);
          }}
          onCancel={() => setDeleteConfirm({ isOpen: false, client: null })}
        />
      </>
    );
  }

  return (
    <div>
      {/* Header */}
      <PageHeader
        title="Clients"
        subtitle={`${clients.length} total clients`}
        action={
          canEditClients ? (
            <Button onClick={() => setShowAddModal(true)} icon={Plus}>
              Add Client
            </Button>
          ) : null
        }
      />

      {!canEditClients && <ViewOnlyBanner functionId="clients" />}

      {/* Filters */}
      <Card style={{ marginBottom: spacing[4] }}>
        <div style={{ display: 'flex', gap: spacing[3], flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search clients..."
            />
          </div>
          <Select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            options={[
              { value: 'all', label: 'All Types' },
              { value: 'favorites', label: '★ Favorites' },
              ...CLIENT_TYPES.map((t) => ({ value: t, label: t })),
            ]}
            style={{ minWidth: 140 }}
            aria-label="Filter by type"
          />
        </div>
      </Card>

      {/* Client List */}
      {clientsLoadFailed && clients.length === 0 ? (
        <LoadErrorBanner
          message="Couldn't load clients. Check your connection and try again."
          onRetry={() => ensureClients?.()}
        />
      ) : !clientsLoaded && clients.length === 0 ? (
        <Card
          role="status"
          style={{ textAlign: 'center', padding: spacing[8], color: colors.textMuted }}
        >
          Loading clients...
        </Card>
      ) : filteredClients.length === 0 ? (
        <EmptyState
          icon={Users}
          title={clients.length === 0 ? 'No clients yet' : 'No clients match your search'}
          description={
            clients.length === 0
              ? 'Add your first client to start tracking projects'
              : 'Try adjusting your search or filters'
          }
          action={
            clients.length === 0 &&
            canEditClients && (
              <Button onClick={() => setShowAddModal(true)} icon={Plus}>
                Add Client
              </Button>
            )
          }
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[3] }}>
          {filteredClients.map((client) => (
            <ClientCard
              key={client.id}
              client={client}
              stats={getClientStats(client)}
              onSelect={setSelectedClient}
            />
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {(showAddModal || editingClient) && (
        <ClientFormModal
          client={editingClient}
          onSave={handleSaveClient}
          onClose={() => {
            setShowAddModal(false);
            setEditingClient(null);
          }}
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title="Delete Client"
        message={deleteMessage}
        confirmText="Delete"
        onConfirm={handleDeleteClient}
        onCancel={() => setDeleteConfirm({ isOpen: false, client: null })}
      />
    </div>
  );
}

export default memo(ClientsView);
