#!/usr/bin/env node
import minimist from 'minimist'
import { parseError } from '@rent-scraper/utils'
import { log } from '@clack/prompts'
import { runCheckConfig } from '../check-config.js'

const args = minimist(process.argv.slice(2))
const source = args.source ?? 'zillow'

runCheckConfig(source)
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    const { message } = parseError(error)
    log.error(message)
    process.exit(1)
  })
