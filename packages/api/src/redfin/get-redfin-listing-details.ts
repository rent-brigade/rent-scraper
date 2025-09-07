import { scrapeDataFromRedfinListingUrl } from './scrape-redfin-data.js'

export const getRedfinListingDetailsById = async (id: string): Promise<any> => {
  return await fetchRedfinListingDetailsById(id)
}

const fetchRedfinListingDetailsById = async (id: string) => {
  const url = `https://www.redfin.com/CA/Los-Angeles/home/${id}`
  const data = await scrapeDataFromRedfinListingUrl(url)
  return data
}
