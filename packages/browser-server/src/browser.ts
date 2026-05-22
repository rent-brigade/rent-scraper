import puppeteer from 'puppeteer'
import { exec } from 'child_process'
import { checkForConfigFile, getValueFromConfigFile, waitForConfigFile } from '@rent-scraper/utils/config'
import type { ListingsSource } from '@rent-scraper/api'

const wsChromeEndpointurl = 'http://127.0.0.1:9222/json/version'

export const getBrowser = async () => {
  try {
    const browser = await puppeteer.connect({
      browserURL: wsChromeEndpointurl,
    })
    return browser
  } catch {
    return null
  }
}

export const closeBrowser = async () => {
  const browser = await getBrowser()
  const pages = await browser?.pages()
  if (pages) await Promise.all(pages.map(page => page.close()))
}

export const launchBrowser = async (source = 'zillow' as ListingsSource) => {
  const browser = await getBrowser()
  if (browser) {
    return { status: 'already launched' }
  } else {
    if (!await checkForConfigFile(source)) {
      await waitForConfigFile(source)
    }
    await checkForConfigFile(source)
    const browserKey = await getValueFromConfigFile(source, 'browser')
    const browserPath = browserKey === 'brave' ? '/Applications/Brave\\ Browser.app/Contents/MacOS/Brave\\ Browser' : '/Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome'
    exec(`${browserPath} --remote-debugging-port=9222 --no-first-run --no-default-browser-check --user-data-dir=$(mktemp -d -t 'chrome-remote_data_dir')`, (error) => {
      if (error) {
        console.error(`Error: ${error.message}`)
      }
    })
    return { status: 'launched' }
  }
}

export const openBrowser = async (url: string) => {
  const browser = await getBrowser()
  if (browser) {
    const pageUrl = url
    const pages = await browser.pages()
    const page = pages?.[0] ?? await browser.newPage()
    const pageTitle = await page.title()
    // do not change page if captcha is showing
    if (!pageTitle.includes('denied')) {
      await page.goto(pageUrl, {
        waitUntil: 'load',
      })
    }
    return { status: 'opened' }
  } else {
    return { status: 'not connected' }
  }
}

export const shutdownBrowser = async () => {
  const browser = await getBrowser()
  if (browser) {
    await browser.close()
    return { status: 'closed' }
  } else {
    return { status: 'not connected' }
  }
}
