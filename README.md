# rent-scraper

Scrape rental listings from Zillow and Redfin and export them to CSV.

## Prerequisites

- Node.js >= 22
- pnpm
- macOS with Google Chrome or Brave installed

## Quick Start (no dev setup)

```bash
npx rent-scraper
```

This runs the interactive setup wizard on first launch, then starts scraping.

## Development Setup

```bash
# Install dependencies
pnpm install

# Run in dev mode (with ts-node, no build step)
pnpm run rent-scraper:dev

# Build all packages
pnpm run build

# Run built version
pnpm run rent-scraper
```

## How It Works

1. **Config** — on first run, an interactive wizard creates `config.zillow.yaml` (or `config.redfin.yaml`) with your zip codes, output path, and other settings.
2. **Browser server** — a local Puppeteer server starts at `http://localhost:8082`, opens Zillow in a real browser, captures the session cookie, and handles PerimeterX captcha challenges.
3. **Scraping** — zip codes are fetched in parallel using the captured cookie. Results are written as JSON, then parsed into HTML listings, then exported to a single CSV.

## Config File

Config is stored as YAML. The wizard creates it, but you can edit it directly.

```yaml
outputPath: /path/to/output # where CSV and raw data are saved
zipCodes: 90026, 90039, 90027 # comma-separated list
daysListed: 1 # listings posted within N days (max 90)
forceCaptcha: false # force captcha to appear on every run (debug only)
limit: 100 # only scrape first N zip codes (optional)
offset: 0 # skip first N zip codes (optional)
zillowCookie: ... # saved automatically by the browser server
```

## CLI Flags

All flags override the corresponding config file value.

| Flag            | Default  | Description                                                            |
| --------------- | -------- | ---------------------------------------------------------------------- |
| `--source`      | `zillow` | Listings source: `zillow` or `redfin`                                  |
| `--days-listed` | `1`      | Listings posted within N days                                          |
| `--runs`        | `1`      | Number of full scrape passes                                           |
| `--reruns`      | `0`      | Retries per failed zip code fetch                                      |
| `--timeout-ms`  | `60000`  | Per-request timeout in milliseconds                                    |
| `--limit`       | _(none)_ | Only scrape first N zip codes                                          |
| `--offset`      | `0`      | Skip first N zip codes                                                 |
| `--retry`       | `false`  | Retry hard bot-filtered zip codes inline                               |
| `--rerun`       | _(none)_ | Resume from a previous run's timestamp (or `true` for the most recent) |

## Individual Commands

```bash
# Run only the browser server (Zillow cookie/captcha handling)
pnpm run browser-server

# Run only the config wizard
pnpm run create-config

# Run only the scrape step (browser server must already be running)
pnpm run scrape-listings

# Validate and update an existing config
pnpm run check-config
```

## Output

Results are written under `outputPath`:

```
outputPath/
  zillow/
    results/YYYY-MM-DD-HHmm/   # raw JSON per zip code
    listings/YYYY-MM-DD-HHmm/  # parsed HTML per listing
    csv/YYYY-MM-DD-HHmm.csv    # final export
    logs/                       # scraping summaries and error zip codes
```
