import { useState, useCallback, useMemo } from 'react';

interface UseSelectionOptions<T> {
  items: T[];
  getItemId: (item: T) => string;
}

interface SelectionState {
  count: number;
  isAllSelected: boolean;
  isPartiallySelected: boolean;
  isEmpty: boolean;
}

export function useSelection<T>({ items, getItemId }: UseSelectionOptions<T>) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleItem = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(items.map(getItemId)));
  }, [items, getItemId]);

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const toggleAll = useCallback(() => {
    if (selectedIds.size === items.length && items.length > 0) {
      deselectAll();
    } else {
      selectAll();
    }
  }, [selectedIds.size, items.length, selectAll, deselectAll]);

  const isSelected = useCallback((id: string) => selectedIds.has(id), [selectedIds]);

  const selectedItems = useMemo(() =>
    items.filter(item => selectedIds.has(getItemId(item))),
    [items, selectedIds, getItemId]
  );

  const selectionState: SelectionState = useMemo(() => ({
    count: selectedIds.size,
    isAllSelected: selectedIds.size === items.length && items.length > 0,
    isPartiallySelected: selectedIds.size > 0 && selectedIds.size < items.length,
    isEmpty: selectedIds.size === 0,
  }), [selectedIds.size, items.length]);

  return {
    selectedIds,
    selectedItems,
    selectionState,
    isSelected,
    toggleItem,
    selectAll,
    deselectAll,
    toggleAll,
    setSelectedIds,
  };
}
