// ============================================================================
// Package Handlers
// Extracted from App.jsx — manages package CRUD
// ============================================================================
import { useCallback } from 'react';
import { VIEWS } from '../constants.js';
import { updateById, removeById } from '../utils.js';

export function usePackageHandlers({
  packages,
  setPackages,
  inventory,
  selectedPackage,
  setSelectedPackage,
  setCurrentView,
  categories,
  showConfirm,
  addChangeLog,
}) {
  const deletePackage = useCallback((id) => {
    showConfirm({
      title: 'Delete Package',
      message: 'Are you sure you want to delete this package? This action cannot be undone.',
      confirmText: 'Delete',
      variant: 'danger',
      onConfirm: () => {
        setPackages(prev => removeById(prev, id));
        if (selectedPackage?.id === id) {
          setSelectedPackage(null);
          setCurrentView(VIEWS.PACKAGES);
        }
      }
    });
  }, [selectedPackage, showConfirm, setPackages, setSelectedPackage, setCurrentView]);

  const addItemToPackage = useCallback((packageId, itemId) => {
    const pkg = packages.find(p => p.id === packageId);
    const item = inventory.find(i => i.id === itemId);
    
    if (pkg && item && !pkg.items.includes(itemId)) {
      setPackages(prev => updateById(prev, packageId, p => ({
        items: [...p.items, itemId]
      })));
      
      addChangeLog({
        type: 'updated',
        itemId: packageId,
        itemType: 'package',
        itemName: pkg.name,
        description: `Added "${item.name}" to package "${pkg.name}"`,
        changes: [{ 
          field: 'packageContents', 
          oldValue: null, 
          newValue: `+ ${item.name} (${item.id})` 
        }]
      });
    }
  }, [packages, inventory, addChangeLog]);

  const addPackage = useCallback(() => {
    const newId = `pkg-${Date.now()}`;
    const newPackage = {
      id: newId,
      name: 'New Package',
      description: 'Package description',
      category: categories[0] || 'General',
      items: [],
      notes: []
    };
    setPackages(prev => [...prev, newPackage]);
    setSelectedPackage(newPackage);
    setCurrentView(VIEWS.PACKAGE_DETAIL);
    
    addChangeLog({
      type: 'created',
      itemId: newId,
      itemType: 'package',
      itemName: 'New Package',
      description: 'Created new package',
      changes: [{ field: 'package', oldValue: null, newValue: 'New Package' }]
    });
  }, [categories, addChangeLog]);

  return {
    deletePackage,
    addItemToPackage,
    addPackage,
  };
}
