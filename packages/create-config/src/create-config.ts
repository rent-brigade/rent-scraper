import { runInitConfig } from './init-config.js'
import { checkForConfigFile, checkRequiredConfigValues, readConfigFile } from '@rent-scraper/utils/config'
import type { ListingsSource } from '@rent-scraper/api'
import { updateConfig } from './update-config.js'

export async function runCreateConfig(source?: ListingsSource) {
  if (source && await checkForConfigFile(source)) {
    // if no config file, create one
    const config = await readConfigFile(source)
    const missingFields = checkRequiredConfigValues(source, config)
    if (missingFields.length) {
      console.log({ missingFields })
      await runInitConfig(source)
    } else {
      await updateConfig(source)
    }
  } else {
    await runInitConfig()
  }
}
