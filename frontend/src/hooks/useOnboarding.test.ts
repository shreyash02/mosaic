import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

const TEST_USER_ID = 'test-user-123'

// Mock useAuth
vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({ user: { id: TEST_USER_ID, email: 'test@test.com' } })),
}))

// Mock the API
vi.mock('../services/api', () => ({
  api: {
    getOnboardingProgress: vi.fn(),
    updateOnboardingProgress: vi.fn(),
  },
}))

import { useOnboarding } from './useOnboarding'
import { resetChecklistApiState } from './useChecklist'
import { api } from '../services/api'

const mockApi = api as unknown as {
  getOnboardingProgress: ReturnType<typeof vi.fn>
  updateOnboardingProgress: ReturnType<typeof vi.fn>
}

describe('useOnboarding', () => {
  beforeEach(() => {
    localStorage.clear()
    resetChecklistApiState()
    vi.clearAllMocks()
    // Default: empty checklists from server
    mockApi.getOnboardingProgress.mockResolvedValue({ checklists: {} })
    mockApi.updateOnboardingProgress.mockResolvedValue({ checklists: {} })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('starts with all steps incomplete', () => {
    const { result } = renderHook(() => useOnboarding())

    expect(result.current.isLoading).toBe(false)
    expect(result.current.getProgress()).toBe(0)
    expect(result.current.isComplete()).toBe(false)
    expect(result.current.isStepCompleted('create-conversation')).toBe(false)
  })

  it('getSteps returns all 5 steps with correct structure', () => {
    const { result } = renderHook(() => useOnboarding())

    const steps = result.current.getSteps()
    expect(steps).toHaveLength(5)
    expect(steps[0]).toMatchObject({
      id: 'create-conversation',
      title: 'Create a conversation',
      completed: false,
    })
    expect(steps.every(s => 'title' in s && 'description' in s)).toBe(true)
  })

  it('completeStep marks a step as completed', () => {
    const { result } = renderHook(() => useOnboarding())

    act(() => result.current.completeStep('create-conversation'))

    expect(result.current.isStepCompleted('create-conversation')).toBe(true)
    expect(result.current.getProgress()).toBe(20) // 1 of 5
  })

  it('completeStep is idempotent', () => {
    const { result } = renderHook(() => useOnboarding())

    act(() => result.current.completeStep('create-conversation'))
    act(() => result.current.completeStep('create-conversation'))

    expect(result.current.getProgress()).toBe(20)
  })

  it('syncs to API after completing a step', async () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useOnboarding())

    act(() => result.current.completeStep('share-link'))

    // Advance past the debounce timer
    await act(async () => {
      vi.advanceTimersByTime(600)
    })

    expect(mockApi.updateOnboardingProgress).toHaveBeenCalled()
    const call = mockApi.updateOnboardingProgress.mock.calls[0][0]
    expect(call.checklists.conversation.steps['share-link']).toBe(true)
    vi.useRealTimers()
  })

  it('getProgress returns correct percentage', () => {
    const { result } = renderHook(() => useOnboarding())

    act(() => {
      result.current.completeStep('create-conversation')
      result.current.completeStep('share-link')
      result.current.completeStep('receive-response')
    })

    expect(result.current.getProgress()).toBe(60) // 3 of 5
  })

  it('isComplete returns true when all steps done', () => {
    const { result } = renderHook(() => useOnboarding())

    act(() => {
      result.current.completeStep('create-conversation')
      result.current.completeStep('share-link')
      result.current.completeStep('receive-response')
      result.current.completeStep('run-analysis')
      result.current.completeStep('view-insights')
    })

    expect(result.current.isComplete()).toBe(true)
    expect(result.current.getProgress()).toBe(100)
  })

  it('dismiss marks onboarding as dismissed', () => {
    const { result } = renderHook(() => useOnboarding())

    act(() => result.current.dismiss())

    expect(result.current.isDismissed()).toBe(true)
  })

  it('reset clears all progress', () => {
    const { result } = renderHook(() => useOnboarding())

    act(() => {
      result.current.completeStep('create-conversation')
      result.current.dismiss()
    })

    act(() => result.current.reset())

    expect(result.current.getProgress()).toBe(0)
    expect(result.current.isDismissed()).toBe(false)
  })

  it('hasEverOnboarded returns true when steps completed', () => {
    const { result } = renderHook(() => useOnboarding())

    expect(result.current.hasEverOnboarded()).toBe(false)

    act(() => result.current.completeStep('create-conversation'))

    expect(result.current.hasEverOnboarded()).toBe(true)
  })

  it('hasEverOnboarded returns true when dismissed', () => {
    const { result } = renderHook(() => useOnboarding())

    act(() => result.current.dismiss())

    expect(result.current.hasEverOnboarded()).toBe(true)
  })

  it('loads progress from API on mount', async () => {
    mockApi.getOnboardingProgress.mockResolvedValue({
      checklists: {
        conversation: {
          steps: { 'create-conversation': true, 'share-link': true },
          completed_at: {},
          dismissed: false,
          started_at: null,
        },
      },
    })

    const { result } = renderHook(() => useOnboarding())

    await waitFor(() => {
      expect(result.current.isStepCompleted('create-conversation')).toBe(true)
    })

    expect(result.current.isStepCompleted('share-link')).toBe(true)
    expect(result.current.getProgress()).toBe(40)
  })

  it('cleans up legacy localStorage keys', () => {
    localStorage.setItem('onboarding_progress', '{}')
    localStorage.setItem('checklist_conversation', '{}')
    localStorage.setItem('checklist_dashboard', '{}')

    renderHook(() => useOnboarding())

    expect(localStorage.getItem('onboarding_progress')).toBeNull()
    expect(localStorage.getItem('checklist_conversation')).toBeNull()
    expect(localStorage.getItem('checklist_dashboard')).toBeNull()
  })
})
