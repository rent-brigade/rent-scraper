import { access, readdir, writeFile } from 'fs/promises'
import fs, { readdirSync } from 'fs'
import path from 'path'
import { readFile } from 'fs/promises'
import * as csv from 'csv'
import YAML from 'yaml'

export type Id = string | number
export type Item = Record<string, unknown>
export type List = Item[]

export const groupByKey = (list: any[], key: string | number): any => list.reduce((hash, obj) => ({ ...hash, [obj[key]]: (hash[obj[key]] || []).concat(obj) }), {})

export const isObject = (data: Record<string, unknown>): boolean => typeof data === 'object' && !!data

export const isEmptyObject = (data: Record<string, unknown>): boolean => isObject(data) && Object.keys(data).length === 0

export function throwError(message: string, status?: number): void {
  throw new Error(JSON.stringify({ status: status ?? 400, message }))
}

export const parseThrownError = (error: { message: string }) => JSON.parse(error?.message)

export const chunkArray = (array: unknown[], size: number): unknown[] => {
  if (array.length <= size) {
    return [array]
  }
  return [array.slice(0, size), ...chunkArray(array.slice(size), size)]
}

export const parseNumber = (value: string | number, options?: { round?: number, zeros?: number, type?: string }): any => {
  const { round, zeros, type } = options ?? {}
  let number = value
  number = round ? Number(roundValue(value, round)) : Number(number)
  number = zeros ? Number(number).toFixed(zeros) : number
  number = type === '%' ? `${number}%` : number
  number = type === '$' ? `$${number}` : number
  return options ? number : Number(number)
}

export const parseCurrency = (value: string | number): string | number => {
  return parseNumber(value, { round: 100, zeros: 2, type: '$' })
}

export const parsePercentage = (value: string | number, options?: { round: number }): string | number => {
  const { round = 100 } = options ?? {}
  return parseNumber(value, { round, type: '%' })
}

export const parsePrice = (value: string | number): number => {
  return Number(parseNumber(value, { round: 100, zeros: 2 }))
}

export const roundValue = (value: string | number, nearest = 100): number => {
  return Math.round(Number(value) * nearest) / nearest
}

export const priceToInteger = (value: string) => {
  const normalized = value?.replace('$', '')?.replace(',', '')
  return Number(normalized)
}

export const percentageToDecimal = (value: string) => {
  const normalized = value?.replace('+', '')?.replace('%', '')
  return roundValue(Number(normalized) / 100, 1000)
}

export const validateBooleanString = (arg: string): boolean => arg === 'true' || Number(arg) === 1

export const parseError = (error: any) => {
  if (error?.response) {
    const { status, data } = error?.response ?? {}
    return { status, message: data }
  } else if (error?.errors) {
    const message = error?.errors
      ?.map((error: any) => error)
      .map((error: { message?: string }) => error?.message)
      .join('')
    return { status: 400, message }
  } else {
    try {
      if (error?.body) {
        const { status, message } = JSON.parse(error?.body) ?? {}
        return { status, message }
      } else {
        const { status, message } = JSON.parse(error?.message) ?? {}
        return { status, message }
      }
    } catch {
      console.log(error)
      const { status, message } = error ?? {}
      return { status: status || 400, message: message || 'Internal Server Error' }
    }
  }
}

export const createDayStartInPST = (fourDigitYear: number, month: number, day: number): Date => {
  const yearString = fourDigitYear.toString()
  const monthString = month.toString().padStart(2, '0')
  const dayString = day.toString().padStart(2, '0')
  const date = new Date(`${yearString}-${monthString}-${dayString}T00:00:00-08:00`)
  return date
}

interface ReadDirectoryOptions {
  extension?: string | string[]
  prefix?: string
  prependDirectory?: boolean
  recursive?: boolean
}

export const readFilesInDirectory = async (directory: string, options?: ReadDirectoryOptions): Promise<string[]> => {
  const { extension, prefix, prependDirectory, recursive = false } = options ?? {}
  // get list files of files in directory
  const files = await readdir(directory, { recursive })
  // filter out any files that are not json and fetch the listing html for each file
  let filtered = extension
    ? files.filter(file => Array.isArray(extension)
        ? extension.includes(path.extname(file))
        : path.extname(file) === extension)
    : files
  filtered = prefix ? filtered.filter(file => file.startsWith(prefix)) : filtered
  // filter out .DS_Store files
  filtered = filtered.filter(file => file !== '.DS_Store')
  // prepend directory to file array if option is set
  return prependDirectory ? filtered.map(file => `${directory}/${file}`) : filtered
}

export const readFilesInDirectorySync = (directory: string, options?: ReadDirectoryOptions): string[] => {
  const { extension, prefix, prependDirectory, recursive = false } = options ?? {}
  // get list files of files in directory
  const files = readdirSync(directory, { recursive }) as string[]
  // filter out any files that are not json and fetch the listing html for each file
  let filtered = extension
    ? files.filter(file => Array.isArray(extension)
        ? extension.includes(path.extname(file))
        : path.extname(file) === extension)
    : files
  filtered = prefix ? filtered.filter(file => file.startsWith(prefix)) : filtered
  // filter out .DS_Store files
  filtered = filtered.filter(file => file !== '.DS_Store')
  // prepend directory to file array if option is set
  return prependDirectory ? filtered.map(file => `${directory}/${file}`) : filtered
}

export const checkForFile = async (filePath: string) => {
  try {
    await access(filePath)
    const file = await readFile(filePath)
    if (file.length) return true
  } catch (error: any) {
    if (error?.code === 'EISDIR') {
      return true
    } else if (error?.code === 'ENOENT') {
      return false
    } else {
      throw error
    }
  }
}

export const parseAbsolutePath = (relPath: string) => path.resolve(path.join(process.env.INIT_CWD as string, relPath))

export const getRandomArrayValue = (array: unknown[]) => array[Math.floor(Math.random() * array.length)]

export const parseCsvFile = async (filePath: string, options: csv.parser.Options) => {
  const records = []
  const parser = fs
    .createReadStream(filePath)
    .pipe(csv.parse(options))
  for await (const record of parser) {
    records.push(record)
  }
  return records
}

export const parseTxtFile = async (filePath: string) => {
  const records = []
  const parser = (await readFile(filePath, 'utf8')).replace(/\n/g, ',').replace(/ /g, '').split(',')
  for (const record of parser) {
    records.push(record)
  }
  return records
}

export const parseJsonFile = async (filePath: string) => {
  return JSON.parse(await readFile(filePath, 'utf8'))
}

export const parseYamlFile = async (filePath: string) => {
  try {
    return YAML.parse(await readFile(filePath, 'utf8'))
  } catch (error: any) {
    if (error?.code === 'ENOENT') {
      await fs.promises.writeFile(filePath, '')
    }
  }
}

export const writeYamlFile = async (filePath: string, data: any) => {
  await writeFile(filePath, YAML.stringify(data))
}

export const compareArrays = <T>(arr1: T[], arr2: T[]) => {
  return arr1?.filter(val => !arr2?.includes(val))
}

export class ErrorLog {
  errors: string[]
  constructor(errors: string[] = []) {
    this.errors = errors
  }

  add(msg: string, error?: unknown) {
    if (error instanceof Error) {
      msg += `: ${error.message}`
    }
    this.errors.push(msg)
  }

  get() {
    return this.errors
  }

  async write(path: string, data: string) {
    await writeFile (path, data)
  }
}
