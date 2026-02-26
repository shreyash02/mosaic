import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useIsMobile } from './useIsMobile'

describe('useIsMobile', () => {
  let changeHandler: ((e: { matches: boolean }) => void) | null = null
  const originalMatchMedia = window.matchMedia

  beforeEach(() => {
    changeHandler = null
    // jsdom doesn't implement matchMedia — define it as a writable property
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: vi.fn(() => ({
        matches: false,
        addEventListener: vi.fn((event: string, handler: (e: { matches: boolean }) => void) => {
          if (event === 'change') changeHandler = handler
        }),
        removeEventListener: vi.fn(),
      })),
    })
  })

  afterEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: originalMatchMedia,
    })
  })

  it('returns false when window width >= 768', () => {
    Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true, configurable: true })
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)
  })

  it('returns true when window width < 768', () => {
    Object.defineProperty(window, 'innerWidth', { value: 500, writable: true, configurable: true })
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(true)
  })

  it('returns true at exactly 767', () => {
    Object.defineProperty(window, 'innerWidth', { value: 767, writable: true, configurable: true })
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(true)
  })

  it('returns false at exactly 768', () => {
    Object.defineProperty(window, 'innerWidth', { value: 768, writable: true, configurable: true })
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)
  })

  it('updates when matchMedia change event fires', () => {
    Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true, configurable: true })
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)

    act(() => {
      changeHandler?.({ matches: true })
    })
    expect(result.current).toBe(true)

    act(() => {
      changeHandler?.({ matches: false })
    })
    expect(result.current).toBe(false)
  })

  it('registers matchMedia listener on mount', () => {
    Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true, configurable: true })
    renderHook(() => useIsMobile())
    expect(window.matchMedia).toHaveBeenCalledWith('(max-width: 767px)')
  })
})
