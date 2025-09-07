import axios from 'axios'
import { getZillowCookie } from './config.js'
import type { RegionId, ZipCode } from '../types.js'
import { getValueFromConfigFile } from '@rent-scraper/utils/config'
import { isZillowBotFiltering } from './check-for-zillow-bot-filtering.js'
import { parseError, throwError } from '@rent-scraper/utils'

interface ZillowRegionIdOptions {
  fromFile?: boolean
}

export const getZillowRegionIdByZipCode = async (zipCode: ZipCode, options?: ZillowRegionIdOptions): Promise<RegionId | null> => {
  const { fromFile = true } = options ?? {}

  if (fromFile) {
    const zillowRegionIds = await getValueFromConfigFile('zillow', 'regionIds') as Record<string, number>
    return zillowRegionIds[String(zipCode)] ?? await fetchZillowRegionIdByZipCode(zipCode)
  } else {
    return await fetchZillowRegionIdByZipCode(zipCode)
  }
}

const fetchZillowRegionIdByZipCode = async (zipCode: ZipCode) => {
  const baseUrl = 'https://www.zillow.com/graphql'
  const body = {
    operationName: 'getAutocompleteResults',
    variables: {
      query: String(zipCode),
      queryOptions: {
        maxResults: 10,
        userIdentity: {
          abKey: '3176854b-962d-4266-8bb8-f9e8f2377158',
        },
        userSearchContext: 'FOR_RENT',
        userLocation: {
          latitude: 34.11,
          longitude: -118.23,
        },
      },
      resultType: [
        'REGIONS',
        'FORSALE',
        'RENTALS',
        'SOLD',
        'COMMUNITIES',
        'BUILDER_COMMUNITIES',
      ],
    },
    query: 'query getAutocompleteResults($query: String!, $queryOptions: SearchAssistanceQueryOptions, $resultType: [SearchAssistanceResultType]) {\n  searchAssistanceResult: zgsAutocompleteRequest(\n    query: $query\n    queryOptions: $queryOptions\n    resultType: $resultType\n  ) {\n    requestId\n    results {\n      __typename\n      id\n      ...RegionResultFields\n      ...SemanticResultFields\n      ...RentalCommunityResultFields\n      ...SchoolResultFields\n      ...BuilderCommunityResultFields\n    }\n    __typename\n  }\n}\n\nfragment RegionResultFields on SearchAssistanceRegionResult {\n  regionId\n  subType\n  __typename\n}\n\nfragment SchoolResultFields on SearchAssistanceSchoolResult {\n  id\n  schoolDistrictId\n  schoolId\n  __typename\n}\n\nfragment SemanticResultFields on SearchAssistanceSemanticResult {\n  nearMe\n  regionIds\n  regionTypes\n  regionDisplayIds\n  queryResolutionStatus\n  viewLatitudeDelta\n  filters {\n    basementStatusType\n    baths {\n      min\n      max\n      __typename\n    }\n    beds {\n      min\n      max\n      __typename\n    }\n    excludeTypes\n    hoaFeesPerMonth {\n      min\n      max\n      __typename\n    }\n    homeType\n    keywords\n    listingStatusType\n    livingAreaSqft {\n      min\n      max\n      __typename\n    }\n    lotSizeSqft {\n      min\n      max\n      __typename\n    }\n    parkingSpots {\n      min\n      max\n      __typename\n    }\n    price {\n      min\n      max\n      __typename\n    }\n    searchRentalFilters {\n      monthlyPayment {\n        min\n        max\n        __typename\n      }\n      petsAllowed\n      rentalAvailabilityDate {\n        min\n        max\n        __typename\n      }\n      __typename\n    }\n    searchSaleFilters {\n      daysOnZillow {\n        min\n        max\n        __typename\n      }\n      __typename\n    }\n    showOnlyType\n    view\n    yearBuilt {\n      min\n      max\n      __typename\n    }\n    __typename\n  }\n  __typename\n}\n\nfragment RentalCommunityResultFields on SearchAssistanceRentalCommunityResult {\n  location {\n    latitude\n    longitude\n    __typename\n  }\n  __typename\n}\n\nfragment BuilderCommunityResultFields on SearchAssistanceBuilderCommunityResult {\n  plid\n  __typename\n}',
  }

  const zillowCookie = await getZillowCookie()

  const headers = {
    'accept': '*/*',
    'accept-encoding': 'gzip, deflate, br, zstd',
    'accept-language': 'en-US,en;q=0.7',
    'client-id': 'hops-homepage',
    'content-type': 'application/json',
    'origin': 'https://www.zillow.com',
    'priority': 'u=1, i',
    'referer': 'https://www.zillow.com/',
    'sec-ch-ua': '"Brave";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"macOS"',
    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'sec-fetch-site': 'same-origin',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'cookie': zillowCookie,
  }

  try {
    const { data } = await axios.post(baseUrl, body, { headers }) || {}
    const { regionId } = data.data.searchAssistanceResult.results.filter((result: { regionId: RegionId }) => result?.regionId)?.[0] || {}

    if (!regionId) {
      console.log('no region id found for zip')
    }

    return regionId
  } catch (error: any) {
    const { status, message } = parseError(error) ?? {}
    if (isZillowBotFiltering(status, message)) {
      throwError(message, status)
    } else {
      console.log('zip code not found')
      return null
    }
  }
}
