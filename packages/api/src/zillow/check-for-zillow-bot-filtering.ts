import { getZillowListingResults } from './get-zillow-listing-results.js'
import { getZillowZipCodes } from './config.js'
import { getRandomArrayValue, parseError, throwError } from '@rent-scraper/utils'
import { fetchHtmlFromZillowListingUrl } from './scrape-zillow-data.js'
import { getZillowListingDetailsByZpid } from './get-zillow-listing-details.js'
import type { ZipCode } from '../types.js'
import axios from 'axios'

export const isZillowBotFiltering = (status: number, data: string) => status === 403 && data?.includes('captcha')
export const getRandomZipCode = (zipCodes: ZipCode[]) => getRandomArrayValue(zipCodes) as ZipCode

interface CheckForZillowBotFilteringOptions {
  fetchListings?: boolean
  regionId?: string
}

const openBrowser = async (url?: string) => {
  const { data } = await axios.post('http://localhost:8082/browser/open', { url })
  return data?.browser as { status: 'navigated' | 'captcha' | 'not connected' } | undefined
}

const refreshCookie = async () => {
  await axios.post('http://localhost:8082/cookie/refresh')
}

export const checkForZillowBotFiltering = async (options?: CheckForZillowBotFilteringOptions, attempt = 0) => {
  try {
    const zillowZipCodes = await getZillowZipCodes()
    if (!zillowZipCodes) {
      throwError('zip codes required, please run the createConfig script')
    }
    const { fetchListings = false } = options ?? {}
    const LA_COUNTY_REGION_ID = 3101
    const { results } = await getZillowListingResults({ regionId: LA_COUNTY_REGION_ID, daysOnZillow: 1, mergePageResults: false }) ?? {}
    const { zpid, detailUrl } = results?.[0] ?? {}
    if (zpid && fetchListings) {
      await getZillowListingDetailsByZpid(zpid)
    } else if (results?.length && !fetchListings) {
      // search API returned results — not bot filtered, no need for HTML check
    } else if (detailUrl && !detailUrl.startsWith('/apartments')) {
      await fetchHtmlFromZillowListingUrl(detailUrl)
    } else if (attempt < 5) {
      await checkForZillowBotFiltering(options, attempt + 1)
    } else {
      throwError('Could not find a valid listing URL to check for bot filtering.')
    }
    return true
  } catch (error) {
    const { status, message } = parseError(error)
    if (isZillowBotFiltering(status, message)) {
      throwError('Zillow bot filtering! Please open https://zillow.com in your browser and complete the challenge to continue.')
    }
  }
}

export const waitForSolvedZillowCaptcha = async () => {
  let captchaSeen = false
  while (true) {
    try {
      const result = await openBrowser('https://www.zillow.com/homes/for_rent/')
      if (result?.status === 'captcha') {
        captchaSeen = true
      } else if (captchaSeen && result?.status === 'navigated') {
        // captcha was showing and is now gone — refresh cookie to pick up new _px3
        await refreshCookie()
        const solved = await checkForZillowBotFiltering()
        if (solved) return solved
      } else if (!captchaSeen) {
        const solved = await checkForZillowBotFiltering()
        if (solved) return solved
      }
    } catch {
      // don't log the error
    }
    await new Promise(resolve => setTimeout(resolve, 500))
  }
}
