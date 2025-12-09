#!/usr/bin/env node
import minimist from 'minimist'
import { log } from '@clack/prompts'
import { parseError } from '@rent-scraper/utils'
import { runRentScraper } from '../index.js'

const args = minimist(process.argv.slice(2))
const source = args.source ?? 'zillow'
const configFilePath = args['config-file']

runRentScraper(source, configFilePath)
  .then(() => process.exit(0))
  .catch((error: any) => {
    const { message } = parseError(error)
    log.error(message)
    process.exit(1)
  })
