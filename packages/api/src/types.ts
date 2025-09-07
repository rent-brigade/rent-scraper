export enum Browser {
  chrome = 'Google Chrome',
  brave = 'Brave Browser',
}
export type BrowserKey = keyof typeof Browser

export type ZipCode = number
export type RegionId = number

export type ListingsSource = 'zillow' | 'redfin'
