# @rent-scraper/browser-server

Local HTTP server wrapping Puppeteer. Runs at `http://localhost:8082` and manages a persistent browser session for Zillow scraping — handling cookie capture, PerimeterX bot detection, and captcha solving.

## Why a separate server?

The browser session (and its PerimeterX trust cookies) must persist across the full scrape run. Running Puppeteer inside the scrape process would restart the session on every zip code fetch. The server keeps the browser alive and exposes it over HTTP so the scraping process can read cookies and trigger actions without owning the browser lifecycle.

## Endpoints

| Method | Path                  | Description                                                                          |
| ------ | --------------------- | ------------------------------------------------------------------------------------ |
| `GET`  | `/server`             | Health check — returns `{ running: true }`                                           |
| `POST` | `/browser/launch`     | Launch the browser                                                                   |
| `POST` | `/browser/open`       | Navigate to a URL, returns `{ status: 'navigated' \| 'captcha' \| 'not connected' }` |
| `POST` | `/browser/status`     | Check current page status without navigating                                         |
| `POST` | `/browser/close`      | Close the current page                                                               |
| `GET`  | `/cookie`             | Return the current Zillow cookie string                                              |
| `POST` | `/cookie/save`        | Extract and save the Zillow cookie from the browser session                          |
| `POST` | `/cookie/refresh`     | Re-extract cookie after a navigation                                                 |
| `POST` | `/cookie/redfin/save` | Extract and save the Redfin cookie                                                   |
| `POST` | `/captcha/solve`      | Auto-solve a PerimeterX captcha via keyboard hold                                    |
| `POST` | `/server/shutdown`    | Shut down the browser and stop the server                                            |

## Captcha Solving

PerimeterX uses a press-and-hold challenge (`#px-captcha`). The solver (`solve-captcha.ts`) presses `Tab` to focus the element, holds `Space` for 10 seconds, then reloads to verify. Retries up to 5 times with a 3-second pause between attempts.

## Usage

```bash
# Start (production build)
pnpm run browser-server

# Start (dev, no build)
pnpm run browser-server:dev

# Debug mode (logs browser and server address)
pnpm run browser-server -- --debug
```
