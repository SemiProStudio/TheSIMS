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
export { BackButton } from './BackButton';
export { Button, IconButton } from './Button';
export { Card, CardHeader, CardBody, CardFooter, StatsCard, EmptyStateCard, CardGrid } from './Card';
export { Badge } from './Badge';
export { Input } from './Input';
export { Modal, ModalHeader, ModalBody, ModalFooter, ConfirmDialog, ModalAlert } from './Modal';
export { SearchInput } from './SearchInput';
export { StatCard } from './StatCard';
export { EmptyState } from './EmptyState';
export { PageHeader } from './PageHeader';
export { Pagination } from './Pagination';
export { CollapsibleSection } from './CollapsibleSection';

// Media components
export { ItemImage } from './ItemImage';
export { Avatar } from './Avatar';

// Loading states
export { LoadingSpinner } from './LoadingSpinner';
export { LoadingOverlay } from './LoadingOverlay';

// Drag and drop
export { useDragReorder, DragHandle } from './DragReorder';

// Layout components
export { Grid, Flex, Divider } from './Layout';

// Accessibility components
export { VisuallyHidden, LiveRegion, SkipLink } from './Accessibility';

// Shared utilities (for component authors)
export { colors, styles, spacing, typography, borderRadius, withOpacity } from './shared';
