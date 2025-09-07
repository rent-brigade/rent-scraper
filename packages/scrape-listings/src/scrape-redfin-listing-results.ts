import { mkdir, writeFile } from 'fs/promises'
import { type ZipCode, getRedfinListingResults, type RedfinListingResultsOptions } from '@rent-scraper/api'
import path from 'path'
import { checkForFile, ErrorLog, parseError } from '@rent-scraper/utils'
import { type ScrapeListingsByZipCodesOptions } from './types.js'
import { getRedfinOutputPath } from '@rent-scraper/api/config'

const validZipCodes = [] as ZipCode[]

const fetchRedfinListingResultsByZipCodeAndExport = async (zipCode: number, filePath: string, options?: RedfinListingResultsOptions) => {
  const { daysListed, timeoutMs } = options ?? {}
  // skip if file already exists
  if (await checkForFile(filePath)) {
    console.log(`${zipCode} exists, skipping`)
  } else {
  // fetch listing results from zillow (search data) and write to json file
    const listings = await getRedfinListingResults({ zipCode, daysListed, timeoutMs })
    if (listings) {
      console.log(`writing ${filePath}`)
      await writeFile (filePath, JSON.stringify(listings))
      validZipCodes.push(zipCode)
    } else {
      console.log(`no results for ${zipCode}`)
    }
  }
}

export const scrapeRedfinListingResultsByZipCodes = async (zipCodes: number[], outputDirectory: string, options: ScrapeListingsByZipCodesOptions) => {
  const { daysListed, timeoutMs, run = 1, reruns = 0 } = options ?? {}

  const errors = new ErrorLog()

  const rerunZipCodes = [] as ZipCode[]
  const doRerun = rerunZipCodes.length

  // make output directory if it doesn't exist
  if (!await checkForFile(outputDirectory)) {
    await mkdir(outputDirectory, { recursive: true })
  }

  for (let i = 1; i <= reruns + 1; i++) {
    errors.add(`rerun ${i} of ${reruns}`)
    // loop through zip codes and fetch data
    if (i === 1 || doRerun) {
      // loop through zip codes and fetch data
      await Promise.all((doRerun ? rerunZipCodes : zipCodes).map(async (zipCode: number) => {
        const filename = `${zipCode}.json`
        const filePath = `${outputDirectory}/${filename}`
        try {
          await fetchRedfinListingResultsByZipCodeAndExport(zipCode, filePath, { daysListed, timeoutMs })
        } catch (error) {
          rerunZipCodes.push(zipCode)
          const { message } = parseError(error)
          errors.add(message ?? `Error during fetch for ${zipCode}, ${error}`)
        }
      }))
    }
  }

  const redfinOutputPath = await getRedfinOutputPath()
  const logsDirectory = path.join(redfinOutputPath, 'redfin', 'logs')
  if (!await checkForFile(logsDirectory)) {
    await mkdir(logsDirectory, { recursive: true })
  }

  // write errors
  if (errors.get().filter(error => !error.includes('rerun ')).length > reruns) {
    const errorsFileName = `${path.basename(outputDirectory)}-results-errors-${run}.txt`
    const errorsPath = path.join(logsDirectory, errorsFileName)
    await errors.write(errorsPath, [...new Set(errors.get())].join('\n'))
    console.log('\x1b[41m\n%s\x1b[0m', `There were errors during processing, see ${path.resolve(errorsPath)}`)
  }

  return { validZipCodes }
}
