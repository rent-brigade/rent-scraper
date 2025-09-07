import { getOutputPathFromConfig, getZipCodesFromConfig } from '@rent-scraper/utils/config'

export const getRedfinOutputPath = async () => await getOutputPathFromConfig('redfin')
export const getRedfinZipCodes = async () => await getZipCodesFromConfig('redfin')
