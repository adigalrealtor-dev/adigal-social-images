import crypto from 'node:crypto';

const BASE_URL = (process.env.PUBLIC_BASE_URL || 'https://adigal-social-images.vercel.app').replace(/\/$/, '');
const DRY_RUN = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true';
const DESTINATIONS = cleanSecret(process.env.POST_DESTINATIONS || 'instagram,facebook')
  .toLowerCase()
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);

const IG_ACCOUNT_LABEL = 'Adi Gal | הנדלניסטית | Real Estate';
const HEADSHOTS = [
  'adi-white-suit',
  'adi-white-office',
  'adi-black-blazer',
  'adi-black-standing',
  'adi-green-blazer',
  'adi-navy-seated',
  'adi-gray-blazer',
  'adi-pointing',
  'adi-street-black',
];

const THEMES = ['luxury', 'coastal', 'modern', 'warm'];

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

function pick(list, seed) {
  const index = Math.abs(hash(seed)) % list.length;
  return list[index];
}

function hash(value) {
  return String(value || '').split('').reduce((sum, ch) => (sum * 31 + ch.charCodeAt(0)) | 0, 7);
}

function short(value, fallback = '', max = 140) {
  const text = String(value || fallback || '').trim();
  return text.length > max ? `${text.slice(0, max - 1).trim()}...` : text;
}

function money(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return '$1,100,000';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(num);
}

function firstValue(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== '') || '';
}

function cleanSecret(value) {
  return String(value || '').trim().replace(/^["']|["']$/g, '').trim();
}

function cleanBridgeToken(value) {
  return cleanSecret(value).replace(/^Bearer\s+/i, '').trim();
}

function md5(value) {
  return crypto.createHash('md5').update(value).digest('hex');
}

function buildUrl(path, params) {
  const url = new URL(path, BASE_URL);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
  }
  return url.toString();
}

function researchHeadline(researchContext, fallback) {
  const line = String(researchContext || '').split('\n').find(Boolean);
  if (!line) return fallback;
  return short(
    line
      .replace(/^\d+\.\s*/, '')
      .replace(/\s+\([^()]+\)\s+-\s+.+$/, '')
      .replace(/\s+-\s+.+$/, ''),
    fallback,
    64,
  );
}

function researchSubline(researchContext, fallback, max = 84) {
  const headline = researchHeadline(researchContext, '');
  return headline ? short(headline, fallback, max) : fallback;
}

function mortgageRateFromResearch(researchContext) {
  const text = String(researchContext || '');
  const match = text.match(/\b([5-9]\.\d{1,2})%/);
  return match ? `${match[1]}%` : '';
}

function isCondoLike(listing) {
  const text = [
    listing?.address,
    listing?.propertyType,
    listing?.propertySubType,
    listing?.remarks,
  ].join(' ').toLowerCase();
  return /condo|apartment|unit|#|apt|co-op|coop|townhouse/.test(text);
}

function selectListingPhotoUrls(urls, listing) {
  const cleanUrls = [...new Set((urls || []).filter(Boolean))];
  if (!cleanUrls.length) return [];

  const start = isCondoLike(listing) && cleanUrls.length >= 9 ? 6 : 0;
  const preferred = cleanUrls.slice(start).concat(cleanUrls.slice(0, start));
  return preferred.slice(0, 10);
}

function buildListingHeadline(row, { city, propertySubType, propertyType }) {
  const subdivision = short(firstValue(row.SubdivisionName, row.MIAMIRE_SubdivisionInformation), '', 24);
  const type = firstValue(propertySubType, propertyType, 'Residence');
  const typeText = [type, propertyType, propertySubType, subdivision].join(' ');
  const normalizedType = /condo|condominium|apartment|unit/i.test(typeText)
    ? 'Condo'
    : /income|multi.?family|duplex|triplex|quadruplex/i.test(typeText)
      ? 'Income Property'
    : /lease|rental/i.test(typeText)
      ? 'Rental'
      : short(type, 'Residence', 18);
  const area = ['Condo', 'Rental', 'Income Property'].includes(normalizedType)
    ? firstValue(city, subdivision, 'South Florida')
    : firstValue(subdivision, city, 'South Florida');

  return short(`${area} ${normalizedType}`, 'South Florida Residence', 34);
}

function listingStatusLabel(row) {
  const typeText = [
    row.TransactionType,
    row.ListingType,
    row.PropertyType,
    row.PropertySubType,
    row.StandardStatus,
    row.MlsStatus,
  ].join(' ').toLowerCase();

  if (/commercial/.test(typeText) && /lease|rental|rent/.test(typeText)) return 'FOR LEASE';
  if (/lease|rental|rent/.test(typeText)) return 'FOR RENT';
  if (/income|sale|purchase|residential|single family|condo|townhouse|multi.?family|duplex|triplex|quadruplex/.test(typeText)) return 'FOR SALE';
  return 'ACTIVE LISTING';
}

function listingActionText(label) {
  if (label === 'FOR RENT') return 'available for rent';
  if (label === 'FOR LEASE') return 'available for lease';
  if (label === 'FOR SALE') return 'listed for sale';
  return 'available now';
}

function postTypeFor(date = new Date()) {
  const forced = (process.env.POST_TYPE || '').toLowerCase();
  if (['listing', 'market', 'mortgage'].includes(forced)) return forced;

  const utcHour = date.getUTCHours();
  if (utcHour === 15) return 'mortgage';
  if (utcHour === 19) return 'listing';
  return 'market';
}

function newYorkParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

function seedForRun(type, date = new Date()) {
  if (process.env.POST_SEED) return process.env.POST_SEED;
  const parts = newYorkParts(date);
  const localDate = `${parts.year}-${parts.month}-${parts.day}`;
  const slot = process.env.POST_SLOT || `${parts.hour}${parts.minute}`;
  return `${localDate}-${type}-${slot}`;
}

function mortgageContent(seed, researchContext = '') {
  const topic = pick([
    {
      rate: 'Rate Check',
      headlineEn: 'Buy vs. Rent Check-In',
      headlineHe: 'לקנות או לשכור?',
      caption: 'Mortgage watch: today is a good day to compare payment, rent, and long-term equity side by side. The right move depends on cash flow, timeline, and the property itself. DM Adi Gal to review your buying power in South Florida.\n\nבדיקה נכונה של משכנתא מתחילה במספרים ולא בתחושת בטן.\n\n#MiamiRealEstate #SouthFloridaRealEstate #MortgageMarket #BuyVsRent #HomeBuying #MiamiHomes #FloridaRealEstate #RealEstateInvesting',
    },
    {
      rate: 'Payment Focus',
      headlineEn: 'Monthly Payment Matters',
      headlineHe: 'התשלום החודשי קובע',
      caption: 'Mortgage watch: do not shop only by price. Monthly payment, insurance, HOA, taxes, and rate options are what decide whether a deal truly works. DM Adi Gal before you write the offer.\n\nלפני הצעה על נכס, חשוב להבין את כל התשלום החודשי.\n\n#MiamiRealEstate #MortgageTips #SouthFloridaHomes #HomeBuying #RealEstateBroker #MiamiCondos #FloridaHomes #BuyWithConfidence',
    },
    {
      rate: 'Investor Lens',
      headlineEn: 'Run the Numbers First',
      headlineHe: 'בודקים מספרים לפני קנייה',
      caption: 'Mortgage watch: investors should look beyond the rate and stress-test rent, reserves, vacancy, HOA, and exit strategy. A strong property can still be a weak deal if the financing does not fit. DM Adi Gal for a South Florida review.\n\nבהשקעה נכונה, המימון חייב להתאים לתכנית.\n\n#MiamiInvesting #RealEstateInvesting #MortgageMarket #SouthFloridaRealEstate #InvestmentProperty #MiamiRealEstate #RentalProperty #FloridaInvestors',
    },
    {
      rate: 'Buyer Strategy',
      headlineEn: 'Pre-Approval Before Touring',
      headlineHe: 'אישור עקרוני לפני סיור',
      caption: 'Mortgage watch: serious buyers should refresh pre-approval before touring. It helps you move faster, negotiate cleaner, and avoid surprises once the right South Florida property appears. DM Adi Gal to get prepared.\n\nקונה מוכן יכול לפעול מהר כשהנכס הנכון מופיע.\n\n#MiamiHomes #HomeBuyerTips #MortgagePreapproval #SouthFloridaRealEstate #MiamiRealEstate #BuyAHome #RealEstateBroker #FloridaProperty',
    },
  ], seed);

  return {
    ...topic,
    researchHeadline: researchHeadline(researchContext, topic.headlineEn),
  };
}

function marketContent(seed, researchContext = '') {
  const topics = [
    {
      headline: 'Seller Market Check-In',
      sub: 'Low inventory keeps well-priced South Florida homes competitive.',
      stat1Num: 'Tight',
      stat1Label: 'Inventory',
      stat2Num: 'Fast',
      stat2Label: 'Buyer activity',
      stat3Num: 'Strong',
      stat3Label: 'Pricing power',
      caption: 'Market pulse: South Florida still rewards sellers who price strategically and present the property well. Buyers are active, but they are also selective. DM Adi Gal to review your neighborhood and timing.\n\nבשוק הנכון, תמחור נכון עושה את כל ההבדל.\n\n#MiamiRealEstate #SouthFloridaRealEstate #SellerMarket #HomeSelling #MiamiHomes #BrowardRealEstate #RealEstateBroker #SellWithAdi',
    },
    {
      headline: 'Condo Market Snapshot',
      sub: 'HOA, reserves, insurance, and location matter more than ever.',
      stat1Num: 'HOA',
      stat1Label: 'Key factor',
      stat2Num: 'Reserves',
      stat2Label: 'Buyer focus',
      stat3Num: 'Location',
      stat3Label: 'Value driver',
      caption: 'Market pulse: condo buyers in South Florida are looking closely at HOA fees, building reserves, insurance, and lifestyle value. The right condo can still be a smart move when the numbers make sense. DM Adi Gal to compare options.\n\nבקניית דירה, חשוב לבדוק גם את הבניין ולא רק את היחידה.\n\n#MiamiCondos #SouthFloridaRealEstate #CondoMarket #MiamiRealEstate #HomeBuying #RealEstateInvesting #BrowardCondos #AdiGal',
    },
    {
      headline: 'Investor Watch',
      sub: 'Short-term rental rules and cash flow decide the real opportunity.',
      stat1Num: 'Cash Flow',
      stat1Label: 'Priority',
      stat2Num: 'Rules',
      stat2Label: 'STR check',
      stat3Num: 'Exit',
      stat3Label: 'Strategy',
      caption: 'Market pulse: Airbnb and investment properties need more than a pretty listing. Review local rules, realistic income, reserves, HOA limits, and resale strategy before moving forward. DM Adi Gal to run the numbers.\n\nבהשקעה טובה, התשואה מתחילה בבדיקה נכונה.\n\n#MiamiInvesting #AirbnbInvestment #SouthFloridaRealEstate #InvestmentProperty #MiamiRealEstate #RentalProperty #RealEstateBroker #FloridaInvestors',
    },
    {
      headline: 'Buyer Opportunity',
      sub: 'Prepared buyers can still find value when they know where to look.',
      stat1Num: 'Ready',
      stat1Label: 'Pre-approval',
      stat2Num: 'Local',
      stat2Label: 'Market knowledge',
      stat3Num: 'Smart',
      stat3Label: 'Negotiation',
      caption: 'Market pulse: buyers still have opportunities in South Florida, especially when they are pre-approved, focused, and ready to negotiate. The best value is usually found before everyone else notices it. DM Adi Gal to start searching.\n\nקונה מוכן יכול למצוא הזדמנות גם בשוק תחרותי.\n\n#MiamiHomes #HomeBuying #SouthFloridaRealEstate #BuyerOpportunity #MiamiRealEstate #BuySellInvest #FloridaHomes #RealEstateBroker',
    },
    {
      headline: 'Luxury Demand Update',
      sub: 'Lifestyle, taxes, and global demand continue to support Miami.',
      stat1Num: 'Global',
      stat1Label: 'Buyer demand',
      stat2Num: 'Lifestyle',
      stat2Label: 'Main driver',
      stat3Num: 'Miami',
      stat3Label: 'Long-term appeal',
      caption: 'Market pulse: Miami luxury demand continues to be driven by lifestyle, tax advantages, business relocation, and international buyers. The right property still needs smart pricing and sharp negotiation. DM Adi Gal for guidance.\n\nמיאמי ממשיכה למשוך קונים שמחפשים איכות חיים והשקעה חכמה.\n\n#MiamiLuxuryRealEstate #SouthFloridaRealEstate #MiamiHomes #LuxuryMarket #RealEstateBroker #BuySellInvest #FloridaRealEstate #AdiGal',
    },
  ];

  const text = String(researchContext || '').toLowerCase();
  const matchedTopic = [
    [/condo|hoa|reserve|assessment|insurance/, 'Condo Market Snapshot'],
    [/airbnb|short.?term|rental|investor|investment/, 'Investor Watch'],
    [/luxury|waterfront|international|global|relocation/, 'Luxury Demand Update'],
    [/buyer|affordability|opportunity|rent/, 'Buyer Opportunity'],
    [/seller|inventory|supply|price|pricing/, 'Seller Market Check-In'],
  ].map(([pattern, headline]) => pattern.test(text) && topics.find((topic) => topic.headline === headline)).find(Boolean);

  return matchedTopic || pick(topics, seed);
}

function fallbackCaption(type, listing, seed, researchContext = '') {
  if (type === 'mortgage') return mortgageContent(seed, researchContext).caption;
  if (type === 'listing' && listing) {
    const action = listingActionText(listing.statusLabel);
    const hashtags = listing.statusLabel === 'FOR RENT' || listing.statusLabel === 'FOR LEASE'
      ? '#MiamiRealEstate #SouthFloridaRealEstate #MiamiRentals #ForRentMiami #MiamiListings #RealEstateBroker #FloridaRealEstate'
      : '#MiamiRealEstate #SouthFloridaRealEstate #MiamiListings #HomeForSale #InvestmentProperty #RealEstateBroker #BuySellInvest #FloridaRealEstate';
    return `${listing.headline || 'South Florida listing'} ${action}: ${listing.address || 'new property available'} at ${listing.price || 'today'}${listing.beds ? ` with ${listing.beds} beds` : ''}${listing.baths ? ` and ${listing.baths} baths` : ''}. DM Adi Gal for details or to schedule a showing.\n\nלפרטים נוספים או לתיאום סיור, שלחו הודעה לאדי גל.\n\n${hashtags}`;
  }
  return marketContent(seed, researchContext).caption;
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${text.slice(0, 1200)} from ${redactUrl(url)}`);
  }
  return text ? JSON.parse(text) : {};
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchText(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${text.slice(0, 1200)} from ${redactUrl(url)}`);
  }
  return text;
}

function redactUrl(url) {
  const safeUrl = new URL(String(url));
  if (safeUrl.searchParams.has('access_token')) safeUrl.searchParams.set('access_token', '***');
  return safeUrl.toString();
}

function decodeXml(value) {
  return String(value || '')
    .replace(/<!\[CDATA\[|\]\]>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function rssItems(xml, limit = 6) {
  return [...String(xml || '').matchAll(/<item\b[\s\S]*?<\/item>/gi)]
    .map((match) => {
      const item = match[0];
      const field = (name) => decodeXml(item.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, 'i'))?.[1]);
      const date = field('pubDate');
      return {
        title: field('title'),
        source: field('source'),
        date,
        dateMs: Date.parse(date),
        summary: field('description'),
      };
    })
    .filter((item) => item.title)
    .slice(0, limit);
}

function itemMatches(type, item) {
  const text = `${item.title} ${item.summary} ${item.source}`.toLowerCase();
  if (type === 'mortgage') {
    return /mortgage|rate|interest|refinance|buy vs rent|affordability|housing/.test(text);
  }
  return /miami|south florida|broward|palm beach|condo|housing|real estate|inventory|seller|buyer|airbnb|short.?term|luxury/.test(text)
    && !/world cup|soccer|stadium/.test(text);
}

function isRecentItem(item, maxAgeDays = 10) {
  if (!Number.isFinite(item.dateMs)) return true;
  return Date.now() - item.dateMs <= maxAgeDays * 24 * 60 * 60 * 1000;
}

async function fetchResearchContext(type) {
  if (type === 'listing') return '';

  const queries = type === 'mortgage'
    ? [
      'mortgage rates today housing market when:3d',
      'buy vs rent mortgage affordability Florida when:7d',
      'current mortgage rates real estate buyers when:7d',
    ]
    : [
      'Miami real estate market inventory prices condo when:7d',
      'South Florida housing market buyers sellers inventory when:7d',
      'Miami Airbnb short term rental investment real estate when:14d',
      'Broward Miami luxury real estate market when:14d',
    ];

  try {
    const results = await Promise.all(queries.map(async (query) => {
      const url = new URL('https://news.google.com/rss/search');
      url.searchParams.set('q', query);
      url.searchParams.set('hl', 'en-US');
      url.searchParams.set('gl', 'US');
      url.searchParams.set('ceid', 'US:en');
      const xml = await fetchText(url);
      return rssItems(xml, 8);
    }));

    const seen = new Set();
    const items = results
      .flat()
      .filter((item) => itemMatches(type, item))
      .filter((item) => isRecentItem(item, type === 'mortgage' ? 7 : 14))
      .filter((item) => {
        const key = item.title.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 8);

    if (!items.length) return '';
    return items
      .map((item, index) => `${index + 1}. ${item.title}${item.source ? ` (${item.source})` : ''}${item.date ? ` - ${item.date}` : ''}`)
      .join('\n');
  } catch (error) {
    console.warn(`Research lookup failed for ${type}; continuing with general context. ${error.message}`);
    return '';
  }
}

function anthropicHeaders(apiKey) {
  return {
    'content-type': 'application/json',
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01',
  };
}

async function availableAnthropicModels(apiKey) {
  try {
    const data = await fetchJson('https://api.anthropic.com/v1/models?limit=100', {
      headers: anthropicHeaders(apiKey),
    });
    const ids = (data.data || []).map((model) => model.id).filter(Boolean);
    const preferred = ids.filter((id) => /haiku/i.test(id)).concat(ids.filter((id) => /sonnet/i.test(id)));
    return [...new Set(preferred.length ? preferred : ids)];
  } catch (error) {
    console.warn(`Could not list Anthropic models; using built-in fallbacks. ${error.message}`);
    return [];
  }
}

async function fetchBridgeListing(seed) {
  const token = cleanBridgeToken(process.env.BRIDGE_ACCESS_TOKEN);
  const dataset = cleanSecret(process.env.BRIDGE_DATASET_ID).replace(/^\/+|\/+$/g, '');
  if (!token || !dataset) return null;

  try {
    return await fetchBridgeODataListing({ token, dataset, seed });
  } catch (error) {
    console.warn(`Bridge OData listing lookup failed; trying native Bridge listings API. ${error.message}`);
    return fetchBridgeNativeListing({ token, dataset, seed });
  }
}

function bridgeAuth(url, token, mode) {
  const headers = { Accept: 'application/json' };
  if (mode === 'bearer') {
    headers.Authorization = `Bearer ${token}`;
  } else {
    url.searchParams.set('access_token', token);
  }
  return headers;
}

async function fetchBridgeJson(makeUrl) {
  const mode = (process.env.BRIDGE_AUTH_MODE || 'auto').toLowerCase();
  const modes = mode === 'bearer' || mode === 'query' ? [mode] : ['query', 'bearer'];
  let lastError;

  for (const authMode of modes) {
    const url = makeUrl();
    const headers = bridgeAuth(url, cleanBridgeToken(process.env.BRIDGE_ACCESS_TOKEN), authMode);
    try {
      return await fetchJson(url, { headers });
    } catch (error) {
      lastError = error;
      if (!String(error.message).includes('HTTP 401')) throw error;
      console.warn(`Bridge ${authMode} auth failed; ${authMode === modes[modes.length - 1] ? 'no auth modes left' : 'trying next auth mode'}. ${error.message}`);
    }
  }

  throw lastError;
}

async function fetchBridgeODataListing({ token, dataset, seed }) {
  const bridgeBase = (process.env.BRIDGE_API_BASE || 'https://api.bridgedataoutput.com/api/v2/OData').replace(/\/$/, '');
  const data = await fetchBridgeJson(() => {
    const url = new URL(`${bridgeBase}/${dataset}/Property`);
    url.searchParams.set('$top', process.env.BRIDGE_TOP || '30');
    url.searchParams.set('$orderby', process.env.BRIDGE_ORDER_BY || 'ModificationTimestamp desc');
    url.searchParams.set('$expand', 'Media');

    const agentId = cleanSecret(process.env.BRIDGE_AGENT_ID);
    const defaultFilter = agentId
      ? `StandardStatus eq 'Active' and (ListAgentMlsId eq '${agentId}' or BuyerAgentMlsId eq '${agentId}')`
      : "StandardStatus eq 'Active'";
    const filter = process.env.BRIDGE_FILTER || defaultFilter;
    if (filter) url.searchParams.set('$filter', filter);
    return url;
  });
  const rows = data.value || data.d?.results || [];
  if (!rows.length) return null;

  const listing = pickBridgeListing(rows.map(normalizeBridgeListing), seed);
  return hydrateBridgeListingPhotos(listing, dataset);
}

async function fetchBridgeNativeListing({ token, dataset, seed }) {
  const bridgeBase = (process.env.BRIDGE_NATIVE_API_BASE || 'https://api.bridgedataoutput.com/api/v2').replace(/\/$/, '');
  const data = await fetchBridgeJson(() => {
    const url = new URL(`${bridgeBase}/${dataset}/listings`);
    url.searchParams.set('limit', process.env.BRIDGE_TOP || '30');
    url.searchParams.set('sortBy', process.env.BRIDGE_NATIVE_SORT_BY || 'ModificationTimestamp');
    url.searchParams.set('order', process.env.BRIDGE_NATIVE_ORDER || 'desc');
    url.searchParams.set('StandardStatus', process.env.BRIDGE_STATUS || 'Active');
    if (cleanSecret(process.env.BRIDGE_AGENT_ID)) url.searchParams.set('ListAgentMlsId', cleanSecret(process.env.BRIDGE_AGENT_ID));
    return url;
  });
  const rows = data.bundle || data.value || data.records || data.listings || data.data || [];
  if (!rows.length) return null;

  const listing = pickBridgeListing(rows.map(normalizeBridgeListing), seed);
  return hydrateBridgeListingPhotos(listing, dataset);
}

function pickBridgeListing(listings, seed) {
  const usefulListings = listings.filter((listing) => listing?.photo1 || listing?.photosCount > 0);
  const pool = usefulListings.length ? usefulListings : listings.filter((listing) => listing?.listingId);
  return pool.length ? pick(pool, seed) : null;
}

function normalizeBridgeListing(row) {
  const media = bridgeMediaItems(row);
  const mediaUrls = media
    .map(mediaUrl)
    .filter(Boolean)
    .slice(0, 12);

  const city = firstValue(row.City, row.CityRegion);
  const state = firstValue(row.StateOrProvince, row.State, 'FL');
  const address = firstValue(row.UnparsedAddress, [row.StreetNumber, row.StreetName, city, state].filter(Boolean).join(', '));
  const remarks = firstValue(row.PublicRemarks, row.Remarks, row.MarketingRemarks);
  const propertyType = firstValue(row.PropertyType, row.PropertySubType);
  const propertySubType = firstValue(row.PropertySubType, row.PropertySubTypeAdditional);
  const headline = buildListingHeadline(row, { city, propertySubType, propertyType });
  const statusLabel = listingStatusLabel(row);

  const listing = {
    listingId: firstValue(row.ListingId, row.ListingID, row.MlsNumber),
    listingKey: firstValue(row.ListingKey, row.ResourceRecordKey, row.ListingKeyNumeric),
    photosCount: Number(firstValue(row.PhotosCount, row.PhotoCount, row.MediaCount, mediaUrls.length)) || 0,
    address,
    city,
    state,
    price: money(firstValue(row.ListPrice, row.CurrentPrice, row.OriginalListPrice)),
    beds: firstValue(row.BedroomsTotal, row.BedsTotal, row.Bedrooms, '3'),
    baths: firstValue(row.BathroomsTotalDecimal, row.BathroomsTotalInteger, row.BathroomsFull, row.BathsTotal, row.BathsTotalInteger, '2'),
    sqft: firstValue(row.LivingArea, row.BuildingAreaTotal, row.LotSizeSquareFeet),
    headline,
    remarks,
    propertyType,
    propertySubType,
    statusLabel,
  };

  const selectedMediaUrls = selectListingPhotoUrls(mediaUrls, listing);
  listing.photoUrls = selectedMediaUrls;
  listing.photo1 = selectedMediaUrls[0] || '';
  listing.photo2 = selectedMediaUrls[1] || selectedMediaUrls[0] || '';
  listing.photo3 = selectedMediaUrls[2] || selectedMediaUrls[0] || '';

  return listing;
}

async function hydrateBridgeListingPhotos(listing, dataset) {
  if (!listing || listing.photo1) return listing;

  const retsUrls = await fetchBridgeRetsPhotoUrls({ dataset, listingId: listing.listingId });
  const selectedUrls = selectListingPhotoUrls(retsUrls, listing);
  listing.photoUrls = selectedUrls;
  listing.photo1 = selectedUrls[0] || '';
  listing.photo2 = selectedUrls[1] || selectedUrls[0] || '';
  listing.photo3 = selectedUrls[2] || selectedUrls[0] || '';
  return listing;
}

function bridgeMediaItems(row) {
  const candidates = [
    row.Media,
    row.media,
    row.Photos,
    row.photos,
    row.Images,
    row.images,
    row.Media?.value,
    row.Media?.results,
    row._embedded?.media,
    row._embedded?.Media,
  ];
  return candidates.find(Array.isArray) || [];
}

function mediaUrl(item) {
  if (!item || typeof item !== 'object') return '';
  return firstValue(
    item.MediaURL,
    item.ResizeMediaURL,
    item.MediaURLFull,
    item.MediaURLLarge,
    item.MediaURLMedium,
    item.MediaUrl,
    item.Url,
    item.URI,
    item.uri,
    item.url,
    item.href,
    item.Link,
    item.link,
  );
}

function parseDigestChallenge(header) {
  const values = {};
  const challenge = String(header || '').replace(/^Digest\s+/i, '');
  for (const part of challenge.match(/(?:[^,"]|"[^"]*")+/g) || []) {
    const [rawKey, ...rawValue] = part.trim().split('=');
    if (!rawKey || !rawValue.length) continue;
    values[rawKey] = rawValue.join('=').replace(/^"|"$/g, '');
  }
  return values;
}

function digestAuthHeader({ challenge, method, uri, username, password, nc = '00000001' }) {
  const realm = challenge.realm;
  const nonce = challenge.nonce;
  const qop = (challenge.qop || 'auth').split(',')[0].trim();
  const algorithm = challenge.algorithm || 'MD5';
  const cnonce = md5(`${Date.now()}:${username}:${uri}`).slice(0, 16);
  const ha1 = md5(`${username}:${realm}:${password}`);
  const ha2 = md5(`${method}:${uri}`);
  const response = md5(`${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}`);

  return [
    `Digest username="${username}"`,
    `realm="${realm}"`,
    `nonce="${nonce}"`,
    `uri="${uri}"`,
    `algorithm=${algorithm}`,
    `response="${response}"`,
    `qop=${qop}`,
    `nc=${nc}`,
    `cnonce="${cnonce}"`,
  ].join(', ');
}

async function fetchWithDigest(url, { username, password, cookie } = {}) {
  const target = new URL(url);
  const first = await fetch(target, {
    headers: {
      Accept: '*/*',
      ...(cookie ? { Cookie: cookie } : {}),
    },
  });

  if (first.status !== 401 || !username || !password) return first;

  const challenge = parseDigestChallenge(first.headers.get('www-authenticate'));
  const auth = digestAuthHeader({
    challenge,
    method: 'GET',
    uri: `${target.pathname}${target.search}`,
    username,
    password,
  });

  return fetch(target, {
    headers: {
      Accept: '*/*',
      Authorization: auth,
      ...(cookie ? { Cookie: cookie } : {}),
    },
  });
}

async function fetchBridgeRetsPhotoUrls({ dataset, listingId }) {
  const username = cleanSecret(process.env.BRIDGE_CLIENT_ID);
  const password = cleanSecret(process.env.BRIDGE_CLIENT_SECRET);
  if (!username || !password || !dataset || !listingId) return [];

  const bridgeBase = (process.env.BRIDGE_NATIVE_API_BASE || 'https://api.bridgedataoutput.com/api/v2').replace(/\/$/, '');
  const loginUrl = `${bridgeBase}/rets/${dataset}/login`;

  try {
    const login = await fetchWithDigest(loginUrl, { username, password });
    if (!login.ok) throw new Error(`Bridge RETS login HTTP ${login.status}: ${(await login.text()).slice(0, 300)}`);

    const setCookie = login.headers.get('set-cookie') || '';
    const cookie = setCookie.split(';')[0];
    if (!cookie) throw new Error('Bridge RETS login did not return a session cookie');

    const objectUrl = new URL(`${bridgeBase}/rets/${dataset}/getObject`);
    objectUrl.searchParams.set('Resource', 'Property');
    objectUrl.searchParams.set('Type', 'Photo');
    objectUrl.searchParams.set('ID', `${listingId}:*`);
    objectUrl.searchParams.set('Location', '1');

    const photos = await fetch(objectUrl, { headers: { Cookie: cookie, Accept: '*/*' } });
    const text = await photos.text();
    if (!photos.ok) throw new Error(`Bridge RETS photos HTTP ${photos.status}: ${text.slice(0, 300)}`);

    return [...text.matchAll(/^Location:\s*(https?:\/\/\S+)/gim)]
      .map((match) => match[1].trim())
      .slice(0, 12);
  } catch (error) {
    console.warn(`Bridge RETS photo lookup failed for ${listingId}; continuing without MLS photos. ${error.message}`);
    return [];
  }
}

function buildImage(type, listing, seed, researchContext = '') {
  const theme = pick(THEMES, seed);
  const headshot = pick(HEADSHOTS, seed);

  if (type === 'listing' && listing?.photo1) {
    return buildUrl('/api/listing', {
      photo_url: listing.photo1,
      photo2_url: listing.photo2,
      photo3_url: listing.photo3,
      address: listing.address,
      headline: listing.headline,
      price: listing.price,
      beds: listing.beds,
      baths: listing.baths,
      sqft: listing.sqft,
      property_type: listing.propertyType,
      tag_label: listing.statusLabel,
      theme,
      headshot,
      v: seed,
    });
  }

  if (type === 'mortgage') {
    const mortgage = mortgageContent(seed, researchContext);
    const currentRate = mortgageRateFromResearch(researchContext);
    return buildUrl('/api/mortgage', {
      rate: process.env.MORTGAGE_RATE || currentRate || mortgage.rate,
      headline_en: process.env.MORTGAGE_HEADLINE_EN || (currentRate ? 'Mortgage Rates Today' : mortgage.headlineEn),
      headline_he: process.env.MORTGAGE_HEADLINE_HE || mortgage.headlineHe,
      theme,
      headshot,
      v: seed,
    });
  }

  const market = marketContent(seed, researchContext);
  return buildUrl('/api/market', {
    headline: process.env.MARKET_HEADLINE || market.headline,
    sub: process.env.MARKET_SUB || researchSubline(researchContext, market.sub),
    stat1_num: process.env.MARKET_STAT1_NUM || market.stat1Num,
    stat1_label: process.env.MARKET_STAT1_LABEL || market.stat1Label,
    stat2_num: process.env.MARKET_STAT2_NUM || market.stat2Num,
    stat2_label: process.env.MARKET_STAT2_LABEL || market.stat2Label,
    stat3_num: process.env.MARKET_STAT3_NUM || market.stat3Num,
    stat3_label: process.env.MARKET_STAT3_LABEL || market.stat3Label,
    theme,
    headshot,
    v: seed,
  });
}

function buildPostImageUrls(type, listing, seed, researchContext = '') {
  const heroImage = buildImage(type, listing, seed, researchContext);
  if (type !== 'listing' || !listing?.photoUrls?.length) return [heroImage];

  const propertyPhotos = listing.photoUrls
    .filter((url) => url && url !== listing.photo1)
    .slice(0, 9);
  return [heroImage, ...propertyPhotos];
}

async function makeCaption(type, listing, seed, researchContext = '') {
  if (process.env.CAPTION_TEXT) return process.env.CAPTION_TEXT;
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('ANTHROPIC_API_KEY is missing; using fallback caption.');
    return fallbackCaption(type, listing, seed, researchContext);
  }

  const apiKey = required('ANTHROPIC_API_KEY');
  const prompt = [
    'Write an Instagram caption for Adi Gal, a South Florida real estate broker.',
    'Return only the final caption text. Do not include labels, headings, or markdown section names.',
    'Tone: polished, clear, helpful, not hypey.',
    'Avoid emoji unless it is genuinely useful.',
    'Keep it under 1,300 characters.',
    'Include a short CTA to DM or call Adi.',
    'Write the main caption in English, then add one natural Hebrew line.',
    'Include 7-12 relevant hashtags focused on Miami real estate, South Florida real estate, buying, selling, investing, listings, and mortgages when relevant.',
    `Post type: ${type}.`,
    type === 'market' ? 'Do not write a generic daily market update. Pick one concrete angle for today: seller market, buyer opportunity, condo market, Airbnb/short-term rental investing, luxury demand, inventory, insurance, prices, or South Florida demand.' : '',
    type === 'mortgage' ? 'Do not write the same generic mortgage watch caption. Pick one concrete angle for today: rate check, monthly payment, buy vs rent, pre-approval, refinancing, affordability, investor financing, or payment strategy.' : '',
    type === 'listing' ? 'Be specific about whether the listing is for rent, for lease, or for sale. Mention the address, price, beds/baths if present, and that the carousel includes property photos.' : '',
    researchContext ? `Fresh research context:\n${researchContext.slice(0, 1800)}` : '',
    listing ? `Listing context: ${JSON.stringify(listing).slice(0, 1800)}` : '',
  ].filter(Boolean).join('\n');

  const fallbackModels = [
    process.env.ANTHROPIC_MODEL,
    'claude-3-5-haiku-20241022',
    'claude-3-7-sonnet-20250219',
    'claude-sonnet-4-20250514',
    'claude-3-5-sonnet-latest',
    'claude-3-5-haiku-latest',
    'claude-3-5-sonnet-20241022',
    'claude-3-haiku-20240307',
  ].filter(Boolean);

  const discoveredModels = await availableAnthropicModels(apiKey);
  const modelCandidates = [...new Set([
    process.env.ANTHROPIC_MODEL,
    ...discoveredModels,
    ...fallbackModels,
  ].filter(Boolean))];

  for (const model of modelCandidates) {
    try {
      const data = await fetchJson('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: anthropicHeaders(apiKey),
        body: JSON.stringify({
          model,
          max_tokens: 500,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      const caption = data.content?.map((part) => part.text || '').join('').trim();
      if (caption) return caption;
    } catch (error) {
      console.warn(`Anthropic caption attempt failed with ${model}; trying fallback. ${error.message}`);
    }
  }

  return fallbackCaption(type, listing, seed, researchContext);
}

async function createInstagramMediaContainer({ graphBase, igUserId, token, imageUrl, caption, carouselItem = false }) {
  const createUrl = new URL(`${graphBase}/${igUserId}/media`);
  createUrl.searchParams.set('image_url', imageUrl);
  createUrl.searchParams.set('access_token', token);
  if (caption) createUrl.searchParams.set('caption', caption);
  if (carouselItem) createUrl.searchParams.set('is_carousel_item', 'true');
  const container = await fetchJson(createUrl, { method: 'POST' });
  if (!container.id) throw new Error(`Meta did not return a media container id: ${JSON.stringify(container)}`);
  return container.id;
}

async function publishInstagram(imageUrls, caption) {
  const igUserId = required('META_IG_USER_ID');
  const token = required('META_ACCESS_TOKEN');
  const graphVersion = process.env.META_GRAPH_VERSION || 'v20.0';
  const graphBase = `https://graph.facebook.com/${graphVersion}`;
  const images = Array.isArray(imageUrls) ? imageUrls.filter(Boolean).slice(0, 10) : [imageUrls].filter(Boolean);

  let creationId;
  if (images.length > 1) {
    const childIds = [];
    for (const imageUrl of images) {
      childIds.push(await createInstagramMediaContainer({ graphBase, igUserId, token, imageUrl, carouselItem: true }));
    }

    const createCarouselUrl = new URL(`${graphBase}/${igUserId}/media`);
    createCarouselUrl.searchParams.set('media_type', 'CAROUSEL');
    createCarouselUrl.searchParams.set('children', childIds.join(','));
    createCarouselUrl.searchParams.set('caption', caption);
    createCarouselUrl.searchParams.set('access_token', token);
    const carousel = await fetchJson(createCarouselUrl, { method: 'POST' });
    if (!carousel.id) throw new Error(`Meta did not return a carousel container id: ${JSON.stringify(carousel)}`);
    creationId = carousel.id;
  } else {
    creationId = await createInstagramMediaContainer({ graphBase, igUserId, token, imageUrl: images[0], caption });
  }

  const publishUrl = new URL(`${graphBase}/${igUserId}/media_publish`);
  publishUrl.searchParams.set('creation_id', creationId);
  publishUrl.searchParams.set('access_token', token);

  let lastError;
  for (let attempt = 1; attempt <= 6; attempt += 1) {
    try {
      return await fetchJson(publishUrl, { method: 'POST' });
    } catch (error) {
      lastError = error;
      const message = String(error.message || '');
      if (!message.includes('Media ID is not available') && !message.includes('not ready for publishing')) throw error;
      console.warn(`Meta media is not ready yet; retrying publish attempt ${attempt}/6.`);
      await sleep(5000 * attempt);
    }
  }

  throw lastError;
}

async function publishFacebook(imageUrls, caption) {
  const pageId = cleanSecret(process.env.META_FB_PAGE_ID);
  const baseToken = cleanSecret(process.env.META_FB_PAGE_ACCESS_TOKEN || process.env.META_ACCESS_TOKEN);
  if (!pageId || !baseToken) return null;

  const graphVersion = process.env.META_GRAPH_VERSION || 'v20.0';
  const graphBase = `https://graph.facebook.com/${graphVersion}`;
  const token = await resolveFacebookPageToken({ graphBase, pageId, token: baseToken });
  const images = (Array.isArray(imageUrls) ? imageUrls : [imageUrls]).filter(Boolean).slice(0, 10);
  if (!images.length) return null;

  if (images.length === 1) {
    const photoUrl = new URL(`${graphBase}/${pageId}/photos`);
    photoUrl.searchParams.set('url', images[0]);
    photoUrl.searchParams.set('caption', caption);
    photoUrl.searchParams.set('access_token', token);
    return fetchJson(photoUrl, { method: 'POST' });
  }

  const attached = [];
  for (const imageUrl of images) {
    const photoUrl = new URL(`${graphBase}/${pageId}/photos`);
    photoUrl.searchParams.set('url', imageUrl);
    photoUrl.searchParams.set('published', 'false');
    photoUrl.searchParams.set('access_token', token);
    const photo = await fetchJson(photoUrl, { method: 'POST' });
    if (photo.id) attached.push({ media_fbid: photo.id });
  }

  const feedUrl = new URL(`${graphBase}/${pageId}/feed`);
  feedUrl.searchParams.set('message', caption);
  feedUrl.searchParams.set('attached_media', JSON.stringify(attached));
  feedUrl.searchParams.set('access_token', token);
  return fetchJson(feedUrl, { method: 'POST' });
}

async function resolveFacebookPageToken({ graphBase, pageId, token }) {
  const accountsUrl = new URL(`${graphBase}/me/accounts`);
  accountsUrl.searchParams.set('fields', 'id,name,access_token');
  accountsUrl.searchParams.set('access_token', token);

  try {
    const data = await fetchJson(accountsUrl);
    const page = (data.data || []).find((item) => String(item.id) === String(pageId));
    if (page?.access_token) return page.access_token;
  } catch (error) {
    console.warn(`Could not derive Facebook Page token; using provided token. ${error.message}`);
  }

  return token;
}

async function main() {
  const now = new Date();
  let type = postTypeFor(now);
  const seed = seedForRun(type, now);
  let listing = null;
  let researchContext = '';

  if (type === 'listing') {
    try {
      listing = await fetchBridgeListing(seed);
    } catch (error) {
      console.warn(`Bridge listing lookup failed; falling back to market post. ${error.message}`);
    }
    if (!listing?.photo1) {
      type = 'market';
      listing = null;
    }
  }

  researchContext = await fetchResearchContext(type);
  const imageUrls = buildPostImageUrls(type, listing, seed, researchContext);
  const caption = await makeCaption(type, listing, seed, researchContext);

  console.log(JSON.stringify({
    dry_run: DRY_RUN,
    type,
    seed,
    destinations: DESTINATIONS,
    instagram_account: IG_ACCOUNT_LABEL,
    image_url: imageUrls[0],
    image_count: imageUrls.length,
    image_urls: imageUrls,
    research_preview: researchContext.slice(0, 300),
    caption_preview: caption.slice(0, 300),
  }, null, 2));

  if (DRY_RUN) return;
  let instagram = null;
  if (DESTINATIONS.includes('instagram')) {
    try {
      instagram = await publishInstagram(imageUrls, caption);
    } catch (error) {
      instagram = { error: String(error.message || error).slice(0, 1200) };
      console.warn(`Instagram publish failed. ${instagram.error}`);
    }
  }

  let facebook = null;
  if (DESTINATIONS.includes('facebook')) {
    try {
      facebook = await publishFacebook(imageUrls, caption);
    } catch (error) {
      facebook = { error: String(error.message || error).slice(0, 1200) };
      console.warn(`Facebook publish failed. ${facebook.error}`);
    }
  }

  const attempted = [instagram, facebook].filter((result) => result !== null);
  const published = attempted.some((result) => result && !result.error);
  if (attempted.length && !published) {
    throw new Error(`All requested publish destinations failed. Instagram: ${instagram?.error || 'not requested'} Facebook: ${facebook?.error || 'not requested'}`);
  }

  console.log(JSON.stringify({ published: true, instagram, facebook }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
