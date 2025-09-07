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
        try {
          await fetchListingHtmlByUrlAndExport('zillow', url, inputFilePath)
          await scrapeZillowListingHtmlByFilePathAndExport(inputFilePath)
        } catch (error) {
          const { message } = parseError(error)
          log.error(message)
        }
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

export const scrapeListingDetailsFromHtmlByFilePaths = async (source: ListingsSource, inputFilePaths: string[]) => {
  // loop through files and fetch html
  await Promise.all(inputFilePaths.map(async inputFilePath => source === 'redfin' ? await scrapeRedfinListingHtmlByFilePathAndExport(inputFilePath) : await scrapeZillowListingHtmlByFilePathAndExport(inputFilePath)))
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
  const numChunks = 20
  const numZipCodes = zipCodes.length
  const chunkSize = numZipCodes > numChunks ? roundValue(numZipCodes / numChunks, 1) : numZipCodes
  const chunks = chunkArray(zipCodes, chunkSize) as number[][]
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
        // fetch the listing html for each file
        numListings = numListings + listingHtmlFilePaths.length
        await scrapeListingDetailsFromHtmlByFilePaths(source, listingHtmlFilePaths)
      } else {
        errors.add(`listing directory does not exist, ${listingDirectory}`)
      }
    }))
  }
  const zillowOutputPath = await getZillowOutputPath()
  const redfinOutputPath = await getRedfinOutputPath()
  const outputPath = source === 'zillow' ? zillowOutputPath : redfinOutputPath
  p.stop('Listings data has been saved to:')
  log.message(path.join(outputPath, source, 'listings', path.basename(inputDirectory)))

  const logsDirectory = path.join(outputPath, source, 'logs')
  if (!await checkForFile(logsDirectory)) {
    await mkdir(logsDirectory, { recursive: true })
  }

  // write errors
  if (errors.get().length > 0) {
    const errorsFileName = `${path.basename(inputDirectory)}-listing-errors.txt`
    const errorsPath = path.join(logsDirectory, errorsFileName)
    await errors.write(errorsPath, [...new Set(errors.get())].join('\n'))

    log.error(`There were errors during processing, see ${path.resolve(errorsPath)}`)
  }
  return { numListings }
}
