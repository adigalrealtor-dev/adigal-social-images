# Adi Gal — Social Image Generator (Final, v3)

Three endpoints (`market`, `mortgage`, `listing`), all built on `@vercel/og` — pure JavaScript,
no native browser binary, no shared-library or OS-compatibility issues of any kind. This is the
version to actually deploy; the Chromium-based attempt (v2) is abandoned due to a persistent,
widely-documented Vercel + `@sparticuz/chromium` compatibility issue that wasn't worth continuing
to fight for a project this size.

Runs entirely free on Vercel's Hobby plan — no `vercel.json` config needed at all this time, since
there's no native binary to bundle or memory/timeout tuning required.

## Deploy it

1. **Delete the old project's files in GitHub** (or just create a fresh repo — simpler): go to your
   `adigal-social-images` repo, delete `vercel.json`, and replace `package.json` and the `api/`
   folder with the versions here.
2. Upload these files (`package.json`, `api/market.js`, `api/mortgage.js`, `api/listing.js`) to the repo,
   keeping the `api/` folder structure.
3. Vercel will auto-redeploy on the push. Wait ~1 minute, then test:
   - `https://adigal-social-images.vercel.app/api/market`
   - `https://adigal-social-images.vercel.app/api/mortgage`
   - `https://adigal-social-images.vercel.app/api/listing`

Each should render directly in the browser tab within a couple seconds.

## Endpoints

**Market:** `/api/market?headline=...&sub=...&stat1_num=...&stat1_label=...&stat2_num=...&stat2_label=...&stat3_num=...&stat3_label=...&agent_name=Adi%20Gal&agent_initials=AG`

**Mortgage:** `/api/mortgage?rate=6.7%25&headline_en=...&headline_he=...&agent_name=Adi%20Gal&agent_initials=AG`

**Listing:** `/api/listing?photo_url=<real MLS photo URL>&address=...&price=...&beds=5&baths=4&sqft=3,820&phone=...&tag_label=JUST%20LISTED`

All params optional — realistic defaults are built in for testing.

## Wiring into Zapier
No change from the setup guide's Code by Zapier steps — same `image_url` construction pattern,
same Facebook/Instagram posting steps. Just make sure `IMAGE_BASE_URL` in Storage by Zapier still
points at the same `adigal-social-images.vercel.app` domain (it doesn't change even though the
underlying code did).
