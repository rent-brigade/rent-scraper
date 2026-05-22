import puppeteer from 'puppeteer'
import { access, mkdtemp } from 'fs/promises'
import { exec } from 'child_process'
import { tmpdir } from 'os'
import path from 'path'
import { checkForConfigFile, waitForConfigFile } from '@rent-scraper/utils/config'
import type { ListingsSource } from '@rent-scraper/api'

const nativeBrowserPaths: Partial<Record<NodeJS.Platform, string[]>> = {
  darwin: [
    '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  ],
  linux: [
    '/usr/bin/brave-browser',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/snap/bin/chromium',
  ],
  win32: [
    'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  ],
}

const findNativeBrowser = async (): Promise<string | null> => {
  const paths = nativeBrowserPaths[process.platform] ?? []
  for (const browserPath of paths) {
    try {
      await access(browserPath)
      return browserPath
    } catch {
      // not found, try next
    }
  }
  return null
}

const wsChromeEndpointurl = 'http://127.0.0.1:9222/json/version'

export const waitForBrowser = async (timeoutMs = 15000): Promise<void> => {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      await puppeteer.connect({ browserURL: wsChromeEndpointurl })
      return
    } catch {
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }
  throw new Error('timed out waiting for browser')
}

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
  }
  if (!await checkForConfigFile(source)) {
    await waitForConfigFile(source)
  }
  const userDataDir = await mkdtemp(path.join(tmpdir(), 'chrome-remote-'))
  const nativePath = await findNativeBrowser()
  console.log(`launching browser: ${nativePath ?? 'bundled chromium'}`)
  if (nativePath) {
    exec(`"${nativePath}" --remote-debugging-port=9222 --no-first-run --no-default-browser-check --user-data-dir="${userDataDir}"`, (error) => {
      if (error) console.error(`Error: ${error.message}`)
    })
  } else {
    const args = [
      '--remote-debugging-port=9222',
      '--no-first-run',
      '--no-default-browser-check',
      `--user-data-dir=${userDataDir}`,
      ...(process.platform === 'linux' ? ['--no-sandbox', '--disable-setuid-sandbox'] : []),
    ]
    await puppeteer.launch({ headless: false, args, dumpio: false })
  }
  return { status: 'launched' }
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
