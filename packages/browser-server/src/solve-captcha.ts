import type { Page } from 'puppeteer'
import { getBrowser } from './browser.js'

const HOLD_DURATION_MS = 10000

const pressAndHoldSpace = async (page: Page) => {
  await page.keyboard.press('Escape')
  await new Promise(resolve => setTimeout(resolve, 500))
  await page.keyboard.press('Tab')
  await new Promise(resolve => setTimeout(resolve, 200))
  await page.keyboard.down('Space')
  await new Promise(resolve => setTimeout(resolve, HOLD_DURATION_MS))
  await page.keyboard.up('Space')
}

export const solveZillowCaptcha = async (): Promise<boolean> => {
  try {
    const browser = await getBrowser()
    if (!browser) return false

    const pages = await browser.pages()
    const page = pages?.[0]
    if (!page) return false

    const title = await page.title()
    if (!title.includes('denied')) return true

    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        await pressAndHoldSpace(page)
      } catch {
        // ignore puppeteer errors, try again
      }

      await page.reload({ waitUntil: 'load' })
      const currentTitle = await page.title()
      if (!currentTitle.includes('denied')) return true

      await new Promise(resolve => setTimeout(resolve, 3000))
    }

    return false
  } catch {
    return false
  }
}
