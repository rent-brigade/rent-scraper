import axios from 'axios'
import dayjs from 'dayjs'
import { getZillowRegionIdByZipCode } from './get-zillow-region-id.js'
import { getZillowCookie } from './config.js'
import type { RegionId, ZipCode } from '../types.js'

export const zillowListingResultsHeaders = {
  'Accept': '*/*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Content-Type': 'application/json',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache',
  'Sec-Ch-Ua': '"Brave";v="135", "Not-A.Brand";v="8", "Chromium";v="135"',
  'Sec-Ch-Ua-Mobile': '?0',
  'Sec-Ch-Ua-Platform': '"macOS"',
  'Sec-Fetch-Dest': 'empty',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Site': 'same-origin',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': '1',
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
}

export interface ZillowListingResultsOptions {
  page?: number
  daysOnZillow?: number
  scrapeData?: boolean
  contactDetails?: boolean
  prettyListings?: boolean
  regionId?: number
  zipCode?: number
  mergePageResults?: boolean
  timeoutMs?: number
}

export interface ZillowListingResults {
  timestamp: dayjs.Dayjs
  zipCode?: ZipCode
  regionId?: RegionId
  numResults: number
  totalResultCount: number
  resultsPerPage: number
  mergePageResults?: boolean
  pagesCrawled?: number
  page?: number
  totalPages?: number
  results: Record<string, any>[]
  urls: string[]
}

export const getZillowListingResults = async ({ page, daysOnZillow, regionId, zipCode, mergePageResults, timeoutMs }: ZillowListingResultsOptions): Promise<ZillowListingResults | null> => {
  if (zipCode) {
    regionId = await getZillowRegionIdByZipCode(zipCode) ?? regionId
  }

  page = (mergePageResults ? 1 : page) ?? 1

  const data = await fetchZillowListingResults({ page, daysOnZillow, regionId, timeoutMs })
  const totalResultCount = data?.cat1?.searchList?.totalResultCount
  const resultsPerPage = data?.cat1?.searchList?.resultsPerPage
  const totalPages = data?.cat1?.searchList?.totalPages

  if (page && page > totalPages) {
    return null
  }

  const pages = mergePageResults && Array.from({ length: totalPages }, (v, k) => k + 1)

  const results = mergePageResults && totalPages > 1 && pages ? (await Promise.all(pages?.map(async (page: number) => await fetchZillowListingResults({ page, daysOnZillow, regionId }, true)))).flat() : data?.cat1?.searchResults?.listResults

  const urls = results?.map((result: { detailUrl?: string }) => result?.detailUrl)
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
    resultsPerPage,
    ...(mergePageResults && { mergePageResults }),
    ...(pages ? { pagesCrawled: pages?.length } : { page }),
    totalPages,
    results,
    urls,
  }
}

export const fetchZillowListingResults = async ({ page, daysOnZillow, regionId, timeoutMs }: ZillowListingResultsOptions, resultsOnly?: boolean) => {
  const baseUrl = 'https://www.zillow.com/async-create-search-page-state'

  const mapBounds = {
    /* LA County Bounds */
    east: -116.2057669921875,
    north: 35.424914784130365,
    south: 32.12915408246069,
    west: -120.3915580078125,
  }

  const regionSelection = [
    {
      regionId,
    },
  ]
  const body = {
    searchQueryState: {
      pagination: { currentPage: page ?? 1 },
      isMapVisible: false,
      mapBounds,
      regionSelection,
      filterState: {
        sortSelection: { value: 'days' },
        doz: { value: daysOnZillow ?? '5' },
        isNewConstruction: { value: false },
        isForSaleForeclosure: { value: false },
        isForSaleByOwner: { value: false },
        isForSaleByAgent: { value: false },
        isForRent: { value: true },
        isComingSoon: { value: false },
        isAuction: { value: false },
        isAllHomes: { value: true },
      },
      isListVisible: true,
    },
    wants: {
      cat1: [
        'listResults',
      ],
    },
    requestId: 6,
    isDebugRequest: false,
  }

  const newAbortSignal = (timeoutMs: number) => {
    const abortController = new AbortController()
    setTimeout(() => abortController.abort(), timeoutMs || 0)
    return abortController.signal
  }

  const zillowCookie = await getZillowCookie()
  const headers = {
    ...zillowListingResultsHeaders,
    cookie: zillowCookie,
  }
  const config = {
    headers,
    ...(timeoutMs && { signal: newAbortSignal(timeoutMs) }),
  }

  const { data } = await axios.put(baseUrl, body, config) || {}
  return resultsOnly ? data?.cat1?.searchResults?.listResults : data
}
