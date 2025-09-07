import puppeteer, { type ScreenshotOptions } from 'puppeteer'

export const generateRandomUA = () => {
  // Array of random user agents
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.1 Safari/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.1 Safari/605.1.15',
  ]
  // Get a random index based on the length of the user agents array
  const randomUAIndex = Math.floor(Math.random() * userAgents.length)
  // Return a random user agent using the index above
  return userAgents[randomUAIndex]
}

/**
 * Take a screeenshot of a zillow listing
 * Works with both local (file://) and remote (https://) urls
 * @param url url of the listing to screenshot
 * @param filePath output to save the screenshot to
 */
export const screenshotZillowListing = async (url: string, filePath: ScreenshotOptions['path']) => {
  const browser = await puppeteer.launch({
    headless: true,
    timeout: 100000,
    defaultViewport: null,
  })

  const page = await browser.newPage()

  if (url.includes('file://')) {
    /* disables javascript to prevent content from hiding on load */
    await page.setJavaScriptEnabled(false)
  } else {
    const customUA = generateRandomUA()
    await page.setUserAgent(customUA)
  }

  await page.goto(url, {
    waitUntil: 'networkidle2',
  })

  /* get height of zillow layout container modal */
  const height = await page.evaluate((): number => document.querySelector('.layout-content-container')?.clientHeight as number)

  /* set viewport height to layout container */
  if (height) {
    await page.setViewport({
      width: 1024,
      height,
    })
  }

  await page.screenshot({ path: filePath, fullPage: true, captureBeyondViewport: true })
  await page.close()
  await browser.close()
  console.log(`screenshot complete, ${filePath}`)
}
