# Lily interface

The visual reference is `Documents/DESIGN/index.html` and `mobile.html`.
`src/lily-ui.css` is the single application design system, imported after the
base styles in `src/main.tsx`. Do not reintroduce the earlier `bookshop-*.css`,
`approved-theme.css`, or `design-applied.css` experiments into the application.

## Reference rules

- Plus Jakarta Sans for interface text; 32px desktop / 27px mobile page titles.
- White content surface, navy text, subtle slate borders. Dark surfaces use the
  reference near-black palette (`#0F0E12`, `#15141B`, `#18171E`).
- Orange marks selected navigation. Forest green identifies primary actions.
- Desktop board: up to 1240px, 230px navigation, 36px content inset.
- Books stay 2:3. Use real covers and Lily's existing default cover assets.
- Collection shelves use small upright books on quiet neutral stages.
- Mobile has a continuous surface, horizontal featured books, two-column
  library, and five consistent bottom navigation items.
- Forms and settings use the same typography and grouped controls. Avoid
  decorative banners, gradients, and multiple nested outlined cards.
- Reader prose and its user-selected themes are independent of app chrome.

## Working on the UI

Change the actual component structure for layout problems. Keep design rules
in the shared stylesheet; do not stack another theme override file. Check real
pages using actual data, including long book titles, light/dark and mobile.
Preserve import, reading, audio, collections, and account behavior.

## Icons and settings
- Use functional Lucide outline icons at stroke width 1.8. Voice uses Mic2; membership uses BadgeCheck; translation uses Languages. Do not use sparkles or pulsing membership decorations.
- Sidebar footer shows the actual number of books in progress and storage usage, without a decorative brand tile.
- Settings sections share a label/control grid on desktop and one column on mobile; preserve backup, restore, notification, account and support actions.
