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

function buildUrl(path, params) {
  const url = new URL(path, BASE_URL);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
  }
  return url.toString();
}

function postTypeFor(date = new Date()) {
  const forced = (process.env.POST_TYPE || '').toLowerCase();
  if (['listing', 'market', 'mortgage'].includes(forced)) return forced;
  const rotation = ['market', 'listing', 'mortgage'];
  return rotation[date.getUTCDate() % rotation.length];
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} from ${url}: ${text.slice(0, 500)}`);
  }
  return text ? JSON.parse(text) : {};
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
  const token = process.env.BRIDGE_ACCESS_TOKEN;
  const dataset = process.env.BRIDGE_DATASET_ID;
  if (!token || !dataset) return null;

  try {
    return await fetchBridgeODataListing({ token, dataset, seed });
  } catch (error) {
    console.warn(`Bridge OData listing lookup failed; trying native Bridge listings API. ${error.message}`);
    return fetchBridgeNativeListing({ token, dataset, seed });
  }
}

function bridgeAuth(url, token) {
  const headers = { Accept: 'application/json' };
  if ((process.env.BRIDGE_AUTH_MODE || 'query').toLowerCase() === 'bearer') {
    headers.Authorization = `Bearer ${token}`;
  } else {
    url.searchParams.set('access_token', token);
  }
  return headers;
}

async function fetchBridgeODataListing({ token, dataset, seed }) {
  const bridgeBase = (process.env.BRIDGE_API_BASE || 'https://api.bridgedataoutput.com/api/v2/OData').replace(/\/$/, '');
  const url = new URL(`${bridgeBase}/${dataset}/Property`);
  url.searchParams.set('$top', process.env.BRIDGE_TOP || '12');
  url.searchParams.set('$orderby', process.env.BRIDGE_ORDER_BY || 'ModificationTimestamp desc');
  url.searchParams.set('$expand', 'Media');

  const agentId = process.env.BRIDGE_AGENT_ID;
  const defaultFilter = agentId
    ? `StandardStatus eq 'Active' and (ListAgentMlsId eq '${agentId}' or BuyerAgentMlsId eq '${agentId}')`
    : "StandardStatus eq 'Active'";
  const filter = process.env.BRIDGE_FILTER || defaultFilter;
  if (filter) url.searchParams.set('$filter', filter);

  const headers = bridgeAuth(url, token);
  const data = await fetchJson(url, { headers });
  const rows = data.value || data.d?.results || [];
  if (!rows.length) return null;

  const row = rows[Math.abs(hash(seed)) % rows.length];
  return normalizeBridgeListing(row);
}

async function fetchBridgeNativeListing({ token, dataset, seed }) {
  const bridgeBase = (process.env.BRIDGE_NATIVE_API_BASE || 'https://api.bridgedataoutput.com/api/v2').replace(/\/$/, '');
  const url = new URL(`${bridgeBase}/${dataset}/listings`);
  url.searchParams.set('limit', process.env.BRIDGE_TOP || '12');
  url.searchParams.set('sortBy', process.env.BRIDGE_NATIVE_SORT_BY || 'ModificationTimestamp');
  url.searchParams.set('order', process.env.BRIDGE_NATIVE_ORDER || 'desc');
  url.searchParams.set('StandardStatus', process.env.BRIDGE_STATUS || 'Active');
  if (process.env.BRIDGE_AGENT_ID) url.searchParams.set('ListAgentMlsId', process.env.BRIDGE_AGENT_ID);

  const headers = bridgeAuth(url, token);
  const data = await fetchJson(url, { headers });
  const rows = data.bundle || data.value || data.records || data.listings || data.data || [];
  if (!rows.length) return null;

  const row = rows[Math.abs(hash(seed)) % rows.length];
  return normalizeBridgeListing(row);
}

function normalizeBridgeListing(row) {
  const media = Array.isArray(row.Media)
    ? row.Media
    : Array.isArray(row.media)
      ? row.media
      : Array.isArray(row.Photos)
        ? row.Photos
        : [];
  const mediaUrls = media
    .map((item) => firstValue(item.MediaURL, item.MediaURLFull, item.MediaUrl, item.Url, item.uri, item.url))
    .filter(Boolean)
    .slice(0, 3);

  const city = firstValue(row.City, row.CityRegion);
  const state = firstValue(row.StateOrProvince, row.State, 'FL');
  const address = firstValue(row.UnparsedAddress, [row.StreetNumber, row.StreetName, city, state].filter(Boolean).join(', '));
  const remarks = firstValue(row.PublicRemarks, row.Remarks, row.MarketingRemarks);
  const headline = remarks
    ? short(String(remarks).replace(/\s+/g, ' '), 'South Florida Residence', 42)
    : `${city || 'South Florida'} Residence`;

  return {
    address,
    city,
    state,
    price: money(firstValue(row.ListPrice, row.CurrentPrice, row.OriginalListPrice)),
    beds: firstValue(row.BedroomsTotal, row.BedsTotal, row.Bedrooms, '3'),
    baths: firstValue(row.BathroomsTotalInteger, row.BathroomsFull, row.BathsTotal, row.BathsTotalInteger, '2'),
    sqft: firstValue(row.LivingArea, row.BuildingAreaTotal, row.LotSizeSquareFeet),
    headline,
    remarks,
    photo1: mediaUrls[0],
    photo2: mediaUrls[1] || mediaUrls[0],
    photo3: mediaUrls[2] || mediaUrls[0],
    propertyType: firstValue(row.PropertyType, row.PropertySubType),
  };
}

function buildImage(type, listing, seed) {
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
      rate: process.env.MORTGAGE_RATE || '6.7%',
      headline_en: process.env.MORTGAGE_HEADLINE_EN || 'Rates held steady this week',
      headline_he: process.env.MORTGAGE_HEADLINE_HE || 'הריבית נשארה יציבה השבוע',
      theme,
      headshot,
      v: seed,
    });
  }

  return buildUrl('/api/market', {
    headline: process.env.MARKET_HEADLINE || 'South Florida Market Pulse',
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

async function makeCaption(type, listing) {
  if (process.env.CAPTION_TEXT) return process.env.CAPTION_TEXT;
  if (DRY_RUN && !process.env.ANTHROPIC_API_KEY) {
    return 'South Florida real estate update. DM Adi Gal for details. #SouthFloridaRealEstate #MiamiRealEstate #BrowardRealEstate #RealEstateBroker';
  }

  const apiKey = required('ANTHROPIC_API_KEY');
  const prompt = [
    'Write an Instagram caption for Adi Gal, a South Florida real estate broker.',
    'Tone: polished, clear, helpful, not hypey.',
    'Keep it under 1,300 characters.',
    'Include a short CTA to DM or call Adi.',
    'Include 5-9 relevant hashtags.',
    'If Hebrew is useful, include one short Hebrew line after the English.',
    `Post type: ${type}.`,
    listing ? `Listing context: ${JSON.stringify(listing).slice(0, 1800)}` : '',
  ].filter(Boolean).join('\n');

  const models = [
    process.env.ANTHROPIC_MODEL,
    'claude-3-5-haiku-20241022',
    'claude-3-7-sonnet-20250219',
    'claude-sonnet-4-20250514',
    'claude-3-5-sonnet-latest',
    'claude-3-5-haiku-latest',
    'claude-3-5-sonnet-20241022',
    'claude-3-haiku-20240307',
  ].filter(Boolean);

  const modelCandidates = [...new Set(models.concat(await availableAnthropicModels(apiKey)))];

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
  return fetchJson(publishUrl, { method: 'POST' });
}

async function main() {
  const now = new Date();
  const seed = process.env.POST_SEED || now.toISOString().slice(0, 10);
  let type = postTypeFor(now);
  let listing = null;

  if (type === 'listing') {
    try {
      listing = await fetchBridgeListing(seed);
    } catch (error) {
      console.warn(`Bridge listing lookup failed; falling back to market post. ${error.message}`);
    }
    if (!listing?.photo1) type = 'market';
  }

  const imageUrl = buildImage(type, listing, seed);
  const caption = await makeCaption(type, listing);

  console.log(JSON.stringify({
    dry_run: DRY_RUN,
    type,
    instagram_account: IG_ACCOUNT_LABEL,
    image_url: imageUrl,
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
