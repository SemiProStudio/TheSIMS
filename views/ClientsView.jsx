// ============================================================================
// Clients View - Client & Project Management (Phase 6)
// ============================================================================

import { memo, useState, useCallback, useMemo, useEffect } from 'react';
import { 
  Users, Plus, Search, Building2, Mail, Phone, Calendar, 
  Package, ChevronRight, Edit2, Trash2, MapPin, FileText,
  Clock, DollarSign, Star, MessageSquare, X
} from 'lucide-react';
import { colors, styles, spacing, borderRadius, typography, withOpacity} from '../theme.js';
import { formatMoney } from '../utils';
import { Card, Button, SearchInput, Badge, ConfirmDialog, CollapsibleSection, PageHeader } from '../components/ui.jsx';
import { Select } from '../components/Select.jsx';
import NotesSection from '../components/NotesSection.jsx';
import { useData } from '../contexts/DataContext.jsx';

import { error as logError } from '../lib/logger.js';

// Client type options
const CLIENT_TYPES = ['Individual', 'Company', 'Agency', 'Non-Profit', 'Government', 'Other'];

// ============================================================================
// Client Card Component
// ============================================================================
const ClientCard = memo(function ClientCard({ client, stats, onSelect }) {
  return (
    <Card 
      style={{ cursor: 'pointer', position: 'relative' }}
      onClick={() => onSelect(client)}
    >
      <div style={{ display: 'flex', gap: spacing[3] }}>
        {/* Avatar */}
        <div style={{
          width: 48, height: 48,
          borderRadius: borderRadius.lg,
          background: `${withOpacity(colors.primary, 20)}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          {client.type === 'Company' || client.type === 'Agency' ? (
            <Building2 size={24} color={colors.primary} />
          ) : (
            <Users size={24} color={colors.primary} />
          )}
        </div>
        
        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: spacing[2],
            marginBottom: spacing[1],
          }}>
            <span style={{ 
              fontWeight: typography.fontWeight.semibold, 
              color: colors.textPrimary,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {client.name}
            </span>
            {client.favorite && <Star size={14} color="#f59e0b" fill="#f59e0b" />}
          </div>
          
          {client.company && client.type === 'Individual' && (
            <div style={{ 
              fontSize: typography.fontSize.xs, 
              color: colors.textMuted,
              marginBottom: spacing[1],
            }}>
              {client.company}
            </div>
          )}
          
          <div style={{ display: 'flex', gap: spacing[3], flexWrap: 'wrap' }}>
            {client.email && (
              <span style={{ 
                fontSize: typography.fontSize.xs, 
                color: colors.textSecondary,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}>
                <Mail size={12} /> {client.email}
              </span>
            )}
            {client.phone && (
              <span style={{ 
                fontSize: typography.fontSize.xs, 
                color: colors.textSecondary,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}>
                <Phone size={12} /> {client.phone}
              </span>
            )}
          </div>
        </div>
        
        {/* Stats */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'flex-end',
          gap: spacing[1],
        }}>
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
// Client Form Modal
// ============================================================================
const ClientFormModal = memo(function ClientFormModal({ client, onSave, onClose }) {
  const [formData, setFormData] = useState({
    name: client?.name || '',
    type: client?.type || 'Individual',
    company: client?.company || '',
    email: client?.email || '',
    phone: client?.phone || '',
    address: client?.address || '',
    notes: client?.notes || '',
    favorite: client?.favorite || false,
  });
  const [nameError, setNameError] = useState('');
  
  const isNameEmpty = !formData.name.trim();
  const isEditing = !!client;
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (isNameEmpty) {
      setNameError('Client name is required');
      return;
    }
    
    onSave({
      ...client,
      ...formData,
      id: client?.id || `CL${Date.now()}`,
      createdAt: client?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  };
  
  return (
    <div className="modal-backdrop" style={styles.modal} onClick={onClose}>
      <div style={styles.modalBox} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{
          padding: spacing[4],
          borderBottom: `1px solid ${colors.borderLight}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <h3 style={{ margin: 0, color: colors.textPrimary }}>
            {client ? 'Edit Client' : 'Add New Client'}
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: colors.textMuted,
              cursor: 'pointer',
              padding: spacing[1],
            }}
          >
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} style={{ padding: spacing[4], maxHeight: 'calc(90vh - 80px)', overflowY: 'auto' }}>
          {/* Name - Required field */}
          <div className="form-section">
            <label className={`form-label ${isNameEmpty ? 'label-required-empty' : ''}`}>
              Name <span className="required-indicator">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => { setFormData(prev => ({ ...prev, name: e.target.value })); setNameError(''); }}
              className={`input ${isNameEmpty ? 'input-required-empty' : ''}`}
              placeholder="Client name"
              autoFocus
            />
            {nameError && <span className="required-error-text">{nameError}</span>}
          </div>
          
          {/* Type */}
          <div className="form-section">
            <label className="form-label">Type</label>
            <Select
              value={formData.type}
              onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
              options={CLIENT_TYPES.map(t => ({ value: t, label: t }))}
              aria-label="Client type"
            />
          </div>
          
          {/* Company (if Individual) */}
          {formData.type === 'Individual' && (
            <div className="form-section">
              <label className="form-label">Company</label>
              <input
                type="text"
                value={formData.company}
                onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                className="input"
                placeholder="Company name (optional)"
              />
            </div>
          )}
          
          {/* Email & Phone */}
          <div className="form-row">
            <div className="form-field">
              <label className="form-label">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="input"
                placeholder="email@example.com"
              />
            </div>
            <div className="form-field">
              <label className="form-label">Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                className="input"
                placeholder="555-123-4567"
              />
            </div>
          </div>
          
          {/* Address */}
          <div className="form-section">
            <label className="form-label">Address</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
              className="input"
              placeholder="Street address, city, state"
            />
          </div>
          
          {/* Notes */}
          <div className="form-section">
            <label className="form-label">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              className="input"
              style={{ minHeight: 80, resize: 'vertical' }}
              placeholder="Additional notes about this client"
            />
          </div>
          
          {/* Favorite */}
          <label style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: spacing[2],
            color: colors.textSecondary,
            fontSize: typography.fontSize.sm,
            cursor: 'pointer',
            marginBottom: spacing[4],
          }}>
            <input
              type="checkbox"
              checked={formData.favorite}
              onChange={(e) => setFormData(prev => ({ ...prev, favorite: e.target.checked }))}
            />
            <Star size={14} /> Mark as favorite
          </label>
          
          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: spacing[2] }}>
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" icon={isEditing ? Edit2 : Plus}>
              {isEditing ? 'Save Changes' : 'Add Client'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
});

// ============================================================================
// Client Detail View
// ============================================================================
const ClientDetailView = memo(function ClientDetailView({ 
  client, 
  projects, 
  onBack, 
  onEdit,
  onDelete,
  onViewReservation,
  onAddNote,
  onReplyNote,
  onDeleteNote,
  user,
}) {
  const [notesCollapsed, setNotesCollapsed] = useState(false);
  
  const stats = useMemo(() => ({
    totalProjects: projects.length,
    activeProjects: projects.filter(p => new Date(p.end) >= new Date()).length,
    totalValue: projects.reduce((sum, p) => sum + (p.value || 0), 0),
    lastProject: projects.length > 0 
      ? projects.sort((a, b) => new Date(b.start) - new Date(a.start))[0]
      : null,
  }), [projects]);
  
  const clientNotes = client.clientNotes || [];
  
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
          <div style={{
            width: 64, height: 64,
            borderRadius: borderRadius.xl,
            background: `${withOpacity(colors.primary, 20)}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            {client.type === 'Company' || client.type === 'Agency' ? (
              <Building2 size={32} color={colors.primary} />
            ) : (
              <Users size={32} color={colors.primary} />
            )}
          </div>
          
          {/* Info */}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2], marginBottom: spacing[2] }}>
              <h2 style={{ margin: 0, color: colors.textPrimary }}>{client.name}</h2>
              {client.favorite && <Star size={18} color="#f59e0b" fill="#f59e0b" />}
              <Badge>{client.type}</Badge>
            </div>
            
            <div style={{ display: 'flex', gap: spacing[4], flexWrap: 'wrap', color: colors.textSecondary, fontSize: typography.fontSize.sm }}>
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
              <p style={{ 
                margin: `${spacing[3]}px 0 0`, 
                color: colors.textMuted,
                fontSize: typography.fontSize.sm,
              }}>
                {client.notes}
              </p>
            )}
          </div>
          
          <div style={{ display: 'flex', gap: spacing[2], alignItems: 'center' }}>
            <Button variant="secondary" onClick={() => onEdit(client)} icon={Edit2}>
              Edit
            </Button>
            <button className="btn-icon danger" onClick={() => onDelete(client)}>
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      </Card>
      
      {/* Stats */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
        gap: spacing[3],
        marginBottom: spacing[4],
      }}>
        <Card style={{ textAlign: 'center', padding: spacing[4] }}>
          <div style={{ fontSize: typography.fontSize['2xl'], fontWeight: 'bold', color: colors.primary }}>
            {stats.totalProjects}
          </div>
          <div style={{ fontSize: typography.fontSize.xs, color: colors.textMuted }}>Total Projects</div>
        </Card>
        <Card style={{ textAlign: 'center', padding: spacing[4] }}>
          <div style={{ fontSize: typography.fontSize['2xl'], fontWeight: 'bold', color: colors.success }}>
            {stats.activeProjects}
          </div>
          <div style={{ fontSize: typography.fontSize.xs, color: colors.textMuted }}>Active</div>
        </Card>
        <Card style={{ textAlign: 'center', padding: spacing[4] }}>
          <div style={{ fontSize: typography.fontSize['2xl'], fontWeight: 'bold', color: colors.accent1 }}>
            {formatMoney(stats.totalValue)}
          </div>
          <div style={{ fontSize: typography.fontSize.xs, color: colors.textMuted }}>Total Value</div>
        </Card>
      </div>
      
      {/* Notes Section */}
      <CollapsibleSection
        title="Notes"
        icon={MessageSquare}
        badge={clientNotes.filter(n => !n.deleted).length || null}
        badgeColor={colors.primary}
        collapsed={notesCollapsed}
        onToggleCollapse={() => setNotesCollapsed(!notesCollapsed)}
        style={{ marginBottom: spacing[4] }}
      >
        <NotesSection
          notes={clientNotes}
          onAddNote={onAddNote}
          onReply={onReplyNote}
          onDelete={onDeleteNote}
          user={user}
          panelColor={colors.primary}
        />
      </CollapsibleSection>
      
      {/* Project History */}
      <Card>
        <h3 style={{ margin: `0 0 ${spacing[3]}px`, color: colors.textPrimary }}>
          Project History
        </h3>
        
        {projects.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: spacing[6],
            color: colors.textMuted,
          }}>
            No projects yet
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
            {projects.map(project => (
              <div
                key={project.id}
                onClick={() => onViewReservation?.(project)}
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
                  <div style={{ fontWeight: typography.fontWeight.medium, color: colors.textPrimary }}>
                    {project.project}
                  </div>
                  <div style={{ fontSize: typography.fontSize.xs, color: colors.textMuted }}>
                    {project.start} - {project.end} • {project.itemCount || 1} items
                  </div>
                </div>
                {project.value > 0 && (
                  <span style={{ color: colors.textSecondary, fontSize: typography.fontSize.sm }}>
                    ${project.value}
                  </span>
                )}
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
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);
  const [editingClient, setEditingClient] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, client: null });
  const [filterType, setFilterType] = useState('all');
  
  // Keep selectedClient in sync with clients prop (for when notes are added/updated)
  useEffect(() => {
    if (selectedClient) {
      const updatedClient = clients.find(c => c.id === selectedClient.id);
      if (updatedClient && updatedClient !== selectedClient) {
        setSelectedClient(updatedClient);
      }
    }
  }, [clients, selectedClient]);
  
  // Get project history for each client from reservations
  const getClientProjects = useCallback((clientId) => {
    const projects = [];
    inventory.forEach(item => {
      (item.reservations || []).forEach(res => {
        if (res.clientId === clientId) {
          projects.push({
            ...res,
            itemId: item.id,
            itemName: item.name,
            itemCount: 1,
          });
        }
      });
    });
    return projects.sort((a, b) => new Date(b.start) - new Date(a.start));
  }, [inventory]);
  
  // Get stats for a client
  const getClientStats = useCallback((client) => {
    const projects = getClientProjects(client.id);
    return {
      totalProjects: projects.length,
      activeReservations: projects.filter(p => new Date(p.end) >= new Date()).length,
      totalValue: projects.reduce((sum, p) => sum + (p.value || 0), 0),
    };
  }, [getClientProjects]);
  
  // Filter clients
  const filteredClients = useMemo(() => {
    let result = [...clients];
    
    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c => 
        c.name.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.company?.toLowerCase().includes(q)
      );
    }
    
    // Type filter
    if (filterType !== 'all') {
      if (filterType === 'favorites') {
        result = result.filter(c => c.favorite);
      } else {
        result = result.filter(c => c.type === filterType);
      }
    }
    
    // Sort: favorites first, then by name
    return result.sort((a, b) => {
      if (a.favorite && !b.favorite) return -1;
      if (!a.favorite && b.favorite) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [clients, searchQuery, filterType]);
  
  // Handlers
  const handleSaveClient = useCallback(async (clientData) => {
    const exists = clients.find(c => c.id === clientData.id);
    if (exists) {
      // Update existing client
      try {
        if (dataContext?.updateClient) {
          await dataContext.updateClient(clientData.id, clientData);
        } else {
          dataContext.patchClient(clientData.id, clientData);
        }
      } catch (err) {
        logError('Failed to update client:', err);
        dataContext.patchClient(clientData.id, clientData);
      }
    } else {
      // New client - create in database
      try {
        if (dataContext?.createClient) {
          await dataContext.createClient(clientData);
        }
      } catch (err) {
        logError('Failed to create client:', err);
      }
      setSelectedClient(clientData);
    }
    setShowAddModal(false);
    setEditingClient(null);
  }, [clients, dataContext]);
  
  const handleDeleteClient = useCallback(async () => {
    if (deleteConfirm.client) {
      const clientToDelete = deleteConfirm.client;
      
      // Delete from database
      if (dataContext?.deleteClient) {
        try {
          await dataContext.deleteClient(clientToDelete.id);
        } catch (err) {
          logError('Failed to delete client:', err);
        }
      }
      
      // Log deletion
      if (addAuditLog) {
        addAuditLog({
          type: 'client_deleted',
          description: `Client "${clientToDelete.name}" deleted`,
          user: user?.name || 'Unknown',
          clientId: clientToDelete.id
        });
      }
    }
    setDeleteConfirm({ isOpen: false, client: null });
  }, [clients, deleteConfirm.client, addAuditLog, user, dataContext]);
  
  // Detail view
  if (selectedClient) {
    return (
      <>
        <ClientDetailView
          client={selectedClient}
          projects={getClientProjects(selectedClient.id)}
          onBack={() => setSelectedClient(null)}
          onEdit={(c) => { setEditingClient(c); }}
          onDelete={(c) => { setDeleteConfirm({ isOpen: true, client: c }); }}
          onViewReservation={onViewReservation}
          onAddNote={(text) => onAddNote(selectedClient.id, text)}
          onReplyNote={(parentId, text) => onReplyNote(selectedClient.id, parentId, text)}
          onDeleteNote={(noteId) => onDeleteNote(selectedClient.id, noteId)}
          user={user}
        />
        {editingClient && (
          <ClientFormModal
            client={editingClient}
            onSave={(updated) => {
              dataContext.patchClient(updated.id, updated);
              setEditingClient(null);
              setSelectedClient(updated);
            }}
            onClose={() => setEditingClient(null)}
          />
        )}
        
        {/* Delete Confirmation */}
        <ConfirmDialog
          isOpen={deleteConfirm.isOpen}
          title="Delete Client"
          message={`Are you sure you want to delete "${deleteConfirm.client?.name}"? This cannot be undone.`}
          confirmText="Delete"
          onConfirm={() => { handleDeleteClient(); setSelectedClient(null); }}
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
          <Button onClick={() => setShowAddModal(true)} icon={Plus}>
            Add Client
          </Button>
        }
      />
      
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
              ...CLIENT_TYPES.map(t => ({ value: t, label: t }))
            ]}
            style={{ minWidth: 140 }}
            aria-label="Filter by type"
          />
        </div>
      </Card>
      
      {/* Client List */}
      {filteredClients.length === 0 ? (
        <Card style={{ textAlign: 'center', padding: spacing[8] }}>
          <Users size={48} color={colors.textMuted} style={{ marginBottom: spacing[3] }} />
          <h3 style={{ margin: 0, color: colors.textPrimary }}>
            {clients.length === 0 ? 'No clients yet' : 'No clients match your search'}
          </h3>
          <p style={{ margin: `${spacing[2]}px 0 0`, color: colors.textMuted }}>
            {clients.length === 0 
              ? 'Add your first client to start tracking projects'
              : 'Try adjusting your search or filters'
            }
          </p>
          {clients.length === 0 && (
            <Button onClick={() => setShowAddModal(true)} icon={Plus} style={{ marginTop: spacing[4] }}>
              Add Client
            </Button>
          )}
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[3] }}>
          {filteredClients.map(client => (
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
          onClose={() => { setShowAddModal(false); setEditingClient(null); }}
        />
      )}
      
      {/* Delete Confirmation */}
      {deleteConfirm && (
        <ConfirmDialog
          title="Delete Client"
          message={`Are you sure you want to delete "${deleteConfirm.name}"? This cannot be undone.`}
          confirmLabel="Delete"
          confirmVariant="danger"
          onConfirm={() => handleDeleteClient(deleteConfirm)}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}
    </div>
  );
}

export default memo(ClientsView);
