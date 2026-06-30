import { getZillowListingResults } from './get-zillow-listing-results.js'
import { getZillowZipCodes, getZillowAutoCaptcha } from './config.js'
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

const checkBrowserStatus = async () => {
  const { data } = await axios.post('http://localhost:8082/browser/status')
  return data?.browser as { status: 'navigated' | 'captcha' | 'not connected' } | undefined
}

export const isBrowserShowingCaptcha = async (): Promise<boolean> => {
  try {
    const result = await checkBrowserStatus()
    return result?.status === 'captcha'
  } catch {
    return false
  }
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

const autoSolveCaptcha = async (): Promise<boolean> => {
  const { data } = await axios.post('http://localhost:8082/captcha/solve')
  return data?.solved === true
}

export const waitForSolvedZillowCaptcha = async () => {
  let autoSolveAttempted = false
  while (true) {
    try {
      const result = await openBrowser('https://www.zillow.com/homes/for_rent/')
      if (result?.status === 'captcha') {
        // attempt auto-solve once per captcha encounter (only if autoCaptcha: true in config)
        if (!autoSolveAttempted && await getZillowAutoCaptcha()) {
          autoSolveAttempted = true
          await autoSolveCaptcha()
          autoSolveAttempted = false
          continue
        }
      } else if (result?.status === 'navigated') {
        // browser is on a clean page — captcha was solved or session is already good
        await refreshCookie()
        return true
      }
    } catch {
      // don't log the error
    }
    await new Promise(resolve => setTimeout(resolve, 500))
  }
}

// Aggressively reloads the page to force a captcha challenge, then waits for the user to solve it.
// Uses timing to distinguish a real press-and-hold solve (several seconds) from a transient
// PerimeterX JS challenge that clears automatically.
export const waitForZillowCaptchaSolve = async () => {
  let captchaSeen = false
  let captchaFirstSeenAt: number | null = null
  let autoSolveAttempted = false
  while (true) {
    try {
      if (!captchaSeen) {
        // rapid reloads to trigger the captcha challenge
        const result = await openBrowser('https://www.zillow.com/homes/for_rent/')
        if (result?.status === 'captcha') {
          captchaSeen = true
          captchaFirstSeenAt = Date.now()
        }
      } else {
        // captcha is showing — poll without reloading so we don't interrupt the solve
        const result = await checkBrowserStatus()
        if (result?.status === 'navigated') {
          const duration = captchaFirstSeenAt ? Date.now() - captchaFirstSeenAt : 0
          if (duration >= 3000) {
            // showed for long enough to be a real user solve
            await refreshCookie()
            return true
          }
          // cleared too fast — transient JS challenge, reset and keep reloading
          captchaSeen = false
          captchaFirstSeenAt = null
          autoSolveAttempted = false
        }
        if (!autoSolveAttempted && await getZillowAutoCaptcha()) {
          autoSolveAttempted = true
          await autoSolveCaptcha()
          continue
        }
      }
    } catch {
      // don't log the error
    }
    await new Promise(resolve => setTimeout(resolve, captchaSeen ? 500 : 100))
  }
}
