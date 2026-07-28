import crypto from 'node:crypto';

const BASE_URL = (process.env.PUBLIC_BASE_URL || 'https://adigal-social-images.vercel.app').replace(/\/$/, '');
const DRY_RUN = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true';

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
  return preferred.slice(0, 3);
}

function buildListingHeadline(row, { city, propertySubType, propertyType }) {
  const subdivision = short(firstValue(row.SubdivisionName, row.MIAMIRE_SubdivisionInformation), '', 24);
  const type = firstValue(propertySubType, propertyType, 'Residence');
  const normalizedType = /condo|condominium|apartment|unit/i.test(String(type)) ? 'Condo' : type;
  const area = normalizedType === 'Condo' ? firstValue(city, subdivision, 'South Florida') : firstValue(subdivision, city, 'South Florida');

  if (String(row.PublicRemarks || '').match(/updated|renovated|remodeled/i)) {
    return short(`Updated ${area} ${normalizedType}`, `${area} ${normalizedType}`, 34);
  }

  return short(`${area} ${normalizedType}`, 'South Florida Residence', 34);
}

function postTypeFor(date = new Date()) {
  const forced = (process.env.POST_TYPE || '').toLowerCase();
  if (['listing', 'market', 'mortgage'].includes(forced)) return forced;

  const utcHour = date.getUTCHours();
  if (utcHour === 15) return 'mortgage';
  if (utcHour === 19) return 'listing';
  return 'market';
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} from ${url}: ${text.slice(0, 500)}`);
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
    throw new Error(`HTTP ${response.status} from ${url}: ${text.slice(0, 500)}`);
  }
  return text;
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
      return {
        title: field('title'),
        source: field('source'),
        date: field('pubDate'),
        summary: field('description'),
      };
    })
    .filter((item) => item.title)
    .slice(0, limit);
}

async function fetchResearchContext(type) {
  if (type === 'listing') return '';

  const query = type === 'mortgage'
    ? 'mortgage rates today buy vs rent housing market'
    : 'Miami South Florida real estate market condo market Airbnb investment';
  const url = new URL('https://news.google.com/rss/search');
  url.searchParams.set('q', query);
  url.searchParams.set('hl', 'en-US');
  url.searchParams.set('gl', 'US');
  url.searchParams.set('ceid', 'US:en');

  try {
    const xml = await fetchText(url);
    const items = rssItems(xml);
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
    .slice(0, 3);

  const city = firstValue(row.City, row.CityRegion);
  const state = firstValue(row.StateOrProvince, row.State, 'FL');
  const address = firstValue(row.UnparsedAddress, [row.StreetNumber, row.StreetName, city, state].filter(Boolean).join(', '));
  const remarks = firstValue(row.PublicRemarks, row.Remarks, row.MarketingRemarks);
  const propertyType = firstValue(row.PropertyType, row.PropertySubType);
  const propertySubType = firstValue(row.PropertySubType, row.PropertySubTypeAdditional);
  const headline = buildListingHeadline(row, { city, propertySubType, propertyType });

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
  };

  const selectedMediaUrls = selectListingPhotoUrls(mediaUrls, listing);
  listing.photo1 = selectedMediaUrls[0] || '';
  listing.photo2 = selectedMediaUrls[1] || selectedMediaUrls[0] || '';
  listing.photo3 = selectedMediaUrls[2] || selectedMediaUrls[0] || '';

  return listing;
}

async function hydrateBridgeListingPhotos(listing, dataset) {
  if (!listing || listing.photo1) return listing;

  const retsUrls = await fetchBridgeRetsPhotoUrls({ dataset, listingId: listing.listingId });
  const selectedUrls = selectListingPhotoUrls(retsUrls, listing);
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
      theme,
      headshot,
      v: seed,
    });
  }

  if (type === 'mortgage') {
    return buildUrl('/api/mortgage', {
      rate: process.env.MORTGAGE_RATE || 'Today',
      headline_en: process.env.MORTGAGE_HEADLINE_EN || researchHeadline(researchContext, 'Mortgage Market Update'),
      headline_he: process.env.MORTGAGE_HEADLINE_HE || 'עדכון משכנתאות יומי',
      theme,
      headshot,
      v: seed,
    });
  }

  return buildUrl('/api/market', {
    headline: process.env.MARKET_HEADLINE || researchHeadline(researchContext, 'South Florida Market Pulse'),
    sub: process.env.MARKET_SUB || 'A quick look at what buyers and sellers should watch this week.',
    stat1_num: process.env.MARKET_STAT1_NUM || '2.1 mo',
    stat1_label: process.env.MARKET_STAT1_LABEL || 'Inventory',
    stat2_num: process.env.MARKET_STAT2_NUM || '38 days',
    stat2_label: process.env.MARKET_STAT2_LABEL || 'Avg. time on market',
    stat3_num: process.env.MARKET_STAT3_NUM || '+4.2%',
    stat3_label: process.env.MARKET_STAT3_LABEL || 'Median price YoY',
    theme,
    headshot,
    v: seed,
  });
}

async function makeCaption(type, listing, researchContext = '') {
  if (process.env.CAPTION_TEXT) return process.env.CAPTION_TEXT;
  if (DRY_RUN && !process.env.ANTHROPIC_API_KEY) {
    return 'South Florida real estate update. DM Adi Gal for details. #SouthFloridaRealEstate #MiamiRealEstate #BrowardRealEstate #RealEstateBroker';
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
    type === 'market' ? 'Use the research context to choose a timely topic such as seller market, buyer market, condo market, Airbnb investment, inventory, prices, or South Florida demand.' : '',
    type === 'mortgage' ? 'Use the research context to discuss mortgage rates, buy vs rent, affordability, refinancing, or investing for the future.' : '',
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

  return 'South Florida real estate update. DM Adi Gal for details. #SouthFloridaRealEstate #MiamiRealEstate #BrowardRealEstate #RealEstateBroker';
}

async function publishInstagram(imageUrl, caption) {
  const igUserId = required('META_IG_USER_ID');
  const token = required('META_ACCESS_TOKEN');
  const graphVersion = process.env.META_GRAPH_VERSION || 'v20.0';
  const graphBase = `https://graph.facebook.com/${graphVersion}`;

  const createUrl = new URL(`${graphBase}/${igUserId}/media`);
  createUrl.searchParams.set('image_url', imageUrl);
  createUrl.searchParams.set('caption', caption);
  createUrl.searchParams.set('access_token', token);
  const container = await fetchJson(createUrl, { method: 'POST' });
  if (!container.id) throw new Error(`Meta did not return a media container id: ${JSON.stringify(container)}`);

  const publishUrl = new URL(`${graphBase}/${igUserId}/media_publish`);
  publishUrl.searchParams.set('creation_id', container.id);
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

async function main() {
  const now = new Date();
  const seed = process.env.POST_SEED || now.toISOString().slice(0, 10);
  let type = postTypeFor(now);
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
  const imageUrl = buildImage(type, listing, seed, researchContext);
  const caption = await makeCaption(type, listing, researchContext);

  console.log(JSON.stringify({
    dry_run: DRY_RUN,
    type,
    instagram_account: IG_ACCOUNT_LABEL,
    image_url: imageUrl,
    research_preview: researchContext.slice(0, 300),
    caption_preview: caption.slice(0, 300),
  }, null, 2));

  if (DRY_RUN) return;
  const result = await publishInstagram(imageUrl, caption);
  console.log(JSON.stringify({ published: true, result }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
