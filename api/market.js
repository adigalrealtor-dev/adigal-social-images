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
  const headline = q.get('headline') || 'Sellers still have the edge';
  const sub = q.get('sub') || 'South Florida inventory stays tight heading into fall.';
  const agentName = q.get('agent_name') || 'Adi Gal';
  const agentInitials = q.get('agent_initials') || 'AG';
  const stats = [
    [q.get('stat1_num') || '2.1 mo', q.get('stat1_label') || 'INVENTORY, DOWN FROM 2.6'],
    [q.get('stat2_num') || '38 days', q.get('stat2_label') || 'AVERAGE TIME ON MARKET'],
    [q.get('stat3_num') || '+4.2%', q.get('stat3_label') || 'MEDIAN PRICE, YEAR OVER YEAR'],
  ];

  const allText = headline + sub + agentName + agentInitials + stats.flat().join('') + 'MARKET UPDATE';
  const [frauncesBold, frauncesBlack, interReg, interSemi, interBold] = await Promise.all([
    loadGoogleFont('Fraunces', 700, allText),
    loadGoogleFont('Fraunces', 900, allText),
    loadGoogleFont('Inter', 400, allText),
    loadGoogleFont('Inter', 600, allText),
    loadGoogleFont('Inter', 700, allText),
  ]);
  const fonts = [
    frauncesBold && { name: 'Fraunces', data: frauncesBold, weight: 700, style: 'normal' },
    frauncesBlack && { name: 'Fraunces', data: frauncesBlack, weight: 900, style: 'normal' },
    interReg && { name: 'Inter', data: interReg, weight: 400, style: 'normal' },
    interSemi && { name: 'Inter', data: interSemi, weight: 600, style: 'normal' },
    interBold && { name: 'Inter', data: interBold, weight: 700, style: 'normal' },
  ].filter(Boolean);

  const stripe = el('div', { style: { position: 'absolute', top: -40, bottom: -40, right: 120, width: 14, backgroundColor: GOLD, display: 'flex', transform: 'skewX(-8deg)' } });
  const badge = el('div', { style: { display: 'flex', backgroundColor: CORAL, padding: '9px 20px', borderRadius: 999, alignSelf: 'flex-start' } },
    el('div', { style: { fontFamily: 'Inter', fontWeight: 700, color: '#3A1608', fontSize: 15, letterSpacing: 2, display: 'flex' } }, 'MARKET UPDATE'));
  const statRow = (num, lab) => el('div', { style: { display: 'flex', alignItems: 'center', gap: 16, borderTop: '1px solid rgba(244,239,228,0.15)', paddingTop: 18, paddingBottom: 18 } },
    el('div', { style: { fontFamily: 'Fraunces', fontWeight: 900, color: GOLD, fontSize: 38, minWidth: 150, flexShrink: 0, display: 'flex' } }, num),
    el('div', { style: { fontFamily: 'Inter', fontWeight: 600, color: SAND, fontSize: 15, letterSpacing: 1, display: 'flex', maxWidth: 320 } }, lab));

  const tree = el('div', { style: { width: 1080, height: 1080, display: 'flex', position: 'relative', backgroundColor: NAVY } },
    stripe,
    el('div', { style: { position: 'relative', display: 'flex', flexDirection: 'column', height: '100%', padding: '72px 140px 72px 72px' } },
      badge,
      el('div', { style: { fontFamily: 'Fraunces', fontWeight: 900, color: SAND, fontSize: 68, lineHeight: 1.08, marginTop: 32, display: 'flex', maxWidth: 780 } }, headline),
      el('div', { style: { fontFamily: 'Inter', fontWeight: 400, color: MUTED, fontSize: 18, lineHeight: 1.5, marginTop: 20, display: 'flex', maxWidth: 560 } }, sub),
      el('div', { style: { display: 'flex', flexDirection: 'column', marginTop: 44, maxWidth: 640 } }, ...stats.map(([n, l]) => statRow(n, l))),
      el('div', { style: { flex: 1, display: 'flex' } }),
      el('div', { style: { display: 'flex', alignItems: 'center', gap: 14 } },
        el('div', { style: { width: 48, height: 48, borderRadius: 999, backgroundColor: GOLD, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Fraunces', fontWeight: 700, fontSize: 19, color: NAVY } }, agentInitials),
        el('div', { style: { display: 'flex', flexDirection: 'column' } },
          el('div', { style: { fontFamily: 'Inter', fontWeight: 600, color: SAND, fontSize: 19, display: 'flex' } }, agentName),
          el('div', { style: { fontFamily: 'Inter', fontWeight: 400, color: MUTED, fontSize: 14, display: 'flex' } }, 'Realtor, South Florida')))));

  return new ImageResponse(tree, { width: 1080, height: 1080, fonts });
}
