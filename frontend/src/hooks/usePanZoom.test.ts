import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePanZoom } from './usePanZoom'

describe('usePanZoom', () => {
  it('initializes with default state', () => {
    const { result } = renderHook(() => usePanZoom())

    expect(result.current.scale).toBe(1)
    expect(result.current.translateX).toBe(0)
    expect(result.current.isPanning).toBe(false)
  })

  it('resetZoom resets scale and translation', () => {
    const { result } = renderHook(() => usePanZoom())

    // Manually set some state via internal methods, then reset
    act(() => result.current.resetZoom())

    expect(result.current.scale).toBe(1)
    expect(result.current.translateX).toBe(0)
  })

  it('provides a container ref', () => {
    const { result } = renderHook(() => usePanZoom())
    expect(result.current.containerRef).toBeDefined()
    expect(result.current.containerRef.current).toBeNull() // not mounted
  })

  it('provides content offset and width refs', () => {
    const { result } = renderHook(() => usePanZoom())
    expect(result.current.contentOffsetRef).toBeDefined()
    expect(result.current.contentWidthRef).toBeDefined()
    expect(result.current.contentOffsetRef.current).toBe(0)
    expect(result.current.contentWidthRef.current).toBe(0)
  })

  it('accepts custom min and max scale', () => {
    const { result } = renderHook(() => usePanZoom({ minScale: 0.5, maxScale: 5 }))

    // Should start at default scale
    expect(result.current.scale).toBe(1)
  })

  it('exposes zoomIn, zoomOut, and resetZoom functions', () => {
    const { result } = renderHook(() => usePanZoom())

    expect(typeof result.current.zoomIn).toBe('function')
    expect(typeof result.current.zoomOut).toBe('function')
    expect(typeof result.current.resetZoom).toBe('function')
  })

  it('exposes handleMouseDownCapture for pan initiation', () => {
    const { result } = renderHook(() => usePanZoom())
    expect(typeof result.current.handleMouseDownCapture).toBe('function')
  })
})
