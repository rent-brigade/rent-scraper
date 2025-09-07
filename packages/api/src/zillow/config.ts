import { getOutputPathFromConfig, getValueFromConfigFile, getZipCodesFromConfig } from '@rent-scraper/utils/config'

export const getZillowCookie = async () => await getValueFromConfigFile('zillow', 'zillowCookie') as string | null
export const getZillowOutputPath = async () => await getOutputPathFromConfig('zillow')
export const getZillowZipCodes = async () => await getZipCodesFromConfig('zillow')

export type Zpid = string
