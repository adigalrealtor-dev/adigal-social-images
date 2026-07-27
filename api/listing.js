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

function textFit(value, maxLength) {
  const text = String(value || '').trim();
  return text.length > maxLength ? `${text.slice(0, maxLength - 1).trim()}...` : text;
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

function feature(value, label) {
  return el('div', { style: { display: 'flex', alignItems: 'center', gap: 10 } },
    el('div', {
      style: {
        width: 38,
        height: 38,
        borderRadius: 999,
        border: `2px solid ${GOLD}`,
        backgroundColor: NAVY,
        color: GOLD,
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

  const photo1 = q.get('photo_url') || q.get('photo1_url') || 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1400&h=900&fit=crop';
  const photo2 = q.get('photo2_url') || q.get('photo_2_url') || photo1;
  const photo3 = q.get('photo3_url') || q.get('photo_3_url') || photo1;
  const logoUrl = q.get('logo_url') || asset(req, '/logo.jpg');
  const headshotUrl = q.get('headshot_url') || asset(req, '/headshot.jpg');

  const address = textFit(q.get('address') || '4521 Bayshore Drive, Miami, FL', 58);
  const price = textFit(q.get('price') || '$2,150,000', 16);
  const beds = textFit(q.get('beds') || '5', 4);
  const baths = textFit(q.get('baths') || '4', 4);
  const sqft = textFit(q.get('sqft') || '3,820', 7);
  const phone = q.get('phone') || '305-409-1305';
  const email = q.get('email') || 'adigalrealtor@gmail.com';
  const handle = q.get('handle') || '@adigalrealtor';
  const agentName = q.get('agent_name') || 'Adi Gal';
  const tagLabel = q.get('tag_label') || 'FOR SALE';
  const headline = textFit(q.get('headline') || q.get('title') || 'Luxury South Florida Residence', 42);

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
    img(photo1, { top: 0, left: 0, width: 1080, height: 500 }),
    img(photo2, { top: 500, left: 0, width: 360, height: 190, borderTop: `6px solid ${WHITE}`, borderRight: `6px solid ${WHITE}` }),
    img(photo3, { top: 500, left: 360, width: 360, height: 190, borderTop: `6px solid ${WHITE}`, borderRight: `6px solid ${WHITE}` }),
    el('div', { style: { position: 'absolute', top: 0, left: 0, width: 360, height: 150, display: 'flex', background: 'linear-gradient(100deg, rgba(255,253,248,0.96), rgba(255,253,248,0.72), rgba(255,253,248,0))' } }),
    el('img', { src: logoUrl, style: { position: 'absolute', top: 28, left: 42, width: 170, height: 95, objectFit: 'contain' } }),

    el('div', {
      style: {
        position: 'absolute',
        top: 448,
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
      el('div', { style: { fontFamily: 'Playfair', fontWeight: 900, color: WHITE, fontSize: 66, letterSpacing: 2, display: 'flex' } }, tagLabel.toUpperCase())),

    el('div', {
      style: {
        position: 'absolute',
        top: 690,
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
        top: 712,
        left: 54,
        width: 610,
        display: 'flex',
        flexDirection: 'column',
      },
    },
      el('div', { style: { fontFamily: 'Inter', fontWeight: 800, color: GOLD, fontSize: 18, letterSpacing: 3, display: 'flex' } }, address.toUpperCase()),
      el('div', { style: { fontFamily: 'Playfair', fontWeight: 900, color: INK, fontSize: 42, lineHeight: 1.04, display: 'flex', marginTop: 10 } }, headline),
      el('div', { style: { fontFamily: 'Playfair', fontWeight: 900, color: RED, fontSize: 64, lineHeight: 1, display: 'flex', marginTop: 12 } }, price),
      el('div', { style: { display: 'flex', gap: 20, marginTop: 18 } },
        feature(beds, 'BD'),
        feature(baths, 'BA'),
        feature(sqft, 'SF'))),

    el('div', {
      style: {
        position: 'absolute',
        top: 646,
        right: 18,
        width: 390,
        height: 430,
        display: 'flex',
        backgroundColor: WHITE,
        borderTopLeftRadius: 190,
        overflow: 'hidden',
      },
    }),
    el('img', { src: headshotUrl, style: { position: 'absolute', right: -16, bottom: 70, width: 405, height: 500, objectFit: 'cover', objectPosition: '22% 50%' } }),

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
      el('div', { style: { fontFamily: 'Playfair', fontWeight: 900, color: WHITE, fontSize: 46, letterSpacing: 2, display: 'flex' } }, phone),
      el('div', { style: { width: 2, height: 46, backgroundColor: 'rgba(200,160,82,0.55)', display: 'flex' } }),
      el('div', { style: { display: 'flex', flexDirection: 'column', gap: 4 } },
        el('div', { style: { fontFamily: 'Inter', fontWeight: 700, color: WHITE, fontSize: 17, display: 'flex' } }, email),
        el('div', { style: { fontFamily: 'Inter', fontWeight: 600, color: GOLD, fontSize: 16, display: 'flex' } }, `${agentName} | Real Estate Broker | ${handle}`))));

  return new ImageResponse(tree, { width: 1080, height: 1080, fonts });
}
