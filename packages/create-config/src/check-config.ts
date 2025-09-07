import { checkForAndReadConfigFile, checkForZillowCookie, checkRequiredConfigValues, resetZillowCookie, waitForBrowserServer, waitForZillowCookie } from '@rent-scraper/utils/config'
import { log } from '@clack/prompts'
import type { ListingsSource } from '@rent-scraper/api'
import { runBrowserServer, runConfirmBrowserLaunch } from '@rent-scraper/browser-server'

export async function runCheckConfig(source: ListingsSource) {
  await runConfirmBrowserLaunch()
  runBrowserServer()
  await resetZillowCookie()
  log.info('Waiting for Server')
  await waitForBrowserServer()

  if (!await checkForZillowCookie()) {
    log.info('Waiting for Zillow cookie')
    await waitForZillowCookie()
  }

  const config = await checkForAndReadConfigFile(source)
  const errors = checkRequiredConfigValues(source, config, 'scrape')
  if (errors.length) {
    const error = `Required fields missing in config.${source}.yaml file: ${errors.join(', ')}`
    throw new Error(error)
  }
}
