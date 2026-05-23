import { createHash } from 'crypto'
import { mkdir, readFile, writeFile, readdir } from 'fs/promises'
import path from 'path'
import dayjs from 'dayjs'
import { checkForFile, readFilesInDirectory } from '@rent-scraper/utils'

const CSV_HEADERS = [
  'listing_id', 'listing_source', 'source_listing_id', 'parcel_number',
  'listing_url', 'street_address', 'cleaned_address', 'cleaned_unit_number',
  'city', 'state', 'zipcode', 'county', 'neighborhood_region',
  'is_undisclosed_address', 'home_status', 'home_type', 'bedrooms',
  'year_built', 'living_area', 'living_area_units', 'is_income_restricted',
  'price_at_source', 'platform_rent_estimate',
  'agent_name', 'agent_phone_number', 'broker_name', 'broker_phone_number',
  'is_owned_by_listing_platform',
  'date_last_updated_at_source', 'date_scraped', 'date_processed', 'scrape_job_name',
]

const csvEscape = (val: unknown): string => {
  if (val == null) return ''
  const str = typeof val === 'object' ? JSON.stringify(val) : String(val as string | number | boolean)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

const parseAddressParts = (streetAddress: string) => {
  const unitMatch = /^(.*?)\s+((?:#|APT|UNIT|STE|Suite|Apt|Unit)\s*.+)$/i.exec(streetAddress)
  if (unitMatch) {
    const cleaned = unitMatch[1].trim().toUpperCase()
    let unit = unitMatch[2].trim()
    if (unit.startsWith('#')) {
      unit = `# ${unit.replace(/^#\s*/, '').trim()}`
    }
    return { cleaned, unit }
  }
  return { cleaned: streetAddress.toUpperCase(), unit: '' }
}

const mapListingToRow = (data: any, scrapeJobName: string): Record<string, unknown> => {
  const zpid = String(data.zpid)
  const listingId = createHash('md5').update(zpid).digest('hex')
  const streetAddress = data.streetAddress || data.address?.streetAddress || ''
  const { cleaned, unit } = parseAddressParts(streetAddress)
  const hdpUrl = data.hdpUrl
    ? `https://www.zillow.com${data.hdpUrl}`
    : `https://www.zillow.com/homedetails/${zpid}_zpid/`

  return {
    listing_id: listingId,
    listing_source: 'zillow',
    source_listing_id: zpid,
    parcel_number: data.resoFacts?.parcelNumber ?? '',
    listing_url: hdpUrl,
    street_address: streetAddress,
    cleaned_address: cleaned,
    cleaned_unit_number: unit,
    city: data.city || data.address?.city || '',
    state: data.state || data.address?.state || '',
    zipcode: data.zipcode || data.address?.zipcode || '',
    county: data.county || '',
    neighborhood_region: data.neighborhoodRegion?.name || data.parentRegion?.name || '',
    is_undisclosed_address: data.isUndisclosedAddress ?? '',
    home_status: data.homeStatus || '',
    home_type: data.homeType || '',
    bedrooms: data.bedrooms ?? '',
    year_built: data.yearBuilt || data.resoFacts?.yearBuilt || '',
    living_area: data.livingAreaValue ?? '',
    living_area_units: data.livingAreaUnits || 'Square Feet',
    is_income_restricted: data.isIncomeRestricted ?? '',
    price_at_source: data.price ?? '',
    platform_rent_estimate: data.rentZestimate ?? '',
    agent_name: data.attributionInfo?.agentName || '',
    agent_phone_number: data.attributionInfo?.agentPhoneNumber || '',
    broker_name: data.attributionInfo?.brokerName || '',
    broker_phone_number: data.attributionInfo?.brokerPhoneNumber || '',
    is_owned_by_listing_platform: data.attributionInfo?.mlsName === 'Zillow Rentals',
    date_last_updated_at_source: data.attributionInfo?.lastUpdated || '',
    date_scraped: data.timestamp ? dayjs(data.timestamp).format('YYYY-MM-DD HH:mm:ss') : '',
    date_processed: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    scrape_job_name: scrapeJobName,
  }
}

export const scrapeZillowListingsToCsv = async (listingsDirectory: string, outputFilePath: string): Promise<number> => {
  const scrapeJobName = path.basename(listingsDirectory)
  const rows: string[] = [CSV_HEADERS.join(',')]

  const entries = await readdir(listingsDirectory, { withFileTypes: true })
  const zipDirs = entries.filter(e => e.isDirectory()).map(e => e.name)

  for (const zipDir of zipDirs) {
    const zipDirPath = path.join(listingsDirectory, zipDir)
    if (!await checkForFile(zipDirPath)) continue

    const jsonFiles = await readFilesInDirectory(zipDirPath, { extension: '.json', prependDirectory: true })

    for (const filePath of jsonFiles) {
      try {
        const data = JSON.parse(await readFile(filePath, 'utf8'))
        if (!data.zpid) continue
        const row = mapListingToRow(data, scrapeJobName)
        rows.push(CSV_HEADERS.map(h => csvEscape(row[h])).join(','))
      } catch {
        // skip malformed files
      }
    }
  }

  await mkdir(path.dirname(outputFilePath), { recursive: true })
  await writeFile(outputFilePath, rows.join('\n'))
  return rows.length - 1
}
