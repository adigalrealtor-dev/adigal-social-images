import { ImageResponse } from '@vercel/og';

export const config = { runtime: 'edge' };

const el = (type, props, ...children) => ({ type, props: { ...props, children: children.flat() } });

const NAVY = '#071F36';
const NAVY_2 = '#0D2B49';
const GOLD = '#C8A052';
const RED = '#8F171C';
const CREAM = '#F6EFE2';
const INK = '#10243B';
const WHITE = '#FFFDF8';

const THEMES = {
  luxury: { navy: '#071F36', gold: '#C8A052', red: '#8F171C', cream: '#F6EFE2', ink: '#10243B', white: '#FFFDF8' },
  coastal: { navy: '#073B4C', gold: '#D7A94B', red: '#0F6E73', cream: '#F3F0E8', ink: '#0B2D3D', white: '#FFFFFF' },
  modern: { navy: '#16202A', gold: '#BFA46A', red: '#5B2333', cream: '#F4F1EA', ink: '#111827', white: '#FFFFFF' },
  commercial: { navy: '#071F36', gold: '#C8A052', red: '#8F171C', cream: '#F6EFE2', ink: '#10243B', white: '#FFFDF8' },
  warm: { navy: '#1F2933', gold: '#C89A4B', red: '#9A3B24', cream: '#F7EFE4', ink: '#1C2630', white: '#FFFFFF' },
};

function pickTheme(q) {
  const requested = (q.get('theme') || q.get('property_type') || '').toLowerCase();
  if (requested.includes('coastal') || requested.includes('water') || requested.includes('beach')) return THEMES.coastal;
  if (requested.includes('modern') || requested.includes('condo')) return THEMES.modern;
  if (requested.includes('commercial') || requested.includes('business') || requested.includes('retail')) return THEMES.commercial;
  if (requested.includes('warm') || requested.includes('mediterranean')) return THEMES.warm;
  return THEMES[requested] || THEMES.luxury;
}

async function loadGoogleFont(family, weight, text) {
  try {
    const css = await fetch(
      `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}&text=${encodeURIComponent(text)}`,
      { headers: { 'User-Agent': 'Mozilla/5.0 (compatible)' } }
    ).then((r) => r.text());
    const match = css.match(/src: url\(([^)]+)\)/);
    if (!match) return null;
    const res = await fetch(match[1]);
    return await res.arrayBuffer();
  } catch {
    return null;
  }
}

function asset(req, path) {
  return new URL(path, req.url).toString();
}

function pickHeadshot(req, q) {
  const direct = q.get('headshot_url');
  if (direct) return direct;
  const requested = q.get('headshot') || q.get('headshot_slug') || 'adi-white-office';
  if (requested.toLowerCase() === 'none') return null;
  const allowed = new Set([
    'adi-current',
    'adi-white-suit',
    'adi-black-blazer',
    'adi-pointing',
    'adi-navy-seated',
    'adi-black-standing',
    'adi-street-black',
    'adi-white-office',
    'adi-green-blazer',
    'adi-gray-blazer',
  ]);
  const slug = allowed.has(requested) ? requested : 'adi-white-office';
  return asset(req, `/headshots/${slug}.png`);
}

function textFit(value, maxLength) {
  const text = String(value || '').trim();
  return text.length > maxLength ? `${text.slice(0, maxLength - 1).trim()}...` : text;
}

function responsiveFont(text, base, longAt, min) {
  const length = String(text || '').length;
  if (length <= longAt) return base;
  return Math.max(min, base - Math.ceil((length - longAt) / 3));
}

function hashText(text) {
  return String(text || '').split('').reduce((sum, ch) => (sum + ch.charCodeAt(0)) % 997, 0);
}

function pickVariant(q, fallbackSeed) {
  const requested = (q.get('variant') || q.get('layout') || '').toLowerCase();
  if (requested === 'hero' || requested === 'collage') return requested;
  const seed = q.get('v') || q.get('seed') || fallbackSeed;
  return hashText(seed) % 2 === 0 ? 'collage' : 'hero';
}

function img(src, style) {
  return el('img', {
    src,
    style: {
      position: 'absolute',
      objectFit: 'cover',
      ...style,
    },
  });
}

function feature(value, label, colors) {
  return el('div', { style: { display: 'flex', alignItems: 'center', gap: 10 } },
    el('div', {
      style: {
        width: 38,
        height: 38,
        borderRadius: 999,
        border: `2px solid ${colors.gold}`,
        backgroundColor: colors.navy,
        color: colors.gold,
        fontFamily: 'Inter',
        fontSize: 12,
        fontWeight: 800,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      },
    }, label),
    el('div', { style: { display: 'flex', flexDirection: 'column' } },
      el('div', { style: { fontFamily: 'Inter', fontSize: 21, fontWeight: 800, color: INK, display: 'flex' } }, value),
      el('div', { style: { fontFamily: 'Inter', fontSize: 12, fontWeight: 600, color: '#5D6B78', display: 'flex', marginTop: -2 } }, label === 'SF' ? 'SQFT' : label)));
}

export default async function handler(req) {
  const { searchParams: q } = new URL(req.url);
  const theme = pickTheme(q);
  const NAVY = theme.navy, GOLD = theme.gold, RED = theme.red, CREAM = theme.cream, INK = theme.ink, WHITE = theme.white;

  const photo1 = q.get('photo_url') || q.get('photo1_url') || 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1400&h=900&fit=crop';
  const photo2 = q.get('photo2_url') || q.get('photo_2_url') || photo1;
  const photo3 = q.get('photo3_url') || q.get('photo_3_url') || photo1;
  const logoUrl = q.get('logo_url') || asset(req, '/logo.jpg');
  const headshotUrl = pickHeadshot(req, q);

  const address = textFit(q.get('address') || '4521 Bayshore Drive, Miami, FL', 52);
  const price = textFit(q.get('price') || '$2,150,000', 16);
  const beds = textFit(q.get('beds') || '5', 4);
  const baths = textFit(q.get('baths') || '4', 4);
  const sqft = textFit(q.get('sqft') || '3,820', 7);
  const phone = q.get('phone') || '305-409-1305';
  const email = q.get('email') || 'adigalrealtor@gmail.com';
  const handle = q.get('handle') || '@adigalrealtor';
  const agentName = q.get('agent_name') || 'Adi Gal';
  const tagLabel = q.get('tag_label') || 'FOR SALE';
  const headline = textFit(q.get('headline') || q.get('title') || 'Luxury South Florida Residence', 36);
  const variant = pickVariant(q, `${address}${headline}${price}`);
  const isHero = variant === 'hero';
  const addressSize = responsiveFont(address, 18, 38, 14);
  const headlineSize = responsiveFont(headline, 40, 24, 30);
  const priceSize = responsiveFont(price, 60, 12, 48);

  const allText = [
    address, price, beds, baths, sqft, phone, email, handle, agentName, tagLabel, headline,
    'Beds Baths SQFT Contact Real Estate Broker Just Listed',
  ].join(' ');

  const [playfairBold, playfairBlack, interReg, interSemi, interBold] = await Promise.all([
    loadGoogleFont('Playfair Display', 700, allText),
    loadGoogleFont('Playfair Display', 900, allText),
    loadGoogleFont('Inter', 400, allText),
    loadGoogleFont('Inter', 600, allText),
    loadGoogleFont('Inter', 800, allText),
  ]);

  const fonts = [
    playfairBold && { name: 'Playfair', data: playfairBold, weight: 700, style: 'normal' },
    playfairBlack && { name: 'Playfair', data: playfairBlack, weight: 900, style: 'normal' },
    interReg && { name: 'Inter', data: interReg, weight: 400, style: 'normal' },
    interSemi && { name: 'Inter', data: interSemi, weight: 600, style: 'normal' },
    interBold && { name: 'Inter', data: interBold, weight: 800, style: 'normal' },
  ].filter(Boolean);

  const photoTiles = isHero ? [] : [
    img(photo2, { top: 500, left: 0, width: 360, height: 190, borderTop: `6px solid ${WHITE}`, borderRight: `6px solid ${WHITE}` }),
    img(photo3, { top: 500, left: 360, width: 360, height: 190, borderTop: `6px solid ${WHITE}`, borderRight: `6px solid ${WHITE}` }),
  ];
  const contentWidth = headshotUrl ? 610 : 972;

  const tree = el('div', {
    style: {
      width: 1080,
      height: 1080,
      display: 'flex',
      position: 'relative',
      backgroundColor: CREAM,
      overflow: 'hidden',
    },
  },
    img(photo1, { top: 0, left: 0, width: 1080, height: isHero ? 620 : 500 }),
    ...photoTiles,
    el('div', { style: { position: 'absolute', top: 0, left: 0, width: 360, height: 150, display: 'flex', background: 'linear-gradient(100deg, rgba(255,253,248,0.96), rgba(255,253,248,0.72), rgba(255,253,248,0))' } }),
    el('img', { src: logoUrl, style: { position: 'absolute', top: 28, left: 42, width: 170, height: 95, objectFit: 'contain' } }),

    el('div', {
      style: {
        position: 'absolute',
        top: isHero ? 522 : 448,
        left: 0,
        width: 650,
        height: 96,
        backgroundColor: RED,
        borderTop: `4px solid ${GOLD}`,
        borderBottom: `4px solid ${GOLD}`,
        display: 'flex',
        alignItems: 'center',
        paddingLeft: 54,
      },
    },
      el('div', { style: { fontFamily: 'Inter', fontWeight: 800, color: WHITE, fontSize: 38, letterSpacing: 0, lineHeight: 1, display: 'flex' } }, tagLabel.toUpperCase())),

    el('div', {
      style: {
        position: 'absolute',
        top: isHero ? 620 : 690,
        left: 0,
        right: 0,
        bottom: 90,
        backgroundColor: CREAM,
        display: 'flex',
        borderTop: `5px solid ${GOLD}`,
      },
    }),
    el('div', {
      style: {
        position: 'absolute',
        top: isHero ? 646 : 712,
        left: 54,
        width: contentWidth,
        display: 'flex',
        flexDirection: 'column',
      },
    },
      el('div', { style: { fontFamily: 'Inter', fontWeight: 800, color: GOLD, fontSize: addressSize, letterSpacing: 0, display: 'flex', lineHeight: 1.12 } }, address.toUpperCase()),
      el('div', { style: { fontFamily: 'Playfair', fontWeight: 900, color: INK, fontSize: headlineSize, lineHeight: 1.02, display: 'flex', marginTop: 10 } }, headline),
      el('div', { style: { fontFamily: 'Playfair', fontWeight: 900, color: RED, fontSize: priceSize, lineHeight: 1, display: 'flex', marginTop: 10 } }, price),
      el('div', { style: { display: 'flex', gap: 20, marginTop: 18 } },
        feature(beds, 'BD', theme),
        feature(baths, 'BA', theme),
        feature(sqft, 'SF', theme))),

    ...(headshotUrl ? [
      el('div', { style: { position: 'absolute', right: 0, bottom: 90, width: 330, height: 390, backgroundColor: 'rgba(255,253,248,0.52)', display: 'flex' } }),
      el('img', { src: headshotUrl, style: { position: 'absolute', right: 0, bottom: 82, width: 330, height: 430, objectFit: 'contain' } }),
    ] : []),

    el('div', {
      style: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: 90,
        backgroundColor: NAVY,
        borderTop: `5px solid ${GOLD}`,
        display: 'flex',
        alignItems: 'center',
        padding: '0 50px',
        gap: 28,
      },
    },
      el('div', { style: { fontFamily: 'Inter', fontWeight: 800, color: GOLD, fontSize: 18, display: 'flex' } }, 'CALL NOW'),
      el('div', { style: { fontFamily: 'Playfair', fontWeight: 900, color: WHITE, fontSize: 46, letterSpacing: 0, display: 'flex' } }, phone),
      el('div', { style: { width: 2, height: 46, backgroundColor: 'rgba(200,160,82,0.55)', display: 'flex' } }),
      el('div', { style: { display: 'flex', flexDirection: 'column', gap: 4 } },
        el('div', { style: { fontFamily: 'Inter', fontWeight: 700, color: WHITE, fontSize: 17, display: 'flex' } }, email),
        el('div', { style: { fontFamily: 'Inter', fontWeight: 600, color: GOLD, fontSize: 16, display: 'flex' } }, `${agentName} | Real Estate Broker | ${handle}`))));

  return new ImageResponse(tree, {
    width: 1080,
    height: 1080,
    fonts,
    headers: { 'Cache-Control': 'no-store, max-age=0' },
  });
}
