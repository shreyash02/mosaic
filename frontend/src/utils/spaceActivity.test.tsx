import { describe, it, expect } from 'vitest'
import { getActivityVerb } from './spaceActivity'
import type { SpaceActivityEventType } from '../types'

describe('getActivityVerb', () => {
  const cases: [SpaceActivityEventType, string][] = [
    ['idea_added', 'added an idea:'],
    ['idea_edited', 'edited an idea:'],
    ['idea_removed', 'removed an idea:'],
    ['organize_started', 'started organizing'],
    ['organize_completed', 'finished organizing:'],
    ['action_accepted', 'accepted an action:'],
    ['action_completed', 'completed an action:'],
    ['action_dismissed', 'dismissed an action:'],
    ['member_joined', 'joined the space'],
    ['suggestion_submitted', 'suggested an idea:'],
    ['suggestion_approved', 'approved a suggestion:'],
    ['suggestion_rejected', 'dismissed a suggestion:'],
  ]

  it.each(cases)('returns correct verb for %s', (eventType, expected) => {
    expect(getActivityVerb(eventType)).toBe(expected)
  })

  it('returns the raw event type for unknown values', () => {
    expect(getActivityVerb('unknown_event' as SpaceActivityEventType)).toBe('unknown_event')
  })
})
