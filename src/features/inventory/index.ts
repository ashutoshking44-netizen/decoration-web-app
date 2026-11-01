export { InventorySetupPage } from '@/components/company/inventory-setup-page';
export { AddDecorationPage } from '@/components/company/add-decoration-page';
export { AddDecorationSetupWizard } from '@/components/company/add-decoration-setup-wizard';
export { DecorationCatalogCard } from '@/components/company/decoration-catalog-card';
export { DecorationCatalogListItem } from '@/components/company/decoration-catalog-list-item';
export { DecorationDetailsModal } from '@/components/company/decoration-details-modal';
export { FlowerColourInput } from '@/components/company/flower-colour-input';

export * from '@/lib/decoration-setups';
export * from '@/lib/decor-item-breakdown';
export * from '@/lib/design-match';

export {
  loadStoredSetups as loadStoredInventoryTasks,
  saveStoredSetups as saveStoredInventoryTasks,
  INITIAL_INVENTORY_ITEMS,
  INITIAL_CONFLICTS,
  INITIAL_SETUP_TASKS,
  INITIAL_STOCK_MOVEMENTS,
  loadStoredItems,
  saveStoredItems,
  loadStoredConflicts,
  saveStoredConflicts,
  loadStoredMovements,
  saveStoredMovements,
  useInventoryStore,
  calculateInventoryStatus,
  getItemStatus,
  normalizeInventoryItem,
  type ItemType,
  type InventoryCategory,
  type InventoryUnit,
  type ItemCondition,
  type InventoryStatus,
  type ItemStatusType,
  type VendorUnitConversion,
  type StockAdjustmentType,
  type StockMovement,
  type InventoryItem,
  type ConflictResolution,
  type ReservationConflict,
  type SetupStatus,
  type SetupChecklistItem,
  type FunctionSetupTask,
} from '@/lib/inventory-setup';
