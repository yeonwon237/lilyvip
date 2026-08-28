# Google Docs shared-link redirect fix

A user-supplied shared document exposed a missing redirect case: Google Docs TXT export responds with HTTP 307 to `doc-…-docstext.googleusercontent.com/export/…`. The proxy now permits that specific download-host pattern only following a Docs TXT export redirect, not as a direct user target. HTTPS, credentials/port validation, DNS pinning, private-address denial, response-size and redirect limits remain enforced. No Google cookies or authorization headers are forwarded.

Verified the supplied shared document through a local HTTP instance of the production proxy plus the browser-mode safeFetch/importer path: analysis and draft build succeeded, 1 chapter, 1,034 paragraphs, 79,721 words, zero failed chapters. No document text or signed download URLs are stored in the repository. Added positive/negative redirect regressions; website tests, build and PWA checks pass. This is local end-to-end verification, not verification of the deployed site.

# Current status after source removal

The user subsequently requested removal of Canva and wdoiquan. Canva adapter, registration, directory UI/types, exports and obsolete tests have been removed. Proxy and adapter selection reject both sources. Google Docs/tiguaien work remains.

Wattpad public Remix TOC support remains: 13 parts parsed from the previously retrieved story 414318417 page. Live chapter requests still timed out. Browser verification was then explicitly blocked by the tool safety policy; no bypass was attempted. Full live story import is therefore NOT verified. Fixture tests/build passing must not be interpreted as successful live Wattpad reading.

The sections below record earlier investigation, including features since removed.

# Website import update — 2026-08-28

## Changes

- Google Docs: dedicated adapter for public document links (`edit`, `view`, `preview`, TXT export) and published HTML (`/d/e/.../pub`, legacy `/d/.../pub`). Imports one document as one chapter, with an editable title. No Google login/cookies; blocked download/private documents fail with guidance.
- Proxy: allow tiguaien.blog and narrowly scoped Google Docs document export/publish paths. Existing HTTPS, DNS pinning, private-address denial, redirect validation, timeout and 4 MiB response cap remain.
- WordPress: discover TOCs stored as Pages, paginate Pages up to 1,000, distinguish an exact chapter Page from TOC/navigation, and keep chapter links on the same origin. Stable TOC candidate IDs prevent same-millisecond collisions. Other custom blog domains still need explicit proxy approval; this is not unrestricted URL fetching.
- Canva: discover Google Docs/tiguaien and additional supported sources, decode escaped serialized links, and explain that design/edit URLs are not published story websites. Notion/wdoiquan links remain marked unsupported and open at source.
- Wattpad: TOC anchor parsing no longer depends on attribute order; tolerate absent API part URLs. Follow same-part `rel=next` page links (maximum 50); reject a chapter if a subsequent page is blocked instead of silently saving partial text. These changes do not bypass login, payment, or anti-bot controls.

## Verification

- `npm run test:website`: pass, including public/private Docs, host/path denial, custom blog homepage/TOC/chapter Pages, Canva destinations, Wattpad HTML TOC and paginated/blocked chapter fixtures.
- `npm run build`: pass (existing ONNX eval and bundle-size warnings).
- `npm run test:pwa`: pass.
- Live tiguaien.blog: discovered 10 TOC candidates; read the first chapter of “Ngày mai về sau” (3,491 words). Its WP Pages endpoint returned HTTP 200 via production `fetchPublic`.
- Live published Google Docs: “Off-Season Training Tips” parsed successfully through production `fetchPublic` without credentials.
- Live Canva directory `adachisensei.my.canva.site`: discovered seven links, all targeting Notion or wdoiquan. These destinations are still unsupported; this is not a successful story import.

## Remaining verification

Follow-up with supplied URLs: Wattpad story 414318417 returned HTTP 200, including through production fetchPublic. Its new public Remix data contains 13 parts but no legacy part-title anchors. Added non-executable JSON parsing and page-first discovery; the actual downloaded page now produces all 13 parts. Subsequent chapter requests timed out (including production fetchPublic), so full chapter reading is NOT verified. Added synthetic Remix regression coverage without retaining story text. Canva adachisensei.my.canva.site returned HTTP 200; its seven links are five Notion and two wdoiquan destinations. Added an explicit no-supported-destination message in the directory UI. These underlying sources remain unsupported. Ordinary shared Google Docs TXT export is fixture-tested; the live Google test covered a published document. Google redirect variants outside the explicit allowlist are rejected. Google documents with multiple tabs are not separately enumerated. No deployed production URL or physical phone UI was tested in this update.

Google sharing/publication guidance: https://support.google.com/docs/answer/183965 and https://support.google.com/docs/answer/2494822.
