# @rent-scraper/api

Internal package. Provides scraping functions and config accessors for Zillow and Redfin, used by `@rent-scraper/scrape-listings`.

## Zillow

- **`waitForSolvedZillowCaptcha()`** — opens `zillow.com/homes/for_rent/` in the browser, polls until the page navigates cleanly (no captcha), then refreshes the cookie. Handles captcha automatically if it appears.
- **`waitForZillowCaptchaSolve()`** — aggressively reloads the page to force a PerimeterX captcha to appear, then auto-solves it. Used when `forceCaptcha: true` is set in config.
- **`isBrowserShowingCaptcha()`** — returns `true` if the browser's current page is showing a captcha challenge.
- **`getZillowListingResults()`** — fetches listing search results for a region via the Zillow API.
- **`getZillowListingDetailsByZpid()`** — fetches full listing details for a given `zpid`.
- **`getZillowRegionId()`** — resolves a zip code to a Zillow region ID.
- **`fetchHtmlFromZillowListingUrl()`** — fetches raw HTML for a listing detail page.

### Config accessors (`config.ts`)

| Function                  | Config key     |
| ------------------------- | -------------- |
| `getZillowCookie()`       | `zillowCookie` |
| `getZillowDaysListed()`   | `daysListed`   |
| `getZillowForceCaptcha()` | `forceCaptcha` |
| `getZillowLimit()`        | `limit`        |
| `getZillowOffset()`       | `offset`       |
| `getZillowOutputPath()`   | `outputPath`   |
| `getZillowZipCodes()`     | `zipCodes`     |

## Redfin

- **`getRedfinListingResults()`** — fetches listing results for a region.
- **`getRedfinListingDetails()`** — fetches listing detail HTML.
- **`getRedfinRegionId()`** — resolves a zip code to a Redfin region ID.
