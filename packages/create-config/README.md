# @rent-scraper/create-config

Interactive CLI wizard for creating and updating `config.zillow.yaml` / `config.redfin.yaml`.

## Usage

```bash
# Start wizard (production build)
pnpm run create-config

# Start wizard (dev, no build)
pnpm run create-config:dev

# Validate and update an existing config (generate region IDs etc.)
pnpm run check-config
```

## What It Does

On first run, the wizard asks for:

- **Source** — Zillow or Redfin
- **Output path** — where scraped data and CSVs are saved
- **Zip codes** — comma-separated list (validates format, lets you fix invalid entries)
- **Days listed** — how many days back to search (1–90)

The config is saved as YAML. Subsequent runs detect the existing file and prompt only for missing or updated fields.

## Config File Location

In a pnpm workspace (development), the config is written alongside the workspace root:

- `config.zillow.yaml`
- `config.redfin.yaml`

Outside a workspace (production / `npx` usage), a pointer file is stored at the platform config directory (via `env-paths`) and the actual config is saved to `~/rent-scraper/` by default.
