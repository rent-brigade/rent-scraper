import dayjs from 'dayjs'
import * as cheerio from 'cheerio'

import { parseRedfinResponse } from './get-redfin-region-id.js'
import { throwError } from '@rent-scraper/utils'
import { getRedfinCookie } from './config.js'

export const getHtmlFromRedfinListingUrl = async (url: string): Promise<{ data: string }> => {
  const data = await fetchHtmlFromRedfinListingUrl(url)
  return {
    data,
  }
}

export const scrapeDataFromRedfinListingUrl = async (url: string) => {
  const html = await fetchHtmlFromRedfinListingUrl(url)
  return scrapeDataFromRedfinListingHtml(html)
}

export const scrapeDataFromRedfinListingHtml = (html: string) => {
  const $ = cheerio.load(html)
  const script = $('script:contains("ReactServerAgent.cache")').text()

  const json = script?.replace('_tLAB.wait(function(){\n(function (root) {\n/* -- Data -- */\nroot.__reactServerState || (root.__reactServerState = {});\nroot.__reactServerState.InitialContext = {"ReactServerAgent.cache":', '')?.split(',"deviceType":"desktop"')[0]

  const parsed = json && JSON.parse(json)
  const dataCache = parsed?.dataCache

  const initialInfo = dataCache?.['/stingray/api/home/details/initialInfo']?.res?.text && parseRedfinResponse(dataCache['/stingray/api/home/details/initialInfo'].res.text)?.payload

  const propertyId = initialInfo?.propertyId ?? initialInfo?.redirectUrl?.split('/').pop()
  const homeCardsJson = dataCache?.[`/stingray/api/v1/rentals/homecards?propertyIds=${propertyId}`]?.res?.text
  const homeCards = homeCardsJson && parseRedfinResponse(homeCardsJson)

  const belowTheFoldJson = dataCache?.['/stingray/api/home/details/belowTheFold']?.res?.text
  const belowTheFold = belowTheFoldJson && parseRedfinResponse(belowTheFoldJson)?.payload

  const propertyParcelInfoJson = dataCache?.[`/stingray/api/home/details/propertyParcelInfo?propertyId=${propertyId}&pageType=6`]?.res?.text
  const propertyParcelInfo = propertyParcelInfoJson && parseRedfinResponse(propertyParcelInfoJson)?.payload

  const rentalId = homeCards?.homes?.[0]?.rentalExtension?.rentalId

  const floorPlansJson = dataCache?.[`/stingray/api/v1/rentals/${rentalId}/floorPlans?`]?.res?.text
  const floorPlans = floorPlansJson && parseRedfinResponse(floorPlansJson)

  const data = {
    hasPropertyHistory: !!belowTheFold?.propertyHistoryInfo,
    propertyId,
    rentalId,
    initialInfo,
    homeCards,
    floorPlans,
    belowTheFold,
    propertyParcelInfo,
  }

  return {
    timestamp: dayjs(),
    ...data,
  }
}

export interface RedfinListingHtmlOptions {
  timeoutMs?: number
}

export const fetchHtmlFromRedfinListingUrl = async (url: string, options?: RedfinListingHtmlOptions): Promise<string> => {
  const { timeoutMs } = options ?? {}
  const redfinCookie = await getRedfinCookie()
  const headers: Record<string, string> = {
    'Content-Type': 'text/html; charset=utf-8',
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    ...(redfinCookie && { Cookie: redfinCookie }),
  }

  const newAbortSignal = (timeoutMs: number) => {
    const abortController = new AbortController()
    setTimeout(() => abortController.abort(), timeoutMs || 0)
    return abortController.signal
  }

  const config = {
    headers,
    ...(timeoutMs && { signal: newAbortSignal(timeoutMs) }),
  }

  const response = await fetch(url, config)
  if (response.status === 202) {
    throwError(`Redfin bot filtering (202) for ${url} — restart the browser server to refresh the cookie.`)
  }
  if (response.ok) {
    const data = await response.text()
    return data
  } else {
    const body = await response.text().catch(() => '')
    const message = (body && JSON.parse(body)?.error) ?? `${response.status} ${response.statusText}`
    throwError(message)
  }
}
