// These types were originally generated with ChatGPT from an example JSON file.
// Amendments have been made by hand, based on more examples.
// Trust them appropriately.

type ListingEventType = 'Listed for rent' | 'Price change'

type NonListingEventType = 'Contingent'
  | 'Listed for sale'
  | 'Listing removed'
  | 'Pending sale'
  | 'Sold'

type HistoryItemEventType = ListingEventType | NonListingEventType

export interface PriceHistoryItemBase {
  date: string
  price: number | null
  time: number | null
  pricePerSquareFoot: number | null
  priceChangeRate: number | null
  // these event types were acquired by running the following command in the data repo
  // rg '"event":[^,]*' -o --no-filename | sort | uniq | cut -d ":" -f 2
  event: HistoryItemEventType
  source: string
  buyerAgent: any
  sellerAgent: {
    photo: any
    profileUrl: string
    name: string
  } | null
  showCountyLink: boolean
  postingIsRental: boolean
  attributeSource: {
    infoString1: string | null
    infoString2: string | null
    infoString3: string | null
  }
};

/*
 * Verified that all "Listed for rent" and "Price change" events have a price with this command:

find . -name "*.json" | xargs -I {} jq 'if (.priceHistory? != null) then
   .priceHistory[]
   | select((.event == "Listed for rent" or .event == "Price change") and (.price | type) != "number")
else
   empty
end' {}

 */

export interface PriceHistoryItemRental extends PriceHistoryItemBase {
  event: ListingEventType
  price: number
}

export interface PriceHistoryItemOther extends PriceHistoryItemBase {
  event: NonListingEventType
  price: number | null
}

export type PriceHistoryItem = PriceHistoryItemRental | PriceHistoryItemOther

type CheckProps = 'date' | 'price' | 'event' | 'postingIsRental'
export type PriceHistoryItemRentalForCheck = Pick<PriceHistoryItemRental, CheckProps>
export type PriceHistoryItemOtherForCheck = Pick<PriceHistoryItemOther, CheckProps>
export type PriceHistoryItemForCheck = PriceHistoryItemRentalForCheck | PriceHistoryItemOtherForCheck

export interface TaxHistoryItem {
  time: number
  taxPaid: number | null
  taxIncreaseRate: number
  value: number | null
  valueIncreaseRate: number
}

export interface ZillowListing {
  listingDataSource: string
  zpid: number
  city: string
  state: string
  homeStatus: string
  address: {
    streetAddress: string
    city: string
    state: string
    zipcode: string
    neighborhood: string | null
    community: string | null
    subdivision: string | null
  }
  isListingClaimedByCurrentSignedInUser: boolean
  isCurrentSignedInAgentResponsible: boolean
  bedrooms: number
  bathrooms: number
  price: number
  yearBuilt: number | null
  streetAddress: string
  zipcode: string
  isCurrentSignedInUserVerifiedOwner: boolean
  propertyUpdatePageLink: string | null
  moveHomeMapLocationLink: string | null
  propertyEventLogLink: string | null
  editPropertyHistorylink: string | null
  listing_sub_type: {
    is_forAuction: boolean
    is_newHome: boolean
    is_FSBO: boolean
    is_FSBA: boolean
    is_foreclosure: boolean
    is_bankOwned: boolean
    is_comingSoon: boolean
    is_pending: boolean
    is_openHouse: boolean
  }
  providerListingID: string
  isRentalListingOffMarket: boolean
  hdpUrl: string
  country: string
  cityId: number
  citySearchUrl: {
    text?: string
    path: string
  }
  zipcodeSearchUrl: {
    path: string
  }
  apartmentsForRentInZipcodeSearchUrl: {
    path: string
  }
  housesForRentInZipcodeSearchUrl: {
    path: string
  }
  abbreviatedAddress: string
  county: string
  neighborhoodRegion: {
    name: string
  } | null
  building: any // null in sample but could hold building data
  isUndisclosedAddress: boolean
  boroughId: number | null
  neighborhoodSearchUrl: {
    path: string
  }
  stateSearchUrl: {
    path: string
  }
  countySearchUrl: {
    text: string
    path: string
  }
  boroughSearchUrl: string | null
  communityUrl: string | null
  isShowcaseListing: boolean
  isPremierBuilder: boolean
  homeType: string
  adTargets: {
    zip: string
    aamgnrc1: string
    mlat?: string
    bd: string
    fsbid?: string
    zusr: string
    city: string
    proptp: string
    pid: string
    price_band?: string
    zestimate?: string
    zestibuck?: string
    tflag?: string
    listtp: string
    premieragent: string
    sqftrange?: string
    price: string
    sqft?: string
    dma: string
    guid: string
    state: string
    mlong?: string
    cnty: string
    prange?: string
    ssid: string
  }
  attributionInfo: {
    listingAgreement: string | null
    mlsName: string | null
    agentEmail: string | null
    agentLicenseNumber: string | null
    agentName: string | null
    agentPhoneNumber: string | null
    attributionTitle: string | null
    brokerName: string | null
    brokerPhoneNumber: string | null
    buyerAgentMemberStateLicense: string | null
    buyerAgentName: string | null
    buyerBrokerageName: string | null
    coAgentLicenseNumber: string | null
    coAgentName: string | null
    coAgentNumber: string | null
    lastChecked: string
    lastUpdated: string
    listingOffices: {
      associatedOfficeType: string
      officeName: string | null
    }[]
    listingAgents: {
      associatedAgentType: string
      memberFullName: string | null
      memberStateLicense: string | null
    }[]
    mlsDisclaimer: string
    mlsId: string | null
    providerLogo: string | null
    listingAttributionContact: string | null
    listingAgentAttributionContact: string | null
    infoString3: string | null
    infoString5: string | null
    infoString10: string
    infoString16: string | null
    trueStatus: string | null
  }
  currency: string
  interactiveFloorPlanUrl: string
  lotPremium: any
  listPriceLow: any
  resoFacts: {
    [key: string]: any // For brevity, type each field as needed if you want strict typing
    aboveGradeFinishedArea: number | null
    accessibilityFeatures: any
    additionalFeeInfo: any
    additionalParcelsDescription: any
    architecturalStyle: any
    associations: any[]
    associationFee: number | null
    associationAmenities: string[] | null
    associationFee2: any
    associationFeeIncludes: any
    associationName: any
    associationName2: any
    associationPhone: any
    associationPhone2: any
    basementYN: any
    buildingFeatures: any
    buildingName: any
    appliances: string[] | null
    atAGlanceFacts: {
      factLabel: string
      factValue: string | null
    }[]
    attic: any
    availabilityDate: number | null
    basement: any
    bathrooms: number
    bathroomsFull: number
    bathroomsHalf: number | null
    bathroomsOneQuarter: any
    bathroomsPartial: any
    bathroomsFloat: number
    bathroomsThreeQuarter: any
    bedrooms: number
    belowGradeFinishedArea: any
    bodyType: any
    builderModel: any
    builderName: any
    buildingArea: any
    buildingAreaSource: any
    canRaiseHorses: boolean
    carportParkingCapacity: any
    cityRegion: string
    commonWalls: any
    communityFeatures: any
    compensationBasedOn: any
    constructionMaterials: any[]
    contingency: any
    cooling: string[] | null
    coveredParkingCapacity: any
    cropsIncludedYN: any
    cumulativeDaysOnMarket: any
    developmentStatus: any
    doorFeatures: any
    electric: any
    elevation: any
    elevationUnits: any
    entryLevel: any
    entryLocation: any
    exclusions: any
    exteriorFeatures: string[]
    feesAndDues: {
      type: string
      fee: string
      name: string | null
      phone: string | null
    }[]
    fencing: any
    fireplaceFeatures: any
    fireplaces: any
    flooring: string[] | null
    foundationArea: any
    foundationDetails: any[]
    frontageLength: any
    frontageType: any
    furnished: boolean
    garageParkingCapacity: any
    gas: any
    greenBuildingVerificationType: any
    greenEnergyEfficient: any
    greenEnergyGeneration: any
    greenIndoorAirQuality: any
    greenSustainability: any
    greenWaterConservation: any
    hasAdditionalParcels: boolean
    hasAssociation: boolean | null
    hasAttachedGarage: boolean
    hasAttachedProperty: boolean
    hasCooling: boolean | null
    hasCarport: boolean
    hasElectricOnProperty: any
    hasFireplace: boolean | null
    hasGarage: boolean
    hasHeating: boolean | null
    hasHomeWarranty: boolean
    hasLandLease: boolean
    hasOpenParking: boolean
    hasRentControl: any
    hasSpa: boolean
    hasPetsAllowed: boolean | null
    hasPrivatePool: boolean | null
    hasView: boolean
    hasWaterfrontView: any
    heating: string[] | null
    highSchool: any
    highSchoolDistrict: any
    hoaFee: any
    hoaFeeTotal: any
    homeType: string
    horseAmenities: any
    horseYN: any
    inclusions: any
    incomeIncludes: any
    interiorFeatures: any
    irrigationWaterRightsAcres: any
    irrigationWaterRightsYN: any
    isNewConstruction: any
    isSeniorCommunity: any
    landLeaseAmount: any
    landLeaseExpirationDate: any
    laundryFeatures: string[] | null
    leaseTerm: string
    levels: any
    listingId: any
    listingTerms: any
    lotFeatures: any
    lotSize: any
    lotSizeDimensions: any
    livingArea: string | null
    livingAreaRange: any
    livingAreaRangeUnits: any
    livingQuarters: any[]
    mainLevelBathrooms: any
    mainLevelBedrooms: any
    marketingType: any
    media: any[]
    middleOrJuniorSchool: any
    middleOrJuniorSchoolDistrict: any
    municipality: any
    numberOfUnitsInCommunity: any
    numberOfUnitsVacant: any
    offerReviewDate: any
    onMarketDate: number | null
    openParkingCapacity: any
    otherEquipment: any
    otherFacts: any[]
    otherParking: string[]
    otherStructures: any
    ownership: any
    ownershipType: any
    parcelNumber: string | null
    parkingCapacity: number
    parkingFeatures: string[]
    parkName: any
    patioAndPorchFeatures: any
    petsMaxWeight: any
    poolFeatures: any
    pricePerSquareFoot: number | null
    propertyCondition: any
    propertySubType: string[]
    roadSurfaceType: any
    roofType: any
    rooms: any[]
    roomTypes: string[]
    securityFeatures: any
    sewer: any
    spaFeatures: any
    specialListingConditions: any
    stories: any
    storiesDecimal: any
    storiesTotal: any
    structureType: any
    subdivisionName: any
    taxAnnualAmount: number | null
    taxAssessedValue: number | null
    tenantPays: any
    topography: any
    totalActualRent: any
    utilities: any
    vegetation: any
    view: any[]
    virtualTour: any
    waterSource: any
    waterBodyName: any
    waterfrontFeatures: any
    waterView: any
    waterViewYN: any
    windowFeatures: any
    woodedArea: any
    yearBuilt: number | null
    yearBuiltEffective: any
    zoning: any
    zoningDescription: any
    elementarySchool: any
    elementarySchoolDistrict: any
    listAOR: any
  }
  monthlyHoaFee: number | null
  livingArea: number | null
  livingAreaValue: number | null
  zestimate: number | null
  newConstructionType: any
  zestimateLowPercent: string | null
  zestimateHighPercent: string | null
  rentZestimate: number | null
  restimateLowPercent: string | null
  restimateHighPercent: string | null
  homeValues: any
  parentRegion: {
    name: string
    regionId: number
  }
  description: string
  whatILove: string | null
  contingentListingType: any
  timeOnZillow: string
  pageViewCount: number
  favoriteCount: number
  daysOnZillow: number
  latitude: number | null
  longitude: number | null
  openHouseSchedule: any[]
  desktopWebHdpImageLink: string
  brokerageName: string | null
  timeZone: string
  pals: any[]
  listedBy: {
    id: string
    elements: {
      id: string
      text: string
      action: any
    }[]
    textStyle: any
  }[]
  sellingSoon: any[]
  listingProvider: {
    title: string
    disclaimerText: string | null
    enhancedVideoURL: string | null
    enhancedDescriptionText: string | null
    showLogos: any
    logos: any[]
    showNoContactInfoMessage: boolean
    agentName: string | null
    agentLicenseNumber: string | null
    postingWebsiteURL: string | null
    postingWebsiteLinkText: string | null
    postingGroupName: string | null
    sourceText: string
    isZRMSourceText: string | null
  }
  isIncomeRestricted: boolean | null
  brokerId: string | null
  ssid: number
  mortgageZHLRates: {
    fifteenYearFixedBucket: {
      rate: number | null
      rateSource: string | null
      lastUpdated: number | null
    }
    thirtyYearFixedBucket: {
      rate: number | null
      rateSource: string | null
      lastUpdated: number | null
    }
    arm5Bucket: {
      rate: number | null
      rateSource: string | null
      lastUpdated: number | null
    }
  }
  propertyTaxRate: number
  hiResImageLink: string
  hdpTypeDimension: string
  mlsid: string | null
  ouid: string
  propertyTypeDimension: string
  mediumImageLink: string
  isZillowOwned: boolean
  enhancedBrokerImageUrl: string | null
  listingAccountUserId: string | null
  buildingId: any
  virtualTourUrl: string | null
  hasApprovedThirdPartyVirtualTourUrl: boolean
  photoCount: number
  livingAreaUnits: string | null
  lotSize: number | null
  lotAreaValue: number | null
  lotAreaUnits: string
  postingProductType: string
  marketingName: string | null
  priceHistory: PriceHistoryItem[] | null
  stateId: number
  zipPlusFour: string | null
  numberOfUnitsTotal: number | null
  foreclosureDefaultFilingDate: any
  foreclosureAuctionFilingDate: any
  foreclosureLoanDate: any
  foreclosureLoanOriginator: any
  foreclosureLoanAmount: any
  foreclosurePriorSaleDate: any
  foreclosurePriorSaleAmount: any
  foreclosureBalanceReportingDate: any
  foreclosureDefaultDescription: any
  foreclosurePastDueBalance: any
  foreclosureUnpaidBalance: any
  foreclosureAuctionTime: any
  foreclosureAuctionDescription: any
  foreclosureAuctionCity: any
  foreclosureAuctionLocation: any
  foreclosureDate: any
  foreclosureAmount: any
  foreclosingBank: any
  foreclosureJudicialType: string | null
  datePostedString: string
  foreclosureTypes: {
    isBankOwned: boolean
    isForeclosedNFS: boolean
    isPreforeclosure: boolean
    isAnyForeclosure: boolean
    wasNonRetailAuction: boolean
    wasForeclosed: boolean
    wasREO: boolean | null
    wasDefault: boolean | null
  }
  foreclosureMoreInfo: any
  hasBadGeocode: boolean
  streetViewMetadataUrlMediaWallLatLong: string
  streetViewMetadataUrlMediaWallAddress: string
  streetViewTileImageUrlMediumLatLong: string
  streetViewTileImageUrlMediumAddress: string
  streetViewServiceUrl: string
  staticMap: {
    sources: {
      width: number
      url: string
      isHighResolutionStaticMap: boolean | null
    }[]
  }
  postingUrl: string | null
  richMedia: any
  hasPublicVideo: boolean
  primaryPublicVideo: any
  richMediaVideos: any
  originalPhotos: {
    caption: string
    mixedSources: {
      jpeg: { url: string, width: number }[]
      webp: { url: string, width: number }[]
    }
  }[]
  listingSubType: {
    isFSBA: boolean
    isFSBO: boolean
    isPending: boolean
    isNewHome: boolean
    isForeclosure: boolean
    isBankOwned: boolean
    isForAuction: boolean
    isOpenHouse: boolean
    isComingSoon: boolean
  }
  tourViewCount: number
  postingContact: {
    name: string | null
    photo: any
  }
  listingAccount: any
  mortgageRates: {
    thirtyYearFixedRate: number
  }
  annualHomeownersInsurance: number
  listingFeedID: any
  livingAreaUnitsShort: string | null
  priceChange: number | null
  priceChangeDate: number | null
  priceChangeDateString: string | null
  formattedChip: {
    location: { fullValue: string }[]
  }
  hideZestimate: boolean
  comingSoonOnMarketDate: any
  isPreforeclosureAuction: boolean
  lastSoldPrice: number | null
  isHousingConnector: boolean
  thumb: { url: string }[]
  neighborhoodMapThumb: { url: string }[]
  isRecentStatusChange: boolean
  isNonOwnerOccupied: boolean
  isFeatured: boolean
  rentalApplicationsAcceptedType: string
  listingTypeDimension: string
  featuredListingTypeDimension: string
  brokerIdDimension: string
  keystoneHomeStatus: string
  pageUrlFragment: string
  isRentalsLeadCapMet: boolean
  isPaidMultiFamilyBrokerId: boolean
  countyId: number
  countyFIPS: string | null
  parcelId: string | null
  taxHistory: TaxHistoryItem[]
  neighborhoodId: number
  zipcodeId: number
}

export type ZillowListingForCheck = Pick<ZillowListing, 'zpid' | 'zipcode' | 'bedrooms'> & {
  priceHistory: PriceHistoryItemForCheck[] | null
}

export type ZillowListingForRow = ZillowListingForCheck
  & Pick<
    ZillowListing,
    | 'address'
    | 'bedrooms'
    | 'daysOnZillow'
    | 'hdpUrl'
    | 'homeStatus'
    | 'homeType'
    | 'isRentalListingOffMarket'
    | 'price'
    | 'timeOnZillow'
    | 'zipcode'
    | 'zpid'
  >
  & Partial<
    Pick<
      ZillowListing,
      | 'neighborhoodRegion'
      | 'attributionInfo'
      | 'brokerageName'
      | 'resoFacts'
      | 'latitude'
      | 'longitude'
    >
  >

export const isZillowListingForRow = (value: unknown): value is ZillowListingForRow => {
  if (value === undefined) return false
  if (value === null) return false
  if (typeof value !== 'object') return false

  const cast = value as ZillowListingForRow

  if (cast.address === undefined) return false
  if (typeof cast.bedrooms !== 'number') return false
  if (typeof cast.bedrooms !== 'number') return false
  if (typeof cast.daysOnZillow !== 'number') return false
  if (typeof cast.hdpUrl !== 'string') return false
  if (typeof cast.homeStatus !== 'string') return false
  if (typeof cast.homeType !== 'string') return false
  if (typeof cast.isRentalListingOffMarket !== 'boolean') return false
  if (typeof cast.price !== 'number') return false
  if (typeof cast.timeOnZillow !== 'string') return false
  if (typeof cast.zipcode !== 'string') return false
  if (typeof cast.zpid !== 'number') return false

  return true
}
