# @rent-scraper/scrape-listings

Core scraping orchestrator. Fetches listing results by zip code, scrapes listing detail HTML, and exports everything to CSV.

## Usage

```bash
# Start (production build)
pnpm run scrape-listings

# Start (dev, no build)
pnpm run scrape-listings:dev
```

The browser server must already be running before calling this.

## Scraping Phases (Zillow)

1. **Cookie refresh** — opens Zillow in the browser to get a fresh session cookie before any fetches
2. **Results** — fetches listing search results JSON for each zip code using the captured cookie
3. **HTML** — fetches the detail page HTML for each valid listing
4. **Parse** — extracts structured listing data from the HTML
5. **CSV export** — writes all listings to a single timestamped CSV file

## CLI Flags

| Flag            | Default  | Description                                                           |
| --------------- | -------- | --------------------------------------------------------------------- |
| `--source`      | `zillow` | `zillow` or `redfin`                                                  |
| `--days-listed` | `1`      | Listings posted within N days                                         |
| `--runs`        | `1`      | Number of full scrape passes                                          |
| `--reruns`      | `0`      | Retries per failed zip code fetch                                     |
| `--timeout-ms`  | `60000`  | Per-request timeout in milliseconds                                   |
| `--limit`       | _(none)_ | Only scrape first N zip codes                                         |
| `--offset`      | `0`      | Skip first N zip codes                                                |
| `--retry`       | `false`  | Retry hard bot-filtered (403) zip codes inline                        |
| `--rerun`       | _(none)_ | Resume from a previous run's timestamp, or `true` for the most recent |

## Output

Written under `outputPath` from config:

```
outputPath/
  zillow/
    results/YYYY-MM-DD-HHmm/   # raw JSON per zip code
    listings/YYYY-MM-DD-HHmm/  # parsed HTML per listing
    csv/YYYY-MM-DD-HHmm.csv    # final export
    logs/                       # scraping summaries and error zip codes
```
