import { scrapeDataFromRedfinListingUrl } from './scrape-redfin-data.js'

export const getRedfinListingDetailsById = async (id: string, url?: string): Promise<any> => {
  return await scrapeDataFromRedfinListingUrl(url ?? `https://www.redfin.com/us/home/${id}`)
}
