# Adi Gal — Social Image Generator (Flyer Templates)

Three endpoints (`market`, `mortgage`, `listing`), all built on `@vercel/og` — pure JavaScript,
no native browser binary, no shared-library or OS-compatibility issues.

The templates are designed to match Adi Gal's existing real-estate flyer style: property-photo
layouts, SLRT logo placement, Adi's headshot, burgundy/navy/gold branding, large serif headlines,
feature blocks, and a strong contact footer.

Runs entirely free on Vercel's Hobby plan — no `vercel.json` config needed at all this time, since
there's no native binary to bundle or memory/timeout tuning required.

## Deploy it

1. **Delete the old project's files in GitHub** (or just create a fresh repo — simpler): go to your
   `adigal-social-images` repo, delete `vercel.json`, and replace `package.json` and the `api/`
   folder with the versions here.
2. Upload these files/folders to the repo:
   - `package.json`
   - `package-lock.json`
   - `api/`
   - `public/logo.jpg`
   - `public/headshot.jpg`
3. Vercel will auto-redeploy on the push. Wait ~1 minute, then test:
   - `https://adigal-social-images.vercel.app/api/market`
   - `https://adigal-social-images.vercel.app/api/mortgage`
   - `https://adigal-social-images.vercel.app/api/listing`

Each should render directly in the browser tab within a couple seconds.

## Endpoints

**Market:** `/api/market?headline=...&sub=...&stat1_num=...&stat1_label=...&stat2_num=...&stat2_label=...&stat3_num=...&stat3_label=...&photo_url=...&phone=305-409-1305&handle=@adigalrealtor`

**Mortgage:** `/api/mortgage?rate=6.7%25&headline_en=...&headline_he=...&photo_url=...&phone=305-409-1305&handle=@adigalrealtor`

**Listing:** `/api/listing?photo_url=<main MLS photo URL>&photo2_url=<second MLS photo URL>&photo3_url=<third MLS photo URL>&address=...&headline=...&price=...&beds=5&baths=4&sqft=3,820&phone=305-409-1305&email=adigalrealtor@gmail.com&handle=@adigalrealtor&tag_label=FOR%20SALE`

All params are optional. The deployed `public/logo.jpg` and transparent cutouts in
`public/headshots/` are used by default. Logo and headshot can be overridden with
`logo_url=...` or `headshot_url=...`.

## Variation Params

Use these on any endpoint to reduce repetition:

- `theme=luxury`
- `theme=coastal`
- `theme=modern`
- `theme=commercial`
- `theme=warm`

For listing posts, `property_type` can also pick a theme automatically:

- `property_type=waterfront` or `property_type=beach` -> coastal
- `property_type=condo` or `property_type=modern` -> modern
- `property_type=commercial`, `business`, or `retail` -> commercial

Use these transparent Adi cutouts with `headshot=...`:

- `adi-white-suit`
- `adi-white-office`
- `adi-black-blazer`
- `adi-black-standing`
- `adi-green-blazer`
- `adi-navy-seated`
- `adi-gray-blazer`
- `adi-pointing`
- `adi-street-black`

Example:

`/api/listing?photo_url=...&price=...&theme=coastal&headshot=adi-white-office&v={{zap_meta_timestamp}}`

## Wiring into Zapier
No change from the setup guide's Code by Zapier steps — same `image_url` construction pattern,
same Facebook/Instagram posting steps. Just make sure `IMAGE_BASE_URL` in Storage by Zapier still
points at the same `adigal-social-images.vercel.app` domain (it doesn't change even though the
underlying code did).
