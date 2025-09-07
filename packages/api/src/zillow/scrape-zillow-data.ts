import axios from 'axios'
import dayjs from 'dayjs'
import * as cheerio from 'cheerio'

export interface ZillowListingHtmlOptions {
  timeoutMs?: number
}

export const fetchHtmlFromZillowListingUrl = async (url: string, options?: ZillowListingHtmlOptions): Promise<string> => {
  const { timeoutMs } = options ?? {}
  const headers = {
    'Host': 'www.zillow.com',
    'accept': '*/*',
    'content-type': 'text/html; charset=utf-8',
    'user-agent': 'insomnia/10.3.0',
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
  const { data } = await axios.options(url, config) || {}
  return data
}

export const getHtmlFromZillowListingUrl = async (url: string): Promise<{ data: string }> => {
  const data = await fetchHtmlFromZillowListingUrl(url)
  return {
    data,
  }
}

export const scrapeDataFromZillowListingUrl = async (url: string) => {
  const html = await fetchHtmlFromZillowListingUrl(url)
  return scrapeDataFromZillowListingHtml(html)
}

const parseZillowListingHtmlData = (data: any, type: 'building' | 'property') => {
  if (type === 'building') {
    return data?.initialReduxState?.gdp?.building ?? null
  } else {
    data = data && JSON.parse(data?.gdpClientCache)
    const firstKey = data && Object.keys(data)?.[0]
    data = data?.[firstKey]?.property
    return data ?? null
  }
}

export const scrapeDataFromZillowListingHtml = (html: string) => {
  const $ = cheerio.load(html)
  const script = $('#__NEXT_DATA__').text()
  const json = script && JSON.parse(script)?.props?.pageProps?.componentProps

  const type = json?.initialReduxState?.gdp ? 'building' : 'property'

  const data = parseZillowListingHtmlData(json, type)
  return {
    timestamp: dayjs(),
    ...data,
  }
}
