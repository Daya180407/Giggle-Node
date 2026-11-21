# GigleNode — Har AI, Ek Jagah, Sahi Rating Ke Saath

AI tools ka trust-driven directory: real user ratings, model-wise detail, honest comparison aur expert blog posts.
Built with **Next.js 15 (App Router) + TypeScript + Tailwind CSS v4**, ready for **Supabase + Vercel** (PRD ka stack).

## Run kijiye

```bash
npm install
npm run dev      # http://localhost:3000
npm run build && npm start
```

Data pehli request par `data/db.json` me automatically seed ho jata hai (40 AI, 100+ models, ~15k ratings,
12 posts, 200 prompts). Reset karna ho to `data/db.json` delete kar dijiye.

### Demo logins

| Role | Email |
| --- | --- |
| User (ratings + bookmarks pre-seeded) | `demo@giglenode.com` |
| Admin | `admin@giglenode.com` |

`/login` page par **Demo User** / **Admin** buttons se ek click me login ho jata hai. Baaki koi bhi email login kar
sakta hai (development auth — password nahi). Production me Supabase Auth use karein.

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

`lib/store.ts` ek single JSON document store hai: local Node dev me `data/db.json`, Cloudflare Workers par R2
`FILES` bucket (`giglenode/db.json`). Worker start par hydrate hota hai aur writes `waitUntil` se persist hote hain.
Production me Supabase ke liye `supabase/schema.sql` ready hai — tables, RLS, rating edit-lock trigger aur
`model_rankings` view (same weighted formula SQL me).

> Vercel par filesystem read-only hota hai. Freebuff Sites (Workers) par writes R2 me persist hote hain;
> relational queries ya bade scale ke liye `supabase/schema.sql` migration recommended hai.

Supabase wire karne ke steps:

1. Supabase project banaiye, `supabase/schema.sql` SQL editor me chala dijiye.
2. `.env.local` me `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` (aur server ke liye
   `SUPABASE_SERVICE_ROLE_KEY`) daaliye — keys chat me paste na karein, secret store me rakhein.
3. `lib/store.ts` ke functions ko Supabase queries se replace kijiye (function signatures already async-friendly hain).

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
