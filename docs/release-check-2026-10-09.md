# Lilyhub release check — 2026-10-09

## Passed

`npm run test:release` completed with exit code 0:

- Book parsing, chapter recognition and import integrity (TXT/EPUB/DOCX).
- Audio text normalization, queue transitions, cancellation and bounded prefetch.
- Local backup/restore, migration, quotas, annotations and selected-book exports.
- Website importer and proxy validation, redirects, cancellation and source fixtures.
- Plan entitlements, entry routing and bilingual plan presentation.
- JJWXC adapters, sessions and font decoding fixtures.
- Translation terminology regressions.
- Vi/En persistence, catalog placeholders, reactive labels and unchanged user content.
- TypeScript/Vite production build.
- PWA precache (79 URLs), offline shell lifecycle and cache exclusions.

Browser checks: library search with 48 fixture books; opening a book and next-chapter progress; reader display controls and reset; desktop/light/dark and simulated mobile layouts. Earlier checks in this change set include landing, legal, settings and language persistence after reload.

## Release hygiene

Local design studies are ignored by Git and removed from generated production output. Development library/PWA fixtures are guarded by Vite DEV and are not emitted into the production shell. Approved icon source is retained under docs/brand; the icon generator uses a declared sharp dependency.

## Limits

Automated source and service checks use fixtures. This does not establish live availability of every third-party website, paid translation model, account sign-in, Google Drive consent or payment activation. Physical iPhone/PWA behavior still warrants a post-deployment check on HTTPS. Build reports existing large translation/runtime chunks; translation dictionaries remain loaded on demand.
