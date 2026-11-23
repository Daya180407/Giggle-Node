import { RATING_CRITERIA } from "./criteria";
import { getSiteSettings } from "./settings";
import type {
  Ai,
  DB,
  DemoDataSettings,
  Model,
  Rating,
  RatingCriteria,
  RatingCriterion,
  User,
} from "./types";

/**
 * Scale demo dataset.
 *
 * A million member rows in the JSON document would be hundreds of megabytes and
 * every save rewrites the whole document, so the demo data is *virtual*: every
 * member, vote and review is derived from a seeded hash of its index. Storage
 * cost is zero, any page of users is O(1), and the whole dataset disappears the
 * moment the admin switches it off.
 */

export const DEMO_RATINGS_PER_USER = 3.9;
export const MIN_DEMO_USERS = 1_000;
export const MAX_DEMO_USERS = 10_000_000;

export const DEMO_USER_COUNTS = [250_000, 1_000_000, 2_500_000, 5_000_000];

const DAY = 86_400_000;

/* ------------------------------- hashing ------------------------------- */

function hash32(value: number, seed: number): number {
  let x = (value ^ seed) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x7feb352d) >>> 0;
  x = Math.imul(x ^ (x >>> 15), 0x846ca68b) >>> 0;
  return (x ^ (x >>> 16)) >>> 0;
}

function unit(index: number, seed: number, salt = 0): number {
  return hash32(index + Math.imul(salt + 1, 0x9e3779b1), seed) / 4_294_967_296;
}

function hashText(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/* -------------------------------- names -------------------------------- */

type NamePool = { region: string; first: string[]; last: string[] };

const NAME_POOLS: NamePool[] = [
  {
    region: "India",
    first: [
      "Aarav", "Vivaan", "Aditya", "Rohan", "Arjun", "Karthik", "Rahul", "Siddharth", "Nikhil", "Manish",
      "Ankit", "Harsh", "Varun", "Yash", "Ananya", "Priya", "Neha", "Ishita", "Meera", "Sneha",
      "Kavya", "Divya", "Riya", "Tanvi", "Aisha", "Pooja", "Shreya", "Deepika", "Sanya", "Naina",
    ],
    last: [
      "Sharma", "Verma", "Patel", "Gupta", "Reddy", "Nair", "Iyer", "Mehta", "Joshi", "Desai",
      "Kapoor", "Malhotra", "Chopra", "Bose", "Kulkarni", "Rao", "Sethi", "Agarwal", "Bhatt", "Pillai",
      "Mishra", "Saxena", "Menon", "Chauhan", "Trivedi",
    ],
  },
  {
    region: "United States",
    first: [
      "James", "Michael", "Daniel", "Christopher", "Ethan", "Noah", "Liam", "Jacob", "Logan", "Tyler",
      "Emily", "Sarah", "Jessica", "Ashley", "Olivia", "Sophia", "Megan", "Hannah", "Rachel", "Lauren",
      "Brandon", "Justin", "Kevin", "Brian", "Natalie",
    ],
    last: [
      "Smith", "Johnson", "Williams", "Brown", "Jones", "Miller", "Davis", "Garcia", "Wilson", "Anderson",
      "Taylor", "Thomas", "Moore", "Martin", "Jackson", "White", "Harris", "Clark", "Lewis", "Walker",
      "Young", "Hall", "Allen", "Wright", "Scott",
    ],
  },
  {
    region: "United Kingdom",
    first: [
      "Oliver", "Harry", "George", "Jack", "Charlie", "Thomas", "Oscar", "William", "Henry", "Alfie",
      "Amelia", "Olivia", "Isla", "Emily", "Sophie", "Grace", "Poppy", "Ella", "Freya", "Charlotte",
      "Callum", "Ewan", "Rhys", "Dylan", "Niamh",
    ],
    last: [
      "Taylor", "Morgan", "Hughes", "Evans", "Edwards", "Roberts", "Lewis", "Walker", "Robinson", "Wood",
      "Thompson", "Wright", "Green", "Clarke", "Baker", "Hall", "Turner", "Hill", "Ward", "Cooper",
      "Bailey", "Richardson", "Cox", "Howard", "Marshall",
    ],
  },
  {
    region: "Brazil",
    first: [
      "Lucas", "Matheus", "Gabriel", "Rafael", "Pedro", "Joao", "Bruno", "Felipe", "Gustavo", "Thiago",
      "Ana", "Maria", "Julia", "Beatriz", "Larissa", "Camila", "Fernanda", "Isabela", "Leticia", "Amanda",
      "Vinicius", "Rodrigo", "Diego", "Leonardo", "Mariana",
    ],
    last: [
      "Silva", "Santos", "Oliveira", "Souza", "Lima", "Pereira", "Costa", "Ferreira", "Almeida", "Rodrigues",
      "Carvalho", "Gomes", "Martins", "Araujo", "Ribeiro", "Barbosa", "Rocha", "Dias", "Nascimento", "Moraes",
      "Cardoso", "Teixeira", "Correia", "Monteiro", "Vieira",
    ],
  },
  {
    region: "Spain",
    first: [
      "Carlos", "Javier", "Miguel", "Alejandro", "Daniel", "Pablo", "Sergio", "Adrian", "Diego", "Alvaro",
      "Lucia", "Sofia", "Marta", "Elena", "Carmen", "Paula", "Laura", "Ana", "Irene", "Natalia",
      "Ruben", "Ivan", "Andres", "Jorge", "Raul",
    ],
    last: [
      "Garcia", "Rodriguez", "Martinez", "Lopez", "Gonzalez", "Perez", "Sanchez", "Ramirez", "Torres", "Flores",
      "Rivera", "Gomez", "Diaz", "Cruz", "Morales", "Ortiz", "Gutierrez", "Chavez", "Ramos", "Vargas",
      "Castillo", "Jimenez", "Moreno", "Romero", "Herrera",
    ],
  },
  {
    region: "Germany",
    first: [
      "Lukas", "Jonas", "Leon", "Felix", "Maximilian", "Paul", "Elias", "Noah", "Ben", "Finn",
      "Anna", "Lea", "Lena", "Sophie", "Marie", "Mia", "Emma", "Hannah", "Laura", "Julia",
      "Tobias", "Sebastian", "Fabian", "Nico", "Moritz",
    ],
    last: [
      "Muller", "Schmidt", "Schneider", "Fischer", "Weber", "Meyer", "Wagner", "Becker", "Schulz", "Hoffmann",
      "Koch", "Richter", "Klein", "Wolf", "Neumann", "Schwarz", "Zimmermann", "Braun", "Kruger", "Hartmann",
      "Lange", "Werner", "Krause", "Meier", "Lehmann",
    ],
  },
  {
    region: "Nigeria",
    first: [
      "Chinedu", "Emeka", "Ikenna", "Tunde", "Femi", "Ade", "Segun", "Kelechi", "Obinna", "Uche",
      "Amara", "Ngozi", "Adaeze", "Funke", "Bisi", "Chioma", "Ifeoma", "Yemi", "Tolu", "Zainab",
      "Ibrahim", "Musa", "Ahmed", "Samuel", "David",
    ],
    last: [
      "Okafor", "Adeyemi", "Balogun", "Eze", "Ibrahim", "Ogunleye", "Chukwu", "Adebayo", "Okonkwo", "Bello",
      "Abubakar", "Obi", "Nwosu", "Oyelaran", "Oladele", "Uche", "Anyanwu", "Lawal", "Danjuma", "Osei",
      "Mensah", "Owusu", "Boateng", "Asante", "Mensah",
    ],
  },
  {
    region: "United Arab Emirates",
    first: [
      "Omar", "Ahmed", "Ali", "Hassan", "Yousef", "Khalid", "Tariq", "Faisal", "Rami", "Sami",
      "Layla", "Noor", "Amina", "Sara", "Hana", "Maryam", "Dina", "Rania", "Yasmin", "Salma",
      "Karim", "Ziad", "Nabil", "Adel", "Waleed",
    ],
    last: [
      "Al Farsi", "Al Mansoori", "Haddad", "Najjar", "Khoury", "Saleh", "Rahman", "Aziz", "Karim", "Hamdan",
      "Al Sayed", "Moussa", "Farouk", "Nasr", "Youssef", "Darwish", "Khatib", "Shaikh", "Habib", "Qasim",
      "Fahmy", "Zaki", "Nasser", "Rashid", "Sultan",
    ],
  },
  {
    region: "Japan",
    first: [
      "Haruto", "Yuto", "Sota", "Ren", "Riku", "Kaito", "Daiki", "Takumi", "Hiroshi", "Kenji",
      "Yui", "Aoi", "Hina", "Sakura", "Mio", "Rin", "Yuna", "Aya", "Emi", "Kaori",
      "Shota", "Kenta", "Naoki", "Tatsuya", "Masato",
    ],
    last: [
      "Sato", "Suzuki", "Takahashi", "Tanaka", "Watanabe", "Ito", "Yamamoto", "Nakamura", "Kobayashi", "Kato",
      "Yoshida", "Yamada", "Sasaki", "Yamaguchi", "Matsumoto", "Inoue", "Kimura", "Hayashi", "Shimizu", "Saito",
      "Mori", "Abe", "Ikeda", "Hashimoto", "Ishikawa",
    ],
  },
];

export type DemoUser = {
  id: string;
  name: string;
  email: string;
  avatar: string;
  country: string;
  joinedAt: string;
  verified: boolean;
  ratings: number;
};

/** The member at `index` (0-based). Pure: the same index always gives the same person. */
export function demoUserAt(index: number, config: DemoDataSettings): DemoUser {
  const seed = config.seed || 1;
  const pool = NAME_POOLS[hash32(index, seed) % NAME_POOLS.length];
  const first = pool.first[hash32(index + 17, seed) % pool.first.length];
  const last = pool.last[hash32(index + 97, seed) % pool.last.length];
  const initial = unit(index, seed, 2) < 0.18 ? ` ${String.fromCharCode(65 + (hash32(index + 51, seed) % 26))}.` : "";
  const name = `${first}${initial} ${last}`;
  const handle = `${first}.${last}`.toLowerCase().replace(/[^a-z.]/g, "");
  const joinedDays = Math.floor(unit(index, seed, 3) * 1_800);
  return {
    id: `demo_u_${index + 1}`,
    name,
    email: `${handle}${index + 1}@demo.giglenode.com`,
    avatar: `${first.charAt(0)}${last.charAt(0)}`.toUpperCase(),
    country: pool.region,
    joinedAt: new Date(Date.now() - joinedDays * DAY).toISOString(),
    verified: unit(index, seed, 4) > 0.36,
    ratings: 1 + Math.floor(unit(index, seed, 5) * 18),
  };
}

/** A page of the virtual member list; no scan needed when there is no query. */
export function demoUsersPage(
  config: DemoDataSettings,
  options: { page?: number; perPage?: number; query?: string } = {},
): { rows: DemoUser[]; total: number; page: number; pages: number; scanned: number } {
  const perPage = Math.max(10, Math.min(200, options.perPage ?? 50));
  const total = clampUsers(config.users);
  const pages = Math.max(1, Math.ceil(total / perPage));
  const query = (options.query ?? "").trim().toLowerCase();

  if (query) {
    const found: DemoUser[] = [];
    const limit = 200;
    const scanCap = Math.min(total, 400_000);
    for (let i = 0; i < scanCap && found.length < limit; i++) {
      const row = demoUserAt(i, config);
      if (row.name.toLowerCase().includes(query) || row.email.includes(query)) found.push(row);
    }
    return { rows: found, total: found.length, page: 1, pages: 1, scanned: scanCap };
  }

  const page = Math.min(Math.max(1, Math.floor(options.page ?? 1)), pages);
  const start = (page - 1) * perPage;
  const rows: DemoUser[] = [];
  for (let i = start; i < Math.min(start + perPage, total); i++) rows.push(demoUserAt(i, config));
  return { rows, total, page, pages, scanned: rows.length };
}

/* ------------------------------ aggregates ----------------------------- */

export type DemoModelAgg = { votes: number; avg: number; dist: number[]; last7: number };

export type DemoAiAgg = {
  /** every demo vote for the whole tool */
  votes: number;
  /** votes shown as AI-level overall ratings (the rest sit on models) */
  overallVotes: number;
  avg: number;
  dist: number[];
  last7: number;
  /** average per area, derived from the same seeded data */
  criteria: Record<RatingCriterion, number>;
};

export type DemoSnapshot = {
  enabled: true;
  users: number;
  /** total sample ratings across the whole catalogue */
  ratings: number;
  seed: number;
  byAi: Map<string, DemoAiAgg>;
  byModel: Map<string, DemoModelAgg>;
};

export function clampUsers(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 1_000_000;
  return Math.min(MAX_DEMO_USERS, Math.max(MIN_DEMO_USERS, Math.round(n)));
}

/**
 * The user's own rating list (the 54 tools from the reference table). Tools that
 * are already in the catalogue keep exactly these scores; everything else gets a
 * seeded score between 3.6 and 4.9, so the list still looks like a real board.
 */
const REFERENCE_RATINGS: Record<string, number> = {
  chatgpt: 5,
  claude: 5,
  canva: 5,
  gemini: 5,
  perplexity: 5,
  cursor: 5,
  elevenlabs: 5,
  "github-copilot": 4.5,
  lovable: 4.5,
  "notion-ai": 4.5,
  "microsoft-copilot": 4.5,
  synthesia: 4.5,
  heygen: 4.5,
  "adobe-firefly": 4.5,
  grammarly: 4.5,
  "zapier-ai": 4.5,
  "clickup-ai": 4.5,
  replit: 4.5,
  "claude-code": 4.5,
  "veed-io-ai": 4.5,
  "semrush-ai": 4.5,
  "tidio-ai": 4.5,
  "intercom-fin-ai": 4.5,
  "zendesk-ai": 4.5,
  deepseek: 4,
  grok: 4,
  mistral: 4,
  "amazon-q-developer": 4,
  "gemini-code-assist": 4,
  askcodi: 4,
};

/** Keeps the reference table's order at the top of the admin rating list. */
const REFERENCE_ORDER = Object.keys(REFERENCE_RATINGS);

/** How many reference-table tools exist in the catalogue right now. */
export function referenceToolsInCatalogue(db: DB): number {
  return db.ai.filter((ai) => REFERENCE_RATINGS[ai.slug] !== undefined).length;
}

function referenceRank(slug: string): number {
  const index = REFERENCE_ORDER.indexOf(slug);
  return index === -1 ? 999 : index;
}

function demoAverage(ai: Ai, seed: number): number {
  const fixed = REFERENCE_RATINGS[ai.slug];
  if (fixed !== undefined) return fixed;
  // Derived tools sit below the reference table's tiers, so the reference
  // list stays recognisable instead of being buried under random 4.9s.
  const base = 4.0 + unit(hashText(ai.id), seed, 9) * 0.4;
  return Math.round(Math.min(4.4, base) * 10) / 10;
}

function starDistribution(avg: number, votes: number): number[] {
  const weights = [1, 2, 3, 4, 5].map((stars) => {
    const d = stars - avg;
    return Math.exp(-(d * d) / (2 * 0.62 * 0.62)) * (stars >= avg ? 1.02 : 0.94);
  });
  const sum = weights.reduce((s, n) => s + n, 0);
  const dist = weights.map((w) => Math.max(0, Math.round((w / sum) * votes)));
  let diff = votes - dist.reduce((s, n) => s + n, 0);
  // Put any rounding remainder on the 5-star bucket, never on 1-star.
  dist[4] += diff;
  while (diff < 0 && dist[4] > 0) {
    dist[4] -= 1;
    diff += 1;
  }
  return dist;
}

const CRITERION_KEYS: RatingCriterion[] = ["ease", "quality", "speed", "reliability", "value"];
const CRITERION_OFFSETS: Record<RatingCriterion, number> = {
  ease: 0.22,
  quality: 0.14,
  speed: -0.18,
  reliability: -0.06,
  value: -0.24,
};

function demoCriteria(ai: Ai, avg: number, seed: number): Record<RatingCriterion, number> {
  const out = {} as Record<RatingCriterion, number>;
  for (const key of CRITERION_KEYS) {
    const jitter = (unit(hashText(ai.id + key), seed, 11) - 0.5) * 0.3;
    const value = Math.min(5, Math.max(1, avg + CRITERION_OFFSETS[key] + jitter));
    out[key] = Math.round(value * 10) / 10;
  }
  return out;
}

/** Builds the whole virtual catalogue once per request; O(tools), not O(users). */
export function demoSnapshot(db: DB): DemoSnapshot | null {
  const demo = getSiteSettings(db).demo;
  if (!demo?.enabled) return null;

  const users = clampUsers(demo.users);
  const seed = demo.seed || 1;
  const totalRatings = Math.round(users * DEMO_RATINGS_PER_USER);
  const visible = db.ai.filter((ai) => !ai.hidden);

  // Popularity weights: visits, featured/sponsored placements and a seeded nudge.
  const weights = visible.map(
    (ai) =>
      1 +
      Math.log10(1 + Math.max(0, ai.visits || 0)) +
      (ai.featured ? 1.5 : 0) +
      (ai.sponsored ? 0.5 : 0) +
      unit(hashText(ai.id), seed, 1) * 0.8,
  );
  const weightSum = weights.reduce((s, n) => s + n, 0) || 1;

  const modelsByAi = new Map<string, Model[]>();
  for (const model of db.models) {
    const list = modelsByAi.get(model.aiId) ?? [];
    list.push(model);
    modelsByAi.set(model.aiId, list);
  }

  const byAi = new Map<string, DemoAiAgg>();
  const byModel = new Map<string, DemoModelAgg>();

  visible.forEach((ai, index) => {
    const votes = Math.max(6, Math.round((totalRatings * weights[index]) / weightSum));
    const avg = demoAverage(ai, seed);
    const dist = starDistribution(avg, votes);
    const models = modelsByAi.get(ai.id) ?? [];
    // A quarter of the votes read as whole-product ratings, like real voters use.
    const overallVotes = models.length ? Math.round(votes * 0.22) : votes;
    const modelVotes = votes - overallVotes;

    byAi.set(ai.id, {
      votes,
      overallVotes,
      avg,
      dist,
      last7: Math.max(1, Math.round(votes * 0.013)),
      criteria: demoCriteria(ai, avg, seed),
    });

    if (!models.length || modelVotes <= 0) return;
    const shares = models.map((model, i) => 0.8 + unit(hashText(model.id), seed, 3) * 0.4 + i * 0.001);
    const shareSum = shares.reduce((s, n) => s + n, 0);
    models.forEach((model, i) => {
      const share = Math.round((modelVotes * shares[i]) / shareSum);
      if (share <= 0) return;
      // Model scores stay on the tool's score, so the headline never drifts from
      // the rating list just because an AI has several models.
      const modelAvg = avg;
      byModel.set(model.id, {
        votes: share,
        avg: modelAvg,
        dist: starDistribution(modelAvg, share),
        last7: Math.max(1, Math.round(share * 0.012)),
      });
    });
  });

  return { enabled: true, users, ratings: totalRatings, seed, byAi, byModel };
}

/* -------------------------------- reviews ------------------------------ */

const JOBS: Record<string, string> = {
  writing: "drafting and editing",
  coding: "writing and reviewing code",
  image: "making product visuals",
  video: "cutting short videos",
  voice: "voice work",
  music: "music sketches",
  design: "design mockups",
  productivity: "daily admin work",
  marketing: "campaign copy",
  business: "customer replies",
  education: "study notes",
  research: "literature research",
  agents: "automating repetitive tasks",
  social: "social posts",
  specialized: "day-to-day work",
};

const REVIEW_TEMPLATES = [
  "I have used {tool} for about six months and it is now part of my daily workflow. {job} takes a fraction of the time it used to.",
  "Solid pick for {job}. The output usually needs only a small edit, and the interface stays out of the way.",
  "Started on the free plan to test it, upgraded within a week. {tool} handles {job} better than the two tools I tried before.",
  "The results are consistent enough that I stopped double-checking every answer. For {job}, that is the whole point.",
  "Good value for the price. I use {tool} mostly for {job} and the quality has improved with every update this year.",
  "What I like most is how quickly I get a usable first draft. {job} used to take an afternoon and now takes twenty minutes.",
  "Not perfect, but easily the most reliable option I have tried for {job}. The export options save me a lot of cleanup.",
  "The learning curve is short. I showed it to two teammates and both were productive with it the same day.",
  "I mainly use it for {job}. It handles long inputs well and rarely loses the thread of what I asked.",
  "Great for quick iterations. I can test five directions for {job} before I would have finished one by hand.",
  "The free tier is genuinely useful, which is rare. I only hit the limit on very busy weeks.",
  "Been using {tool} since the beta. It has become noticeably faster, and the output quality is more consistent now.",
  "Nice balance between control and speed. When {job} needs a specific tone I can steer it without rewriting everything.",
  "It fits well into my existing workflow. The results are good enough to share with a client after a light review.",
  "I tried several tools for {job} and kept coming back to this one. The interface is simple and the output is predictable.",
  "The mobile version is surprisingly usable. I often start {job} on my phone and finish it on the laptop.",
  "Support answered a billing question within a day, which matters to me more than another feature. The product itself is strong.",
  "Overall a dependable tool. It is not the cheapest, but it saves enough time on {job} that the plan pays for itself.",
];

const PROS = [
  "Fast first draft",
  "Clean, editable output",
  "Simple interface",
  "Good free plan",
  "Reliable with long prompts",
  "Useful templates",
  "Easy exports",
  "Consistent quality",
  "Works well on mobile",
  "Good value for the price",
];

const CONS = [
  "Free-plan limits are tight",
  "Occasional factual errors",
  "Pricey for a full team",
  "Slow during peak hours",
  "No offline mode",
  "Exports need manual cleanup",
  "Limited customisation",
  "Credits run out quickly",
];

function pick<T>(list: T[], value: number): T {
  return list[Math.floor(value * list.length) % list.length];
}

function splitCriteria(stars: number, value: number): RatingCriteria {
  const total = Math.round(Math.min(5, Math.max(1, stars)) * 5);
  const base = Math.floor(total / 5);
  let remainder = total - base * 5;
  const rotate = Math.floor(value * 5);
  const out = {} as RatingCriteria;
  CRITERION_KEYS.forEach((key, i) => {
    let score = base;
    if (remainder > 0 && (i + rotate) % 5 < remainder) score += 1;
    out[key] = Math.min(5, Math.max(1, score));
  });
  return out;
}

function reviewStars(avg: number, value: number): number {
  const roll = value * 100;
  if (avg >= 4.7) return roll < 70 ? 5 : roll < 96 ? 4 : 3;
  if (avg >= 4.3) return roll < 52 ? 5 : roll < 90 ? 4 : roll < 98 ? 3 : 2;
  if (avg >= 4) return roll < 42 ? 5 : roll < 82 ? 4 : roll < 96 ? 3 : 2;
  return roll < 30 ? 5 : roll < 70 ? 4 : roll < 92 ? 3 : 2;
}

/** Up to `count` deterministic sample reviews for one tool, newest first. */
export function demoReviewRows(ai: Ai, agg: DemoAiAgg, count: number, config: DemoDataSettings): { rating: Rating; user: User }[] {
  const seed = (config.seed || 1) ^ hashText(ai.id);
  const rows: { rating: Rating; user: User }[] = [];
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const userIndex = hashText(ai.id + i) % clampUsers(config.users);
    const person = demoUserAt(userIndex, config);
    const stars = reviewStars(agg.avg, unit(i, seed, 21));
    const ageDays = Math.floor(unit(i, seed, 22) * 75);
    const at = new Date(now - ageDays * DAY - Math.floor(unit(i, seed, 23) * DAY)).toISOString();
    const criteria = splitCriteria(stars, unit(i, seed, 24));
    const review = pick(REVIEW_TEMPLATES, unit(i, seed, 25)).replace(/\{tool\}/g, ai.name).replace(/\{job\}/g, JOBS[ai.category] ?? "daily work");
    const pros = pick(PROS, unit(i, seed, 26));
    const cons = stars < 5 && unit(i, seed, 27) > 0.25 ? pick(CONS, unit(i, seed, 28)) : null;

    rows.push({
      rating: {
        id: `demo_r_${ai.id}_${i + 1}`,
        userId: person.id,
        modelId: null,
        aiId: ai.id,
        stars,
        criteria,
        pros,
        cons,
        review,
        createdAt: at,
        updatedAt: at,
        lastEditedAt: null,
        status: "approved",
        verified: person.verified && unit(i, seed, 29) > 0.55,
        demo: true,
      },
      user: {
        id: person.id,
        name: person.name,
        email: person.email,
        avatar: person.avatar,
        role: "user",
        createdAt: person.joinedAt,
        verified: person.verified,
        demo: true,
      },
    });
  }

  return rows.sort((a, b) => +new Date(b.rating.updatedAt) - +new Date(a.rating.updatedAt));
}

/** Real reviews first-class, demo reviews appended and trimmed to the same list. */
export function withDemoReviews(
  db: DB,
  ai: Ai,
  realRows: { rating: Rating; user?: User }[],
  limit: number,
): { rating: Rating; user?: User }[] {
  const demo = getSiteSettings(db).demo;
  if (!demo?.enabled) return realRows;
  const agg = demoSnapshot(db)?.byAi.get(ai.id);
  if (!agg) return realRows;
  const rows = demoReviewRows(ai, agg, Math.max(limit, 8), demo);
  return [...realRows, ...rows]
    .sort((a, b) => +new Date(b.rating.updatedAt) - +new Date(a.rating.updatedAt))
    .slice(0, limit);
}

/** Per-area averages for the sidebar, from the virtual dataset only. */
export function demoCriteriaAverages(db: DB, aiId: string) {
  const demo = getSiteSettings(db).demo;
  if (!demo?.enabled) return [];
  const agg = demoSnapshot(db)?.byAi.get(aiId);
  if (!agg) return [];
  return RATING_CRITERIA.map(({ key, label }) => ({
    key,
    label,
    avg: agg.criteria[key],
    count: agg.votes,
  }));
}

/** Highest-rated tools for the admin rating list. */
export function demoRatingList(db: DB, limit = 54) {
  const snap = demoSnapshot(db);
  if (!snap) return [];
  return [...snap.byAi.entries()]
    .map(([aiId, agg]) => {
      const ai = db.ai.find((row) => row.id === aiId);
      return ai ? { ai, agg } : null;
    })
    .filter((row): row is { ai: Ai; agg: DemoAiAgg } => Boolean(row))
    .sort((a, b) => {
      const aRef = REFERENCE_RATINGS[a.ai.slug] !== undefined;
      const bRef = REFERENCE_RATINGS[b.ai.slug] !== undefined;
      if (aRef !== bRef) return aRef ? -1 : 1;
      return (
        b.agg.avg - a.agg.avg ||
        referenceRank(a.ai.slug) - referenceRank(b.ai.slug) ||
        b.agg.votes - a.agg.votes
      );
    })
    .slice(0, limit);
}
