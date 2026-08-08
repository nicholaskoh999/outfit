# outfit.nkmwei.de — Frontend Prototype

A personal wardrobe and outfit recommendation tool. Not ecommerce — a private
fashion archive whose primary job is answering **"What should I wear today?"**

This is the **frontend prototype stage**: no backend, no auth, no cloud sync,
no AI API, no live weather. All recommendation logic is deterministic and runs
in the browser; all user interaction state lives in `localStorage`.

## Running

```bash
npm install
npm run dev -- --host 0.0.0.0   # local dev server (default http://localhost:5173)
npm run build                    # type-check + production build to dist/
npm run preview                  # serve the production build
```

Stack: React 18 · TypeScript · Vite · Tailwind CSS v4 · Radix primitives
(Dialog only — shadcn-style, fully custom-styled) · React Router.

Routing uses `BrowserRouter`; static hosting needs an SPA fallback to
`index.html`.

## Pages

| Route | Page |
| --- | --- |
| `/` | Today — occasion selection, Quick Pick, Refine, Best/Safe/Different |
| `/outfits` | Outfit collection (All / Approved / Suggested / Favorites) |
| `/outfits/:param` | Outfit detail — accepts a curated id (`outfit-004`) or a combo key (`top-002_bottom-004_shoe-002`) |
| `/wardrobe` | Wardrobe grid — category tabs, search, filters |
| `/wardrobe/:itemId` | Item detail |
| `/favorites` | Favorites — separate **Looks** and **Pieces** areas |

The active recommendation context (occasion + refinements) is carried in URL
query params (`?occasion=factory&weather=hot&work=factory-floor`), so detail
pages score outfits in the same context that recommended them.

## Key component map

```
AppShell                  header + desktop nav + mobile bottom nav
pages/
  TodayPage               occasion chips, Quick Pick, recommendation row
  OutfitsPage             browsable outfit collection with state filters
  OutfitDetailPage        score, garment stack, why-it-works, actions
  WardrobePage            tabs + search + filters + grid
  ItemDetailPage          metadata, status, compatible outfits
  FavoritesPage           Looks section + Pieces section
components/
  RecommendationCard      role label + triptych + score + reasons
  OutfitTriptych          the 4:5 visual identity of an outfit
  RefineSheet             weather / style / work-context chips (bottom sheet)
  SwapPieceSheet          slot alternatives with recomputed outfit scores
  RejectSheet             optional reject reasons
  OutfitScoreBreakdown    hidden-by-default factor bars
  WearHistory, EmptyState, WardrobeCard, WardrobeFilters, ItemImage
  ui/Sheet                Radix Dialog styled as bottom sheet / side panel
  ui/Toast                single toast with action (Wear Today → Undo)
lib/
  types.ts                all domain types
  data.ts                 seed access, combo keys, outfit param resolution
  colors.ts               colour-harmony pair matrix
  scoring.ts              deterministic scoring engine + WEIGHTS
  recommend.ts            candidate generation, diversity picks, swaps, hints
  store.tsx               localStorage-backed user state (React context)
  context.ts              recommendation context ⇄ URL params
```

## Data model

- **`src/data/wardrobe.json`** — canonical wardrobe seed built from the
  real asset package (5 tops, 4 bottoms, 1 shoe — 10 items, all `active`).
  Identity/asset fields (ids, slugs, names, brands, types, colors, fits,
  statuses, image paths, `asset_quality`/`assetNotes`) come from the
  package's `wardrobe.json` verbatim; structured scoring metadata (color
  family/hex/tone, occasions, weather, practicality, styles) is merged in
  for the deterministic engine. `brand` and `fit` may be `null` when the
  package didn't specify them. `HIMLAND Shorts — Black` (`bottom-004`)
  kept its original metadata; its hero photo was supplied later and is
  normalized to the same 4:5 studio canvas as the rest of the wardrobe.
- **`src/data/outfits.json`** — intentionally empty
  (`pending_user_approval`); seed outfits will be added only after the
  user approves candidate combinations. The Outfits page lists
  user-approved combos from localStorage in the meantime.
- Seed JSON is **never mutated at runtime**. Any top×bottom×shoe combination
  has a stable derived identity: `top-001_bottom-001_shoe-002`.
- Status vocabulary already supports `wishlist` and retired items are never
  deleted, so a future "what would this purchase unlock" calculator only
  needs new UI, not a schema change.

## Scoring model

Weighted factors in `scoring.ts` (`WEIGHTS`, adjustable in one place):
occasion fit 30% · personal taste 30% · colour harmony 20% · silhouette
balance 10% · practicality 10%, minus a **dynamic recency penalty**
(exponential decay per wear — never a fixed-day hard block).

- Colour harmony is an explicit pair matrix (safe pairs like charcoal+black
  score highest; charcoal+apricot is allowed but scored as "forward").
- Taste learns locally: exact approvals/rejections, pair-level affinity
  from decision history, favourites, and reject-reason nudges.
- Practicality reacts to context: factory **floor** penalises light tones
  and fragile pieces, factory **office** relaxes the rules, customer visit
  boosts clean presentation; weather (hot/rainy/indoor AC) adjusts too.
- Best / Safe / Different picks enforce visual diversity (a different top
  garment, limited shared pieces) rather than taking the top three scores.
  When no genuinely strong third look exists, a wardrobe hint is shown
  instead of filler.

## localStorage behaviour

Single key `outfit.nkmwei.de:v1` containing:

- `favoriteLooks` (combo keys) and `favoritePieces` (item ids)
- `decisions` — per-combo approve/reject with optional reason + date
- `wearLog` — every Wear Today press ({key, items, date}); Undo removes it
- `statusOverrides` — runtime item status changes (laundry, retired, …)

Clearing the key resets the prototype to pure seed state.

## Responsive behaviour

Mobile-first: bottom tab navigation, horizontal snap-swipe recommendation
cards, bottom-sheet Refine/filters/swap, large imagery. Desktop (≥640px):
top navigation, three recommendation columns, inline filter panel,
side-panel sheets, denser metadata. Same visual language on both.

## Imagery

All garment imagery is real photography from the asset package
(`public/assets/{tops,bottoms,shoes}/`, normalized 1200×1500 / 4:5 WebP
on a warm off-white canvas). Images render with `object-contain` on the
`studio` background token (`#f7f6f2`, sampled from the photo canvas), so
garments are never cropped — non-4:5 layout cells letterbox seamlessly.
Some sources are model-worn photos, used as supplied. The SVG silhouette
in `ItemImage` remains only as a fallback for future items added without
imagery.

## Implementation notes for the next phase

1. New photography: 4:5, ~1200×1500 WebP, warm off-white background —
   drop into `public/assets/` and reference from `images` per item.
2. Weights, colour matrix, and recency decay are intentionally isolated in
   `lib/scoring.ts` / `lib/colors.ts` for tuning.
3. `UserState` is the exact shape a future backend would sync; the store is
   the only writer, so swapping localStorage for an API is contained in
   `lib/store.tsx`.
4. Live weather later: `RefineState.weather` is already the single source —
   an API would only pre-fill it.
5. Wishlist calculator later: score any hypothetical item by inserting it
   into `allCandidates` — no schema work needed.
6. Fonts load from Google Fonts with system fallbacks; self-host for
   production if offline resilience matters.
