# @rent-scraper/utils

Internal package. Shared utilities and config file management used across all `@rent-scraper/*` packages.

## Config (`config.ts`)

Handles reading and writing the YAML config files (`config.zillow.yaml`, `config.redfin.yaml`).

- **`readConfigFile(source)`** — parse the config file for a source
- **`writeConfigFile(source, config)`** — write config back to disk
- **`getValueFromConfigFile(source, key)`** — read a single config key
- **`updateConfigFile(source, payload)`** — merge and save partial updates
- **`getConfigFilePath(source)`** — resolve the config file path (workspace root in dev, pointer file in prod)
- **`checkForConfigFile(source)`** — return whether the config file exists
- **`checkBrowserServer()`** — ping `localhost:8082` and return whether the browser server is running
- **`checkRequiredConfigValues(source, config)`** — return a list of missing required fields

## Utilities (`index.ts`)

General-purpose helpers used across the monorepo: array comparison, error parsing, YAML read/write, path resolution, and random value selection.
