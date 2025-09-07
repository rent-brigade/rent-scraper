import axios, { isCancel } from 'axios'
import { getZillowRegionIdByZipCode, getRedfinRegionIdByZipCode, checkForZillowBotFiltering, waitForSolvedZillowCaptcha } from '@rent-scraper/api'
import { parseError, throwError } from '@rent-scraper/utils'
import { checkForAndReadConfigFile, getZipCodesFromConfig, stringifyZipCodes, updateConfigFile } from '@rent-scraper/utils/config'
import { cancel, confirm, log, outro, spinner } from '@clack/prompts'
import { setTimeout as sleep } from 'node:timers/promises'
import type { ListingsSource } from '@rent-scraper/api'

const closeBrowser = async () => {
  await axios.post('http://localhost:8082/browser/close')
}

export const runGenerateRegionIds = async (source: ListingsSource) => {
  try {
    const config = await checkForAndReadConfigFile(source)
    if (config?.regionIds) {
      log.success('Region Ids have been found in config...')
      return
    }

    log.step('Region Ids were not found in your Config file')

    const s = spinner()

    if (source === 'redfin') {
      // generate redfin region ids
      await generateRedfinRegionIds()
    } else {
      try {
        // check for bot filtering before generating region ids
        await checkForZillowBotFiltering()
      } catch (error: any) {
        const { message } = parseError(error)
        log.error(message)
        // advance once captcha is solved
        const shouldContinue = await confirm({
          message: 'You need to complete a captcha in your browser. Press Return to launch your browser and continue.',
          active: 'OK',
          inactive: 'Cancel',
        })

        if (isCancel(shouldContinue) || !shouldContinue) {
          cancel('Create config canceled. Please try again.')
          return process.exit(1)
        }

        await sleep(1000)

        outro('Browser Launching...')

        await sleep(1000)

        await waitForSolvedZillowCaptcha()
      }

      await closeBrowser()

      // generate zillow region ids
      s.start('Generating Region Ids')
      await generateZillowRegionIds()
      await sleep(1000)
      s.stop('Region Ids Generated and added to Config file')
      await sleep(1000)
    }
  } catch (error: any) {
    const { message } = parseError(error)
    log.error(message)
  }
}

export async function generateZillowRegionIds() {
  try {
    // parse zipcodes from config file
    const zipCodes = await getZipCodesFromConfig('zillow')
    // throw error if zip codes have not been added to config file.
    if (!zipCodes) {
      return throwError('Zip codes must be added to config file.')
    }

    await checkForZillowBotFiltering()
    // loop through zip codes and fetch data
    const regionIds = Object.fromEntries((await Promise.all(zipCodes.map(async (zipCode: number) => {
      const regionId = await getZillowRegionIdByZipCode(zipCode, { fromFile: false })
      return [zipCode, regionId]
    }))).filter(x => x)) as Record<number, number | null>

    const data = {
      zipCodes: stringifyZipCodes(zipCodes),
      regionIds,
    }

    // update config file with regionIds
    await updateConfigFile('zillow', data)
  } catch (error: any) {
    const { status, message } = parseError(error)
    log.error(`${status}, ${message}`)
  }
}

export async function generateRedfinRegionIds() {
  try {
    // parse zipcodes from config file
    const zipCodes = await getZipCodesFromConfig('redfin')

    // throw error if zip codes have not been added to config file.
    if (!zipCodes) {
      return throwError('Zip codes must be added to config file.')
    }

    // loop through zip codes and fetch data
    const regionIds = Object.fromEntries((await Promise.all(zipCodes.map(async (zipCode: number) => {
      const regionId = await getRedfinRegionIdByZipCode(zipCode, { fromFile: false })
      return [zipCode, regionId]
    }))).filter(x => x))

    const data = {
      zipCodes: stringifyZipCodes(zipCodes),
      regionIds,
    }

    // update config file with regionIds
    await updateConfigFile('redfin', data)
  } catch (error) {
    const { status, message } = parseError(error)
    console.error(status, message)
  }
}
