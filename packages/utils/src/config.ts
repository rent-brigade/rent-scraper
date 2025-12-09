import type { ListingsSource } from '@rent-scraper/api'
import { checkForFile, parseYamlFile, throwError, writeYamlFile } from '@rent-scraper/utils'
import type { BrowserKey } from '@rent-scraper/api'
import axios from 'axios'
import { spinner, log } from '@clack/prompts'
import { mkdir, stat } from 'fs/promises'
import os from 'os'
import path from 'path'
import envPaths from 'env-paths'

export interface ScrapeConfig {
  outputPath: string
  source?: ListingsSource
  zipCodes: string
  daysListed?: number
  regionIds?: Record<number, number | null>
  browser?: BrowserKey
  zillowCookie?: string
}
const paths = envPaths('rent-scraper').config
export const pointerFilePath = path.join(paths, 'config.yaml')
export const globalDir = path.join(os.homedir(), 'rent-scraper')

export const getConfigFilePath = async (source: ListingsSource) => {
  // const workspaceDir = await findWorkspaceDir(process.cwd()
  const workspaceDir = null
  if (workspaceDir) {
    return source === 'redfin' ? path.join(workspaceDir, 'config.redfin.yaml') : path.join(workspaceDir, 'config.zillow.yaml')
  } else {
    if (await checkForPointerFile()) {
      return await readPointerFile(source)
    }
  }
}

export const checkForConfigFile = async (source: ListingsSource, configFilePath?: string) => {
  const configFile = configFilePath ?? await getConfigFilePath(source)
  if (configFile) {
    return await checkForFile(configFile)
  }
}

export const checkForPointerFile = async () => {
  return await checkForFile(pointerFilePath)
}

export const checkForAndReadConfigFile = async (source: ListingsSource) => {
  const configFile = await getConfigFilePath(source)
  if (configFile) {
    if (!await checkForFile(configFile)) {
      throwError('Config file is required.')
    }
    return await parseYamlFile(configFile) as ScrapeConfig
  }
}

export const resetZillowCookie = async () => {
  const configFile = await readConfigFile('zillow')
  if (configFile) {
    const { zillowCookie, ...config } = configFile ?? {}
    await writeConfigFile('zillow', config)
  }
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

export const checkRequiredConfigValues = (source: ListingsSource, config?: ScrapeConfig, task = 'init') => {
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
  if (configFile) {
    return await parseYamlFile(configFile) as ScrapeConfig
  }
}

export const writePointerFile = async (source: ListingsSource, configDirectory: string, filename?: string) => {
  if (!path.isAbsolute(configDirectory)) {
    throwError('configDirectory must be an absolute path')
  }

  const stats = await stat(configDirectory).catch(() => null)
  if (stats && !stats.isDirectory()) {
    throwError(`${configDirectory} exists but is not a directory`)
  }

  // creates configDirectory if it doesn't exit
  await mkdir(configDirectory, { recursive: true })

  const pointerDirectory = path.dirname(pointerFilePath)

  // creates pointerDirectory if it doesn't exit
  await mkdir(pointerDirectory, { recursive: true })
  // await writeFile(pointerFilePath, configDirectory)

  filename = filename ?? `config.${source}.yaml`
  const configFilePath = path.join(configDirectory, filename)
  const configData = {
    ...await parseYamlFile(pointerFilePath),
    [source]: configFilePath,
  }

  await writeYamlFile(pointerFilePath, configData)
  const pointer = await parseYamlFile(pointerFilePath) ?? {}
  return pointer?.[source]
}

export const readPointerFile = async (source: ListingsSource) => {
  try {
    // get data from pointerFile
    return (await parseYamlFile(pointerFilePath))?.[source]
  } catch (err: any) {
    console.error(`Failed to read pointer file at ${pointerFilePath}: ${err.message}`)
  }
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
  const filePath = await getConfigFilePath(source)
  await writeYamlFile(filePath, config)
  return filePath
}
