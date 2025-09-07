import { mkdir, writeFile } from 'fs/promises'
import path from 'path'
import { type ZipCode, getZillowListingResults, type ZillowListingResultsOptions, checkForZillowBotFiltering } from '@rent-scraper/api'
import { checkForFile, ErrorLog, parseError } from '@rent-scraper/utils'
import { type ScrapeZillowListingsByZipCodesOptions } from './types.js'
import { getZillowOutputPath } from '@rent-scraper/api/config'
import { log, spinner } from '@clack/prompts'

const validZipCodes = [] as ZipCode[]
const debug = process.env.DEBUG

const fetchZillowListingResultsByZipCodeAndExport = async (zipCode: number, filePath: string, options?: ZillowListingResultsOptions) => {
  const { daysOnZillow, timeoutMs } = options ?? {}
  // skip if file already exists
  if (await checkForFile(filePath)) {
    if (debug) {
      log.warning(`${zipCode} exists, skipping`)
    }
  } else {
  // fetch listing results from zillow (search data) and write to json file
    const listings = await getZillowListingResults({ zipCode, daysOnZillow, mergePageResults: true, timeoutMs })
    if (listings) {
      if (debug) {
        log.info(`writing ${filePath}`)
      }
      await writeFile (filePath, JSON.stringify(listings))
      validZipCodes.push(zipCode)
    } else {
      if (debug) {
        log.warning(`no results for ${zipCode}`)
      }
    }
  }
}

export const scrapeZillowListingResultsByZipCodes = async (zipCodes: number[], outputDirectory: string, options?: ScrapeZillowListingsByZipCodesOptions) => {
  const { daysListed, timeoutMs, run = 1, reruns = 0, fetchListings = false } = options ?? {}
  const errors = new ErrorLog()

  // throw error if zillow bot filtering is enabled
  await checkForZillowBotFiltering({ fetchListings })

  const rerunZipCodes = [] as ZipCode[]
  const doRerun = rerunZipCodes.length

  // make output directory if it doesn't exist
  if (!await checkForFile(outputDirectory)) {
    await mkdir(outputDirectory, { recursive: true })
  }

  const s = spinner()
  s.start('Scraping Zillow search results')
  for (let i = 1; i <= reruns + 1; i++) {
    errors.add(`rerun ${i} of ${reruns}`)
    // loop through zip codes and fetch data
    if (i === 1 || doRerun) {
      await Promise.all((doRerun ? rerunZipCodes : zipCodes).map(async (zipCode: number) => {
        const filename = `${zipCode}.json`
        const filePath = `${outputDirectory}/${filename}`
        try {
          await fetchZillowListingResultsByZipCodeAndExport(zipCode, filePath, { daysOnZillow: daysListed, timeoutMs })
        } catch (error) {
          rerunZipCodes.push(zipCode)
          const { message } = parseError(error)
          errors.add(message ?? `Error during fetch for ${zipCode}, ${error}`)
        }
      }))
    }
  }
  s.stop('Zillow search results have been saved to:')
  const zillowOutputPath = await getZillowOutputPath()
  log.message(path.join(zillowOutputPath, 'zillow', 'results', path.basename(outputDirectory)))

  const logsDirectory = path.join(zillowOutputPath, 'zillow', 'logs')
  if (!await checkForFile(logsDirectory)) {
    await mkdir(logsDirectory, { recursive: true })
  }

  // write errors
  if (errors.get().filter(error => !error.includes('rerun ')).length > reruns) {
    const errorsFileName = `${path.basename(outputDirectory)}-results-errors-${run}.txt`
    const errorsPath = path.join(logsDirectory, errorsFileName)
    await errors.write(errorsPath, [...new Set(errors.get())].join('\n'))
    log.error(`There were errors during processing, see ${path.resolve(errorsPath)}`)
  }

  return { validZipCodes }
}
