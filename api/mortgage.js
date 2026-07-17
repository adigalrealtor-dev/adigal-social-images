import { ImageResponse } from '@vercel/og';

export const config = { runtime: 'edge' };

const el = (type, props, ...children) => ({ type, props: { ...props, children: children.flat() } });
const NAVY = '#0B2033', GOLD = '#C9A15C', SAND = '#F4EFE4', CORAL = '#E8734A', MUTED = '#8CA3B5';

async function loadGoogleFont(family, weight, text) {
  const css = await fetch(
    `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}&text=${encodeURIComponent(text)}`,
    { headers: { 'User-Agent': 'Mozilla/5.0 (compatible)' } }
  ).then((r) => r.text());
  const match = css.match(/src: url\(([^)]+)\)/);
  if (!match) return null;
  const res = await fetch(match[1]);
  return await res.arrayBuffer();
}

export default async function handler(req) {
  const { searchParams: q } = new URL(req.url);
  const rate = q.get('rate') || '6.7%';
  const headline_en = q.get('headline_en') || 'Rates held steady this week';
  const headline_he = q.get('headline_he') || 'הריבית נשארה יציבה השבוע';
  const agentName = q.get('agent_name') || 'Adi Gal';
  const agentInitials = q.get('agent_initials') || 'AG';

  const latinText = rate + headline_en + agentName + agentInitials + 'MORTGAGE MARKET30-YEAR FIXED AVERAGEEN / עברית';
  const [frauncesBold, frauncesBlack, interReg, interSemi, hebrewFont] = await Promise.all([
    loadGoogleFont('Fraunces', 700, latinText),
    loadGoogleFont('Fraunces', 900, latinText),
    loadGoogleFont('Inter', 400, latinText),
    loadGoogleFont('Inter', 600, latinText),
    loadGoogleFont('Noto Sans Hebrew', 400, headline_he),
  ]);
  const fonts = [
    frauncesBold && { name: 'Fraunces', data: frauncesBold, weight: 700, style: 'normal' },
    frauncesBlack && { name: 'Fraunces', data: frauncesBlack, weight: 900, style: 'normal' },
    interReg && { name: 'Inter', data: interReg, weight: 400, style: 'normal' },
    interSemi && { name: 'Inter', data: interSemi, weight: 600, style: 'normal' },
    hebrewFont && { name: 'Noto Sans Hebrew', data: hebrewFont, weight: 400, style: 'normal' },
  ].filter(Boolean);

  const topPanel = el('div', { style: { position: 'absolute', top: 0, left: 0, right: 0, height: 260, backgroundColor: GOLD, display: 'flex', clipPath: 'polygon(0 0, 100% 0, 100% 55%, 0 100%)' } });
  const badge = el('div', { style: { display: 'flex', backgroundColor: CORAL, padding: '9px 20px', borderRadius: 999 } },
    el('div', { style: { fontFamily: 'Inter', fontWeight: 700, color: '#3A1608', fontSize: 15, letterSpacing: 2, display: 'flex' } }, 'MORTGAGE MARKET'));

  const tree = el('div', { style: { width: 1080, height: 1080, display: 'flex', flexDirection: 'column', position: 'relative', backgroundColor: NAVY } },
    topPanel,
    el('div', { style: { position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '64px 88px', height: '100%' } },
      badge,
      el('div', { style: { fontFamily: 'Fraunces', fontWeight: 900, color: SAND, fontSize: 200, lineHeight: 1, marginTop: 64, display: 'flex' } }, rate),
      el('div', { style: { fontFamily: 'Inter', fontWeight: 600, color: GOLD, fontSize: 20, letterSpacing: 4, marginTop: 8, display: 'flex' } }, '30-YEAR FIXED AVERAGE'),
      el('div', { style: { width: 60, height: 3, backgroundColor: 'rgba(244,239,228,0.3)', display: 'flex', marginTop: 52 } }),
      el('div', { style: { fontFamily: 'Fraunces', fontWeight: 700, color: SAND, fontSize: 36, lineHeight: 1.3, textAlign: 'center', display: 'flex', maxWidth: 780, marginTop: 44 } }, headline_en),
      el('div', { style: { fontFamily: hebrewFont ? 'Noto Sans Hebrew' : 'Inter', fontWeight: 400, color: '#B8C4CE', fontSize: 27, lineHeight: 1.6, textAlign: 'center', display: 'flex', maxWidth: 780, marginTop: 22, direction: 'rtl' } }, headline_he),
      el('div', { style: { flex: 1, display: 'flex' } }),
      el('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', borderTop: '1px solid rgba(244,239,228,0.15)', paddingTop: 28 } },
        el('div', { style: { display: 'flex', alignItems: 'center', gap: 14 } },
          el('div', { style: { width: 48, height: 48, borderRadius: 999, backgroundColor: GOLD, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Fraunces', fontWeight: 700, fontSize: 19, color: NAVY } }, agentInitials),
          el('div', { style: { display: 'flex', flexDirection: 'column' } },
            el('div', { style: { fontFamily: 'Inter', fontWeight: 600, color: SAND, fontSize: 19, display: 'flex' } }, agentName),
            el('div', { style: { fontFamily: 'Inter', fontWeight: 400, color: MUTED, fontSize: 14, display: 'flex' } }, 'Realtor, South Florida'))),
        el('div', { style: { fontFamily: 'Inter', fontWeight: 600, color: MUTED, fontSize: 15, letterSpacing: 1, display: 'flex' } }, 'EN / עברית'))));

  return new ImageResponse(tree, { width: 1080, height: 1080, fonts });
}
