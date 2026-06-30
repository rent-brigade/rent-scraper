import { describe, it, expect } from 'vitest'
import { isZillowBotFiltering } from '../src/zillow/check-for-zillow-bot-filtering.js'

describe('isZillowBotFiltering', () => {
  it('returns true for a 403 with captcha in the body', () => {
    expect(isZillowBotFiltering(403, 'captcha challenge required')).toBe(true)
  })

  it('returns false for a 200 response', () => {
    expect(isZillowBotFiltering(200, 'captcha')).toBe(false)
  })

  it('returns false for a 403 without captcha in the body', () => {
    expect(isZillowBotFiltering(403, 'forbidden')).toBe(false)
  })

  it('returns false for a 404', () => {
    expect(isZillowBotFiltering(404, 'captcha')).toBe(false)
  })
})
