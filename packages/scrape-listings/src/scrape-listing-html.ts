import { mkdir, readFile, writeFile } from 'fs/promises'
import path from 'path'
import { type ZipCode, type ListingsSource, fetchHtmlFromZillowListingUrl, type ZillowListingHtmlOptions, checkForZillowBotFiltering, fetchHtmlFromRedfinListingUrl } from '@rent-scraper/api'
import { ErrorLog, parseError, parseJsonFile, throwError, checkForFile, readFilesInDirectory } from '@rent-scraper/utils'
import { getRedfinOutputPath, getZillowOutputPath } from '@rent-scraper/api/config'
import { log, spinner } from '@clack/prompts'

const debug = process.env.DEBUG

export const fetchListingHtmlByUrlAndExport = async (source: ListingsSource, url: string, outputFilePath: string, options?: ZillowListingHtmlOptions) => {
  const { timeoutMs } = options ?? {}
  // skip if file already exists
  if (await checkForFile(outputFilePath)) {
    if (debug) {
      log.warn(`${outputFilePath} exists, skipping`)
    }
  } else {
    try {
      // fetch the html for the listing and write to file
      if (debug) {
        log.info(`writing ${outputFilePath}`)
      }
      const html = source === 'redfin' ? await fetchHtmlFromRedfinListingUrl(url) : await fetchHtmlFromZillowListingUrl(url, { timeoutMs })
      await writeFile(`${outputFilePath}`, html)
    } catch (error: any) {
      throwError(`error fetching html for ${url}`, error)
    }
  }
}

const fetchListingHtmlByFilePath = async (inputFilePath: string, { timeoutMs }: ZillowListingHtmlOptions) => {
  // read the input file and parse its data
  if (await checkForFile(inputFilePath)) {
    const data = JSON.parse(await readFile(inputFilePath, 'utf8')) || {}
    const { hdpUrl } = data || {}
    // check if file contains the hdpUrl field
    if (hdpUrl) {
      const url = `https://www.zillow.com${hdpUrl}`
      const outputFilePath = inputFilePath.replace('.json', '.html')
      // check if file already exists
      if (!await checkForFile(outputFilePath)) {
        await fetchListingHtmlByUrlAndExport('zillow', url, outputFilePath, { timeoutMs })
      } else {
        if (debug) {
          log.warn(`file already exists, ${outputFilePath}`)
        }
      }
    } else {
      throwError(`file is empty, ${inputFilePath}`)
    }
  } else {
    if (debug) {
      log.warn(`file does not exist at this path, ${inputFilePath}, skipping`)
    }
  }
}

const fetchListingHtmlByFilePaths = async (inputFilePaths: string[], options?: ZillowListingHtmlOptions) => {
  const { timeoutMs } = options ?? {}
  // zoom through and fetch html
  await Promise.all(inputFilePaths.map(async inputFilePath => await fetchListingHtmlByFilePath(inputFilePath, { timeoutMs })))
}

interface ScrapeListingHtmlOptions extends ZillowListingHtmlOptions {
  run?: number
  reruns?: number
}

interface ZillowResult {
  zpid: string
  detailUrl: string
}

interface RedfinResult {
  homeData: {
    propertyId: string
    url: string
  }
}

const parseIdAndUrlFromResult = (result: ZillowResult & RedfinResult, source = 'zillow' as ListingsSource) => {
  if (source === 'zillow') {
    const { zpid: id, detailUrl: url } = result || {}
    return { id, url }
  } else if (source === 'redfin') {
    const { propertyId: id, url } = result?.homeData || {}
    return { id, url: `https://www.redfin.com${url}` }
  }
}

export const scrapeListingHtmlByZipCodes = async (source: ListingsSource, zipCodes: number[], inputDirectory: string, outputDirectory = inputDirectory, options?: ScrapeListingHtmlOptions) => {
  const { timeoutMs, run = 1, reruns = 0 } = options ?? {}
  const errors = new ErrorLog()

  if (!inputDirectory) {
    throwError('inputDirectory is required')
  }

  if (source === 'zillow') {
    // throw error if zillow bot filtering is enabled
    await checkForZillowBotFiltering()
  }

  const rerunZipCodes = [] as ZipCode[]
  const doRerun = rerunZipCodes.length

  const s = spinner()
  s.start('Downloading listings html files')

  for (let i = 1; i <= reruns + 1; i++) {
    errors.add(`rerun ${i} of ${reruns}`)
    // loop through zip codes
    if (i === 1 || doRerun) {
      await Promise.all((doRerun ? rerunZipCodes : zipCodes).map(async (zipCode: number) => {
        const readFilePath = `${inputDirectory}/${zipCode}.json`
        // if the json zip code exists parse the data
        if (await checkForFile(readFilePath)) {
          try {
            const { results } = await parseJsonFile(readFilePath) || {}
            if (!results) {
              errors.add(`empty file, ${readFilePath}`)
            } else {
              // make output directory if it doesn't exist
              const outputSubDirectory = outputDirectory ? `${outputDirectory}/${zipCode}` : `${inputDirectory}/${zipCode}`
              if (!await checkForFile(outputSubDirectory)) {
                await mkdir(outputSubDirectory, { recursive: true })
              }

              if (results?.length) {
                // loop through the listings and fetch the data
                await Promise.all(await results.map(async (result: ZillowResult & RedfinResult) => {
                  try {
                    const { id, url } = parseIdAndUrlFromResult(result, source) ?? {}
                    if (!url) {
                      return errors.add(`url missing for ${id}`)
                    }
                    const filename = `${id}.html`
                    const filePath = `${outputSubDirectory}/${filename}`
                    await fetchListingHtmlByUrlAndExport(source, url, filePath, { timeoutMs })
                  } catch (error) {
                    const { message } = parseError(error)
                    errors.add(message ?? `error fetching listing for id, ${error}`)
                  }
                }))
              } else {
                errors.add(`no results for file, ${readFilePath}`)
              }
            }
          } catch (error) {
            rerunZipCodes.push(zipCode)
            const { message } = parseError(error)
            errors.add(message ?? `error reading json data, ${readFilePath}, ${error}`)
          }
        } else {
          if (debug) {
            log.warn(`file does not exist, ${readFilePath}, skipping`)
          }
        }
      }))
    }
  }
  s.stop('Listings HTML files have been saved to:')
  const zillowOutputPath = await getZillowOutputPath()
  const redfinOutputPath = await getRedfinOutputPath()
  log.message(path.join(zillowOutputPath, source, 'listings', path.basename(inputDirectory)))

  const outputPath = source === 'zillow' ? zillowOutputPath : redfinOutputPath
  const logsDirectory = path.join(outputPath, source, 'logs')
  if (!await checkForFile(logsDirectory)) {
    await mkdir(logsDirectory, { recursive: true })
  }

  // write errors
  if (errors.get().filter(error => !error.includes('rerun ')).length > reruns) {
    const errorsFileName = `${path.basename(inputDirectory)}-html-errors-${run}.txt`
    const errorsPath = path.join(logsDirectory, errorsFileName)

    await errors.write(errorsPath, [...new Set(errors.get())].join('\n'))
    if (debug) {
      log.error(`There were errors during processing, see ${path.resolve(errorsPath)}`)
    }
  }
}

export const scrapeListingHtmlByZipCodesAndListingDetails = async (source: ListingsSource, zipCodes: number[], inputDirectory: string, options: ScrapeListingHtmlOptions) => {
  const { timeoutMs, run = 1, reruns = 0 } = options ?? {}

  const errors = new ErrorLog()

  if (!inputDirectory) {
    throwError('inputDirectory is required')
  }

  if (source === 'zillow') {
    // throw error if zillow bot filtering is enabled
    await checkForZillowBotFiltering()
  }

  const rerunZipCodes = [] as ZipCode[]
  const doRerun = rerunZipCodes.length

  for (let i = 1; i <= reruns + 1; i++) {
    errors.add(`rerun ${i} of ${reruns}`)
    // loop through zip codes
    if (i === 1 || doRerun) {
      await Promise.all((doRerun ? rerunZipCodes : zipCodes).map(async (zipCode: number) => {
        const listingDirectory = `${inputDirectory}/${zipCode}`
        // check if zip code directory exists
        if (await checkForFile(listingDirectory)) {
          try {
          // get list of json files in current directory
            const listingFilePaths = await readFilesInDirectory(listingDirectory, { extension: '.json', prependDirectory: true })
            // fetch the listing html for each file
            await fetchListingHtmlByFilePaths(listingFilePaths, { timeoutMs })
          } catch (error) {
            rerunZipCodes.push(zipCode)
            const { message } = parseError(error)
            errors.add(message ?? `Error during fetch for ${zipCode}, ${error}`)
          }
        } else {
          errors.add(`listing directory does not exist, ${listingDirectory}`)
        }
      }))
    }
  }

  const zillowOutputPath = await getZillowOutputPath()
  const redfinOutputPath = await getRedfinOutputPath()
  const outputPath = source === 'zillow' ? zillowOutputPath : redfinOutputPath
  const logsDirectory = path.join(outputPath, source, 'logs')
  if (!await checkForFile(logsDirectory)) {
    await mkdir(logsDirectory, { recursive: true })
  }

  // write errors
  if (errors.get().filter(error => !error.includes('rerun ')).length > reruns) {
    const errorsFileName = `${path.basename(inputDirectory)}-html-errors-${run}.txt`
    const errorsPath = path.join(logsDirectory, errorsFileName)

    await errors.write(errorsPath, [...new Set(errors.get())].join('\n'))
    if (debug) {
      log.error(`There were errors during processing, see ${path.resolve(errorsPath)}`)
    }
  }
}

export const scrapeListingHtmlByInputDirectory = async (source: ListingsSource, inputDirectory: string, outputDirectory = inputDirectory) => {
  const errors = new ErrorLog()

  if (source === 'zillow') {
    // throw error if zillow bot filtering is enabled
    await checkForZillowBotFiltering()
  }

  if (!inputDirectory) {
    throwError('inputDirectory is required')
  }
  if (!await checkForFile(outputDirectory)) {
    await mkdir(outputDirectory, { recursive: true })
  }

  // check if inputDirectory exists
  if (await checkForFile(inputDirectory)) {
    try {
      // get list of json files in current directory and filter by zpids
      const listingFilePaths = await readFilesInDirectory(inputDirectory, { extension: '.json', prependDirectory: true })
      // fetch the listing html for each file
      await fetchListingHtmlByFilePaths(listingFilePaths)
    } catch (error) {
      const { message } = parseError(error)
      errors.add(message ?? `Error during fetch for ${inputDirectory}, ${error}`)
    }
  } else {
    errors.add(`inputDirectory does not exist, ${inputDirectory}`)
  }

  const zillowOutputPath = await getZillowOutputPath()
  const redfinOutputPath = await getRedfinOutputPath()
  const outputPath = source === 'zillow' ? zillowOutputPath : redfinOutputPath
  const logsDirectory = path.join(outputPath, source, 'logs')
  if (!await checkForFile(logsDirectory)) {
    await mkdir(logsDirectory, { recursive: true })
  }
  const errorsFileName = `${path.basename(inputDirectory)}-html-errors.txt`
  const errorsPath = path.join(logsDirectory, errorsFileName)

  // write errors
  if (errors.get().length > 0) {
    await errors.write(errorsPath, [...new Set(errors.get())].join('\n'))
    if (debug) {
      log.error(`There were errors during processing, see ${path.resolve(errorsPath)}`)
    }
  }
}

const generateUrlFromId = (source: ListingsSource, id: string) => source === 'redfin' ? `https://www.redfin.com/home/${id}` : source === 'zillow' ? `https://www.zillow.com/homedetails/${id}_zpid` : null

export const scrapeListingHtmlByIds = async (source: ListingsSource, ids: string[], outputDirectory: string) => {
  if (source === 'zillow') {
    await checkForZillowBotFiltering()
  }

  if (!outputDirectory) {
    throwError('outputDirectory is required')
  }
  if (!await checkForFile(outputDirectory)) {
    await mkdir(outputDirectory, { recursive: true })
  }

  await Promise.all(ids.map(async (id) => {
    const url = generateUrlFromId(source, id)
    const outputFilePath = `${outputDirectory}/${id}.html`
    if (url) {
      await fetchListingHtmlByUrlAndExport(source, url, outputFilePath)
    }
  }))
}
