import { ImageResponse } from '@vercel/og';

export const config = { runtime: 'edge' };

const el = (type, props, ...children) => ({ type, props: { ...props, children: children.flat() } });

const NAVY = '#071F36';
const GOLD = '#C8A052';
const RED = '#8F171C';
const CREAM = '#F6EFE2';
const INK = '#10243B';
const WHITE = '#FFFDF8';

const THEMES = {
  luxury: { navy: '#071F36', gold: '#C8A052', red: '#8F171C', cream: '#F6EFE2', ink: '#10243B', white: '#FFFDF8' },
  coastal: { navy: '#073B4C', gold: '#D7A94B', red: '#0F6E73', cream: '#F3F0E8', ink: '#0B2D3D', white: '#FFFFFF' },
  modern: { navy: '#16202A', gold: '#BFA46A', red: '#5B2333', cream: '#F4F1EA', ink: '#111827', white: '#FFFFFF' },
  warm: { navy: '#1F2933', gold: '#C89A4B', red: '#9A3B24', cream: '#F7EFE4', ink: '#1C2630', white: '#FFFFFF' },
};

function pickTheme(q) {
  const requested = (q.get('theme') || '').toLowerCase();
  return THEMES[requested] || THEMES.modern;
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

const asset = (req, path) => new URL(path, req.url).toString();
function pickHeadshot(req, q) {
  const direct = q.get('headshot_url');
  if (direct) return direct;
  const requested = q.get('headshot') || q.get('headshot_slug') || 'adi-pointing';
  if (requested.toLowerCase() === 'none') return null;
  const allowed = new Set([
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
  const slug = allowed.has(requested) ? requested : 'adi-pointing';
  return asset(req, `/headshots/${slug}.png`);
}
const short = (value, max) => {
  const text = String(value || '').trim();
  return text.length > max ? `${text.slice(0, max - 1).trim()}...` : text;
};

function hashText(text) {
  return String(text || '').split('').reduce((sum, ch) => (sum + ch.charCodeAt(0)) % 997, 0);
}

function pickVariant(q, fallbackSeed) {
  const requested = (q.get('variant') || q.get('layout') || '').toLowerCase();
  if (requested === 'right' || requested === 'left') return requested;
  const seed = q.get('v') || q.get('seed') || fallbackSeed;
  return hashText(seed) % 2 === 0 ? 'right' : 'left';
}

export default async function handler(req) {
  const { searchParams: q } = new URL(req.url);
  const theme = pickTheme(q);
  const NAVY = theme.navy, GOLD = theme.gold, RED = theme.red, CREAM = theme.cream, INK = theme.ink, WHITE = theme.white;

  const rate = short(q.get('rate') || '6.7%', 8);
  const headlineEn = short(q.get('headline_en') || 'Rates held steady this week', 54);
  const headlineHe = short(q.get('headline_he') || 'הריבית נשארה יציבה השבוע', 54);
  const photoUrl = q.get('photo_url') || q.get('background_url') || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1400&h=900&fit=crop';
  const logoUrl = q.get('logo_url') || asset(req, '/logo.jpg');
  const headshotUrl = pickHeadshot(req, q);
  const agentName = q.get('agent_name') || 'Adi Gal';
  const phone = q.get('phone') || '305-409-1305';
  const handle = q.get('handle') || '@adigalrealtor';
  const variant = pickVariant(q, `${rate}${headlineEn}${headlineHe}`);
  const headshotLeft = variant === 'left';
  const portraitPanelStyle = headshotLeft
    ? { left: 0, borderRight: `5px solid ${GOLD}` }
    : { right: 0, borderLeft: `5px solid ${GOLD}` };
  const portraitStyle = headshotLeft ? { left: 18 } : { right: 26 };
  const contentLeft = headshotUrl && headshotLeft ? 398 : 54;
  const headshotNodes = headshotUrl ? [
    el('div', { style: { position: 'absolute', top: 452, bottom: 90, width: 340, backgroundColor: NAVY, display: 'flex', ...portraitPanelStyle } }),
    el('img', { src: headshotUrl, style: { position: 'absolute', bottom: 106, width: 290, height: 430, objectFit: 'contain', ...portraitStyle } }),
  ] : [];

  const latinText = [rate, headlineEn, agentName, phone, handle, 'Mortgage Watch 30 Year Fixed Average English Hebrew'].join(' ');
  const [playfairBold, playfairBlack, interReg, interSemi, interBold, hebrewFont] = await Promise.all([
    loadGoogleFont('Playfair Display', 700, latinText),
    loadGoogleFont('Playfair Display', 900, latinText),
    loadGoogleFont('Inter', 400, latinText),
    loadGoogleFont('Inter', 600, latinText),
    loadGoogleFont('Inter', 800, latinText),
    loadGoogleFont('Noto Sans Hebrew', 600, headlineHe),
  ]);
  const fonts = [
    playfairBold && { name: 'Playfair', data: playfairBold, weight: 700, style: 'normal' },
    playfairBlack && { name: 'Playfair', data: playfairBlack, weight: 900, style: 'normal' },
    interReg && { name: 'Inter', data: interReg, weight: 400, style: 'normal' },
    interSemi && { name: 'Inter', data: interSemi, weight: 600, style: 'normal' },
    interBold && { name: 'Inter', data: interBold, weight: 800, style: 'normal' },
    hebrewFont && { name: 'Noto Hebrew', data: hebrewFont, weight: 600, style: 'normal' },
  ].filter(Boolean);

  const tree = el('div', { style: { width: 1080, height: 1080, position: 'relative', display: 'flex', backgroundColor: CREAM, overflow: 'hidden' } },
    el('img', { src: photoUrl, style: { position: 'absolute', top: 0, left: 0, width: 1080, height: 390, objectFit: 'cover' } }),
    el('div', { style: { position: 'absolute', top: 0, left: 0, right: 0, height: 390, display: 'flex', background: 'linear-gradient(90deg, rgba(7,31,54,0.76), rgba(7,31,54,0.18))' } }),
    el('div', { style: { position: 'absolute', top: 0, left: 0, width: 360, height: 138, display: 'flex', background: 'linear-gradient(100deg, rgba(255,253,248,0.96), rgba(255,253,248,0.72), rgba(255,253,248,0))' } }),
    el('img', { src: logoUrl, style: { position: 'absolute', top: 26, left: 42, width: 172, height: 92, objectFit: 'contain' } }),

    el('div', { style: { position: 'absolute', top: 348, left: 0, width: 700, height: 104, backgroundColor: RED, borderTop: `5px solid ${GOLD}`, borderBottom: `5px solid ${GOLD}`, display: 'flex', alignItems: 'center', paddingLeft: 54 } },
      el('div', { style: { fontFamily: 'Inter', fontWeight: 800, color: WHITE, fontSize: 38, letterSpacing: 0, lineHeight: 1, display: 'flex' } }, 'MORTGAGE WATCH')),

    el('div', { style: { position: 'absolute', top: 452, left: 0, right: 0, bottom: 90, backgroundColor: CREAM, display: 'flex' } }),
    ...headshotNodes,
    el('div', { style: { position: 'absolute', top: 502, left: contentLeft, width: headshotUrl ? 610 : 972, display: 'flex', flexDirection: 'column' } },
      el('div', { style: { fontFamily: 'Inter', fontWeight: 800, color: GOLD, fontSize: 19, letterSpacing: 0, display: 'flex' } }, '30-YEAR FIXED AVERAGE'),
      el('div', { style: { fontFamily: 'Playfair', fontWeight: 900, color: RED, fontSize: 132, lineHeight: 0.9, display: 'flex', marginTop: 10 } }, rate),
      el('div', { style: { width: 530, height: 2, backgroundColor: GOLD, display: 'flex', marginTop: 24, marginBottom: 24 } }),
      el('div', { style: { fontFamily: 'Playfair', fontWeight: 900, color: INK, fontSize: 43, lineHeight: 1.08, display: 'flex' } }, headlineEn),
      el('div', { style: { fontFamily: hebrewFont ? 'Noto Hebrew' : 'Inter', fontWeight: 600, color: '#425568', fontSize: 26, lineHeight: 1.28, direction: 'rtl', textAlign: 'right', display: 'flex', marginTop: 18, width: 570 } }, headlineHe)),

    el('div', { style: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 90, backgroundColor: NAVY, borderTop: `5px solid ${GOLD}`, display: 'flex', alignItems: 'center', padding: '0 52px', gap: 26 } },
      el('div', { style: { fontFamily: 'Playfair', fontWeight: 900, color: WHITE, fontSize: 40, display: 'flex' } }, phone),
      el('div', { style: { width: 2, height: 42, backgroundColor: 'rgba(200,160,82,0.55)', display: 'flex' } }),
      el('div', { style: { fontFamily: 'Inter', fontWeight: 700, color: GOLD, fontSize: 19, display: 'flex' } }, `${agentName} | Real Estate Broker`),
      el('div', { style: { fontFamily: 'Inter', fontWeight: 700, color: WHITE, fontSize: 17, display: 'flex', marginLeft: 'auto' } }, handle)));

  return new ImageResponse(tree, {
    width: 1080,
    height: 1080,
    fonts,
    headers: { 'Cache-Control': 'no-store, max-age=0' },
  });
}
