# LilyVIP — Final pre-beta audit (2026-08-27)

## HEAD

`252e3bad69ab33ce4e644e528b7d4f04ffebb1d5` (`main`). Verified using `git pull --ff-only origin main`; GitHub was already current and the initial working tree was clean. No AGENTS.md was present in the repository. The final implementation is the commit containing this report; its exact hash is provided in the task's final response.

## Audit Summary

Audit of implementation, not commit descriptions. No new product features, backend, accounts, payments, cloud sync, R2, adapters, framework changes or redesign. Fixed issues are concentrated in storage transactions, backup validation, archive extraction, PWA lifecycle and audio cancellation/privacy. Existing tier architecture remains intact. Open Beta defaults to five local books and free Reader Pro/audio.

The old 323-assertion book-engine script contains copied implementations and simulations: its pass alone is not sufficient evidence. The production-importing 42-assertion suite is now also wired into `test:book-engine`; additional regressions exercise the real repository, importers, queue and built worker.

## P0 Findings

1. **Potential private chapter transmission via system speech.** Both fallback paths selected a Vietnamese Web Speech voice without checking `localService`, and could use the browser's unspecified default. Remote speech services are possible. Fixed by requiring an explicitly local Vietnamese voice; otherwise playback fails safely and asks for a local voice. No actual third-party transmission of a user's book was performed or observed during this audit.
2. **False acknowledgement of note/bookmark persistence.** Mutation promises resolved on individual request success, before transaction commit; `saveBookmark` resolved immediately after queuing `put`. A later abort could leave the UI claiming a save that never happened. Note editor also closed after the context swallowed a write failure. Fixed: await transaction completion, reject abort/error, preserve the editor draft on failure. Fault-injection regressions abort after request success and verify rollback/rejection.

No known unresolved P0 remains in the reviewed implementation.

## P1 Findings

| Finding | Fix / evidence |
| --- | --- |
| Restore counted slots and checked duplicates outside its write transaction | One transaction now selects and writes; concurrent restore/restore and restore/import tests remain at five books |
| Backup accepted invalid dates, missing metadata types, malformed notes, duplicate progress and gapped chapter indices | Validate all fields used by the reader/library, references, unique IDs, ranges and contiguous chapter indices before writes |
| Duplicate detection used only a short content prefix | Compare complete chapter content/ordering to avoid silently skipping a different version with the same beginning |
| Existing book IDs could be overwritten, then deleted by post-save compensation | Reject ID collisions and invalid chapter sets before writing; no destructive post-commit compensation |
| Delete failure was presented as success and removed the book from UI | Keep UI/data unchanged and show an error; cascade rejects transaction abort |
| Late progress/annotation writes could recreate children after delete; throttled progress could be attributed to a newly selected book | Parent checks share write transaction; capture book identity and percentage with pending progress |
| Note editing could move an annotation to the current chapter/book | Update existing note/color without changing locator; new editor drafts capture original book/chapter |
| ZIP local headers with data descriptors were misread; decompression failures returned compressed bytes; no expansion bound | Central-directory sizes, CRC and bounds validation; 32 MiB entry/128 MiB expanded archive limits, 100 MiB input limit; fail closed for unsupported/encrypted/corrupt archives |
| EPUB nested containers duplicated text | Extract leaf text blocks instead of both parent and child blocks |
| Network HTML could replace a cached shell whose hashed assets belonged to a different build | Pin HTML/assets to a build-specific cache; hash source and output contents; wait for old windows to close before activation; scope cleanup to shell caches |
| Voice switch/in-flight pause could play stale speech; resume could start duplicate synthesis | Invalidate jobs and prefetched URLs, preserve pause during inference, guard duplicate resume, terminate worker jobs on navigation/stop |
| Long unbroken tokens escaped the audio chunk limit | Bound every chunk to 240 UTF-16 code units; exercise 3k/6k/10k-word chapters and a 10k-character token |
| ONNX session release only covered successful inference | Idempotent postinstall patch releases in `finally`, with bounded single-thread inference |
| Voice “downloaded” did not guarantee offline runtime availability | Cache fixed-version WASM/data assets in a separate voice-runtime cache; ready requires model, parsed config and runtime; validate sizes, bound downloads, deduplicate same-voice downloads |

No known unresolved P1 blocker remains. Platform/device verification limits are listed below rather than represented as successful tests.

## P2 Findings / Known Issues

- No distributed rate limiter on the website proxy. Host allowlist, pinned public DNS, three redirects, GET-only, cross-site browser check, 15-second request abort, 4 MiB body cap and no forwarded credentials substantially narrow the surface. Non-browser clients can still abuse supported public sources and hosting bandwidth; not an arbitrary-target proxy. Monitor provider usage and consider edge rate limits before widening exposure.
- TOC/Audio chapter lists render all rows. A 1,000-chapter book was usable in the desktop browser; no mobile frame-time/memory benchmark is claimed. TOC retrieval and library health no longer retain full chapter text collections unnecessarily.
- Annotation locator fallback can pick the first/nearest repeated phrase when context is ambiguous. Stale/unresolved locators do not crash or mutate text; overlapping render ranges preserve source text. A future confidence threshold would reduce misplaced fallback highlights.
- Backup JSON is assembled in memory, capped at 250 MiB on file input. Very large backups may still stress low-memory phones. Original uploaded files and voice models are intentionally absent from backup; restored text/notes remain usable, but the original-file button may report unavailable for restored device books.
- Shelves use localStorage, separately from IndexedDB. Shelf quota failure is reported explicitly after successful restoration of books/notes; no false rollback claim. Shelf writes outside restore are still best effort and not cross-tab synchronized.
- Minor existing UI placeholders remain (e.g. book sharing success toast without real sharing; system voice option may be displayed even when no local Vietnamese voice is available). No account/payment/cloud endpoint is exposed by these placeholders.
- Routes are in-memory app navigation, not a URL router. Deep URL reload boots the shell/Home; it does not restore a specific Reader view from the URL.
- Build warns about ONNX dependency `eval` and chunks over 500 kB. Production JS main is about 708 kB (189 kB gzip), ORT 538 kB (134 kB gzip); `dist` about 2.2 MiB, excluding downloaded voices/runtime. No broad dependency upgrade was made.

## Fixed

All P0/P1 items above, plus stale search result suppression, original-file download provenance in both detail/repository paths, safer object URL download lifetime, synchronous import/restore guards, API-root exclusion and input-selection whitespace offset correction. No production user data was deleted, reset or migrated destructively.

## IndexedDB

- Database: `LilyVIP_LocalLibrary_v1`, current version **3**, unchanged.
- Historical v1: books, chapters, rawBlobs, progress. v2 added bookmarks. v3 added annotations. Historical source was read from git, not inferred from test fixtures.
- Books: `id`; indexes `by_updatedAt`, `by_lastReadAt`.
- Chapters: `id`; `by_bookId`, unique compound `by_bookId_index`.
- rawBlobs: `id`; progress: `bookId`.
- Bookmarks: `id`; indexes bookId, bookId/chapterIndex, createdAt.
- Annotations: `id`; indexes bookId, bookId/chapterIndex, createdAt, updatedAt.
- No backup-metadata or incomplete-import store exists. Imports are fully parsed in memory and atomically committed, so incomplete imports are not persisted.
- Non-destructive upgrades, one shared opening promise, version-change/closed-connection handling; blocked upgrades ask users to close older tabs. No automatic `deleteDatabase`/store clear/reset path.
- Deletion cascades across all six stores in a single transaction. Parent existence checks prevent late progress/bookmark/annotation writes from recreating deleted children.
- `persist()`/`estimate()` are guarded and failures are nonfatal; persistence is a browser request, not a durability guarantee. Keep external backups.

## Backup/Restore

Format `lily-library-backup`, version 1. JSON metadata/chapters/progress/bookmarks/annotations/shelves; no raw files, voices or temporary audio. Validation precedes writes. IDs are remapped, duplicate imports skipped, five-slot enforcement serialized with normal imports. The complete restored IndexedDB batch commits or aborts together. Shelves have a separately reported best-effort outcome.

Tests compare metadata, all paragraph text, progress, bookmark fields and note/highlight fields after remapping. Both v1→v3 and v2→v3 run the round-trip/cascade/concurrency/fault regressions. Invalid inputs leave existing library unchanged. No title/prefix-only deduplication remains.

## PWA

Generated manifest includes all 13 current shell URLs and separately emitted worker assets. Build identity changes for HTML/static/SW changes, not only asset filenames. Navigation uses its own build's cached HTML and matching immutable assets. Updates wait for old windows to close; no forced reload or `skipWaiting` over unsaved notes/audio. Only older `lily-app-shell-*` caches are removed; OPFS models and `lily-voice-runtime-v1` remain. `/api` and `/api/*` are never given an SPA fallback.

Built-worker execution tests reject all network fetches and verify cached deep-route navigation/assets, cleanup, voice-cache preservation and API exclusions. In-app browser also successfully reloaded with the localhost server stopped and opened the persisted, edited note. This is an **origin-unavailable test**, not airplane-mode testing of an installed iOS PWA. A two-build browser update test kept `/assets/index-Hm-U16qb.js` in an open client while production served `/assets/index-CWwoJNlB.js`; after closing/reopening, `/assets/index-CWwoJNlB.js` loaded and Lily Huyền remained “Đã sẵn sàng” without another download. This tests two patched builds, not the complete real-world old-release→new-release installed-PWA matrix.

## Website Proxy

Allowlist: supported WordPress/WikiCV/WikiDich/Wattpad/Canva host families only; HTTPS, normal port, no URL credentials. Public DNS answer is pinned into the HTTPS connection; every redirect is revalidated. Localhost/IP literals/private DNS/IPv6 loopback and mapped-private targets are rejected. No cookies or authorization are forwarded. Responses carry no-store, nosniff and sandbox CSP; unsupported content types/methods fail closed. API implementation is shared between Vite preview and Vercel function.

Tests exercise actual local HTTP handler and controlled upstream transport: private DNS answers, public→private redirects, pinned address, oversized bodies, cancellation, cross-site rejection and method restriction. No private service was contacted. WordPress login/password/challenge HTML is rejected; WikiCV/Wattpad require recognizable public content. Canva is a link directory, not a chapter extractor. Custom self-hosted WordPress domains are not permitted by production proxy even if adapter recognition is broader.

No authenticated, paywalled, CAPTCHA, DRM or geographic barrier was bypassed. No live supported-source availability guarantee or deployed Vercel smoke test is claimed; no deployment URL was supplied.

## Reader

Browser fixture: 1,000 chapters, ~12.7 MiB TXT, about 10k characters per chapter. Import, save, Reader, TOC filtering, chapter 1,000 and whole-book keyword search passed. Search stays local and is cursor-based, max 50 results; stale asynchronous results no longer overwrite a new query. Fake IndexedDB 1,000×10k TOC/search completes around 0.56s on this host; this is not a phone UI benchmark.

400 overlapping annotations exercise actual writes/rendering without source mutation. Browser restored a marked note, edited it, exported a Quote Card PNG, and reopened the edited note with origin offline. Direct drag-selection could not be reliably verified with the in-app control surface; annotation testing used an explicit synthetic backup fixture, not hidden production data injection.

## Audio

Chunk queue has one lookahead, stale-job guards and URL cleanup on stop/switch/consume. Pause during inference is honored; resume does not start a second inference. Navigation cancels old synthesis; automatic chapter continuation preserves explicit playback intent. Models stay in OPFS; runtime cache is separate from app-shell lifecycle. Fixed-version external requests download public model/runtime files, not chapter text. System fallback requires `localService === true`.

Tests cover queue races, rejected remote voices, 3k/6k/10k-word chunking and a 10k-character unbroken token. The dependency patch was verified by a clean `npm ci`. Worker creation failure removes pending requests; stop terminates/rejects jobs. Download/config readiness is stricter than a nonzero-size check. iOS autoplay priming retains the same audio element across chapter load.

Physical iPhone/Safari background/foreground, screen lock, OS suspension and hours-long neural memory measurements remain unverified. No uninterrupted background-audio promise is made. Browser smoke: Lily Huyền model/runtime download reported ready; a synthetic one-chunk chapter progressed through playback and completion without inference errors in captured logs. Audible quality and peak process RAM were not measured.

## Privacy

No analytics/beacon/content-upload endpoint found for book text, annotations, notes, search or backups. Feedback exports safe local diagnostics plus user-entered report, or opens Telegram with user-entered text only; no feedback was sent during testing. Search and backup are local. Rendering uses React text/canvas and stripped imported HTML, not injected scripts. Remote covers/fonts still make normal asset requests; book content is not attached. No raw chapter/backup/note logging was added; speech event objects that could contain an utterance were removed from logs.

References used for API/lifecycle semantics: [Web Speech localService](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesisVoice/localService), [service worker lifecycle](https://web.dev/articles/service-worker-lifecycle).

## Tests

| Command | Result |
| --- | --- |
| `npm ci` / postinstall patch | PASS; clean locked install, no dependency upgrades |
| `npm run test:book-engine` | PASS: legacy 323/323 + production-importing 42/42 + archive/import regressions |
| `npm run test:audio` | PASS: 18 normalization assertions + queue/privacy/chunk-bound regressions |
| `npm run test:backup` | PASS: v2→v3, 5 slots, round trip, cascade, invalid schema, concurrent restore/import, post-request abort, provenance, shelf quota, 400 annotations |
| `LILY_TEST_DB_VERSION=1 npm run test:backup` | PASS: same regressions with v1→v3 |
| `npm run test:website` | PASS: adapter fixtures, HTTP/routing, DNS pinning/private redirects, size/abort |
| `npm run test:pwa` | PASS: 13 generated URLs and executable offline/lifecycle regressions |
| `npm run build` | PASS: TypeScript + Vite production |
| `npm audit --json` / clean-install audit | 0 reported vulnerabilities at audit time |
| `git diff --check` | PASS |

`dev` and `preview` are persistent server commands, not finite test suites. Production preview was used for browser integration; development server startup/HTTP routing was also smoke-tested; there is no lint script. Test output is not inflated by treating every simulated assertion as an end-to-end test.

## Remaining Risks

Browser storage may be evicted or cleared; backup remains essential. External-source/CDN availability and provider abuse limits remain operational dependencies. Device-specific PWA/audio behavior, deployed Vercel routing and multi-week durability are not certified by this audit. Nonblocking limitations are enumerated above. No known remaining data-loss, boot, migration, SSRF, restore-corruption, private-text transmission or common audio-crash blocker was identified after the fixes and available checks.

## FINAL VERDICT

**GO FOR OPEN BETA** for the audited local-first scope, with the explicit verification limits above. This verdict is not a guarantee against browser/OS storage eviction or an assertion that untested physical-device scenarios passed.
