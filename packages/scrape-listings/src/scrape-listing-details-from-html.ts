import path from 'path'
import { mkdir, readFile, unlink, writeFile } from 'fs/promises'
import { type ListingsSource, scrapeDataFromZillowListingHtml, scrapeDataFromRedfinListingHtml } from '@rent-scraper/api'
import { checkForFile, chunkArray, ErrorLog, parseError, parsePercentage, readFilesInDirectory, roundValue, throwError } from '@rent-scraper/utils'
import { fetchListingHtmlByUrlAndExport } from './scrape-listing-html.js'
import { getRedfinOutputPath, getZillowOutputPath } from '@rent-scraper/api/config'
import { log, progress } from '@clack/prompts'

const debug = process.env.DEBUG

const scrapeZillowListingHtmlByFilePathAndExport = async (inputFilePath: string) => {
  // read the input file and take screenshot
  if (await checkForFile(inputFilePath)) {
    const outputFilePath = inputFilePath.replace('.html', '.json')
    if (!await checkForFile(outputFilePath)) {
      if (debug) {
        log.message(`scraping data for ${inputFilePath}`)
      }
      const html = (await readFile(inputFilePath)).toString()
      if (!html || html.trim() === '') {
        // empty file from a previous bad fetch — delete so it can be retried
        await unlink(inputFilePath)
        throwError(`empty file found at ${inputFilePath}, deleted for retry`)
      }
      if (html.includes('px-captcha')) {
        // bad file from a previous bot-filtered fetch — delete so it can be retried
        await unlink(inputFilePath)
        throwError(`captcha page found in ${inputFilePath}, deleted for retry`)
      }
      const data = await scrapeDataFromZillowListingHtml(html)
      // rescrape if no history and a bestMatchedUnit url is available
      if (!data?.priceHistory && data?.bestMatchedUnit?.hdpUrl) {
        if (debug) {
          log.warning(`rescraping ${inputFilePath} - https://www.zillow.com${data?.bestMatchedUnit?.hdpUrl}`)
        }
        if (await checkForFile(inputFilePath)) {
          if (debug) {
            log.warning(`deleting ${inputFilePath}`)
          }
          await unlink(inputFilePath)
        }
        if (await checkForFile(outputFilePath)) {
          if (debug) {
            log.warning(`deleting ${outputFilePath}`)
          }
          await unlink(outputFilePath)
        }
        const url = `https://www.zillow.com${data?.bestMatchedUnit?.hdpUrl}`
        await fetchListingHtmlByUrlAndExport('zillow', url, inputFilePath)
        await scrapeZillowListingHtmlByFilePathAndExport(inputFilePath)
      } else {
        if (!data) {
          throwError(`problem scraping data for ${inputFilePath}`)
        } else {
          if (debug) {
            log.info(`writing ${outputFilePath}`)
          }
          await writeFile(`${outputFilePath}`, JSON.stringify(data))
        }
      }
    } else {
      if (debug) {
        log.warning(`file already exists, ${outputFilePath}`)
      }
    }
  }
}

const scrapeRedfinListingHtmlByFilePathAndExport = async (inputFilePath: string) => {
  // read the input file and take screenshot
  if (await checkForFile(inputFilePath)) {
    const outputFilePath = inputFilePath.replace('.html', '.json')
    if (!await checkForFile(outputFilePath)) {
      if (debug) {
        log.message(`scraping data for ${inputFilePath}`)
      }
      const html = (await readFile(inputFilePath)).toString()
      const data = scrapeDataFromRedfinListingHtml(html)
      // rescrape if no history and a bestMatchedUnit url is available
      if (!data) {
        throwError(`problem scraping data for ${inputFilePath}`)
      } else {
        if (debug) {
          log.warning(`writing ${outputFilePath}`)
        }
        await writeFile(`${outputFilePath}`, JSON.stringify(data))
      }
    } else {
      if (debug) {
        log.warning(`file already exists, ${outputFilePath}`)
      }
    }
  }
}

export const scrapeListingDetailsFromHtmlByFilePaths = async (source: ListingsSource, inputFilePaths: string[], errors?: ErrorLog) => {
  // loop through files and fetch html; returns count of successfully parsed listings
  const results = await Promise.all(inputFilePaths.map(async (inputFilePath) => {
    try {
      if (source === 'redfin') {
        await scrapeRedfinListingHtmlByFilePathAndExport(inputFilePath)
      } else {
        await scrapeZillowListingHtmlByFilePathAndExport(inputFilePath)
      }
      // count it if the output json file exists
      const outputFilePath = inputFilePath.replace('.html', '.json')
      return await checkForFile(outputFilePath) ? 1 : 0
    } catch (error) {
      const { message } = parseError(error)
      errors?.add(message)
      return 0
    }
  }))
  return results.reduce<number>((sum, n) => sum + n, 0)
}

export const scrapeListingDetailsFromHtmlByZipCodes = async (source: ListingsSource, zipCodes: number[], inputDirectory: string) => {
  const errors = new ErrorLog()
  let numListings = 0

  if (!inputDirectory) {
    throwError('inputDirectory is required')
  }
  // loop through zip codes
  const p = progress({ style: 'heavy', max: 100, size: 50 })
  p.start('Scraping listings data')

  // sets chunk size to number of zip codes (max 20)
  const numZipCodes = zipCodes.length
  const numChunks = numZipCodes < 20 ? numZipCodes + 1 : 20
  const chunkSize = numZipCodes > numChunks ? roundValue(numZipCodes / numChunks, 1) : numZipCodes
  const chunks = chunkArray(zipCodes, chunkSize) as number[][]

  // run the scraper in chunks to show progress
  for (const [idx, chunk] of chunks.entries()) {
    const percent = roundValue(((Number(idx) + 1) / numChunks) * 100, 1)
    p.advance(roundValue((1 / (numChunks)) * 100, 1), `Scraping listings (${parsePercentage(percent)})`)

    await Promise.all(chunk.map(async (zipCode) => {
      if (debug) {
        log.message(`processing files for ${zipCode}`)
      }
      const listingDirectory = `${inputDirectory}/${zipCode}`
      // check if zip code directory exists
      if (await checkForFile(listingDirectory)) {
      // get list of json files in current directory
        const listingHtmlFilePaths = await readFilesInDirectory(listingDirectory, { extension: '.html', prependDirectory: true })
        // fetch the listing html for each file; count only successfully parsed listings
        const parsed = await scrapeListingDetailsFromHtmlByFilePaths(source, listingHtmlFilePaths, errors)
        numListings = numListings + parsed
      } else {
        errors.add(`listing directory does not exist, ${listingDirectory}`)
      }
    }))
  }
  const zillowOutputPath = await getZillowOutputPath()
  const redfinOutputPath = await getRedfinOutputPath()
  const outputPath = source === 'zillow' ? zillowOutputPath : redfinOutputPath
  if (numListings > 0) {
    p.stop('Listings data has been saved to:')
    log.message(path.join(outputPath, source, 'listings', path.basename(inputDirectory)))
  } else {
    p.stop('No listings data saved.')
  }

  const logsDirectory = path.join(outputPath, source, 'logs')
  // creates logsDirectory if it doesn't exist
  await mkdir(logsDirectory, { recursive: true })

  // write errors
  if (errors.get().length > 0) {
    const errorsFileName = `${path.basename(inputDirectory)}-listing-errors.txt`
    const errorsPath = path.join(logsDirectory, errorsFileName)
    await errors.write(errorsPath, [...new Set(errors.get())].join('\n'))

    log.error(`There were errors during processing, see ${path.resolve(errorsPath)}`)
  }
  return { numListings }
}
