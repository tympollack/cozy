# Cozy 🏡

A **Progressive Web App** that gamifies therapeutic cleaning and home sharing. Users snap **Light** (daytime) and **Dark** (nighttime) photos of their living spaces, swipe through a randomised feed of other people's homes, and earn points in a positivity-only virtual economy.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Styling | Tailwind CSS v4 |
| State | Zustand (with `persist` middleware) |
| Auth + DB | Supabase — shared project, `cozy` schema |
| Image Storage | Cloudflare R2 (via `@aws-sdk/client-s3`) |
| Image Optimisation | Cloudflare Image Resizing (`cdn-cgi/image/`) |
| PWA | `next-pwa` (service worker, offline shell) |
| Icons | Lucide React |

## Project Structure

```
cozy/
├── app/
│   ├── actions/          # Server Actions (getFeed, uploadPost, cheerPost)
│   ├── camera/           # /camera — Light & Dark photo upload UI
│   ├── feed/             # /feed — swipeable card feed
│   ├── login/            # /login — magic-link auth
│   ├── layout.tsx
│   └── page.tsx          # Root redirect (/ → /feed or /login)
├── components/
│   ├── Navbar.tsx
│   ├── PointsBadge.tsx   # Live animated point counter
│   └── PostCard.tsx      # Dual Light/Dark image card with Cheer button
├── lib/
│   ├── cloudflare.ts     # getOptimizedImageUrl() — cdn-cgi/image/ helper
│   ├── geohash.ts        # Server-side precision-4 geohash encoder
│   ├── r2.ts             # Cloudflare R2 upload utility
│   ├── supabase.ts       # Server-only clients (SSR + service role)
│   └── supabase-browser.ts  # Browser client (Client Components only)
├── store/
│   └── useCozyStore.ts   # Zustand store — points (persisted) + feed
└── public/
    └── manifest.json     # PWA manifest
```

## Privacy

Exact location data is **never stored**. If a user opts in to location sharing:
1. Raw lat/lng are extracted server-side in `uploadPost()`.
2. A [geohash](https://en.wikipedia.org/wiki/Geohash) at precision 4 (~45 km × 45 km cell) is computed by `lib/geohash.ts`.
3. Only the hash is written to `cozy.posts.obfuscated_location_hash`.
4. The raw coordinates are discarded — they never touch the database.

## Getting Started

### 1. Environment Variables

```bash
cp .env.local.example .env.local
# Fill in your Supabase and R2 credentials
```

### 2. Database Migration

The schema lives in the shared `sunshade-db-platform` repo:

```bash
cd ../sunshade-db-platform
supabase db push
```

### 3. Dev Server

```bash
npm run dev
```

### 4. Production Build

```bash
npm run build -- --webpack
# --webpack flag required for next-pwa compatibility
```

## Economy

| Action | Points |
|---|---|
| Upload a post (Light + Dark pair) | +10 |
| Someone cheers your post | +1 |
| Cheering someone else's post | +1 |

Points are cached in `localStorage` via Zustand `persist` — they survive page refreshes.

## Cloudflare Image Resizing

Image optimisation uses `lib/cloudflare.ts` → `getOptimizedImageUrl(url, width)` which builds a `/cdn-cgi/image/width=N,quality=85,format=auto,fit=cover/<path>` URL.

> **Requirement:** Your R2 bucket must be served through a Cloudflare-proxied custom domain (orange-cloud ☁️ enabled). Image Resizing must be turned on under **Speed → Optimization** in the Cloudflare dashboard. It does not work on `*.r2.dev` public URLs.
