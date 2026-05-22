import { getOutputPathFromConfig, getValueFromConfigFile, getZipCodesFromConfig } from '@rent-scraper/utils/config'

export const getRedfinOutputPath = async () => await getOutputPathFromConfig('redfin')
export const getRedfinZipCodes = async () => await getZipCodesFromConfig('redfin')
export const getRedfinDaysListed = async () => await getValueFromConfigFile('redfin', 'daysListed') as string | null
export const getRedfinCookie = async () => await getValueFromConfigFile('redfin', 'redfinCookie') as string | null
