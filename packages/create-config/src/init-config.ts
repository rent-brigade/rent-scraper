import {
  intro,
  outro,
  confirm,
  select,
  isCancel,
  cancel,
  text,
  log,
  tasks,
} from '@clack/prompts'
import type { BrowserKey } from '@rent-scraper/api'
import type { ListingsSource } from '@rent-scraper/api'
import { parseAbsolutePath } from '@rent-scraper/utils'
import type { ScrapeConfig } from '@rent-scraper/utils/config'
import { readConfigFile, writeConfigFile } from '@rent-scraper/utils/config'
import path from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'
import color from 'picocolors'

const isValidZipCode = (zipCode: string) => /(^\d{5}$)|(^\d{5}-\d{4}$)/.test(zipCode)

export async function runInitConfig(source?: ListingsSource) {
  intro(color.inverse(' create config '))

  const config = source && await readConfigFile(source)

  // inititalize config
  source = source ?? await select({
    message: 'Which listings would you like to scrape?',
    initialValue: 'zillow',
    options: [
      { value: 'zillow', label: 'Zillow' },
      { value: 'redfin', label: 'Redfin' },
    ],
  }) as ListingsSource

  if (isCancel(source)) {
    cancel('Operation cancelled')
    return process.exit(1)
  }

  // sets output path and trims the text input
  const outputPath = config?.outputPath ?? (await text({
    message: 'Where would like you the data to be stored?',
    placeholder: './rent-data',
    defaultValue: './rent-data',
  }) as string)?.trim()

  if (isCancel(outputPath)) {
    cancel('Operation cancelled')
    return process.exit(1)
  }

  const browser = config?.browser ?? (source === 'zillow'
    ? await select({
      message: 'Which browser would you use for scraping?',
      initialValue: 'chrome',
      options: [
        { value: 'chrome', label: 'Google Chrome' },
        { value: 'brave', label: 'Brave Browser' },
      ],
    }) as BrowserKey
    : null)

  if (isCancel(browser)) {
    cancel('Operation cancelled')
    return process.exit(1)
  }

  const zipCodeResponse = config?.zipCodes ?? await text({
    message: 'What zip codes would you like to scrape?',
    placeholder: 'Example: 90026, 90039, 90027',
    validate(value) {
      if (!value || value?.length === 0) return `Please enter a list of zip codes`
    },
  }) as string

  /** removes spaces and splits zipCodes by commas to array */
  let zipCodes = zipCodeResponse.replace(/ /g, '').split(',').filter(x => x)
  /** checks for invalid zips */
  const invalidZips = zipCodes.filter(zip => !isValidZipCode(zip))
  zipCodes = zipCodes.filter(zip => !invalidZips.includes(zip))

  if (invalidZips.length) {
    log.error('Invalid zips!')
    const zipFix = await select({
      message: `The following zip codes are invalid: ${invalidZips.join(', ')}.`,
      initialValue: 'remove',
      options: [
        { value: 'remove', label: 'Please remove them.' },
        { value: 'edit', label: 'Let me edit them.' },
      ],
    })

    if (zipFix === 'remove') {
      zipCodes = zipCodes.filter(zip => !invalidZips.includes(zip))
    }

    if (zipFix === 'edit') {
      const editZips = (await text({
        message: 'Please fix the following zip codes:',
        placeholder: invalidZips.join(', '),
        initialValue: invalidZips.join(', '),
        validate(value) {
          if (value?.length === 0) return `Please enter a list of zip codes`
          /** removes spaces and splits zipCodes by commas to array */
          const zipArray = value?.replace(/ /g, '').split(',').filter(x => x)
          /** checks for invalid zips */
          const invalidZips = zipArray?.filter(zip => !isValidZipCode(zip))
          if (invalidZips?.length) {
            return `The following zip codes are invalid: ${invalidZips.join(', ')}.`
          }
        },
      }) as string).replace(/ /g, '').split(',')
      zipCodes = [...zipCodes, ...editZips]
    }
  }

  zipCodes = [...new Set(zipCodes)]

  if (!invalidZips.length) {
    log.success('Great! All your zips are valid!')
  }

  if (isCancel(zipCodes)) {
    cancel('Operation cancelled')
    return process.exit(1)
  }

  const daysListed = config?.daysListed ?? (await text({
    message: 'How many days would you like to search listings? (Max. 90)',
    placeholder: '1',
    defaultValue: '1',
    validate(value) {
      if (value && value === '0') return `Please enter a number.`
      else if (Number(value) > 90) return `Please enter a number less than 90.`
    },
  }) as string)?.trim()

  if (isCancel(daysListed)) {
    cancel('Operation cancelled')
    return process.exit(1)
  }

  // await sleep(1000)
  // log.info('')

  // const shouldContinue = await confirm({
  //   message: 'Are you ready to continue?',
  // })

  // if (isCancel(shouldContinue) || !shouldContinue) {
  //   cancel('Create config canceled. Please try again.')
  //   return process.exit(1)
  // }

  await sleep(1000)

  const answers = [
    `Listings source: ${source}`,
    `Output path: ${outputPath}`,
    ...(browser ? [`Browser: ${browser}`] : []),
    `Zip codes: ${zipCodes.join(', ')}`,
    `Days listed: ${daysListed}`,
  ].filter(x => x)

  log.info('')
  log.info('Please review your answers:')

  answers.map((item) => {
    log.warn(item)
  })

  log.info('')

  const saveConfig = await confirm({
    message: 'Would you like to save this config?',
  })

  if (isCancel(saveConfig) || !saveConfig) {
    cancel('Create config canceled. Please try again.')
    return process.exit(1)
  }

  const data = {
    outputPath: path.isAbsolute(outputPath) ? outputPath : parseAbsolutePath(outputPath),
    ...(browser && { browser }),
    zipCodes: zipCodes.join(', '),
    daysListed: Number(daysListed),
  } as ScrapeConfig

  await tasks([
    {
      title: 'Saving config to file',
      task: async () => {
        await sleep(3000)
        await writeConfigFile(source, data)
        return 'Saved config to file'
      },
    },
  ])

  await sleep(1000)

  outro(`Config file saved!`)

  await sleep(1000)

  return source
}
