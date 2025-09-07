import { parseError } from '@rent-scraper/utils'
import { runScrapeListings } from '../scrape-listings.js'
import { log } from '@clack/prompts'

runScrapeListings()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    const { message } = parseError(error)
    log.error(message)
    process.exit(1)
  })
