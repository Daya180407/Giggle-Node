# GigleNode — Har AI, Ek Jagah, Sahi Rating Ke Saath

AI tools ka trust-driven directory: real user ratings, model-wise detail, honest comparison aur expert blog posts.
Built with **Next.js 16 (App Router) + TypeScript + Tailwind CSS v4**, ready for **Supabase + Vercel** aur **Cloudflare Workers** dono par.

## Run kijiye

```bash
npm install
npm run dev      # http://localhost:3000
npm run build && npm start
```

Data pehli request par `data/db.json` me automatically seed ho jata hai (catalogue, models, prompts aur posts).
Koi sample member, review ya rating pre-seeded nahi hai: har rating aur review kisi real signed-in visitor se aata hai.
Fresh start ke liye `data/db.json` delete kar dijiye.

### Admin login

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@giglenode.com` | `admin12345` |

Pehle login ke turant baad `/admin/settings` se password badal dijiye. Signup `/signup` se hota hai,
reset link `/forgot-password` se. Passwords PBKDF2-SHA256 (100k iterations, per-user salt) se hash hote hain aur
session cookie HMAC-signed hai (`SESSION_SECRET`, production me zaroori).

## Pages

| Route | Kya hai |
| --- | --- |
| `/` | Hero, category tabs ke saath Top 5 ranking, Trending This Week, New & Rising, Latest Posts, Finder banner |
| `/category/[slug]` | Poori ranking + cost calculator (`/category/all` = sab) |
| `/ai/[slug]` | Rating, models table (smart ranking), pros/cons, free alternative, prompt library, reviews, related posts |
| `/ai/[slug]/[model]` | Model ki apni rating, distribution, reviews, rate/edit form |
| `/compare/[[...slug]]` | 2–3 AI comparison (`/compare/chatgpt-vs-gemini-vs-claude`) + selector |
| `/finder` | 3-sawal quiz → top 3 AI |
| `/blog`, `/blog/[slug]` | Posts, filters; top-10 posts me live ranking automatic |
| `/my-list` | Bookmarks + following |
| `/profile` | Meri ratings, counts, Top Reviewer badge |
| `/contributors` | Top 10 contributors |
| `/search?q=` | AI + model + post teeno me search |
| `/admin` | Dashboard: AI, models, posts, ratings moderation, users, sponsors boost |

## Ranking (PRD section 9)

`lib/rank.ts`:

```
Weighted Score = (Votes / (Votes + 50)) × avg + (50 / (Votes + 50)) × globalAvg
```

- Recency: 30 din ke andar **1.5x** weight, 90 din tak 1.0 tak decay, uske baad slow decay (min 0.6).
- Overall AI rating uske models ke votes-weighted score se banti hai.
- Teen lists: **Top Rated** (home/category), **Trending This Week** (visits + 7-din ratings), **New & Rising**
  (naye AI, kam votes, rating ≥ 4.4).
- Har page `force-dynamic` hai — ranking hamesha request par recalculate hoti hai, isliye admin changes turant live.

## Rating rules (PRD sections 8 + 16)

- Login zaroori, 1 user → 1 model → 1 rating (edit par wahi row update hoti hai).
- Edit ke baad **24 ghante ka lock** (`lastEditedAt`).
- Ek IP se 24 ghante me max **20** ratings (`rateEvents`).
- Admin `/admin/ratings` se koi bhi rating delete kar sakta hai.
- Sponsored listings par hamesha “Sponsored” label; boost AI page par disclose hota hai.

## Data layer

`lib/store.ts` ek single JSON document store hai jo host ke hisaab se backend chunta hai:

- **Local dev** → `data/db.json`.
- **Vercel / koi bhi Node host** → Supabase table `giglenode_state` (`doc` jsonb + `version` column, compare-and-swap
  writes se concurrent updates safe rehte hain).
- **Cloudflare Workers** → R2 `FILES` bucket (`giglenode/db.json`).
- Kuch bhi configured na ho → in-memory seed (persist nahi hota).

Owner avatars `lib/assets.ts` se jaate hain: Supabase Storage bucket (default `giglenode-media`), R2, ya local
`data/blobs/`. Uploads server-side rehte hain, public bucket ki zaroorat nahi.

### Vercel + Supabase deploy

1. Supabase project banaiye aur `supabase/schema.sql` SQL editor me chala dijiye (tables, RLS, `giglenode_state`,
   storage bucket).
2. Vercel → Project → Settings → Environment Variables me daaliye:
   `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SESSION_SECRET` (long random), aur optionally
   `SUPABASE_STORAGE_BUCKET`, `RESEND_API_KEY`, `EMAIL_FROM`.
   `SUPABASE_SERVICE_ROLE_KEY` sirf server-side hai — kabhi `NEXT_PUBLIC_*` me na daalein aur chat me paste na karein.
3. Repo ko Vercel par import karke deploy kijiye. Build `npm ci && npm run build` hai; Node 22+ chahiye
   (`package.json` me `engines` set hai).
4. Deploy ke baad pehli request document seed karti hai. `admin@giglenode.com` / `admin12345` se login karke
   password badal dijiye.

Cloudflare Workers par Supabase env vars na daalein; wahan R2 binding pehle se configured hai.

## SEO

- Har AI/model/post ka apna slug + `generateMetadata`, canonical URLs.
- `app/sitemap.ts` (AI + models + categories + posts) aur `app/robots.ts`.
- `SoftwareApplication` + `AggregateRating` JSON-LD AI pages par, `ItemList` home par, `Article` blog par.
- Image optimisation ke liye `next/image` enabled, colours/fonts system-level taaki load fast rahe.

## Stack choices

- **Next.js 16.4.6 + React 19.2**. Next 15 line OpenNext ke supported-version gate me fail hoti hai (aur 15.5.4 me
  CVE-2025-66478 tha).
- **Tailwind CSS v4** tokens: indigo `#4F46E5`, star `#F59E0B`, surface `#F8FAFC`, ink `#1E293B`.
- Koi third-party UI/state library nahi — bundle chhota (103 kB shared JS).
