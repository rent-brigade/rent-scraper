export interface ScrapeListingsByZipCodesOptions {
  daysListed?: number
  run?: number
  reruns?: number
  timeoutMs: number
}

export interface ScrapeZillowListingsByZipCodesOptions extends ScrapeListingsByZipCodesOptions {
  altFetch?: boolean
  fetchListings?: boolean
}
