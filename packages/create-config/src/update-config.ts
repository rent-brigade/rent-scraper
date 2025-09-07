import {
  isCancel,
  cancel,
  log,
  select,
  outro,
  multiselect,
} from '@clack/prompts'
import type { ListingsSource } from '@rent-scraper/api'
import { readConfigFile, writeConfigFile } from '@rent-scraper/utils/config'
import { setTimeout as sleep } from 'node:timers/promises'
import { runInitConfig } from './init-config.js'
import { rename } from 'node:fs/promises'
import { parseAbsolutePath } from '@rent-scraper/utils'
import type { ScrapeConfig } from '@rent-scraper/utils/config'

export async function updateConfig(source: ListingsSource) {
  const config = await readConfigFile(source)
  const numZipCodes = config.zipCodes.split(', ').length

  const answers = [
    `Output path: ${parseAbsolutePath(config.outputPath)}`,
    ...(config.browser ? [`Browser: ${config.browser}`] : []),
    `Zip codes: ${numZipCodes > 10 ? config.zipCodes.split(', ').splice(0, 10).join(', ') + '...' : config.zipCodes}`,
  ].filter(x => x)

  log.warn(`Config file found at ${parseAbsolutePath('./config.' + source + '.yaml')}`)

  let status = await select({
    message: 'Would you like to:',
    initialValue: 'keep',
    options: [
      { value: 'keep', label: 'Keep this config' },
      { value: 'edit', label: 'Edit this config' },
      { value: 'review', label: 'Review this config' },
      { value: 'new', label: 'Create a new config' },
    ],
  })

  if (isCancel(status)) {
    cancel('Operation cancelled')
    return process.exit(1)
  }

  if (status === 'review' || status === 'edit') {
    for (const item of answers) {
      await sleep(300)
      log.info(item)
    }
  }

  const edit = status === 'edit' && await multiselect({
    message: 'Which fields would you like to edit?',
    options: [
      { value: 'outputPath', label: 'Output path' },
      { value: 'browser', label: 'Browser' },
      { value: 'zipCodes', label: 'Zip codes' },
    ],
    required: false,
  }) as keyof ScrapeConfig[] | []

  if (edit && Array.isArray(edit) && edit.length) {
    const data = await readConfigFile(source)
    await sleep(1000)
    await rename(parseAbsolutePath(`./config.${source}.yaml`), parseAbsolutePath(`./config.${source}.yaml.bak`))
    for (const item of edit as keyof ScrapeConfig) {
      delete data[item as keyof ScrapeConfig]
    }
    await sleep(1000)
    await writeConfigFile(source, data)
    await runInitConfig(source)
  }

  if (status === 'new') {
    await rename(parseAbsolutePath(`./config.${source}.yaml`), parseAbsolutePath(`./config.${source}.yaml.bak`))
    await runInitConfig()
  }

  status = status === 'review'
    ? await select({
        message: 'Would you like to:',
        initialValue: 'keep',
        options: [
          { value: 'keep', label: 'Keep this config' },
          { value: 'edit', label: 'Edit this config' },
          { value: 'new', label: 'Create a new config' },
        ],
      })
    : status

  if (status === 'keep') {
    outro(`Config file saved!`)
    return process.exit(0)
  }
}
