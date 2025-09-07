import type { ListingsSource } from '@rent-scraper/api'
import { checkForFile, parseYamlFile, throwError, writeYamlFile } from '@rent-scraper/utils'
import { findWorkspaceDir } from '@pnpm/find-workspace-dir'
import type { BrowserKey } from '@rent-scraper/api'
import axios from 'axios'
import { spinner, log } from '@clack/prompts'

export interface ScrapeConfig {
  outputPath: string
  source?: ListingsSource
  zipCodes: string
  regionIds?: Record<number, number | null>
  browser?: BrowserKey
  zillowCookie?: string
}

export const getConfigFilePath = async (source: ListingsSource) => {
  const workspaceDir = await findWorkspaceDir(process.cwd())
  return source === 'redfin' ? `${workspaceDir}/config.redfin.yaml` : `${workspaceDir}/config.zillow.yaml`
}

export const checkForConfigFile = async (source: ListingsSource) => {
  const configFile = await getConfigFilePath(source)
  return await checkForFile(configFile)
}

export const checkForAndReadConfigFile = async (source: ListingsSource) => {
  const configFile = await getConfigFilePath(source)
  if (!await checkForFile(configFile)) {
    throwError('Config file is required.')
  }
  return await parseYamlFile(configFile) as ScrapeConfig
}

export const resetZillowCookie = async () => {
  const { zillowCookie, ...config } = await readConfigFile('zillow')
  await writeConfigFile('zillow', config)
}

export const waitForConfigFile = async (source: ListingsSource) => {
  try {
    return await new Promise((resolve) => {
      // const s = spinner()
      // s.start('Waiting for Config File')
      const interval2 = setInterval(async () => {
        const running = await checkForConfigFile(source)
        if (running) {
          // s.stop('Config file is ready!')
          resolve(running)
          clearInterval(interval2)
        }
      }, 1000)
    })
  } catch (error: any) {
    throwError(error?.message)
  }
}

export const waitForBrowserServer = async () => {
  try {
    return await new Promise((resolve, reject) => {
      const s = spinner()
      s.start('Waiting for browser server')
      let i = 0
      const interval2 = setInterval(async () => {
        i++
        if (i > 10) {
          reject(new Error('browser server is not running.'))
        }
        const running = await checkBrowserServer()
        if (running) {
          s.stop('Browser server is connected!')
          resolve(running)
          clearInterval(interval2)
        }
      }, 1000)
    })
  } catch (error: any) {
    throwError(error?.message)
  }
}

export const checkBrowserServer = async () => {
  try {
    const { data } = await axios.get('http://localhost:8082/server')
    return data.running
  } catch {
    return false
  }
}

export const waitForZillowCookie = async () => {
  return await new Promise((resolve) => {
    const interval = setInterval(async () => {
      const zillowCookie = await checkForZillowCookie()
      if (zillowCookie) {
        resolve(zillowCookie)
        clearInterval(interval)
      }
    }, 1000)
  })
}

export const checkForZillowCookie = async () => {
  return await getValueFromConfigFile('zillow', 'zillowCookie')
}

export const checkRequiredConfigValues = (source: ListingsSource, config: ScrapeConfig, task = 'init') => {
  const { outputPath, zipCodes, browser, zillowCookie } = config ?? {}
  const errors = []
  if (!outputPath) {
    errors.push('outputPath')
  }
  if (!zipCodes) {
    errors.push('zipCodes')
  }
  if (source === 'zillow' && !browser) {
    errors.push('browser')
  }
  if (task === 'scrape') {
    if (source === 'zillow' && !zillowCookie) {
      errors.push('zillowCookie')
    }
  }
  return errors
}

export const getZipCodesFromConfig = async (source: ListingsSource) => {
  const zipCodes = await getValueFromConfigFile(source, 'zipCodes') as string
  return zipCodes?.replace(/ /g, '').split(',').map(item => Number(item))
}

export const stringifyZipCodes = (zipCodes: number[]) => {
  return zipCodes.join(', ')
}

export const readConfigFile = async (source: ListingsSource) => {
  const configFile = await getConfigFilePath(source)
  return await parseYamlFile(configFile) as ScrapeConfig
}

export const getOutputPathFromConfig = async (source: ListingsSource) => {
  const outputPath = await getValueFromConfigFile(source, 'outputPath') as string
  return outputPath
}

export const getValueFromConfigFile = async (source: ListingsSource, key: keyof ScrapeConfig): Promise<ScrapeConfig[keyof ScrapeConfig] | null> => {
  const config = await readConfigFile(source)
  return config?.[key] ?? null
}

export const updateConfigFile = async (source: ListingsSource, payload: any) => {
  const config = await readConfigFile(source)
  const keys = Object.keys(payload)

  const data = {
    ...config,
    ...payload,
  }
  // write region ids to config file
  await writeConfigFile(source, data)
  log.success(`Updated ${source} config: ${keys.join(', ')}`)
}
export const writeConfigFile = async (source: ListingsSource, config: ScrapeConfig) => {
  const workspaceDir = await findWorkspaceDir(process.cwd())
  if (source === 'redfin') {
    return await writeYamlFile(`${workspaceDir}/config.redfin.yaml`, config)
  } else {
    return await writeYamlFile(`${workspaceDir}/config.zillow.yaml`, config)
  }
}
