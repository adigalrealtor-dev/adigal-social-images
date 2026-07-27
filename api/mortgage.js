import { ImageResponse } from '@vercel/og';

export const config = { runtime: 'edge' };

const el = (type, props, ...children) => ({ type, props: { ...props, children: children.flat() } });

const NAVY = '#071F36';
const GOLD = '#C8A052';
const RED = '#8F171C';
const CREAM = '#F6EFE2';
const INK = '#10243B';
const WHITE = '#FFFDF8';

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
const short = (value, max) => {
  const text = String(value || '').trim();
  return text.length > max ? `${text.slice(0, max - 1).trim()}...` : text;
};

export default async function handler(req) {
  const { searchParams: q } = new URL(req.url);

  const rate = short(q.get('rate') || '6.7%', 8);
  const headlineEn = short(q.get('headline_en') || 'Rates held steady this week', 54);
  const headlineHe = short(q.get('headline_he') || 'הריבית נשארה יציבה השבוע', 70);
  const photoUrl = q.get('photo_url') || q.get('background_url') || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1400&h=900&fit=crop';
  const logoUrl = q.get('logo_url') || asset(req, '/logo.jpg');
  const headshotUrl = q.get('headshot_url') || asset(req, '/headshot.jpg');
  const agentName = q.get('agent_name') || 'Adi Gal';
  const phone = q.get('phone') || '305-409-1305';
  const handle = q.get('handle') || '@adigalrealtor';

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
    el('img', { src: photoUrl, style: { position: 'absolute', top: 0, left: 0, width: 1080, height: 470, objectFit: 'cover' } }),
    el('div', { style: { position: 'absolute', top: 0, left: 0, right: 0, height: 470, display: 'flex', background: 'linear-gradient(90deg, rgba(7,31,54,0.72), rgba(7,31,54,0.12))' } }),
    el('div', { style: { position: 'absolute', top: 0, left: 0, width: 360, height: 138, display: 'flex', background: 'linear-gradient(100deg, rgba(255,253,248,0.96), rgba(255,253,248,0.72), rgba(255,253,248,0))' } }),
    el('img', { src: logoUrl, style: { position: 'absolute', top: 26, left: 42, width: 172, height: 92, objectFit: 'contain' } }),

    el('div', { style: { position: 'absolute', top: 382, left: 0, width: 760, height: 112, backgroundColor: RED, borderTop: `5px solid ${GOLD}`, borderBottom: `5px solid ${GOLD}`, display: 'flex', alignItems: 'center', paddingLeft: 54 } },
      el('div', { style: { fontFamily: 'Playfair', fontWeight: 900, color: WHITE, fontSize: 55, letterSpacing: 1, display: 'flex' } }, 'MORTGAGE WATCH')),

    el('div', { style: { position: 'absolute', top: 494, left: 0, right: 0, bottom: 90, backgroundColor: CREAM, display: 'flex' } }),
    el('div', { style: { position: 'absolute', top: 535, left: 54, width: 620, display: 'flex', flexDirection: 'column' } },
      el('div', { style: { fontFamily: 'Inter', fontWeight: 800, color: GOLD, fontSize: 19, letterSpacing: 4, display: 'flex' } }, '30-YEAR FIXED AVERAGE'),
      el('div', { style: { fontFamily: 'Playfair', fontWeight: 900, color: RED, fontSize: 142, lineHeight: 0.9, display: 'flex', marginTop: 12 } }, rate),
      el('div', { style: { width: 530, height: 2, backgroundColor: GOLD, display: 'flex', marginTop: 26, marginBottom: 28 } }),
      el('div', { style: { fontFamily: 'Playfair', fontWeight: 900, color: INK, fontSize: 47, lineHeight: 1.08, display: 'flex' } }, headlineEn),
      el('div', { style: { fontFamily: hebrewFont ? 'Noto Hebrew' : 'Inter', fontWeight: 600, color: '#425568', fontSize: 32, lineHeight: 1.22, direction: 'rtl', textAlign: 'right', display: 'flex', marginTop: 22 } }, headlineHe)),

    el('div', { style: { position: 'absolute', right: 0, bottom: 90, width: 380, height: 500, backgroundColor: WHITE, borderTopLeftRadius: 190, display: 'flex', overflow: 'hidden' } }),
    el('img', { src: headshotUrl, style: { position: 'absolute', right: -24, bottom: 70, width: 410, height: 510, objectFit: 'cover', objectPosition: '22% 50%' } }),

    el('div', { style: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 90, backgroundColor: NAVY, borderTop: `5px solid ${GOLD}`, display: 'flex', alignItems: 'center', padding: '0 52px', gap: 26 } },
      el('div', { style: { fontFamily: 'Playfair', fontWeight: 900, color: WHITE, fontSize: 40, display: 'flex' } }, phone),
      el('div', { style: { width: 2, height: 42, backgroundColor: 'rgba(200,160,82,0.55)', display: 'flex' } }),
      el('div', { style: { fontFamily: 'Inter', fontWeight: 700, color: GOLD, fontSize: 19, display: 'flex' } }, `${agentName} | Real Estate Broker`),
      el('div', { style: { fontFamily: 'Inter', fontWeight: 700, color: WHITE, fontSize: 17, display: 'flex', marginLeft: 'auto' } }, handle)));

  return new ImageResponse(tree, { width: 1080, height: 1080, fonts });
}
