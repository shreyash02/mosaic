import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { AnonymityLevel } from '../types'
import type { ResponseItem } from '../types'

// Mock the api module
vi.mock('../services/api', () => ({
  api: {
    saveDraft: vi.fn(),
    loadDraft: vi.fn(),
    deleteDraft: vi.fn(),
  },
}))

import { useDraftResponses } from './useDraftResponses'
import { api } from '../services/api'

const mockApi = api as unknown as {
  saveDraft: ReturnType<typeof vi.fn>
  loadDraft: ReturnType<typeof vi.fn>
  deleteDraft: ReturnType<typeof vi.fn>
}

const testResponses: ResponseItem[] = [
  { question_id: 'q1', response_text: 'Great experience' },
  { question_id: 'q2', response_data: { rating: 8 } },
]

const defaultOptions = {
  accessCode: 'ABC123',
  anonymityLevel: AnonymityLevel.FULLY_ANONYMOUS,
}

describe('useDraftResponses', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    mockApi.loadDraft.mockResolvedValue({ has_draft: false, responses: [], reveal_consent: false })
    mockApi.saveDraft.mockResolvedValue({ success: true, last_saved_at: '2025-01-20T12:00:00Z', message: 'ok' })
    mockApi.deleteDraft.mockResolvedValue({ success: true })
  })

  it('starts with initial state', () => {
    const { result } = renderHook(() => useDraftResponses(defaultOptions))

    expect(result.current.isDraftLoaded).toBe(false)
    expect(result.current.isSaving).toBe(false)
    expect(result.current.lastSavedAt).toBeNull()
    expect(result.current.hasUnsavedChanges).toBe(false)
  })

  it('saveDraftToLocalStorage saves to localStorage', () => {
    const { result } = renderHook(() => useDraftResponses(defaultOptions))

    act(() => {
      result.current.saveDraftToLocalStorage(testResponses)
    })

    const stored = localStorage.getItem('draft_ABC123_user')
    expect(stored).not.toBeNull()
    const parsed = JSON.parse(stored!)
    expect(parsed.accessCode).toBe('ABC123')
    expect(parsed.responses).toEqual(testResponses)
    expect(parsed.version).toBe(1)
    expect(result.current.lastSavedAt).not.toBeNull()
  })

  it('uses participant code in localStorage key when provided', () => {
    const { result } = renderHook(() =>
      useDraftResponses({ ...defaultOptions, participantCode: 'PART1' })
    )

    act(() => {
      result.current.saveDraftToLocalStorage(testResponses)
    })

    expect(localStorage.getItem('draft_ABC123_PART1')).not.toBeNull()
    expect(localStorage.getItem('draft_ABC123_user')).toBeNull()
  })

  it('does not save when disabled', () => {
    const { result } = renderHook(() =>
      useDraftResponses({ ...defaultOptions, enabled: false })
    )

    act(() => {
      result.current.saveDraftToLocalStorage(testResponses)
    })

    expect(localStorage.getItem('draft_ABC123_user')).toBeNull()
  })

  it('saveDraftToServer calls api.saveDraft', async () => {
    const { result } = renderHook(() => useDraftResponses(defaultOptions))

    await act(async () => {
      await result.current.saveDraftToServer(testResponses, true)
    })

    expect(mockApi.saveDraft).toHaveBeenCalledWith(
      'ABC123',
      {
        responses: testResponses,
        participant_code: undefined,
        reveal_consent: true,
      },
      undefined
    )
    expect(result.current.lastSavedAt).not.toBeNull()
  })

  it('saveDraftToServer does not call api for empty responses', async () => {
    const { result } = renderHook(() => useDraftResponses(defaultOptions))

    await act(async () => {
      await result.current.saveDraftToServer([])
    })

    expect(mockApi.saveDraft).not.toHaveBeenCalled()
  })

  it('saveDraftToServer calls onSaveError on failure', async () => {
    const onSaveError = vi.fn()
    mockApi.saveDraft.mockRejectedValue(new Error('Server down'))

    const { result } = renderHook(() =>
      useDraftResponses({ ...defaultOptions, onSaveError })
    )

    await act(async () => {
      await result.current.saveDraftToServer(testResponses)
    })

    expect(onSaveError).toHaveBeenCalledWith(expect.any(Error))
  })

  it('loadDraft loads from localStorage', async () => {
    const onDraftLoaded = vi.fn()
    const draft = {
      accessCode: 'ABC123',
      responses: testResponses,
      revealConsent: false,
      lastSavedAt: '2025-01-20T12:00:00Z',
      version: 1,
    }
    localStorage.setItem('draft_ABC123_user', JSON.stringify(draft))

    const { result } = renderHook(() =>
      useDraftResponses({ ...defaultOptions, onDraftLoaded })
    )

    await act(async () => {
      await result.current.loadDraft()
    })

    expect(result.current.isDraftLoaded).toBe(true)
    expect(onDraftLoaded).toHaveBeenCalledWith(testResponses, false)
  })

  it('loadDraft prefers more recent server draft over local', async () => {
    const onDraftLoaded = vi.fn()
    const localResponses: ResponseItem[] = [{ question_id: 'q1', response_text: 'local' }]
    const serverResponses: ResponseItem[] = [{ question_id: 'q1', response_text: 'server' }]

    // Local draft is older
    const localDraft = {
      accessCode: 'ABC123',
      responses: localResponses,
      revealConsent: false,
      lastSavedAt: '2025-01-19T12:00:00Z',
      version: 1,
    }
    localStorage.setItem('draft_ABC123_user', JSON.stringify(localDraft))

    // Server draft is newer
    mockApi.loadDraft.mockResolvedValue({
      has_draft: true,
      last_saved_at: '2025-01-20T12:00:00Z',
      responses: serverResponses,
      reveal_consent: true,
    })

    const { result } = renderHook(() =>
      useDraftResponses({ ...defaultOptions, onDraftLoaded })
    )

    await act(async () => {
      await result.current.loadDraft()
    })

    expect(onDraftLoaded).toHaveBeenCalledWith(serverResponses, true)
  })

  it('loadDraft prefers more recent local draft over server', async () => {
    const onDraftLoaded = vi.fn()
    const localResponses: ResponseItem[] = [{ question_id: 'q1', response_text: 'local newer' }]
    const serverResponses: ResponseItem[] = [{ question_id: 'q1', response_text: 'server older' }]

    const localDraft = {
      accessCode: 'ABC123',
      responses: localResponses,
      revealConsent: false,
      lastSavedAt: '2025-01-21T12:00:00Z',
      version: 1,
    }
    localStorage.setItem('draft_ABC123_user', JSON.stringify(localDraft))

    mockApi.loadDraft.mockResolvedValue({
      has_draft: true,
      last_saved_at: '2025-01-20T12:00:00Z',
      responses: serverResponses,
      reveal_consent: false,
    })

    const { result } = renderHook(() =>
      useDraftResponses({ ...defaultOptions, onDraftLoaded })
    )

    await act(async () => {
      await result.current.loadDraft()
    })

    expect(onDraftLoaded).toHaveBeenCalledWith(localResponses, false)
  })

  it('clearDraft removes from localStorage and server', async () => {
    localStorage.setItem('draft_ABC123_user', 'data')

    const { result } = renderHook(() => useDraftResponses(defaultOptions))

    await act(async () => {
      await result.current.clearDraft()
    })

    expect(localStorage.getItem('draft_ABC123_user')).toBeNull()
    expect(mockApi.deleteDraft).toHaveBeenCalledWith('ABC123', undefined, undefined)
    expect(result.current.lastSavedAt).toBeNull()
  })

  it('tracks hasUnsavedChanges when responses change after save', () => {
    const { result } = renderHook(() => useDraftResponses(defaultOptions))

    // Set current responses and save them — both should match
    act(() => {
      result.current.setCurrentResponses(testResponses)
      result.current.saveDraftToLocalStorage(testResponses)
    })
    expect(result.current.hasUnsavedChanges).toBe(false)

    // Now change the current responses to something different
    act(() => {
      result.current.setCurrentResponses([
        { question_id: 'q1', response_text: 'Changed!' },
      ])
    })
    expect(result.current.hasUnsavedChanges).toBe(true)
  })

  it('tracks hasUnsavedChanges when revealConsent differs', () => {
    const { result } = renderHook(() => useDraftResponses(defaultOptions))

    act(() => {
      result.current.setCurrentResponses(testResponses)
      result.current.saveDraftToLocalStorage(testResponses, false)
    })

    act(() => {
      result.current.setCurrentRevealConsent(true)
    })

    expect(result.current.hasUnsavedChanges).toBe(true)
  })

  it('skips server drafts for OPEN anonymity without access token', async () => {
    localStorage.removeItem('access_token')

    const { result } = renderHook(() =>
      useDraftResponses({
        ...defaultOptions,
        anonymityLevel: AnonymityLevel.OPEN,
      })
    )

    await act(async () => {
      await result.current.saveDraftToServer(testResponses)
    })

    expect(mockApi.saveDraft).not.toHaveBeenCalled()
  })
})
