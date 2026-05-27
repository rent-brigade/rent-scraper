import type { Page } from 'puppeteer'
import { getBrowser } from './browser.js'

const HOLD_DURATION_MS = 10000 // PerimeterX typically requires ~8-10s hold

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
    if (!title.includes('denied')) return true // no captcha present

    // Delete pxcts cookie — resets the challenge state so a fresh attempt starts clean
    await page.deleteCookie({ name: 'pxcts', domain: '.zillow.com' })

    for (let attempt = 0; attempt < 5; attempt++) {
      if (attempt > 0) {
        // wait between attempts
        await new Promise(resolve => setTimeout(resolve, 5000))
      }

      try {
        // Try mouse hold on the captcha element first
        const captchaEl = await page.$('#px-captcha')
        if (captchaEl) {
          const box = await captchaEl.boundingBox()
          if (box) {
            await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
            await page.mouse.down()
            await new Promise(resolve => setTimeout(resolve, HOLD_DURATION_MS))
            await page.mouse.up()
          } else {
            // element found but no bounding box — fall back to keyboard
            await pressAndHoldSpace(page)
          }
        } else {
          // no element found — fall back to keyboard Tab + Space
          await pressAndHoldSpace(page)
        }
      } catch {
        // any puppeteer error — try keyboard as last resort
        await pressAndHoldSpace(page)
      }

      // give the page a moment to react
      await new Promise(resolve => setTimeout(resolve, 1000))
      const currentTitle = await page.title()
      if (!currentTitle.includes('denied')) return true
    }

    return false
  } catch {
    return false
  }
}
