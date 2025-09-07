import dayjs from 'dayjs'

import { getRedfinRegionIdByZipCode } from './get-redfin-region-id.js'

export interface RedfinListingResultsOptions {
  regionId?: number | null
  zipCode?: number
  timeoutMs?: number
  daysListed?: number
}

export const getRedfinListingResults = async ({ regionId, zipCode, timeoutMs, daysListed }: RedfinListingResultsOptions) => {
  if (zipCode) {
    regionId = await getRedfinRegionIdByZipCode(zipCode) ?? regionId
  }

  try {
    const data = await fetchRedfinListingResults({ regionId, timeoutMs })
    const totalResultCount = data?.numMatchedHomes

    const results = daysListed ? data?.homes?.filter((home: { rentalExtension: { freshnessTimestamp: string } }) => dayjs().diff(home?.rentalExtension?.freshnessTimestamp, 'day') < daysListed) : data?.homes

    const urls = results?.map((result: any) => result?.detailUrl)
    const numResults = results?.length

    if (!numResults) {
      return null
    }

    return {
      timestamp: dayjs(),
      ...(zipCode && { zipCode }),
      regionId,
      numResults,
      totalResultCount,
      results,
      urls,
    }
  } catch (error: any) {
    console.log(error)
    throw error
  }
}

export const fetchRedfinListingResults = async ({ regionId, timeoutMs }: RedfinListingResultsOptions) => {
  const baseUrl = 'https://www.redfin.com/stingray/api/v1/search/rentals'

  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  }

  const params = `?al=1&isRentals=true&market=socal&num_homes=350&ord=days-on-redfin-asc&page_number=1&region_id=${regionId}&region_type=2&sf=1,2,3,5,6,7&start=0&status=9&uipt=1,2,3,4&use_max_pins=true&v=8`

  const newAbortSignal = (timeoutMs: number) => {
    const abortController = new AbortController()
    setTimeout(() => abortController.abort(), timeoutMs || 0)
    return abortController.signal
  }

  const config = {
    headers,
    ...(timeoutMs && { signal: newAbortSignal(timeoutMs) }),
  }

  const apiUrl = `${baseUrl}${params}`

  return await (await fetch(apiUrl, config)).json()
}
