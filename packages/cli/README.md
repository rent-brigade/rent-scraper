# rent-scraper

CLI entry point. Wires together config setup, region ID generation, and scraping into a single command.

## Usage

```bash
# Run (production build)
pnpm run rent-scraper

# Run (dev, no build)
pnpm run rent-scraper:dev

# Or via npx (no install required)
npx rent-scraper
```

## What It Does

1. Checks for an existing config file — runs the `create-config` wizard if none is found
2. Validates the config and generates Zillow region IDs for any zip codes that don't have them yet
3. Starts the scrape via `@rent-scraper/scrape-listings`

See the [root README](../../README.md) for full CLI flags and config options.
