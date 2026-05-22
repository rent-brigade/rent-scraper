import puppeteer from 'puppeteer'
import { closeBrowser, openBrowser } from './browser.js'
import { updateConfigFile } from '@rent-scraper/utils/config'
import { parseError } from '@rent-scraper/utils'

const wsChromeEndpointurl = 'http://127.0.0.1:9222/json/version'

export const getZillowCookie = async (attempt = 0, options?: { onCaptcha?: () => Promise<void> }): Promise<string | undefined> => {
  const browser = await puppeteer.connect({
    browserURL: wsChromeEndpointurl,
  })
  if (attempt === 0) {
    await openBrowser('https://www.zillow.com/homes/for_rent/')
  }
  const pages = await browser.pages()
  const title = pages?.[0] ? await pages[0].title() : ''
  if (title.includes('Access to this page has been denied')) {
    if (options?.onCaptcha) {
      await options.onCaptcha()
    } else {
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
    return await getZillowCookie(attempt + 1, options)
  }
  const allCookies = await browser.cookies()
  const zillowCookies = allCookies.filter(c => c.domain?.includes('zillow.com'))
  const hasPxvid = zillowCookies.some(c => c.name === '_pxvid')
  if (hasPxvid) {
    await closeBrowser()
    return zillowCookies.map(c => `${c.name}=${c.value}`).join('; ')
  } else {
    console.log('refetching zillow cookie')
    await new Promise(resolve => setTimeout(resolve, 2000))
    return await getZillowCookie(attempt + 1)
  }
}

export const getRedfinCookie = async (attempt = 0): Promise<string | undefined> => {
  const browser = await puppeteer.connect({
    browserURL: wsChromeEndpointurl,
  })
  if (attempt === 0) {
    await openBrowser('https://www.redfin.com')
    await new Promise(resolve => setTimeout(resolve, 3000))
  }
  const pages = await browser.pages()
  const title = pages?.[0] ? await pages[0].title() : ''
  const cookies = (await browser.cookies()).filter(cookie => cookie.domain.includes('redfin.com'))
  if (cookies.some(cookie => cookie.name === 'aws-waf-token') && title.includes('Redfin')) {
    await closeBrowser()
    return cookies.map(c => `${c.name}=${c.value}`).join('; ')
  } else {
    console.log('refetching redfin cookie')
    await new Promise(resolve => setTimeout(resolve, 2000))
    return await getRedfinCookie(attempt + 1)
  }
}

export const saveRedfinCookie = async () => {
  try {
    const redfinCookie = await getRedfinCookie()
    if (redfinCookie) {
      await updateConfigFile('redfin', { redfinCookie })
    }
  } catch (error: any) {
    const { status, message } = parseError(error)
    console.error(status, message)
  }
}

export const saveZillowCookie = async (options?: { onCaptcha?: () => Promise<void> }) => {
  try {
    const zillowCookie = await getZillowCookie(0, options)
    if (zillowCookie) {
      await updateConfigFile('zillow', { zillowCookie })
    }
  } catch (error: any) {
    const { status, message } = parseError(error)
    console.error(status, message)
  }
}
