import { describe, it, expect } from 'vitest'
import { checkRequiredConfigValues, stringifyZipCodes } from '../src/config.js'

describe('checkRequiredConfigValues', () => {
  it('returns no errors when required fields are present', () => {
    const config = { outputPath: '/some/path', zipCodes: '90026, 90039' } as any
    expect(checkRequiredConfigValues('zillow', config)).toEqual([])
  })

  it('flags missing outputPath', () => {
    const config = { zipCodes: '90026' } as any
    expect(checkRequiredConfigValues('zillow', config)).toContain('outputPath')
  })

  it('flags missing zipCodes', () => {
    const config = { outputPath: '/some/path' } as any
    expect(checkRequiredConfigValues('zillow', config)).toContain('zipCodes')
  })

  it('flags missing zillowCookie when task is scrape', () => {
    const config = { outputPath: '/some/path', zipCodes: '90026' } as any
    expect(checkRequiredConfigValues('zillow', config, 'scrape')).toContain('zillowCookie')
  })

  it('does not flag missing zillowCookie for redfin source', () => {
    const config = { outputPath: '/some/path', zipCodes: '90026' } as any
    expect(checkRequiredConfigValues('redfin', config, 'scrape')).not.toContain('zillowCookie')
  })

  it('returns all missing fields when config is undefined', () => {
    const errors = checkRequiredConfigValues('zillow', undefined)
    expect(errors).toContain('outputPath')
    expect(errors).toContain('zipCodes')
  })
})

describe('stringifyZipCodes', () => {
  it('joins zip codes with comma and space', () => {
    expect(stringifyZipCodes([90026, 90039, 90027])).toBe('90026, 90039, 90027')
  })

  it('handles a single zip code', () => {
    expect(stringifyZipCodes([90210])).toBe('90210')
  })
})
