import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { scrapeDataFromZillowListingHtml } from '../src/zillow/scrape-zillow-data.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const fixture = (name: string) => readFileSync(join(__dirname, 'fixtures', name), 'utf8')

describe('scrapeDataFromZillowListingHtml', () => {
  it('parses a property-type listing', () => {
    const result = scrapeDataFromZillowListingHtml(fixture('zillow-property.html'))
    expect(result.zpid).toBe(12345)
    expect(result.price).toBe(2500)
    expect(result.bedrooms).toBe(2)
    expect(result.bathrooms).toBe(1)
    expect(result.homeType).toBe('APARTMENT')
    expect(result.timestamp).toBeDefined()
  })

  it('parses a building-type listing', () => {
    const result = scrapeDataFromZillowListingHtml(fixture('zillow-building.html'))
    expect(result.zpid).toBe(67890)
    expect(result.price).toBe(3000)
    expect(result.streetAddress).toBe('456 Oak Ave')
    expect(result.timestamp).toBeDefined()
  })

  it('returns a timestamp on HTML with no listing data', () => {
    const result = scrapeDataFromZillowListingHtml('<html><body></body></html>')
    expect(result.timestamp).toBeDefined()
  })
})
