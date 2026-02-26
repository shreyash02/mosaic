import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useHints, resetAllHintsState } from './useHints'
import type { HintId } from './useHints'

describe('useHints', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('shows all hints by default', () => {
    const { result } = renderHook(() => useHints())

    expect(result.current.shouldShowHint('share-conversation-link')).toBe(true)
    expect(result.current.shouldShowHint('run-analysis')).toBe(true)
    expect(result.current.seenHints).toEqual([])
  })

  it('dismissHint marks a hint as seen', () => {
    const { result } = renderHook(() => useHints())

    act(() => result.current.dismissHint('share-conversation-link'))

    expect(result.current.shouldShowHint('share-conversation-link')).toBe(false)
    expect(result.current.shouldShowHint('run-analysis')).toBe(true)
    expect(result.current.seenHints).toContain('share-conversation-link')
  })

  it('dismissing the same hint twice is idempotent', () => {
    const { result } = renderHook(() => useHints())

    act(() => result.current.dismissHint('run-analysis'))
    act(() => result.current.dismissHint('run-analysis'))

    expect(result.current.seenHints.filter((id: HintId) => id === 'run-analysis')).toHaveLength(1)
  })

  it('resetAllHints clears all dismissed hints', () => {
    const { result } = renderHook(() => useHints())

    act(() => {
      result.current.dismissHint('share-conversation-link')
      result.current.dismissHint('run-analysis')
    })
    expect(result.current.seenHints).toHaveLength(2)

    act(() => result.current.resetAllHints())
    expect(result.current.seenHints).toHaveLength(0)
    expect(result.current.shouldShowHint('share-conversation-link')).toBe(true)
  })

  it('resetHint clears only the specified hint', () => {
    const { result } = renderHook(() => useHints())

    act(() => {
      result.current.dismissHint('share-conversation-link')
      result.current.dismissHint('run-analysis')
    })

    act(() => result.current.resetHint('share-conversation-link'))
    expect(result.current.shouldShowHint('share-conversation-link')).toBe(true)
    expect(result.current.shouldShowHint('run-analysis')).toBe(false)
  })

  it('persists state to localStorage', () => {
    const { result, unmount } = renderHook(() => useHints())

    act(() => result.current.dismissHint('run-analysis'))
    unmount()

    // Re-mount — should load from localStorage
    const { result: result2 } = renderHook(() => useHints())
    expect(result2.current.shouldShowHint('run-analysis')).toBe(false)
  })

  it('resetAllHintsState clears localStorage directly', () => {
    const { result } = renderHook(() => useHints())
    act(() => result.current.dismissHint('run-analysis'))

    resetAllHintsState()
    expect(localStorage.getItem('mosaic_hints_seen')).toBeNull()
  })
})
