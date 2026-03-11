import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// Mock the api module
vi.mock('../services/api', () => ({
  api: {
    saveJournalDraft: vi.fn(),
    loadJournalDraft: vi.fn(),
    deleteJournalDraft: vi.fn(),
  },
}))

import { useJournalDraft } from './useJournalDraft'
import { api } from '../services/api'

const mockApi = api as unknown as {
  saveJournalDraft: ReturnType<typeof vi.fn>
  loadJournalDraft: ReturnType<typeof vi.fn>
  deleteJournalDraft: ReturnType<typeof vi.fn>
}

const testData = {
  responses: { q1: 'My journal entry', q2: 'Another thought' },
  ratingResponses: { q3: 7 },
  choiceResponses: { q4: 'option-a' },
  checkboxResponses: { q5: ['opt1', 'opt2'] },
}

describe('useJournalDraft', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    mockApi.loadJournalDraft.mockResolvedValue({
      has_draft: false,
      responses: {},
      rating_responses: {},
      choice_responses: {},
      checkbox_responses: {},
    })
    mockApi.saveJournalDraft.mockResolvedValue({
      success: true,
      last_saved_at: '2025-01-20T12:00:00Z',
      message: 'ok',
    })
    mockApi.deleteJournalDraft.mockResolvedValue(undefined)
  })

  it('starts with idle status', () => {
    const { result } = renderHook(() =>
      useJournalDraft({ journalId: 'j1' })
    )

    expect(result.current.draftStatus).toBe('idle')
    expect(result.current.lastSavedAt).toBeNull()
  })

  it('updateDraft sets status to unsaved', () => {
    const { result } = renderHook(() =>
      useJournalDraft({ journalId: 'j1' })
    )

    act(() => {
      result.current.updateDraft(
        testData.responses,
        testData.ratingResponses,
        testData.choiceResponses,
        testData.checkboxResponses,
      )
    })

    expect(result.current.draftStatus).toBe('unsaved')
  })

  it('updateDraft does nothing when disabled', () => {
    const { result } = renderHook(() =>
      useJournalDraft({ journalId: 'j1', enabled: false })
    )

    act(() => {
      result.current.updateDraft(
        testData.responses,
        testData.ratingResponses,
        testData.choiceResponses,
        testData.checkboxResponses,
      )
    })

    expect(result.current.draftStatus).toBe('idle')
  })

  it('updateDraft does nothing without journalId', () => {
    const { result } = renderHook(() =>
      useJournalDraft({ journalId: undefined })
    )

    act(() => {
      result.current.updateDraft(
        testData.responses,
        testData.ratingResponses,
        testData.choiceResponses,
        testData.checkboxResponses,
      )
    })

    expect(result.current.draftStatus).toBe('idle')
  })

  it('saveDraftNow saves to localStorage and server', async () => {
    const { result } = renderHook(() =>
      useJournalDraft({ journalId: 'j1' })
    )

    // Must updateDraft first to set currentData
    act(() => {
      result.current.updateDraft(
        testData.responses,
        testData.ratingResponses,
        testData.choiceResponses,
        testData.checkboxResponses,
      )
    })

    await act(async () => {
      await result.current.saveDraftNow()
    })

    // Server save should have been called
    expect(mockApi.saveJournalDraft).toHaveBeenCalledWith('j1', {
      responses: testData.responses,
      rating_responses: testData.ratingResponses,
      choice_responses: testData.choiceResponses,
      checkbox_responses: testData.checkboxResponses,
    })

    // Should be saved to localStorage
    const stored = localStorage.getItem('journal_draft_j1')
    expect(stored).not.toBeNull()
    const parsed = JSON.parse(stored!)
    expect(parsed.journalId).toBe('j1')
    expect(parsed.responses).toEqual(testData.responses)

    expect(result.current.draftStatus).toBe('saved')
    expect(result.current.lastSavedAt).toBe('2025-01-20T12:00:00Z')
  })

  it('loadDraft loads from localStorage when no server draft', async () => {
    const localDraft = {
      journalId: 'j1',
      ...testData,
      lastSavedAt: '2025-01-20T10:00:00Z',
    }
    localStorage.setItem('journal_draft_j1', JSON.stringify(localDraft))

    const { result } = renderHook(() =>
      useJournalDraft({ journalId: 'j1' })
    )

    let loaded: any
    await act(async () => {
      loaded = await result.current.loadDraft()
    })

    expect(loaded).toEqual({
      responses: testData.responses,
      ratingResponses: testData.ratingResponses,
      choiceResponses: testData.choiceResponses,
      checkboxResponses: testData.checkboxResponses,
    })
    expect(result.current.draftStatus).toBe('saved')
  })

  it('loadDraft loads from server when no local draft', async () => {
    mockApi.loadJournalDraft.mockResolvedValue({
      has_draft: true,
      last_saved_at: '2025-01-20T12:00:00Z',
      responses: testData.responses,
      rating_responses: testData.ratingResponses,
      choice_responses: testData.choiceResponses,
      checkbox_responses: testData.checkboxResponses,
    })

    const { result } = renderHook(() =>
      useJournalDraft({ journalId: 'j1' })
    )

    let loaded: any
    await act(async () => {
      loaded = await result.current.loadDraft()
    })

    expect(loaded).toEqual({
      responses: testData.responses,
      ratingResponses: testData.ratingResponses,
      choiceResponses: testData.choiceResponses,
      checkboxResponses: testData.checkboxResponses,
    })
  })

  it('loadDraft prefers more recent source', async () => {
    // Local is newer
    const localDraft = {
      journalId: 'j1',
      responses: { q1: 'local version' },
      ratingResponses: {},
      choiceResponses: {},
      checkboxResponses: {},
      lastSavedAt: '2025-01-21T12:00:00Z',
    }
    localStorage.setItem('journal_draft_j1', JSON.stringify(localDraft))

    // Server is older
    mockApi.loadJournalDraft.mockResolvedValue({
      has_draft: true,
      last_saved_at: '2025-01-20T12:00:00Z',
      responses: { q1: 'server version' },
      rating_responses: {},
      choice_responses: {},
      checkbox_responses: {},
    })

    const { result } = renderHook(() =>
      useJournalDraft({ journalId: 'j1' })
    )

    let loaded: any
    await act(async () => {
      loaded = await result.current.loadDraft()
    })

    expect(loaded?.responses.q1).toBe('local version')
  })

  it('loadDraft returns null when no drafts exist', async () => {
    const { result } = renderHook(() =>
      useJournalDraft({ journalId: 'j1' })
    )

    let loaded: any
    await act(async () => {
      loaded = await result.current.loadDraft()
    })

    expect(loaded).toBeNull()
  })

  it('loadDraft returns null without journalId', async () => {
    const { result } = renderHook(() =>
      useJournalDraft({ journalId: undefined })
    )

    let loaded: any
    await act(async () => {
      loaded = await result.current.loadDraft()
    })

    expect(loaded).toBeNull()
  })

  it('clearDraft removes from localStorage and server', async () => {
    localStorage.setItem('journal_draft_j1', 'data')

    const { result } = renderHook(() =>
      useJournalDraft({ journalId: 'j1' })
    )

    await act(async () => {
      await result.current.clearDraft()
    })

    expect(localStorage.getItem('journal_draft_j1')).toBeNull()
    expect(mockApi.deleteJournalDraft).toHaveBeenCalledWith('j1')
    expect(result.current.draftStatus).toBe('idle')
    expect(result.current.lastSavedAt).toBeNull()
  })

  it('saveDraftNow handles server failure gracefully', async () => {
    mockApi.saveJournalDraft.mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() =>
      useJournalDraft({ journalId: 'j1' })
    )

    act(() => {
      result.current.updateDraft(
        testData.responses,
        testData.ratingResponses,
        testData.choiceResponses,
        testData.checkboxResponses,
      )
    })

    await act(async () => {
      await result.current.saveDraftNow()
    })

    // localStorage should still have been saved
    expect(localStorage.getItem('journal_draft_j1')).not.toBeNull()
    // Status should be unsaved since server failed
    expect(result.current.draftStatus).toBe('unsaved')
  })
})
