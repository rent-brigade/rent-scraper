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
  await axios.post('http://localhost:8082/browser/open', { url })
}

export const checkForZillowBotFiltering = async (options?: CheckForZillowBotFilteringOptions) => {
  try {
    const zillowZipCodes = await getZillowZipCodes()
    if (!zillowZipCodes) {
      return throwError('zip codes required, please run the createConfig script')
    }
    const { fetchListings = false } = options ?? {}
    const LA_COUNTY_REGION_ID = 3101
    const { results } = await getZillowListingResults({ regionId: LA_COUNTY_REGION_ID, daysOnZillow: 1, mergePageResults: false }) ?? {}
    const { zpid, detailUrl } = results?.[0] ?? {}
    if (zpid && fetchListings) {
      await getZillowListingDetailsByZpid(zpid)
    } else if (detailUrl && !detailUrl.startsWith('/apartments')) {
      await fetchHtmlFromZillowListingUrl(detailUrl)
    } else {
      await checkForZillowBotFiltering()
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
  return await new Promise((resolve) => {
    const interval = setInterval(async () => {
      try {
        await openBrowser('https://www.zillow.com/homes/for_rent/')
        const solved = await checkForZillowBotFiltering()
        if (solved) {
          resolve(solved)
          clearInterval(interval)
        }
      } catch {
        // don't log the error
      }
    }, 500)
  })
}
