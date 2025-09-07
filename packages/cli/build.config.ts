import path from 'node:path'
import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  entries: ['src/index', 'src/bin/run-rent-scraper'],
  clean: true,
  declaration: 'node16',
  rollup: {
    emitCJS: false,
    inlineDependencies: true,
    esbuild: {
      minify: true,
    },
  },
  alias: {
    '@rent-scraper/api': path.resolve(__dirname, '../api/src'),
    '@rent-scraper/utils': path.resolve(__dirname, '../utils/src'),
    '@rent-scraper/create-config': path.resolve(__dirname, '../create-config/src'),
    '@rent-scraper/browser-server': path.resolve(__dirname, '../browser-server/src'),
    '@rent-scraper/scrape-listings': path.resolve(__dirname, '../scrape-listings/src'),
  },
})
