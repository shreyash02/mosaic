import { describe, it, expect, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { usePageTitle } from './usePageTitle'

describe('usePageTitle', () => {
  afterEach(() => {
    document.title = ''
  })

  it('sets "Title | Mosaic" when given a title', () => {
    renderHook(() => usePageTitle('Settings'))
    expect(document.title).toBe('Settings | Mosaic')
  })

  it('sets just "Mosaic" when given null', () => {
    renderHook(() => usePageTitle(null))
    expect(document.title).toBe('Mosaic')
  })

  it('sets just "Mosaic" when given undefined', () => {
    renderHook(() => usePageTitle())
    expect(document.title).toBe('Mosaic')
  })

  it('resets title to "Mosaic" on unmount', () => {
    const { unmount } = renderHook(() => usePageTitle('Dashboard'))
    expect(document.title).toBe('Dashboard | Mosaic')

    unmount()
    expect(document.title).toBe('Mosaic')
  })

  it('updates title when prop changes', () => {
    const { rerender } = renderHook(
      ({ title }) => usePageTitle(title),
      { initialProps: { title: 'Page A' as string | undefined } }
    )
    expect(document.title).toBe('Page A | Mosaic')

    rerender({ title: 'Page B' })
    expect(document.title).toBe('Page B | Mosaic')
  })
})
