import minimist from 'minimist'
import dayjs from 'dayjs'
import path from 'path'
import axios from 'axios'
import { mkdir, readdir, writeFile } from 'fs/promises'
import { type ZipCode, waitForSolvedZillowCaptcha, isBrowserShowingCaptcha } from '@rent-scraper/api'
import { compareArrays, throwError } from '@rent-scraper/utils'
import type { ScrapeListingsByZipCodesOptions, ScrapeZillowListingsByZipCodesOptions } from './types.js'
import { scrapeListingDetailsFromHtmlByZipCodes } from './scrape-listing-details-from-html.js'
import { scrapeListingHtmlByZipCodes } from './scrape-listing-html.js'
import { scrapeZillowListingResultsByZipCodes } from './scrape-zillow-listing-results.js'
import { scrapeRedfinListingResultsByZipCodes } from './scrape-redfin-listing-results.js'
import { scrapeZillowListingsToCsv } from './scrape-listings-to-csv.js'
import { getRedfinOutputPath, getRedfinZipCodes, getZillowOutputPath, getZillowZipCodes, getZillowDaysListed, getRedfinDaysListed } from '@rent-scraper/api/config'
import { confirm, intro, isCancel, log } from '@clack/prompts'
import { setTimeout as sleep } from 'node:timers/promises'
import { checkBrowserServer } from '@rent-scraper/utils/config'
import color from 'picocolors'

const getMostRecentDirectory = async (parentDir: string): Promise<string | null> => {
  try {
    const entries = await readdir(parentDir, { withFileTypes: true })
    const dirs = entries.filter(e => e.isDirectory()).map(e => e.name).sort()
    return dirs.length > 0 ? dirs[dirs.length - 1] : null
  } catch {
    return null
  }
}

const closeBrowser = async () => {
  await axios.post('http://localhost:8082/browser/close')
}
const shutdownBrowserServer = async () => {
  await axios.post('http://localhost:8082/server/shutdown')
}

const scrapeZillowListingsByZipCodes = async (zipCodes: ZipCode[], resultsDirectory: string, listingsDirectory: string, { daysListed, timeoutMs, run, reruns, preValidatedZipCodes = [] }: ScrapeZillowListingsByZipCodesOptions) => {
  let validZipCodes: ZipCode[] = []
  let botFilteredZipCodes: ZipCode[] = []
  let noResultsZipCodes: ZipCode[] = []

  if (zipCodes.length > 0) {
    // always refresh cookie before fetching — Puppeteer sessions start with a stale cookie
    await waitForSolvedZillowCaptcha()
    await closeBrowser()

    ;({ validZipCodes, botFilteredZipCodes, noResultsZipCodes } = await scrapeZillowListingResultsByZipCodes(zipCodes, resultsDirectory, { daysListed, timeoutMs, run, reruns, skipBotCheck: true }))

    // retry hard bot-filtered zip codes (403 + captcha response)
    if (botFilteredZipCodes.length > 0) {
      log.warn(`Bot filtering hit ${botFilteredZipCodes.length} of ${zipCodes.length} zip code(s) — will retry after listings are fetched`)
      if (await isBrowserShowingCaptcha()) {
        await waitForSolvedZillowCaptcha()
        await closeBrowser()
      } else {
        await sleep(3000)
      }
      const inlineRetryCount = botFilteredZipCodes.length
      const retryResult = await scrapeZillowListingResultsByZipCodes(botFilteredZipCodes, resultsDirectory, { daysListed, timeoutMs, run, reruns, skipBotCheck: true, silent: true })
      validZipCodes = [...validZipCodes, ...retryResult.validZipCodes]
      botFilteredZipCodes = retryResult.botFilteredZipCodes
      noResultsZipCodes = [...noResultsZipCodes, ...retryResult.noResultsZipCodes]
      const inlineRecovered = retryResult.validZipCodes.length
      log.info(`Inline retry: recovered ${inlineRecovered} of ${inlineRetryCount} · ${botFilteredZipCodes.length} still bot-filtered`)
    }

    // soft bot filtering — all zip codes came back empty (200 + empty data)
    if (validZipCodes.length === 0 && zipCodes.length > 0) {
      log.warn(`No results returned for any zip codes — possible soft bot filtering. Please try again shortly.`)
    }

    // end-of-run retry: recover any still-bot-filtered zip codes before scraping HTML
    if (botFilteredZipCodes.length > 0) {
      const retryCount = botFilteredZipCodes.length
      log.warn(`${retryCount} zip code(s) still bot-filtered`)
      const shouldRetry = await confirm({
        message: 'Retry bot-filtered zip codes? The browser will open — solve the captcha, then wait for scraping to resume.',
        active: 'OK',
        inactive: 'Skip',
      })
      if (!isCancel(shouldRetry) && shouldRetry) {
        log.info('Opening browser — solve the captcha to continue...')
        await waitForSolvedZillowCaptcha()
        await closeBrowser()
        const endRetryResult = await scrapeZillowListingResultsByZipCodes(botFilteredZipCodes, resultsDirectory, { daysListed, timeoutMs, run, reruns, skipBotCheck: true, silent: true })
        validZipCodes = [...validZipCodes, ...endRetryResult.validZipCodes]
        botFilteredZipCodes = endRetryResult.botFilteredZipCodes
        noResultsZipCodes = [...noResultsZipCodes, ...endRetryResult.noResultsZipCodes]
        const recovered = endRetryResult.validZipCodes.length
        log.info(recovered > 0 ? `Recovered ${recovered} of ${retryCount} zip code(s)` : `Recovered 0 of ${retryCount} zip code(s)`)
      }
    }
  }

  // --- Phase 2: scrape HTML and parse for all valid zip codes (pre-validated + newly fetched) ---
  const allValidZipCodes = [...preValidatedZipCodes, ...validZipCodes]
  await scrapeListingHtmlByZipCodes('zillow', allValidZipCodes, resultsDirectory, listingsDirectory, { timeoutMs, run, reruns, skipBotCheck: true })
  const { numListings } = await scrapeListingDetailsFromHtmlByZipCodes('zillow', allValidZipCodes, listingsDirectory)

  return { numListings, validZipCodes: allValidZipCodes, noResultsZipCodes }
}

const scrapeRedfinListingsByZipCodes = async (zipCodes: ZipCode[], resultsDirectory: string, listingsDirectory: string, { daysListed, timeoutMs, run, reruns }: ScrapeListingsByZipCodesOptions) => {
  const { validZipCodes } = await scrapeRedfinListingResultsByZipCodes(zipCodes, resultsDirectory, { daysListed, timeoutMs, run, reruns })
  await scrapeListingHtmlByZipCodes('redfin', validZipCodes, resultsDirectory, listingsDirectory, { timeoutMs, run, reruns })
  const { numListings } = await scrapeListingDetailsFromHtmlByZipCodes('redfin', validZipCodes, listingsDirectory)
  return { numListings, validZipCodes }
}

export async function runScrapeListings() {
  intro(color.inverse(' scrape listings '))
  const args = minimist(process.argv.slice(2))
  const source = args.source ?? 'zillow'

  if (source === 'zillow') {
    const running = await checkBrowserServer()
    if (!running) {
      throwError('Please launch the browser server before scraping.')
    }
  }

  const zillowOutputPath = await getZillowOutputPath()
  const redfinOutputPath = await getRedfinOutputPath()
  const outputPath = source === 'zillow' ? zillowOutputPath : redfinOutputPath
  const daysListed = args['days-listed'] ?? (source === 'zillow' ? await getZillowDaysListed() : await getRedfinDaysListed()) ?? 1

  const runs = args.runs ?? 1 // allow multiple runs to catch any listings that might have been missed
  const reruns = args.reruns ?? 0 // allow re-runs on error
  const timeoutMs = args['timeout-ms'] ?? 60000 // set timeout for fetches

  // --rerun flag: resume from a specific or most recent previous run
  const rerun = args.rerun
  const rerunTimestamp = typeof rerun === 'string'
    ? rerun
    : rerun
      ? await getMostRecentDirectory(path.join(outputPath, source, 'results'))
      : null

  if (rerun && !rerunTimestamp) throwError('No previous run found to rerun.')
  if (rerunTimestamp) log.info(`Rerunning from: ${rerunTimestamp}`)

  const timestamp = rerunTimestamp ?? dayjs().format('YYYY-MM-DD-HHmm')
  const resultsDirectory = args['results-directory'] ?? path.join(outputPath, source, 'results', timestamp)
  const listingsDirectory = args['listings-directory'] ?? path.join(outputPath, source, 'listings', timestamp)

  const logsDirectory = args['logs-directory'] ?? path.join(outputPath, source, 'logs')

  let totalCsvListings = 0

  const shutdownIfRunning = async () => {
    if (source === 'zillow' || source === 'redfin') {
      if (await checkBrowserServer()) await shutdownBrowserServer()
    }
  }

  try {
    if (source === 'redfin') {
      const redfinZipCodes = await getRedfinZipCodes()
      for (let run = 1; run <= runs; run++) {
        if (!redfinZipCodes) {
          throwError('zip codes required, please run the createConfig script')
        }
        const zipCodes = redfinZipCodes

        const { numListings, validZipCodes } = await scrapeRedfinListingsByZipCodes(zipCodes, resultsDirectory, listingsDirectory, { daysListed, timeoutMs, run, reruns })
        if (run === runs) {
          // parse results data for text file output
          const scrapingResultsData = Object.entries({ numListings }).map(([key, val]) => `${key}: ${val}`).join('\n')
          const invalidZipCodes = compareArrays(zipCodes, validZipCodes)
          const invalidZipCodesData = invalidZipCodes.join('\n')

          // creates logsDirectory if it doesn't exit
          await mkdir(logsDirectory, { recursive: true })

          // write results and logs
          const logScrapingResultsFileName = `${path.basename(resultsDirectory)}-scraping-results.txt`
          const logScrapingResultsPath = path.join(logsDirectory, logScrapingResultsFileName)
          const logInvalidZipCodesFileName = `${path.basename(resultsDirectory)}-invalid-zipcodes.txt`
          const logInvalidZipCodesPath = path.join(logsDirectory, logInvalidZipCodesFileName)

          await writeFile(logScrapingResultsPath, scrapingResultsData)
          await writeFile(logInvalidZipCodesPath, invalidZipCodesData)
        }
      }
    } else if (source === 'zillow') {
      const zillowZipCodes = await getZillowZipCodes()
      if (!zillowZipCodes) throwError('zip codes required, please run the createConfig script')
      const zipCodes = zillowZipCodes

      // For reruns: scan results directory and only re-fetch zip codes with missing result files
      let zipCodesToFetch = zipCodes
      let preValidatedZipCodes: ZipCode[] = []
      if (rerunTimestamp) {
        const existingFiles = await readdir(resultsDirectory).catch(() => [] as string[])
        const existing = new Set(existingFiles.filter(f => f.endsWith('.json')).map(f => f.replace('.json', '')))
        preValidatedZipCodes = zipCodes.filter(zc => existing.has(String(zc)))
        zipCodesToFetch = zipCodes.filter(zc => !existing.has(String(zc)))
        if (zipCodesToFetch.length > 0) {
          log.info(`${preValidatedZipCodes.length} already fetched · retrying ${zipCodesToFetch.length} missing`)
        } else {
          log.info(`All ${preValidatedZipCodes.length} zip codes already fetched · proceeding to HTML scraping`)
        }
      }

      for (let run = 1; run <= runs; run++) {
        const { numListings, validZipCodes, noResultsZipCodes } = await scrapeZillowListingsByZipCodes(zipCodesToFetch, resultsDirectory, listingsDirectory, { daysListed, timeoutMs, run, reruns, preValidatedZipCodes })
        if (run === runs) {
          const timestamp = path.basename(listingsDirectory)
          const csvOutputPath = path.join(zillowOutputPath, 'zillow', 'csv', `${timestamp}.csv`)
          const numCsvListings = await scrapeZillowListingsToCsv(listingsDirectory, csvOutputPath)
          totalCsvListings = numCsvListings
          if (numCsvListings > 0) {
            log.info(`CSV exported: ${numCsvListings} listings → ${csvOutputPath}`)
          }

          // parse results data for text file output
          const scrapingResultsData = Object.entries({ numListings, numCsvListings }).map(([key, val]) => `${key}: ${val}`).join('\n')
          const invalidZipCodes = compareArrays(zipCodes, validZipCodes)
          const noResultsSet = new Set(noResultsZipCodes)
          const erroredZipCodes = invalidZipCodes.filter(zc => !noResultsSet.has(zc))
          const noResultsInvalid = invalidZipCodes.filter(zc => noResultsSet.has(zc))

          // creates logsDirectory if it doesn't exit
          await mkdir(logsDirectory, { recursive: true })

          // write results and logs
          const logScrapingResultsFileName = `${path.basename(resultsDirectory)}-scraping-results.txt`
          const logScrapingResultsPath = path.join(logsDirectory, logScrapingResultsFileName)
          const logNoResultsZipCodesFileName = `${path.basename(resultsDirectory)}-zipcodes-no-results.txt`
          const logNoResultsZipCodesPath = path.join(logsDirectory, logNoResultsZipCodesFileName)
          const logErroredZipCodesFileName = `${path.basename(resultsDirectory)}-zipcodes-errored.txt`
          const logErroredZipCodesPath = path.join(logsDirectory, logErroredZipCodesFileName)

          await writeFile(logScrapingResultsPath, scrapingResultsData)
          if (noResultsInvalid.length > 0) await writeFile(logNoResultsZipCodesPath, noResultsInvalid.join('\n'))
          if (erroredZipCodes.length > 0) await writeFile(logErroredZipCodesPath, erroredZipCodes.join('\n'))

          // terminal summary
          const zipSummaryParts = [`${validZipCodes.length}/${zipCodes.length} with results`]
          if (noResultsInvalid.length > 0) zipSummaryParts.push(`${noResultsInvalid.length} no results`)
          if (erroredZipCodes.length > 0) zipSummaryParts.push(`${erroredZipCodes.length} errored`)
          log.info(`Zip codes: ${zipSummaryParts.join(' · ')}`)
          log.info(`Listings:  ${numListings} parsed · ${numCsvListings} exported to CSV`)
        }
      }
    }
    if (source === 'zillow' ? totalCsvListings > 0 : true) {
      log.success('Scraping complete!')
    } else {
      log.warn('Scraping finished but no listings were exported — please try again shortly.')
    }
  } finally {
    await shutdownIfRunning()
  }
}
