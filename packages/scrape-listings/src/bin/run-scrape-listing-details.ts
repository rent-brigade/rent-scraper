import minimist from 'minimist'
import path from 'path'
import { readdir, readFile, unlink, writeFile } from 'fs/promises'
import { log, intro } from '@clack/prompts'
import color from 'picocolors'
import { parseError } from '@rent-scraper/utils'
import { getZillowOutputPath } from '@rent-scraper/api/config'
import { scrapeDataFromZillowListingHtml } from '@rent-scraper/api'
import { scrapeZillowListingsToCsv } from '../scrape-listings-to-csv.js'

intro(color.inverse(' scrape listing details '))

const args = minimist(process.argv.slice(2))

const getMostRecentDirectory = async (parentDir: string): Promise<string | null> => {
  try {
    const entries = await readdir(parentDir, { withFileTypes: true })
    const dirs = entries.filter(e => e.isDirectory()).map(e => e.name).sort()
    return dirs.length > 0 ? dirs[dirs.length - 1] : null
  } catch {
    return null
  }
}

try {
  const zillowOutputPath = await getZillowOutputPath()
  const listingsBase = path.join(zillowOutputPath, 'zillow', 'listings')

  const timestamp = args['listings-directory']
    ? path.basename(args['listings-directory'] as string)
    : await getMostRecentDirectory(listingsBase)

  if (!timestamp) {
    log.error('No listings directory found. Pass --listings-directory <path>.')
    process.exit(1)
  }

  const listingsDirectory = (args['listings-directory'] as string) ?? path.join(listingsBase, timestamp)
  log.info(`Using listings directory: ${listingsDirectory}`)

  // scan subdirectories directly — no zip code config needed
  const zipDirs = (await readdir(listingsDirectory, { withFileTypes: true }))
    .filter(e => e.isDirectory())
    .map(e => e.name)

  // delete existing json files so they get re-parsed from html
  let deleted = 0
  for (const zipDir of zipDirs) {
    const zipPath = path.join(listingsDirectory, zipDir)
    const files = await readdir(zipPath)
    for (const file of files) {
      if (file.endsWith('.json')) {
        await unlink(path.join(zipPath, file))
        deleted++
      }
    }
  }
  if (deleted > 0) log.info(`Cleared ${deleted} existing JSON files`)

  // parse html → json without any network requests or browser
  let parsed = 0
  let skipped = 0
  for (const zipDir of zipDirs) {
    const zipPath = path.join(listingsDirectory, zipDir)
    const files = (await readdir(zipPath)).filter(f => f.endsWith('.html'))
    for (const file of files) {
      const htmlPath = path.join(zipPath, file)
      const jsonPath = htmlPath.replace('.html', '.json')
      try {
        const html = (await readFile(htmlPath)).toString()
        if (!html || html.trim() === '' || html.includes('px-captcha')) {
          skipped++
          continue
        }
        const data = await scrapeDataFromZillowListingHtml(html)
        if (data) {
          await writeFile(jsonPath, JSON.stringify(data))
          parsed++
        } else {
          skipped++
        }
      } catch {
        skipped++
      }
    }
  }

  log.info(`Parsed ${parsed} listings${skipped > 0 ? ` (${skipped} skipped)` : ''}`)

  const csvOutputPath = path.join(zillowOutputPath, 'zillow', 'csv', `${timestamp}.csv`)
  const numCsvListings = await scrapeZillowListingsToCsv(listingsDirectory, csvOutputPath)

  if (numCsvListings > 0) {
    log.success(`${numCsvListings} listings → ${csvOutputPath}`)
  } else {
    log.warning('No listings exported to CSV')
  }

  process.exit(0)
} catch (error: any) {
  const { message } = parseError(error)
  log.error(message)
  process.exit(1)
}
