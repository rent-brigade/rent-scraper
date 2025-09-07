import type { RegionId, ZipCode } from '../types.js'
import { getValueFromConfigFile } from '@rent-scraper/utils/config'

interface RegionIdOptions {
  fromFile?: boolean
}

export const getRedfinRegionIdByZipCode = async (zipCode: ZipCode, options?: RegionIdOptions): Promise<RegionId | null> => {
  const { fromFile = true } = options ?? {}

  if (fromFile) {
    const redfinRegionIds = await getValueFromConfigFile('redfin', 'regionIds') as Record<string, number>
    return redfinRegionIds[String(zipCode)] ?? await fetchRedfinRegionIdByZipCode(zipCode)
  } else {
    return await fetchRedfinRegionIdByZipCode(zipCode)
  }
}

export const parseRedfinResponse = (response: string) => {
  return JSON.parse(response.replace('{}&&', ''))
}

export const fetchRedfinRegionIdByZipCode = async (zipCode: ZipCode): Promise<RegionId | null> => {
  const baseUrl = `https://www.redfin.com/stingray/do/rental-location-autocomplete`

  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  }

  const params = `?location=${zipCode}&v=2`

  try {
    const apiUrl = `${baseUrl}${params}`
    const response = await (await fetch(apiUrl, { method: 'GET', headers })).text()
    const data = parseRedfinResponse(response)
    const { exactMatch } = data.payload || {}
    const regionId = Number(exactMatch.id.replace(exactMatch.type, '').replace('_', ''))

    if (!regionId) {
      console.log('no region id found for zip')
    }

    return regionId
  } catch {
    console.log('zip code not found')
    return null
  }
}
