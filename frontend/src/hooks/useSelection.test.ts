import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSelection } from './useSelection'

interface TestItem {
  id: string
  name: string
}

const items: TestItem[] = [
  { id: '1', name: 'Alpha' },
  { id: '2', name: 'Beta' },
  { id: '3', name: 'Gamma' },
]

const getItemId = (item: TestItem) => item.id

describe('useSelection', () => {
  it('starts with empty selection', () => {
    const { result } = renderHook(() => useSelection({ items, getItemId }))

    expect(result.current.selectionState.isEmpty).toBe(true)
    expect(result.current.selectionState.count).toBe(0)
    expect(result.current.selectionState.isAllSelected).toBe(false)
    expect(result.current.selectionState.isPartiallySelected).toBe(false)
    expect(result.current.selectedItems).toEqual([])
  })

  it('toggleItem selects and deselects an item', () => {
    const { result } = renderHook(() => useSelection({ items, getItemId }))

    act(() => result.current.toggleItem('1'))
    expect(result.current.isSelected('1')).toBe(true)
    expect(result.current.selectionState.count).toBe(1)

    act(() => result.current.toggleItem('1'))
    expect(result.current.isSelected('1')).toBe(false)
    expect(result.current.selectionState.count).toBe(0)
  })

  it('selectAll selects all items', () => {
    const { result } = renderHook(() => useSelection({ items, getItemId }))

    act(() => result.current.selectAll())
    expect(result.current.selectionState.isAllSelected).toBe(true)
    expect(result.current.selectionState.count).toBe(3)
    expect(result.current.selectedItems).toEqual(items)
  })

  it('deselectAll clears all selections', () => {
    const { result } = renderHook(() => useSelection({ items, getItemId }))

    act(() => result.current.selectAll())
    act(() => result.current.deselectAll())
    expect(result.current.selectionState.isEmpty).toBe(true)
    expect(result.current.selectionState.count).toBe(0)
  })

  it('toggleAll selects all when none selected', () => {
    const { result } = renderHook(() => useSelection({ items, getItemId }))

    act(() => result.current.toggleAll())
    expect(result.current.selectionState.isAllSelected).toBe(true)
  })

  it('toggleAll deselects all when all selected', () => {
    const { result } = renderHook(() => useSelection({ items, getItemId }))

    act(() => result.current.selectAll())
    act(() => result.current.toggleAll())
    expect(result.current.selectionState.isEmpty).toBe(true)
  })

  it('toggleAll selects all when partially selected', () => {
    const { result } = renderHook(() => useSelection({ items, getItemId }))

    act(() => result.current.toggleItem('1'))
    expect(result.current.selectionState.isPartiallySelected).toBe(true)

    act(() => result.current.toggleAll())
    expect(result.current.selectionState.isAllSelected).toBe(true)
  })

  it('selectedItems returns the correct subset', () => {
    const { result } = renderHook(() => useSelection({ items, getItemId }))

    act(() => {
      result.current.toggleItem('1')
      result.current.toggleItem('3')
    })

    expect(result.current.selectedItems).toEqual([
      { id: '1', name: 'Alpha' },
      { id: '3', name: 'Gamma' },
    ])
  })

  it('isAllSelected is false for empty items list', () => {
    const { result } = renderHook(() =>
      useSelection({ items: [], getItemId })
    )
    expect(result.current.selectionState.isAllSelected).toBe(false)
  })

  it('setSelectedIds allows external control', () => {
    const { result } = renderHook(() => useSelection({ items, getItemId }))

    act(() => result.current.setSelectedIds(new Set(['2', '3'])))
    expect(result.current.selectionState.count).toBe(2)
    expect(result.current.isSelected('2')).toBe(true)
    expect(result.current.isSelected('3')).toBe(true)
    expect(result.current.isSelected('1')).toBe(false)
  })
})
