import minimist from 'minimist'
import { runGenerateRegionIds } from '../generate-region-ids.js'

const args = minimist(process.argv.slice(2))
const source = args.source ?? 'zillow'

runGenerateRegionIds(source)
  .then(() => {
    process.exit(0)
  })
  .catch(() => {
    process.exit(1)
  })
