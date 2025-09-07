import path from 'node:path'
import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  entries: ['src/index', 'src/bin/run-browser-server'],
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
  },
})
