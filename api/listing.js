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
  const photoUrl = q.get('photo_url') || 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1080&h=1080&fit=crop';
  const address = q.get('address') || '4521 Bayshore Drive, Miami, FL';
  const price = q.get('price') || '$2,150,000';
  const beds = q.get('beds') || '5';
  const baths = q.get('baths') || '4';
  const sqft = q.get('sqft') || '3,820';
  const agentName = q.get('agent_name') || 'Adi Gal';
  const agentInitials = q.get('agent_initials') || 'AG';
  const phone = q.get('phone') || '(305) 555-0142';
  const tagLabel = q.get('tag_label') || 'JUST LISTED';

  const allText = address + price + beds + baths + sqft + agentName + agentInitials + phone + tagLabel + 'Beds Baths Sqft DM or call for a private tour REALTY';
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

  const photoBg = el('div', { style: { position: 'absolute', top: 0, left: 0, width: 1080, height: 1080, display: 'flex', backgroundImage: `url(${photoUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } });

  const facts = [[beds, 'Beds'], [baths, 'Baths'], [sqft, 'Sqft']].map(([n, l]) =>
    el('div', { style: { display: 'flex', alignItems: 'center', gap: 10 } },
      el('div', { style: { width: 26, height: 26, borderRadius: 999, backgroundColor: 'rgba(201,161,92,0.18)', border: `1.5px solid ${GOLD}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter', fontWeight: 700, color: GOLD, fontSize: 13 } }, '\u2713'),
      el('div', { style: { display: 'flex', alignItems: 'baseline', gap: 6 } },
        el('div', { style: { fontFamily: 'Inter', fontWeight: 700, color: SAND, fontSize: 22, display: 'flex' } }, n),
        el('div', { style: { fontFamily: 'Inter', fontWeight: 400, color: MUTED, fontSize: 14, display: 'flex' } }, l))));

  const panel = el('div', { style: { position: 'absolute', left: 0, right: 0, bottom: 0, top: 640, backgroundColor: NAVY, display: 'flex', flexDirection: 'column', clipPath: 'polygon(0 8%, 100% 0%, 100% 100%, 0% 100%)' } },
    el('div', { style: { display: 'flex', flexDirection: 'column', padding: '86px 64px 0 64px' } },
      el('div', { style: { fontFamily: 'Inter', fontWeight: 600, color: GOLD, fontSize: 17, letterSpacing: 2, display: 'flex', maxWidth: 900 } }, address.toUpperCase()),
      el('div', { style: { fontFamily: 'Fraunces', fontWeight: 900, color: SAND, fontSize: 64, lineHeight: 1, marginTop: 14, display: 'flex' } }, price),
      el('div', { style: { display: 'flex', gap: 32, marginTop: 28 } }, ...facts)),
    el('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '26px 64px', marginTop: 36, borderTop: '1px solid rgba(244,239,228,0.15)' } },
      el('div', { style: { fontFamily: 'Inter', fontWeight: 600, color: SAND, fontSize: 17, display: 'flex' } }, 'DM or call for a private tour'),
      el('div', { style: { fontFamily: 'Inter', fontWeight: 700, color: GOLD, fontSize: 17, letterSpacing: 1, display: 'flex' } }, phone)));

  const logoBadge = el('div', { style: { position: 'absolute', top: 44, left: 44, display: 'flex', alignItems: 'center', gap: 12, backgroundColor: 'rgba(11,32,51,0.85)', padding: '8px 20px 8px 8px', borderRadius: 999 } },
    el('div', { style: { width: 40, height: 40, borderRadius: 999, backgroundColor: GOLD, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Fraunces', fontWeight: 700, fontSize: 17, color: NAVY } }, agentInitials),
    el('div', { style: { fontFamily: 'Inter', fontWeight: 600, color: SAND, fontSize: 15, letterSpacing: 1, display: 'flex' } }, `${agentName.toUpperCase()} REALTY`));

  const listedBadge = el('div', { style: { position: 'absolute', top: 44, right: 44, display: 'flex', backgroundColor: CORAL, padding: '10px 22px', borderRadius: 999 } },
    el('div', { style: { fontFamily: 'Inter', fontWeight: 700, color: '#3A1608', fontSize: 15, letterSpacing: 2, display: 'flex' } }, tagLabel));

  const tree = el('div', { style: { width: 1080, height: 1080, display: 'flex', position: 'relative' } }, photoBg, panel, logoBadge, listedBadge);

  return new ImageResponse(tree, { width: 1080, height: 1080, fonts });
}
