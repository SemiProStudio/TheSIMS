// ============================================================================
// UI Component Library Index
// Re-exports all components for easy importing
// 
// Usage:
//   import { Button, Card, Modal } from './components/ui';
//   // or
//   import { Button } from './components/ui/Button';
// ============================================================================

// Core components
export { BackButton } from './BackButton.jsx';
export { Button, IconButton } from './Button.jsx';
export { Card, CardHeader, CardBody, CardFooter, StatsCard, EmptyStateCard, CardGrid } from './Card.jsx';
export { Badge } from './Badge.jsx';
export { Input } from './Input.jsx';
export { Modal, ModalHeader, ModalBody, ModalFooter, ConfirmDialog, ModalAlert } from './Modal.jsx';
export { SearchInput } from './SearchInput.jsx';
export { StatCard } from './StatCard.jsx';
export { EmptyState } from './EmptyState.jsx';
export { PageHeader } from './PageHeader.jsx';
export { Pagination } from './Pagination.jsx';
export { CollapsibleSection } from './CollapsibleSection.jsx';

// Media components
export { ItemImage } from './ItemImage.jsx';
export { Avatar } from './Avatar.jsx';

// Loading states
export { LoadingSpinner } from './LoadingSpinner.jsx';
export { LoadingOverlay } from './LoadingOverlay.jsx';

// Drag and drop
export { useDragReorder, DragHandle } from './DragReorder.jsx';

// Layout components
export { Grid, Flex, Divider } from './Layout.jsx';

// Accessibility components
export { VisuallyHidden, LiveRegion, SkipLink } from './Accessibility.jsx';

// Shared utilities (for component authors)
export { colors, styles, spacing, typography, borderRadius, withOpacity } from './shared.js';
