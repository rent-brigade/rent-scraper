import { describe, it, expect } from 'vitest'
import { scrapeDataFromRedfinListingHtml } from '../src/redfin/scrape-redfin-data.js'

describe('scrapeDataFromRedfinListingHtml', () => {
  it('returns a timestamp on HTML with no listing data', () => {
    const result = scrapeDataFromRedfinListingHtml('<html><body></body></html>')
    expect(result.timestamp).toBeDefined()
    expect(result.propertyId).toBeUndefined()
    expect(result.hasPropertyHistory).toBe(false)
  })
})
