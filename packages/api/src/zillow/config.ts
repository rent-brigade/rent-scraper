import { getOutputPathFromConfig, getValueFromConfigFile, getZipCodesFromConfig } from '@rent-scraper/utils/config'

export const getZillowCookie = async () => await getValueFromConfigFile('zillow', 'zillowCookie') as string | null
export const getZillowDaysListed = async () => await getValueFromConfigFile('zillow', 'daysListed') as string | null
export const getZillowAutoCaptcha = async () => await getValueFromConfigFile('zillow', 'autoCaptcha') as boolean | null
export const getZillowLimit = async () => await getValueFromConfigFile('zillow', 'limit') as number | null
export const getZillowOffset = async () => await getValueFromConfigFile('zillow', 'offset') as number | null
export const getZillowOutputPath = async () => await getOutputPathFromConfig('zillow')
export const getZillowZipCodes = async () => await getZipCodesFromConfig('zillow')

export type Zpid = string
