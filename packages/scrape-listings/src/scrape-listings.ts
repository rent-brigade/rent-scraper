import minimist from 'minimist'
import dayjs from 'dayjs'
import path from 'path'
import axios from 'axios'
import { mkdir, writeFile } from 'fs/promises'
import { type ZipCode, checkForZillowBotFiltering, waitForSolvedZillowCaptcha } from '@rent-scraper/api'
import { checkForFile, compareArrays, parseError, throwError } from '@rent-scraper/utils'
import type { ScrapeListingsByZipCodesOptions, ScrapeZillowListingsByZipCodesOptions } from './types.js'
import { scrapeListingDetailsFromHtmlByZipCodes } from './scrape-listing-details-from-html.js'
import { scrapeListingHtmlByZipCodes } from './scrape-listing-html.js'
import { scrapeZillowListingResultsByZipCodes } from './scrape-zillow-listing-results.js'
import { scrapeRedfinListingResultsByZipCodes } from './scrape-redfin-listing-results.js'
import { getRedfinOutputPath, getRedfinZipCodes, getZillowOutputPath, getZillowZipCodes, getZillowDaysListed, getRedfinDaysListed } from '@rent-scraper/api/config'
import { cancel, confirm, intro, isCancel, log, outro } from '@clack/prompts'
import { setTimeout as sleep } from 'node:timers/promises'
import { checkBrowserServer } from '@rent-scraper/utils/config'
import color from 'picocolors'

const closeBrowser = async () => {
  await axios.post('http://localhost:8082/browser/close')
}
const shutdownBrowserServer = async () => {
  await axios.post('http://localhost:8082/server/shutdown')
}

const scrapeZillowListingsByZipCodes = async (zipCodes: ZipCode[], resultsDirectory: string, listingsDirectory: string, { daysListed, timeoutMs, run, reruns }: ScrapeZillowListingsByZipCodesOptions) => {
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

  const { validZipCodes } = await scrapeZillowListingResultsByZipCodes(zipCodes, resultsDirectory, { daysListed, timeoutMs, run, reruns })
  await scrapeListingHtmlByZipCodes('zillow', validZipCodes, resultsDirectory, listingsDirectory, { timeoutMs, run, reruns })
  const { numListings } = await scrapeListingDetailsFromHtmlByZipCodes('zillow', validZipCodes, listingsDirectory)
  return { numListings, validZipCodes }
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

  const resultsDirectory = args['results-directory'] ?? path.join(outputPath, source, 'results', `${dayjs().format('YYYY-MM-DD-HHmm')}`)
  const listingsDirectory = args['listings-directory'] ?? path.join(outputPath, source, 'listings', `${dayjs().format('YYYY-MM-DD-HHmm')}`)

  const logsDirectory = args['logs-directory'] ?? path.join(outputPath, source, 'logs')

  if (source === 'redfin') {
    const redfinZipCodes = await getRedfinZipCodes()
    for (let run = 1; run <= runs; run++) {
      if (!redfinZipCodes) {
        return throwError('zip codes required, please run the createConfig script')
      }
      const zipCodes = redfinZipCodes

      const { numListings, validZipCodes } = await scrapeRedfinListingsByZipCodes(zipCodes, resultsDirectory, listingsDirectory, { daysListed, timeoutMs, run, reruns })
      if (run === runs) {
        // parse results data for text file output
        const scrapingResultsData = Object.entries({ numListings }).map(([key, val]) => `${key}: ${val}`).join('\n')
        const invalidZipCodes = compareArrays(zipCodes, validZipCodes)
        const invalidZipCodesData = invalidZipCodes.join('\n')

        if (!await checkForFile(logsDirectory)) {
          await mkdir(logsDirectory, { recursive: true })
        }

        // write results and logs
        const logScrapingResultsFileName = `${path.basename(resultsDirectory)}-scraping-results.txt`
        const logScrapingResultsPath = path.join(logsDirectory, logScrapingResultsFileName)
        const logInvalidZipCodesFileName = `${path.basename(resultsDirectory)}-invalid-zipcodes.txt`
        const logInvalidZipCodesPath = path.join(logsDirectory, logInvalidZipCodesFileName)

        await writeFile (logScrapingResultsPath, scrapingResultsData)
        await writeFile (logInvalidZipCodesPath, invalidZipCodesData)
      }
    }
  } else if (source === 'zillow') {
    const zillowZipCodes = await getZillowZipCodes()
    for (let run = 1; run <= runs; run++) {
      if (!zillowZipCodes) {
        return throwError('zip codes required, please run the createConfig script')
      }
      const zipCodes = zillowZipCodes

      const { numListings, validZipCodes } = await scrapeZillowListingsByZipCodes(zipCodes, resultsDirectory, listingsDirectory, { daysListed, timeoutMs, run, reruns })
      if (run === runs) {
        // parse results data for text file output
        const scrapingResultsData = Object.entries({ numListings }).map(([key, val]) => `${key}: ${val}`).join('\n')
        const invalidZipCodes = compareArrays(zipCodes, validZipCodes)
        const invalidZipCodesData = invalidZipCodes.join('\n')

        if (!await checkForFile(logsDirectory)) {
          await mkdir(logsDirectory, { recursive: true })
        }

        // write results and logs
        const logScrapingResultsFileName = `${path.basename(resultsDirectory)}-scraping-results.txt`
        const logScrapingResultsPath = path.join(logsDirectory, logScrapingResultsFileName)
        const logInvalidZipCodesFileName = `${path.basename(resultsDirectory)}-invalid-zipcodes.txt`
        const logInvalidZipCodesPath = path.join(logsDirectory, logInvalidZipCodesFileName)

        await writeFile (logScrapingResultsPath, scrapingResultsData)
        await writeFile (logInvalidZipCodesPath, invalidZipCodesData)
      }
    }
  }
  log.success('Scraping complete!')

  if (source === 'zillow') {
    await shutdownBrowserServer()
  }
}
