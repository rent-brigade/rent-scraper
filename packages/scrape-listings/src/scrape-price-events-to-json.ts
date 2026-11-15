import { createHash } from 'crypto'
import { mkdir, readFile, writeFile, readdir } from 'fs/promises'
import path from 'path'
import { checkForFile, readFilesInDirectory } from '@rent-scraper/utils'

export interface PriceEvent {
  event_id: string
  listing_id: string
  event_type: string | null
  event_timestamp: string | null
  price: number | null
  source: string | null
  event_index: number
  is_latest_price_event: boolean
  is_last_event: boolean
  is_base_price_event: boolean
  is_peak_price_event: boolean
  scrape_job_name: string
}

export const scrapeZillowPriceEventsToJson = async (listingsDirectory: string, outputFilePath: string): Promise<number> => {
  const baseName = path.basename(listingsDirectory)
  const scrapeJobName = baseName === 'listings' ? path.basename(path.dirname(listingsDirectory)) : baseName
  const events: PriceEvent[] = []

  let entries
  try {
    entries = await readdir(listingsDirectory, { withFileTypes: true })
  } catch {
    return 0
  }

  const zipDirs = entries.filter(e => e.isDirectory()).map(e => e.name)

  for (const zipDir of zipDirs) {
    const zipDirPath = path.join(listingsDirectory, zipDir)
    if (!await checkForFile(zipDirPath)) continue

    const jsonFiles = await readFilesInDirectory(zipDirPath, { extension: '.json', prependDirectory: true })

    for (const filePath of jsonFiles) {
      try {
        const data = JSON.parse(await readFile(filePath, 'utf8'))
        if (!data.zpid || !Array.isArray(data.priceHistory) || !data.priceHistory.length) continue

        const zpid = String(data.zpid)
        const listingId = createHash('md5').update(zpid).digest('hex')
        const history: any[] = data.priceHistory

        const prices = history.filter(h => h.price != null).map(h => h.price as number)
        const maxPrice = prices.length ? Math.max(...prices) : null

        // find the index of the oldest "Listed for rent" event (last in array = chronologically first)
        let baseEventIndex = -1
        for (let i = history.length - 1; i >= 0; i--) {
          if (history[i].event === 'Listed for rent') {
            baseEventIndex = i
            break
          }
        }

        history.forEach((item, i) => {
          const eventId = createHash('md5').update(`${listingId}|${item.time}`).digest('hex')
          events.push({
            event_id: eventId,
            listing_id: listingId,
            event_type: item.event || null,
            event_timestamp: item.date || null,
            price: item.price ?? null,
            source: item.source || null,
            event_index: i,
            is_latest_price_event: i === 0,
            is_last_event: i === history.length - 1,
            is_base_price_event: i === baseEventIndex,
            is_peak_price_event: item.price != null && item.price === maxPrice,
            scrape_job_name: scrapeJobName,
          })
        })
      } catch {
        // skip malformed files
      }
    }
  }

  await mkdir(path.dirname(outputFilePath), { recursive: true })
  await writeFile(outputFilePath, JSON.stringify(events))
  return events.length
}
