import { describe, it, expect } from 'vitest'
import { AxiosError, AxiosHeaders } from 'axios'
import { getErrorMessage } from './errorMessages'

function makeAxiosError(
  status: number,
  data?: unknown,
): AxiosError {
  const error = new AxiosError(
    'Request failed',
    'ERR_BAD_REQUEST',
    undefined,
    undefined,
    {
      status,
      data,
      statusText: 'Error',
      headers: {},
      config: { headers: new AxiosHeaders() },
    }
  )
  return error
}

function makeNetworkError(): AxiosError {
  // No response property — simulates a network failure
  return new AxiosError('Network Error', 'ERR_NETWORK')
}

describe('getErrorMessage', () => {
  it('returns fallback for non-Error values', () => {
    expect(getErrorMessage(null, 'save')).toBe('Failed to save, please try again')
    expect(getErrorMessage(undefined, 'save')).toBe('Failed to save, please try again')
    expect(getErrorMessage('string error', 'save')).toBe('Failed to save, please try again')
    expect(getErrorMessage(42, 'save')).toBe('Failed to save, please try again')
  })

  it('returns fallback for network errors (no response)', () => {
    const error = makeNetworkError()
    expect(getErrorMessage(error, 'load data')).toBe('Failed to load data, please try again')
  })

  it('returns fallback for 5xx server errors', () => {
    expect(getErrorMessage(makeAxiosError(500, { detail: 'Internal error' }), 'save'))
      .toBe('Failed to save, please try again')
    expect(getErrorMessage(makeAxiosError(503, { detail: 'Service down' }), 'save'))
      .toBe('Failed to save, please try again')
  })

  it('extracts string detail from 4xx errors (FastAPI format)', () => {
    const error = makeAxiosError(400, { detail: 'Email already registered' })
    expect(getErrorMessage(error, 'register')).toBe('Email already registered')
  })

  it('extracts array detail from 4xx errors (FastAPI validation)', () => {
    const error = makeAxiosError(422, {
      detail: [{ msg: 'Field is required', loc: ['body', 'email'] }]
    })
    expect(getErrorMessage(error, 'submit')).toBe('Field is required')
  })

  it('extracts message field from 4xx errors', () => {
    const error = makeAxiosError(403, { message: 'Access denied' })
    expect(getErrorMessage(error, 'access')).toBe('Access denied')
  })

  it('returns fallback for 4xx with no parseable message', () => {
    const error = makeAxiosError(400, { foo: 'bar' })
    expect(getErrorMessage(error, 'update')).toBe('Failed to update, please try again')
  })

  it('returns fallback for 4xx with empty detail array', () => {
    const error = makeAxiosError(422, { detail: [] })
    expect(getErrorMessage(error, 'submit')).toBe('Failed to submit, please try again')
  })

  it('uses default fallback action when none provided', () => {
    const error = makeNetworkError()
    expect(getErrorMessage(error)).toBe('Failed to complete the action, please try again')
  })

  it('returns fallback for framework-generated detail phrases', () => {
    expect(getErrorMessage(makeAxiosError(405, { detail: 'Method Not Allowed' }), 'create workspace'))
      .toBe('Failed to create workspace, please try again')
    expect(getErrorMessage(makeAxiosError(404, { detail: 'Not Found' }), 'load data'))
      .toBe('Failed to load data, please try again')
    expect(getErrorMessage(makeAxiosError(401, { detail: 'Not authenticated' }), 'save'))
      .toBe('Failed to save, please try again')
  })

  it('returns fallback for framework-generated message phrases', () => {
    const error = makeAxiosError(405, { message: 'Method Not Allowed' })
    expect(getErrorMessage(error, 'save')).toBe('Failed to save, please try again')
  })

  it('still shows intentional 404 messages', () => {
    const error = makeAxiosError(404, { detail: 'Workspace not found' })
    expect(getErrorMessage(error, 'load workspace')).toBe('Workspace not found')
  })

  it('prefers detail over message', () => {
    const error = makeAxiosError(400, {
      detail: 'Specific error',
      message: 'Generic error'
    })
    expect(getErrorMessage(error, 'save')).toBe('Specific error')
  })
})
