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
   - `public/headshots/`
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

Use `v=...` or `seed=...` on any endpoint to rotate the layout automatically. In Zapier, the
best option is to append `&v={{zap_meta_timestamp}}` so each generated post can land on a different
layout without changing the rest of the Zap.

You can also force a specific layout:

- Listing: `variant=collage` or `variant=hero`
- Market: `variant=right` or `variant=left`
- Mortgage: `variant=right` or `variant=left`

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

If one cutout looks wrong on a specific post, use `headshot=none` to remove Adi from that image,
or use `headshot_url=...` to supply a different transparent PNG.

Example:

`/api/listing?photo_url=...&price=...&theme=coastal&headshot=adi-white-office&v={{zap_meta_timestamp}}`

## Daily Posting Without Zapier

Zapier is not required for the production posting flow. The repo includes a GitHub Actions schedule
in `.github/workflows/daily-instagram.yml` that runs every day at 8:30 AM New York time during
daylight saving time.

The scheduled script:

1. Pulls listing data from Bridge when the rotation lands on a listing post.
2. Builds one of the image URLs from this deployed Vercel app.
3. Uses Anthropic to write the caption.
4. Publishes the image directly to Instagram through Meta's API.

Instagram can keep cross-posting to Facebook from the Instagram account settings, so the script does
not call Facebook Pages directly.

Add these GitHub repository secrets before enabling the workflow:

- `ANTHROPIC_API_KEY`
- `BRIDGE_ACCESS_TOKEN`
- `BRIDGE_DATASET_ID`
- `META_IG_USER_ID`
- `META_ACCESS_TOKEN`

Optional secrets:

- `ANTHROPIC_MODEL` is optional; the script tries `claude-3-5-sonnet-latest`, then `claude-3-5-haiku-latest`
- `BRIDGE_API_BASE` defaults to `https://api.bridgedataoutput.com/api/v2/OData`
- `BRIDGE_AUTH_MODE` defaults to `query`; set to `bearer` if your Bridge token expects an Authorization header
- `BRIDGE_FILTER` defaults to `StandardStatus eq 'Active'`
- `META_GRAPH_VERSION` defaults to `v20.0`

Manual dry run:

```bash
npm run post:daily:dry
```
