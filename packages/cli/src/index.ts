import type { ListingsSource } from '@rent-scraper/api'
import { checkForConfigFile } from '@rent-scraper/utils/config'
import { runCreateConfig, runCheckConfig, runGenerateRegionIds } from '@rent-scraper/create-config'
import { runScrapeListings } from '@rent-scraper/scrape-listings'

export async function runRentScraper(source: ListingsSource) {
  if (!await checkForConfigFile(source)) {
    // if no config file, create one
    await runCreateConfig()
  }
  // confirm config and generate regionIds if needed
  await runCheckConfig(source)
  await runGenerateRegionIds(source)
  await runScrapeListings()
}
