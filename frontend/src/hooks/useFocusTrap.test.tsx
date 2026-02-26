import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { useState } from 'react'
import { useFocusTrap } from './useFocusTrap'

// jsdom doesn't implement offsetParent (always null), which means
// useFocusTrap's getFocusableElements filters out all elements.
// We override it so visible elements have a non-null offsetParent.
beforeEach(() => {
  Object.defineProperty(HTMLElement.prototype, 'offsetParent', {
    configurable: true,
    get() {
      return this.closest('[data-testid="modal"]') ? document.body : null
    },
  })
})

afterEach(() => {
  // Restore default (null)
  Object.defineProperty(HTMLElement.prototype, 'offsetParent', {
    configurable: true,
    get() { return null },
  })
})

function TestModal({
  initialOpen = true,
  onClose = vi.fn(),
  closeOnEscape = true,
  autoFocus = true,
  restoreFocus = true,
}: {
  initialOpen?: boolean
  onClose?: () => void
  closeOnEscape?: boolean
  autoFocus?: boolean
  restoreFocus?: boolean
}) {
  const [isOpen, setIsOpen] = useState(initialOpen)
  const ref = useFocusTrap<HTMLDivElement>({
    isOpen,
    onClose: () => {
      setIsOpen(false)
      onClose()
    },
    closeOnEscape,
    autoFocus,
    restoreFocus,
  })

  return (
    <>
      <button data-testid="trigger">Trigger</button>
      {isOpen && (
        <div ref={ref} data-testid="modal" role="dialog">
          <button data-testid="first">First</button>
          <input data-testid="middle" />
          <button data-testid="last">Last</button>
        </div>
      )}
    </>
  )
}

describe('useFocusTrap', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    document.body.style.overflow = ''
  })

  it('auto-focuses the first focusable element when opened', () => {
    render(<TestModal />)
    act(() => { vi.runAllTimers() })

    expect(document.activeElement).toBe(screen.getByTestId('first'))
  })

  it('does not auto-focus when autoFocus is false', () => {
    render(<TestModal autoFocus={false} />)
    act(() => { vi.runAllTimers() })

    expect(document.activeElement).not.toBe(screen.getByTestId('first'))
  })

  it('calls onClose when Escape is pressed', () => {
    const onClose = vi.fn()
    render(<TestModal onClose={onClose} />)
    act(() => { vi.runAllTimers() })

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(onClose).toHaveBeenCalledOnce()
  })

  it('does not call onClose on Escape when closeOnEscape is false', () => {
    const onClose = vi.fn()
    render(<TestModal onClose={onClose} closeOnEscape={false} />)
    act(() => { vi.runAllTimers() })

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(onClose).not.toHaveBeenCalled()
  })

  it('locks body scroll when open', () => {
    render(<TestModal />)
    act(() => { vi.runAllTimers() })

    expect(document.body.style.overflow).toBe('hidden')
  })

  it('restores body scroll when closed', () => {
    document.body.style.overflow = 'auto'
    render(<TestModal initialOpen={true} />)
    act(() => { vi.runAllTimers() })

    expect(document.body.style.overflow).toBe('hidden')

    fireEvent.keyDown(document, { key: 'Escape' })
    act(() => { vi.runAllTimers() })

    expect(document.body.style.overflow).toBe('auto')
  })

  it('wraps focus from last to first on Tab', () => {
    render(<TestModal />)
    act(() => { vi.runAllTimers() })

    const last = screen.getByTestId('last')
    last.focus()
    expect(document.activeElement).toBe(last)

    fireEvent.keyDown(document, { key: 'Tab' })

    expect(document.activeElement).toBe(screen.getByTestId('first'))
  })

  it('wraps focus from first to last on Shift+Tab', () => {
    render(<TestModal />)
    act(() => { vi.runAllTimers() })

    const first = screen.getByTestId('first')
    first.focus()
    expect(document.activeElement).toBe(first)

    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })

    expect(document.activeElement).toBe(screen.getByTestId('last'))
  })
})
