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

function statTile(num, label) {
  return el('div', {
    style: {
      width: 250,
      height: 92,
      backgroundColor: NAVY,
      border: `2px solid ${GOLD}`,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      padding: '12px 16px',
    },
  },
    el('div', { style: { fontFamily: 'Playfair', fontWeight: 900, color: GOLD, fontSize: 35, lineHeight: 1, display: 'flex' } }, short(num, 12)),
    el('div', { style: { fontFamily: 'Inter', fontWeight: 700, color: WHITE, fontSize: 12, letterSpacing: 1, lineHeight: 1.2, display: 'flex', marginTop: 7 } }, short(label, 34).toUpperCase()));
}

export default async function handler(req) {
  const { searchParams: q } = new URL(req.url);

  const headline = short(q.get('headline') || 'Sellers still have the edge', 52);
  const sub = short(q.get('sub') || 'South Florida inventory stays tight heading into fall.', 96);
  const photoUrl = q.get('photo_url') || q.get('background_url') || 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1400&h=900&fit=crop';
  const logoUrl = q.get('logo_url') || asset(req, '/logo.jpg');
  const headshotUrl = q.get('headshot_url') || asset(req, '/headshot.jpg');
  const agentName = q.get('agent_name') || 'Adi Gal';
  const phone = q.get('phone') || '305-409-1305';
  const handle = q.get('handle') || '@adigalrealtor';
  const stats = [
    [q.get('stat1_num') || '2.1 mo', q.get('stat1_label') || 'Inventory'],
    [q.get('stat2_num') || '38 days', q.get('stat2_label') || 'Avg. time on market'],
    [q.get('stat3_num') || '+4.2%', q.get('stat3_label') || 'Median price YoY'],
  ];

  const allText = [headline, sub, agentName, phone, handle, stats.flat().join(' '), 'Market Pulse South Florida Real Estate'].join(' ');
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

  const tree = el('div', { style: { width: 1080, height: 1080, position: 'relative', display: 'flex', backgroundColor: CREAM, overflow: 'hidden' } },
    el('img', { src: photoUrl, style: { position: 'absolute', top: 0, left: 0, width: 1080, height: 500, objectFit: 'cover' } }),
    el('div', { style: { position: 'absolute', top: 0, left: 0, right: 0, height: 500, display: 'flex', background: 'linear-gradient(90deg, rgba(7,31,54,0.78), rgba(7,31,54,0.16))' } }),
    el('div', { style: { position: 'absolute', top: 0, left: 0, width: 360, height: 138, display: 'flex', background: 'linear-gradient(100deg, rgba(255,253,248,0.96), rgba(255,253,248,0.72), rgba(255,253,248,0))' } }),
    el('img', { src: logoUrl, style: { position: 'absolute', top: 26, left: 42, width: 172, height: 92, objectFit: 'contain' } }),

    el('div', { style: { position: 'absolute', top: 400, left: 0, right: 0, height: 126, backgroundColor: RED, borderTop: `5px solid ${GOLD}`, borderBottom: `5px solid ${GOLD}`, display: 'flex', alignItems: 'center', paddingLeft: 54 } },
      el('div', { style: { fontFamily: 'Playfair', fontWeight: 900, color: WHITE, fontSize: 62, letterSpacing: 1, display: 'flex' } }, 'MARKET PULSE')),

    el('div', { style: { position: 'absolute', top: 526, left: 0, right: 0, bottom: 90, backgroundColor: CREAM, display: 'flex' } }),
    el('div', { style: { position: 'absolute', top: 526, right: 0, bottom: 90, width: 330, backgroundColor: NAVY, borderLeft: `5px solid ${GOLD}`, display: 'flex' } }),
    el('div', { style: { position: 'absolute', top: 552, right: 48, width: 235, height: 235, borderRadius: 999, backgroundColor: WHITE, border: `5px solid ${GOLD}`, display: 'flex', overflow: 'hidden' } }),
    el('img', { src: headshotUrl, style: { position: 'absolute', top: 544, right: 38, width: 255, height: 315, objectFit: 'cover', objectPosition: '22% 42%' } }),
    el('div', { style: { position: 'absolute', top: 560, left: 54, width: 650, display: 'flex', flexDirection: 'column' } },
      el('div', { style: { fontFamily: 'Playfair', fontWeight: 900, color: INK, fontSize: 56, lineHeight: 1.04, display: 'flex' } }, headline),
      el('div', { style: { fontFamily: 'Inter', fontWeight: 600, color: '#4F6070', fontSize: 21, lineHeight: 1.32, display: 'flex', marginTop: 16 } }, sub),
      el('div', { style: { display: 'flex', gap: 16, marginTop: 26, flexWrap: 'wrap' } }, ...stats.map(([num, label]) => statTile(num, label)))),
    el('div', { style: { position: 'absolute', right: 48, bottom: 144, width: 235, height: 70, display: 'flex', flexDirection: 'column', alignItems: 'center' } },
      el('div', { style: { fontFamily: 'Playfair', fontWeight: 900, color: WHITE, fontSize: 28, display: 'flex' } }, agentName),
      el('div', { style: { fontFamily: 'Inter', fontWeight: 700, color: GOLD, fontSize: 13, letterSpacing: 1, display: 'flex', marginTop: 4 } }, 'SOUTH FLORIDA REALTOR')),

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
