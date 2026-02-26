import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSSEEvent } from './useSSEEvent'

describe('useSSEEvent', () => {
  it('calls callback when matching SSE event fires', () => {
    const callback = vi.fn()
    renderHook(() => useSSEEvent('analysis_complete', callback))

    act(() => {
      window.dispatchEvent(new CustomEvent('sse:analysis_complete', {
        detail: { conversationId: '123', status: 'done' },
      }))
    })

    expect(callback).toHaveBeenCalledOnce()
    expect(callback).toHaveBeenCalledWith({ conversationId: '123', status: 'done' })
  })

  it('does not call callback for non-matching SSE events', () => {
    const callback = vi.fn()
    renderHook(() => useSSEEvent('analysis_complete', callback))

    act(() => {
      window.dispatchEvent(new CustomEvent('sse:other_event', { detail: {} }))
    })

    expect(callback).not.toHaveBeenCalled()
  })

  it('handles multiple events', () => {
    const callback = vi.fn()
    renderHook(() => useSSEEvent('response_added', callback))

    act(() => {
      window.dispatchEvent(new CustomEvent('sse:response_added', { detail: { id: '1' } }))
      window.dispatchEvent(new CustomEvent('sse:response_added', { detail: { id: '2' } }))
    })

    expect(callback).toHaveBeenCalledTimes(2)
    expect(callback).toHaveBeenNthCalledWith(1, { id: '1' })
    expect(callback).toHaveBeenNthCalledWith(2, { id: '2' })
  })

  it('cleans up listener on unmount', () => {
    const callback = vi.fn()
    const { unmount } = renderHook(() => useSSEEvent('test_event', callback))

    unmount()

    act(() => {
      window.dispatchEvent(new CustomEvent('sse:test_event', { detail: {} }))
    })

    expect(callback).not.toHaveBeenCalled()
  })

  it('updates listener when eventType changes', () => {
    const callback = vi.fn()
    const { rerender } = renderHook(
      ({ eventType }) => useSSEEvent(eventType, callback),
      { initialProps: { eventType: 'event_a' } }
    )

    // Fire old event type
    act(() => {
      window.dispatchEvent(new CustomEvent('sse:event_a', { detail: 'a' }))
    })
    expect(callback).toHaveBeenCalledOnce()

    // Switch event type
    rerender({ eventType: 'event_b' })

    // Old event type should no longer fire
    act(() => {
      window.dispatchEvent(new CustomEvent('sse:event_a', { detail: 'a2' }))
    })
    expect(callback).toHaveBeenCalledOnce() // still 1

    // New event type should fire
    act(() => {
      window.dispatchEvent(new CustomEvent('sse:event_b', { detail: 'b' }))
    })
    expect(callback).toHaveBeenCalledTimes(2)
    expect(callback).toHaveBeenLastCalledWith('b')
  })
})
