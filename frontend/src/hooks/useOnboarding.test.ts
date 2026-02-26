import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

// Mock the api module before importing the hook
vi.mock('../services/api', () => ({
  api: {
    getOnboardingProgress: vi.fn(),
    updateOnboardingProgress: vi.fn(),
  },
}))

// Mock useAuth to return a user (so onboarding syncs with server)
vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({ user: { id: 'user-1', email: 'test@test.com' } })),
}))

import { useOnboarding } from './useOnboarding'
import { api } from '../services/api'
import { useAuth } from '../contexts/AuthContext'

const mockApi = api as {
  getOnboardingProgress: ReturnType<typeof vi.fn>
  updateOnboardingProgress: ReturnType<typeof vi.fn>
}

describe('useOnboarding', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockApi.getOnboardingProgress.mockResolvedValue({
      steps: {
        'create-conversation': false,
        'share-link': false,
        'receive-response': false,
        'run-analysis': false,
        'view-insights': false,
      },
      completed_at: {},
      dismissed: false,
    })
    mockApi.updateOnboardingProgress.mockResolvedValue({})
  })

  it('loads onboarding state from server on mount', async () => {
    const { result } = renderHook(() => useOnboarding())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(mockApi.getOnboardingProgress).toHaveBeenCalled()
  })

  it('starts with all steps incomplete', async () => {
    const { result } = renderHook(() => useOnboarding())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.getProgress()).toBe(0)
    expect(result.current.isComplete()).toBe(false)
    expect(result.current.isStepCompleted('create-conversation')).toBe(false)
  })

  it('getSteps returns all 5 steps with correct structure', async () => {
    const { result } = renderHook(() => useOnboarding())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    const steps = result.current.getSteps()
    expect(steps).toHaveLength(5)
    expect(steps[0]).toMatchObject({
      id: 'create-conversation',
      title: 'Create a conversation',
      completed: false,
    })
    expect(steps.every(s => 'title' in s && 'description' in s)).toBe(true)
  })

  it('completeStep marks a step as completed', async () => {
    const { result } = renderHook(() => useOnboarding())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    act(() => result.current.completeStep('create-conversation'))

    expect(result.current.isStepCompleted('create-conversation')).toBe(true)
    expect(result.current.getProgress()).toBe(20) // 1 of 5
  })

  it('completeStep is idempotent', async () => {
    const { result } = renderHook(() => useOnboarding())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    act(() => result.current.completeStep('create-conversation'))
    act(() => result.current.completeStep('create-conversation'))

    expect(result.current.getProgress()).toBe(20)
  })

  it('completeStep syncs to server', async () => {
    const { result } = renderHook(() => useOnboarding())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    act(() => result.current.completeStep('share-link'))

    // syncToServer is async, wait for it
    await waitFor(() => {
      expect(mockApi.updateOnboardingProgress).toHaveBeenCalled()
    })

    const call = mockApi.updateOnboardingProgress.mock.calls[0][0]
    expect(call.steps['share-link']).toBe(true)
  })

  it('getProgress returns correct percentage', async () => {
    const { result } = renderHook(() => useOnboarding())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    act(() => {
      result.current.completeStep('create-conversation')
      result.current.completeStep('share-link')
      result.current.completeStep('receive-response')
    })

    expect(result.current.getProgress()).toBe(60) // 3 of 5
  })

  it('isComplete returns true when all steps done', async () => {
    const { result } = renderHook(() => useOnboarding())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

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

  it('dismiss marks onboarding as dismissed', async () => {
    const { result } = renderHook(() => useOnboarding())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    act(() => result.current.dismiss())

    expect(result.current.isDismissed()).toBe(true)

    await waitFor(() => {
      expect(mockApi.updateOnboardingProgress).toHaveBeenCalled()
    })
  })

  it('reset clears all progress', async () => {
    const { result } = renderHook(() => useOnboarding())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    act(() => {
      result.current.completeStep('create-conversation')
      result.current.dismiss()
    })

    act(() => result.current.reset())

    expect(result.current.getProgress()).toBe(0)
    expect(result.current.isDismissed()).toBe(false)
  })

  it('loads pre-existing progress from server', async () => {
    mockApi.getOnboardingProgress.mockResolvedValue({
      steps: {
        'create-conversation': true,
        'share-link': true,
        'receive-response': false,
        'run-analysis': false,
        'view-insights': false,
      },
      completed_at: {
        'create-conversation': '2025-01-01T00:00:00Z',
        'share-link': '2025-01-02T00:00:00Z',
      },
      dismissed: false,
    })

    const { result } = renderHook(() => useOnboarding())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.isStepCompleted('create-conversation')).toBe(true)
    expect(result.current.isStepCompleted('share-link')).toBe(true)
    expect(result.current.isStepCompleted('receive-response')).toBe(false)
    expect(result.current.getProgress()).toBe(40)
  })

  it('falls back to defaults when server request fails', async () => {
    mockApi.getOnboardingProgress.mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useOnboarding())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.getProgress()).toBe(0)
  })

  it('uses defaults when no user is authenticated', async () => {
    vi.mocked(useAuth).mockReturnValue({ user: null } as any)

    const { result } = renderHook(() => useOnboarding())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(mockApi.getOnboardingProgress).not.toHaveBeenCalled()
    expect(result.current.getProgress()).toBe(0)
  })
})
