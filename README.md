# rent-scraper

Scrape data from rental listings

### Prerequisites

- Node.js >= 22
- pnpm package manager
- MacOS + Google Chrome or Brave browser installed (cross platform coming soon)

### Zero Development Usage

1. Run Latest Production Version

    ```bash
    npx rent-scraper
    ```

### Development Setup and Usage

1. Install pnpm globally (if not already installed):

   ```bash
   npm install -g pnpm
   ```

2. Clone the repository and install dependencies:

   ```bash
   git clone [repository-url]
   cd rent-scraper
   pnpm install
   ```

3. Run development version:

   ```bash
   pnpm run rent-scraper:dev
   ```

4. Build the project:

   ```bash
   pnpm run build
   ```

5. Run built version:

   ```bash
   pnpm run rent-scraper
   ```

### Advanced Usage

#### Command Line Options with defaults (overrides config file)
- ```--source=zillow```: Scrape source (zillow or redfin)
- ```--days-listed=1```: Days listed (number)
- ```--runs=1```: Amount of times to run the entire script (number)
- ```--reruns=1```: Amount of times to rerun each script (number)
- ```--timout-ms=60000```: Time in milliseconds to kill fetch and cause a rerun (number)
