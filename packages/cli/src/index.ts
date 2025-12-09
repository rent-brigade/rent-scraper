import type { ListingsSource } from '@rent-scraper/api'
import { checkForConfigFile, getConfigFilePath } from '@rent-scraper/utils/config'
import { runCreateConfig, runCheckConfig, runGenerateRegionIds } from '@rent-scraper/create-config'
import { runScrapeListings } from '@rent-scraper/scrape-listings'
import { cancel, confirm, isCancel, log } from '@clack/prompts'

export async function runRentScraper(source: ListingsSource, configFilePath?: string) {
  if (!await checkForConfigFile(source, configFilePath)) {
    if (configFilePath) {
      const saveConfig = await confirm({
        message: `No config file found at ${configFilePath}. Would you like to create a new config file?`,
      })

      if (isCancel(saveConfig) || !saveConfig) {
        cancel('Create config canceled. Please try again with a different config file.')
        return process.exit(1)
      }
    } else {
      log.warning('No config file found.')
      log.info('')
    }

    // if no config file, create one
    await runCreateConfig(source)
  } else {
    const configFile = configFilePath ?? await getConfigFilePath(source)
    log.success(`Using config file found at ${configFile}`)
  }
  // confirm config and generate regionIds if needed
  await runCheckConfig(source)
  await runGenerateRegionIds(source)
  await runScrapeListings()
}
