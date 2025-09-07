import puppeteer from 'puppeteer'
import { closeBrowser, openBrowser } from './browser.js'
import { updateConfigFile } from '@rent-scraper/utils/config'
import { parseError } from '@rent-scraper/utils'

export const getZillowCookie = async () => {
  const wsChromeEndpointurl = 'http://127.0.0.1:9222/json/version'
  const browser = await puppeteer.connect({
    browserURL: wsChromeEndpointurl,
  })
  await openBrowser('https://www.zillow.com/homes/for_rent/')
  const [cookie] = (await browser.cookies()).filter(cookie => cookie.name === '_pxvid')
  if (cookie) {
    await closeBrowser()
    return cookie
  } else {
    console.log('refetching cookie')
    setTimeout(async () => {
      await getZillowCookie()
    }, 2000)
  }
}

export const saveZillowCookie = async () => {
  try {
    const { name, value } = await getZillowCookie() ?? {}
    const zillowCookie = `${name}=${value}`

    const data = {
      zillowCookie,
    }

    // update config file
    await updateConfigFile('zillow', data)
  } catch (error: any) {
    const { status, message } = parseError(error)
    console.error(status, message)
  }
}
