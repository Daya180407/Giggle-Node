import { DEFAULT_SITE_SETTINGS } from "./settings";
import type {
  Ai,
  Bookmark,
  CategorySlug,
  DB,
  Follow,
  Model,
  Post,
  PostType,
  PriceType,
  Prompt,
  Rating,
  User,
} from "./types";

type SeedModel = {
  name: string;
  bestFor: string;
  price?: PriceType;
  offset?: number;
  date?: string;
  /** jobs this model handles; a model without tags follows its tool's category */
  categories?: CategorySlug[];
};

type SeedAi = {
  name: string;
  slug: string;
  category: CategorySlug;
  price: PriceType;
  website: string;
  logo: string;
  color: string;
  planPrice: number;
  unitCost: number;
  quality: number;
  pop: number;
  createdAt: string;
  description: string;
  bestFor: string[];
  freeAlt?: string;
  sponsored?: boolean;
  models: SeedModel[];
};

const AI_SEED: SeedAi[] = [
  {
    name: "ChatGPT",
    slug: "chatgpt",
    category: "writing",
    price: "freemium",
    website: "https://chat.openai.com",
    logo: "💬",
    color: "#10A37F",
    planPrice: 20,
    unitCost: 0.004,
    quality: 0.94,
    pop: 1,
    createdAt: "2023-01-09",
    description:
      "ChatGPT duniya ka sabse popular general-purpose AI assistant hai. Writing, coding, brainstorming aur data analysis, sab ek hi chat window me ho jata hai. Voice mode aur image understanding ise daily kaam ke liye sabse flexible tool banate hain.",
    bestFor: ["Writing", "Coding help", "Research", "Brainstorming"],
    freeAlt: "gemini",
    models: [
      {
        name: "GPT-4o",
        bestFor: "Daily all-round tasks",
        price: "freemium",
        offset: 0.25,
        date: "2024-05-13",
        categories: ["writing", "coding", "research"],
      },
      { name: "o1", bestFor: "Hard reasoning & maths", price: "paid", offset: 0.12, date: "2024-12-05", categories: ["research", "coding"] },
      { name: "GPT-4o Mini", bestFor: "Fast, cheap everyday chat", price: "free", offset: -0.3, date: "2024-07-18", categories: ["writing", "productivity"] },
    ],
  },
  {
    name: "Claude",
    slug: "claude",
    category: "writing",
    price: "freemium",
    website: "https://claude.ai",
    logo: "📜",
    color: "#D97757",
    planPrice: 20,
    unitCost: 0.005,
    quality: 0.93,
    pop: 0.9,
    createdAt: "2023-03-14",
    description:
      "Anthropic ka Claude lambi writing, document analysis aur careful reasoning ke liye famous hai. Iski tone natural hoti hai aur ye 200K token tak ka context handle karta hai, isliye book-length drafts aur codebases review karne me strong hai.",
    bestFor: ["Long-form writing", "Document analysis", "Editing"],
    freeAlt: "chatgpt",
    models: [
      { name: "Claude Sonnet 4.5", bestFor: "Coding + writing balance", price: "freemium", offset: 0.3, date: "2025-09-29", categories: ["coding", "writing"] },
      { name: "Claude Opus 4.1", bestFor: "Deep research & strategy", price: "paid", offset: 0.18, date: "2025-08-05", categories: ["research", "writing"] },
      { name: "Claude Haiku 3.5", bestFor: "Fast drafts and summaries", price: "free", offset: -0.25, date: "2024-10-22", categories: ["writing"] },
    ],
  },
  {
    name: "Gemini",
    slug: "gemini",
    category: "writing",
    price: "freemium",
    website: "https://gemini.google.com",
    logo: "✨",
    color: "#4285F4",
    planPrice: 20,
    unitCost: 0.002,
    quality: 0.91,
    pop: 0.95,
    createdAt: "2023-12-06",
    description:
      "Google ka Gemini search, Gmail, Docs aur YouTube ke saath deeply connected hai. Bade context window aur free tier ki generosity ki wajah se students aur creators ise roz use karte hain.",
    bestFor: ["Google Workspace", "Research", "Free usage"],
    models: [
      { name: "Gemini 2.5 Pro", bestFor: "Long context reasoning", price: "freemium", offset: 0.26, date: "2025-03-25", categories: ["research", "productivity"] },
      { name: "Gemini 2.5 Flash", bestFor: "Fast answers on mobile", price: "free", offset: -0.18, date: "2025-04-17", categories: ["writing", "productivity"] },
    ],
  },
  {
    name: "Perplexity",
    slug: "perplexity",
    category: "productivity",
    price: "freemium",
    website: "https://www.perplexity.ai",
    logo: "🔍",
    color: "#20808D",
    planPrice: 20,
    unitCost: 0.01,
    quality: 0.9,
    pop: 0.8,
    createdAt: "2022-12-07",
    description:
      "Perplexity ek AI search engine hai jo har jawab ke saath source links deta hai. News, market research aur fact-checking ke liye ye Google se tez aur zyada trustworthy feel hota hai.",
    bestFor: ["Cited research", "News summaries", "Fact checking"],
    models: [
      { name: "Sonar Pro", bestFor: "Deep research with citations", price: "paid", offset: 0.24, date: "2025-01-21" },
      { name: "Sonar", bestFor: "Quick sourced answers", price: "free", offset: -0.1, date: "2025-01-21" },
    ],
  },
  {
    name: "Midjourney",
    slug: "midjourney",
    category: "image",
    price: "paid",
    website: "https://www.midjourney.com",
    logo: "🖼️",
    color: "#1D1D1D",
    planPrice: 10,
    unitCost: 0.025,
    quality: 0.93,
    pop: 0.9,
    createdAt: "2022-07-12",
    description:
      "Midjourney apni cinematic lighting aur artistic style ke liye jana jata hai. Discord aur web editor dono pe chalta hai aur character consistency ke liye strong controls deta hai.",
    bestFor: ["Concept art", "Cinematic visuals", "Thumbnails"],
    freeAlt: "stable-diffusion",
    models: [
      { name: "Midjourney v7", bestFor: "Photoreal art & style control", price: "paid", offset: 0.28, date: "2025-04-03" },
      { name: "Midjourney v6.1", bestFor: "Balanced detail and speed", price: "paid", offset: 0.1, date: "2024-07-31" },
      { name: "Niji 6", bestFor: "Anime & illustration", price: "paid", offset: -0.05, date: "2024-02-14" },
    ],
  },
  {
    name: "DALL·E 3",
    slug: "dall-e-3",
    category: "image",
    price: "freemium",
    website: "https://openai.com/dall-e-3",
    logo: "🎨",
    color: "#412991",
    planPrice: 20,
    unitCost: 0.04,
    quality: 0.84,
    pop: 0.7,
    createdAt: "2023-10-01",
    description:
      "DALL·E 3 ChatGPT ke andar hi image banata hai aur prompt ko samajhne me sabse accurate hai. Text rendering aur simple edits ke liye beginners ke liye best entry point.",
    bestFor: ["Prompt accuracy", "Beginners", "ChatGPT workflow"],
    freeAlt: "stable-diffusion",
    models: [
      { name: "DALL·E 3", bestFor: "Prompt-accurate images", price: "freemium", offset: 0.15, date: "2023-10-01" },
      { name: "DALL·E 3 HD", bestFor: "Print quality output", price: "paid", offset: 0.05, date: "2024-02-01" },
    ],
  },
  {
    name: "Leonardo AI",
    slug: "leonardo-ai",
    category: "image",
    price: "freemium",
    website: "https://leonardo.ai",
    logo: "🐉",
    color: "#7C3AED",
    planPrice: 12,
    unitCost: 0.01,
    quality: 0.86,
    pop: 0.65,
    createdAt: "2022-12-01",
    description:
      "Leonardo AI game assets, product shots aur social media creatives ke liye banaya gaya hai. Isme trained models, canvas editing aur upscaling sab built-in hai.",
    bestFor: ["Game assets", "Product shots", "Free daily credits"],
    models: [
      { name: "Phoenix", bestFor: "Text accuracy in images", price: "freemium", offset: 0.2, date: "2025-02-11" },
      { name: "Lightning XL", bestFor: "Fast batch generation", price: "free", offset: -0.12, date: "2024-09-02" },
    ],
  },
  {
    name: "Ideogram",
    slug: "ideogram",
    category: "image",
    price: "freemium",
    website: "https://ideogram.ai",
    logo: "🅸",
    color: "#F97316",
    planPrice: 8,
    unitCost: 0.012,
    quality: 0.85,
    pop: 0.55,
    createdAt: "2023-08-22",
    description:
      "Ideogram images ke andar text sabse saaf likhta hai, isliye posters, logos aur thumbnails ke liye pehli choice hai. Magic Prompt feature beginner-friendly hai.",
    bestFor: ["Text in images", "Posters", "Logos"],
    models: [
      { name: "Ideogram 3.0", bestFor: "Typography-heavy designs", price: "freemium", offset: 0.22, date: "2025-03-26" },
      { name: "Ideogram 2.0", bestFor: "Fast poster drafts", price: "free", offset: -0.08, date: "2024-08-21" },
    ],
  },
  {
    name: "Stable Diffusion",
    slug: "stable-diffusion",
    category: "image",
    price: "free",
    website: "https://stability.ai",
    logo: "🌌",
    color: "#0EA5E9",
    planPrice: 0,
    unitCost: 0,
    quality: 0.83,
    pop: 0.6,
    createdAt: "2022-08-22",
    description:
      "Stable Diffusion open-source hai, isliye aap apne computer pe free chala sakte hain aur control bhi poora rakhte hain. LoRA, ControlNet aur custom checkpoints ki duniya isi ke around bani hai.",
    bestFor: ["Free unlimited use", "Local generation", "Custom models"],
    models: [
      { name: "SDXL", bestFor: "Balanced open-source quality", price: "free", offset: 0.14, date: "2023-07-26" },
      { name: "SD 3.5 Large", bestFor: "Prompt understanding", price: "free", offset: 0.06, date: "2024-10-22" },
      { name: "SD 1.5", bestFor: "Low VRAM setups", price: "free", offset: -0.22, date: "2022-10-20" },
    ],
  },
  {
    name: "Runway",
    slug: "runway",
    category: "video",
    price: "freemium",
    website: "https://runwayml.com",
    logo: "🎬",
    color: "#0F172A",
    planPrice: 15,
    unitCost: 0.35,
    quality: 0.89,
    pop: 0.75,
    createdAt: "2021-12-08",
    description:
      "Runway AI video generation aur editing ka complete studio hai. Text-to-video, image-to-video aur motion brush jaise tools filmmakers aur ad agencies roz use karte hain.",
    bestFor: ["Text to video", "Ad films", "Motion control"],
    models: [
      { name: "Gen-4", bestFor: "Cinematic shots with consistency", price: "paid", offset: 0.3, date: "2025-03-31" },
      { name: "Gen-3 Alpha", bestFor: "Fast 10s clips", price: "paid", offset: 0.08, date: "2024-06-17" },
    ],
  },
  {
    name: "Sora",
    slug: "sora",
    category: "video",
    price: "paid",
    website: "https://openai.com/sora",
    logo: "🌀",
    color: "#000000",
    planPrice: 20,
    unitCost: 0.5,
    quality: 0.87,
    pop: 0.7,
    createdAt: "2024-12-09",
    description:
      "OpenAI ka Sora realistic physics aur lambi clips ke liye famous hai. Storyboard feature se aap scene by scene video bana sakte hain, aur audio bhi generate hota hai.",
    bestFor: ["Realistic clips", "Storyboards", "Creative shorts"],
    freeAlt: "pika",
    models: [
      { name: "Sora 2", bestFor: "Realistic multi-shot video", price: "paid", offset: 0.26, date: "2025-09-30" },
      { name: "Sora Turbo", bestFor: "Quick social clips", price: "paid", offset: -0.02, date: "2024-12-09" },
    ],
  },
  {
    name: "Pika",
    slug: "pika",
    category: "video",
    price: "freemium",
    website: "https://pika.art",
    logo: "🎥",
    color: "#EC4899",
    planPrice: 10,
    unitCost: 0.2,
    quality: 0.82,
    pop: 0.5,
    createdAt: "2023-11-28",
    description:
      "Pika short meme-style clips aur viral effects ke liye best hai. Pikaffects se photos ko animate karna ek click ka kaam hai, aur free plan se try karna aasan hai.",
    bestFor: ["Fun effects", "Photo animation", "Shorts"],
    models: [
      { name: "Pika 2.2", bestFor: "Creative effects", price: "freemium", offset: 0.16, date: "2025-01-15" },
      { name: "Pika 1.5", bestFor: "Quick free clips", price: "free", offset: -0.14, date: "2024-08-01" },
    ],
  },
  {
    name: "Synthesia",
    slug: "synthesia",
    category: "video",
    price: "paid",
    website: "https://www.synthesia.io",
    logo: "🧑‍💼",
    color: "#4F46E5",
    planPrice: 29,
    unitCost: 0.6,
    quality: 0.85,
    pop: 0.55,
    createdAt: "2017-01-01",
    description:
      "Synthesia AI avatars se training aur corporate videos banata hai, 140+ languages me. Script likhiye aur studio-quality presenter video tayyar hai, camera ki zarurat nahi.",
    bestFor: ["Corporate training", "Multilingual voices", "Avatars"],
    freeAlt: "heygen",
    models: [
      { name: "Avatar Studio", bestFor: "Brand training videos", price: "paid", offset: 0.18, date: "2024-05-14" },
      { name: "Synthesia Express", bestFor: "Quick explainer videos", price: "paid", offset: -0.05, date: "2023-09-20" },
    ],
  },
  {
    name: "HeyGen",
    slug: "heygen",
    category: "video",
    price: "freemium",
    website: "https://www.heygen.com",
    logo: "👥",
    color: "#06B6D4",
    planPrice: 24,
    unitCost: 0.45,
    quality: 0.84,
    pop: 0.5,
    createdAt: "2020-11-01",
    description:
      "HeyGen apni clone avatar aur lip-sync translation ke liye popular hai. Ek video ko 30+ languages me dub kar sakte hain, awaaz bhi aapki hi rehti hai.",
    bestFor: ["Avatar cloning", "Video translation", "UGC ads"],
    models: [
      { name: "Avatar IV", bestFor: "Realistic talking avatars", price: "paid", offset: 0.2, date: "2025-06-10" },
      { name: "HeyGen Free", bestFor: "Testing avatar videos", price: "free", offset: -0.16, date: "2024-03-05" },
    ],
  },
  {
    name: "Descript",
    slug: "descript",
    category: "video",
    price: "freemium",
    website: "https://www.descript.com",
    logo: "✂️",
    color: "#22C55E",
    planPrice: 19,
    unitCost: 0.1,
    quality: 0.82,
    pop: 0.45,
    createdAt: "2016-06-01",
    description:
      "Descript me video editing text ki tarah hoti hai — galat word delete karo aur video se bhi cut ho jata hai. Podcast aur YouTube editing ke liye sabse fast workflow.",
    bestFor: ["Text-based editing", "Podcasts", "Filler word removal"],
    models: [
      { name: "Descript Studio", bestFor: "Full editing suite", price: "paid", offset: 0.15, date: "2024-10-01" },
      { name: "Underlord", bestFor: "AI edit suggestions", price: "freemium", offset: 0.02, date: "2025-02-20" },
    ],
  },
  {
    name: "Cursor",
    slug: "cursor",
    category: "coding",
    price: "freemium",
    website: "https://cursor.com",
    logo: "⌨️",
    color: "#0EA5E9",
    planPrice: 20,
    unitCost: 0.02,
    quality: 0.94,
    pop: 0.9,
    createdAt: "2023-03-14",
    description:
      "Cursor ek AI-first code editor hai jo poore codebase ko samajhta hai. Tab completion, multi-file agent aur natural language edits ise developers ki pehli pasand banate hain.",
    bestFor: ["Whole-repo edits", "Agentic coding", "Fast refactors"],
    models: [
      { name: "Cursor Agent", bestFor: "Multi-file feature building", price: "paid", offset: 0.3, date: "2025-02-24" },
      { name: "Cursor Tab", bestFor: "Line-by-line autocomplete", price: "freemium", offset: 0.12, date: "2023-09-01" },
      { name: "Cursor Composer", bestFor: "Quick in-editor changes", price: "freemium", offset: 0.0, date: "2024-10-10" },
    ],
  },
  {
    name: "GitHub Copilot",
    slug: "github-copilot",
    category: "coding",
    price: "paid",
    website: "https://github.com/features/copilot",
    logo: "🐙",
    color: "#111827",
    planPrice: 10,
    unitCost: 0.015,
    quality: 0.9,
    pop: 0.85,
    createdAt: "2021-06-29",
    description:
      "GitHub Copilot VS Code, JetBrains aur Neovim me officially fit ho jata hai. PR summaries, code review aur chat ke saath ye teams ke liye sabse safe choice hai.",
    bestFor: ["IDE integration", "Code review", "Team adoption"],
    freeAlt: "tabnine",
    models: [
      { name: "Copilot Chat", bestFor: "Explaining & fixing code", price: "paid", offset: 0.2, date: "2023-03-22" },
      { name: "Copilot Edits", bestFor: "Multi-file agent mode", price: "paid", offset: 0.1, date: "2025-01-15" },
    ],
  },
  {
    name: "v0",
    slug: "v0",
    category: "coding",
    price: "freemium",
    website: "https://v0.dev",
    logo: "▲",
    color: "#000000",
    planPrice: 20,
    unitCost: 0.03,
    quality: 0.88,
    pop: 0.7,
    createdAt: "2023-09-14",
    description:
      "Vercel ka v0 prompt se React + Tailwind UI banata hai aur code seedha copy ya deploy kar sakte hain. Landing pages aur dashboards ka pehla draft minutes me mil jata hai.",
    bestFor: ["UI generation", "React components", "Fast prototypes"],
    models: [
      { name: "v0-1.5", bestFor: "Production-ready UI code", price: "freemium", offset: 0.25, date: "2025-04-08" },
      { name: "v0 Mini", bestFor: "Quick free prototypes", price: "free", offset: -0.12, date: "2024-11-19" },
    ],
  },
  {
    name: "Bolt.new",
    slug: "bolt-new",
    category: "coding",
    price: "freemium",
    website: "https://bolt.new",
    logo: "⚡",
    color: "#2563EB",
    planPrice: 20,
    unitCost: 0.03,
    quality: 0.85,
    pop: 0.6,
    createdAt: "2024-10-03",
    description:
      "Bolt.new browser me hi poora full-stack app generate, run aur deploy karta hai. Non-developers ke liye ye idea se live link tak ka sabse chhota rasta hai.",
    bestFor: ["Full-stack prototypes", "Browser dev", "No setup"],
    models: [
      { name: "Bolt Agent", bestFor: "End-to-end app builds", price: "paid", offset: 0.2, date: "2025-01-20" },
      { name: "Bolt Free", bestFor: "Trying ideas quickly", price: "free", offset: -0.15, date: "2024-10-03" },
    ],
  },
  {
    name: "Replit Agent",
    slug: "replit",
    category: "coding",
    price: "freemium",
    website: "https://replit.com",
    logo: "🧱",
    color: "#F26207",
    planPrice: 25,
    unitCost: 0.03,
    quality: 0.83,
    pop: 0.55,
    createdAt: "2024-09-05",
    description:
      "Replit Agent app banane ke saath database, auth aur hosting bhi set kar deta hai. Mobile app se bhi coding possible hai, isliye students ise bahut pasand karte hain.",
    bestFor: ["App + hosting", "Students", "Mobile coding"],
    models: [
      { name: "Replit Agent 2", bestFor: "Full app with database", price: "paid", offset: 0.18, date: "2025-05-12" },
      { name: "Replit Core", bestFor: "Cloud IDE + AI", price: "paid", offset: 0.0, date: "2023-10-01" },
    ],
  },
  {
    name: "Tabnine",
    slug: "tabnine",
    category: "coding",
    price: "freemium",
    website: "https://www.tabnine.com",
    logo: "🧠",
    color: "#6D28D9",
    planPrice: 9,
    unitCost: 0.008,
    quality: 0.79,
    pop: 0.4,
    createdAt: "2018-11-01",
    description:
      "Tabnine privacy-first code completion deta hai aur self-hosted bhi chal sakta hai. Enterprises ke liye ye important hai jab code bahar nahi bhejna hota.",
    bestFor: ["Privacy-first teams", "Self-hosted AI", "Autocomplete"],
    models: [
      { name: "Tabnine Enterprise", bestFor: "On-prem deployment", price: "paid", offset: 0.12, date: "2024-04-01" },
      { name: "Tabnine Basic", bestFor: "Free completion", price: "free", offset: -0.2, date: "2023-01-01" },
    ],
  },
  {
    name: "ElevenLabs",
    slug: "elevenlabs",
    category: "voice",
    price: "freemium",
    website: "https://elevenlabs.io",
    logo: "🔊",
    color: "#111827",
    planPrice: 11,
    unitCost: 0.03,
    quality: 0.95,
    pop: 0.85,
    createdAt: "2022-09-01",
    description:
      "ElevenLabs voice cloning aur natural TTS ka market leader hai. 30+ languages, emotion control aur real-time API ke saath ye audiobooks se AI agents tak use hota hai.",
    bestFor: ["Voice cloning", "Audiobooks", "Multilingual dubbing"],
    models: [
      { name: "Eleven v3", bestFor: "Emotional, expressive speech", price: "paid", offset: 0.3, date: "2025-06-05" },
      { name: "Flash v2.5", bestFor: "Low-latency real-time voice", price: "freemium", offset: 0.12, date: "2025-03-01" },
      { name: "Turbo v2", bestFor: "Fast cheap narration", price: "freemium", offset: 0.0, date: "2024-08-19" },
    ],
  },
  {
    name: "Murf AI",
    slug: "murf-ai",
    category: "voice",
    price: "paid",
    website: "https://murf.ai",
    logo: "🎙️",
    color: "#F43F5E",
    planPrice: 19,
    unitCost: 0.02,
    quality: 0.83,
    pop: 0.45,
    createdAt: "2020-03-01",
    description:
      "Murf AI presentation, e-learning aur ads ke liye studio-style voiceover banata hai. Timeline editor me script, voice aur music sath me manage ho jate hain.",
    bestFor: ["E-learning voiceover", "Presentations", "Studio editor"],
    freeAlt: "elevenlabs",
    models: [
      { name: "Murf Gen2", bestFor: "Natural business narration", price: "paid", offset: 0.15, date: "2025-01-10" },
      { name: "Murf Free", bestFor: "Short voice tests", price: "free", offset: -0.18, date: "2023-05-01" },
    ],
  },
  {
    name: "PlayHT",
    slug: "playht",
    category: "voice",
    price: "freemium",
    website: "https://play.ht",
    logo: "📢",
    color: "#8B5CF6",
    planPrice: 31,
    unitCost: 0.025,
    quality: 0.8,
    pop: 0.35,
    createdAt: "2019-01-01",
    description:
      "PlayHT realistic TTS aur voice cloning deta hai, saath me podcast aur video ke liye workflow tools. Iska API developers ke liye simple hai.",
    bestFor: ["Podcast narration", "Voice API", "Cloning"],
    models: [
      { name: "Play 3.0", bestFor: "Expressive narration", price: "paid", offset: 0.14, date: "2025-02-14" },
      { name: "Play 2.0", bestFor: "Stable standard voices", price: "freemium", offset: -0.1, date: "2024-05-01" },
    ],
  },
  {
    name: "Suno",
    slug: "suno",
    category: "music",
    price: "freemium",
    website: "https://suno.com",
    logo: "🎵",
    color: "#F59E0B",
    planPrice: 10,
    unitCost: 0.05,
    quality: 0.92,
    pop: 0.85,
    createdAt: "2023-08-01",
    description:
      "Suno ek prompt se poora gaana banata hai — vocals, lyrics aur mixing sab. Reels aur YouTube ke liye original music banane ka sabse aasan tareeka.",
    bestFor: ["Full songs", "Lyrics + vocals", "Background music"],
    models: [
      { name: "Suno v4.5", bestFor: "Radio-quality songs", price: "paid", offset: 0.28, date: "2025-07-17" },
      { name: "Suno v4", bestFor: "Fast song drafts", price: "freemium", offset: 0.1, date: "2024-11-19" },
      { name: "Suno v3.5", bestFor: "Free daily tracks", price: "free", offset: -0.1, date: "2024-05-20" },
    ],
  },
  {
    name: "Udio",
    slug: "udio",
    category: "music",
    price: "freemium",
    website: "https://www.udio.com",
    logo: "🎶",
    color: "#6366F1",
    planPrice: 10,
    unitCost: 0.045,
    quality: 0.88,
    pop: 0.55,
    createdAt: "2024-04-10",
    description:
      "Udio audio quality aur instrument detail me strong hai. Iske remix aur extend features se ek idea ko poore track me badha sakte hain.",
    bestFor: ["Studio-quality audio", "Remixing", "Instrumentals"],
    models: [
      { name: "Udio 1.5", bestFor: "Detailed mixes", price: "freemium", offset: 0.22, date: "2025-01-22" },
      { name: "Udio Free", bestFor: "Trying ideas", price: "free", offset: -0.15, date: "2024-04-10" },
    ],
  },
  {
    name: "AIVA",
    slug: "aiva",
    category: "music",
    price: "freemium",
    website: "https://www.aiva.ai",
    logo: "🎼",
    color: "#0F766E",
    planPrice: 11,
    unitCost: 0.02,
    quality: 0.76,
    pop: 0.3,
    createdAt: "2016-02-01",
    description:
      "AIVA cinematic aur orchestral background scores ke liye bana hai. Filmmakers ise documentary aur game score ke liye use karte hain, licence clear ke saath.",
    bestFor: ["Cinematic scores", "Documentaries", "Game music"],
    models: [
      { name: "AIVA Pro", bestFor: "Licensed film score", price: "paid", offset: 0.12, date: "2024-06-01" },
      { name: "AIVA Free", bestFor: "Personal project music", price: "free", offset: -0.15, date: "2023-02-01" },
    ],
  },
  {
    name: "Canva Magic Studio",
    slug: "canva",
    category: "design",
    price: "freemium",
    website: "https://www.canva.com",
    logo: "🖌️",
    color: "#00C4CC",
    planPrice: 12,
    unitCost: 0.01,
    quality: 0.88,
    pop: 0.9,
    createdAt: "2023-10-04",
    description:
      "Canva Magic Studio design ke saath AI image, text aur video ek hi editor me le aata hai. Templates ki wajah se non-designers ke liye sabse fast option.",
    bestFor: ["Social media posts", "Presentations", "Templates"],
    models: [
      { name: "Magic Design", bestFor: "Instant post layouts", price: "freemium", offset: 0.22, date: "2023-10-04" },
      { name: "Magic Write", bestFor: "Copy inside designs", price: "freemium", offset: 0.05, date: "2023-10-04" },
    ],
  },
  {
    name: "Figma AI",
    slug: "figma-ai",
    category: "design",
    price: "paid",
    website: "https://www.figma.com",
    logo: "🧩",
    color: "#A259FF",
    planPrice: 16,
    unitCost: 0.02,
    quality: 0.86,
    pop: 0.65,
    createdAt: "2024-06-26",
    description:
      "Figma AI design files me hi first drafts banata hai — wireframes, layers rename aur content fill. Product teams ke liye design system ke saath kaam karna aasan hai.",
    bestFor: ["UI wireframes", "Design systems", "Team handoff"],
    models: [
      { name: "Figma Make", bestFor: "Prompt to interactive UI", price: "paid", offset: 0.24, date: "2025-05-07" },
      { name: "Figma AI Beta", bestFor: "In-file design help", price: "paid", offset: 0.06, date: "2024-06-26" },
    ],
  },
  {
    name: "Gamma",
    slug: "gamma",
    category: "productivity",
    price: "freemium",
    website: "https://gamma.app",
    logo: "📊",
    color: "#7C3AED",
    planPrice: 10,
    unitCost: 0.02,
    quality: 0.87,
    pop: 0.7,
    createdAt: "2022-12-01",
    description:
      "Gamma ek prompt ya doc se polished slides aur one-pagers banata hai. Pitch deck aur report ke liye PowerPoint se tez aur zyada modern result deta hai.",
    bestFor: ["Pitch decks", "Reports", "One-pagers"],
    models: [
      { name: "Gamma 3", bestFor: "Branded, editable decks", price: "freemium", offset: 0.24, date: "2025-04-22" },
      { name: "Gamma 2", bestFor: "Fast free decks", price: "free", offset: -0.06, date: "2024-08-14" },
    ],
  },
  {
    name: "Notion AI",
    slug: "notion-ai",
    category: "productivity",
    price: "paid",
    website: "https://www.notion.so/product/ai",
    logo: "📝",
    color: "#111827",
    planPrice: 10,
    unitCost: 0.01,
    quality: 0.85,
    pop: 0.7,
    createdAt: "2023-02-22",
    description:
      "Notion AI aapke workspace ke notes aur docs ke andar hi search aur likhta hai. Meeting notes se action items nikalna aur knowledge base se jawab dhoondhna iska strength hai.",
    bestFor: ["Knowledge base", "Meeting notes", "Workspace search"],
    freeAlt: "perplexity",
    models: [
      { name: "Notion AI", bestFor: "Workspace Q&A and drafts", price: "paid", offset: 0.18, date: "2023-02-22" },
      { name: "Notion AI Free", bestFor: "Limited trial answers", price: "free", offset: -0.2, date: "2024-09-01" },
    ],
  },
  {
    name: "Otter.ai",
    slug: "otter-ai",
    category: "productivity",
    price: "freemium",
    website: "https://otter.ai",
    logo: "🦦",
    color: "#2563EB",
    planPrice: 17,
    unitCost: 0.02,
    quality: 0.83,
    pop: 0.55,
    createdAt: "2016-01-01",
    description:
      "Otter.ai meetings ko real-time transcribe karta hai aur summary deta hai. Zoom, Meet aur Teams ke saath integration isliye offices me common hai.",
    bestFor: ["Meeting notes", "Live transcription", "Team summaries"],
    models: [
      { name: "OtterPilot", bestFor: "Auto-join and summarise", price: "paid", offset: 0.16, date: "2024-02-01" },
      { name: "Otter Free", bestFor: "300 free minutes", price: "free", offset: -0.12, date: "2023-01-01" },
    ],
  },
  {
    name: "Fireflies.ai",
    slug: "fireflies-ai",
    category: "productivity",
    price: "freemium",
    website: "https://fireflies.ai",
    logo: "🔥",
    color: "#EF4444",
    planPrice: 18,
    unitCost: 0.02,
    quality: 0.81,
    pop: 0.45,
    createdAt: "2016-06-01",
    description:
      "Fireflies meetings record karke CRM me notes bhejta hai. Sales teams ke liye ye conversations searchable banata hai aur follow-up automatic likh deta hai.",
    bestFor: ["Sales call notes", "CRM sync", "Searchable meetings"],
    models: [
      { name: "Fireflies Pro", bestFor: "Unlimited transcription", price: "paid", offset: 0.14, date: "2024-03-01" },
      { name: "Fireflies Free", bestFor: "Basic meeting notes", price: "free", offset: -0.16, date: "2023-01-01" },
    ],
  },
  {
    name: "Grammarly",
    slug: "grammarly",
    category: "writing",
    price: "freemium",
    website: "https://www.grammarly.com",
    logo: "✍️",
    color: "#15C39A",
    planPrice: 12,
    unitCost: 0.002,
    quality: 0.86,
    pop: 0.8,
    createdAt: "2009-07-01",
    description:
      "Grammarly har app me English ko saaf karta hai — grammar, tone aur clarity. Email aur LinkedIn post likhne walon ke liye ye sabse bina friction wala AI hai.",
    bestFor: ["Grammar fixes", "Tone adjustment", "Email writing"],
    models: [
      { name: "GrammarlyGO", bestFor: "Rewrite with your tone", price: "paid", offset: 0.18, date: "2023-04-20" },
      { name: "Grammarly Free", bestFor: "Basic grammar corrections", price: "free", offset: -0.14, date: "2021-01-01" },
    ],
  },
  {
    name: "DeepL",
    slug: "deepl",
    category: "writing",
    price: "freemium",
    website: "https://www.deepl.com",
    logo: "🌐",
    color: "#0F2B46",
    planPrice: 9,
    unitCost: 0.001,
    quality: 0.9,
    pop: 0.7,
    createdAt: "2017-08-28",
    description:
      "DeepL translation quality me Google Translate se aage mani jati hai, especially European languages me. Document translation apni formatting bacha kar rakhta hai.",
    bestFor: ["Accurate translation", "Document translation", "Formal tone"],
    models: [
      { name: "DeepL Pro", bestFor: "Business documents", price: "paid", offset: 0.2, date: "2020-03-01" },
      { name: "DeepL Free", bestFor: "Everyday translation", price: "free", offset: -0.1, date: "2017-08-28" },
    ],
  },
  {
    name: "QuillBot",
    slug: "quillbot",
    category: "writing",
    price: "freemium",
    website: "https://quillbot.com",
    logo: "🪶",
    color: "#22C55E",
    planPrice: 10,
    unitCost: 0.001,
    quality: 0.8,
    pop: 0.5,
    createdAt: "2017-01-01",
    description:
      "QuillBot paraphrase, summarise aur citation ke liye students ka favourite hai. Plagiarism checker ke saath ek hi jagah writing workflow mil jata hai.",
    bestFor: ["Paraphrasing", "Summaries", "Citations"],
    models: [
      { name: "QuillBot Premium", bestFor: "Full paraphrase modes", price: "paid", offset: 0.12, date: "2023-06-01" },
      { name: "QuillBot Free", bestFor: "Basic paraphrasing", price: "free", offset: -0.18, date: "2021-01-01" },
    ],
  },
  {
    name: "Jasper",
    slug: "jasper",
    category: "business",
    price: "paid",
    website: "https://www.jasper.ai",
    logo: "💼",
    color: "#F97316",
    planPrice: 39,
    unitCost: 0.01,
    quality: 0.8,
    pop: 0.5,
    createdAt: "2021-01-01",
    description:
      "Jasper brand voice aur campaign workflows ke liye banaya gaya marketing AI hai. Teams ke liye approval flow aur multiple brand tones manage karna aasan hai.",
    bestFor: ["Brand campaigns", "Marketing teams", "Ad copy"],
    freeAlt: "copy-ai",
    models: [
      { name: "Jasper Brand Voice", bestFor: "On-brand marketing copy", price: "paid", offset: 0.14, date: "2024-02-01" },
      { name: "Jasper Pro", bestFor: "Long-form campaign content", price: "paid", offset: 0.0, date: "2023-01-01" },
    ],
  },
  {
    name: "Copy.ai",
    slug: "copy-ai",
    category: "business",
    price: "freemium",
    website: "https://www.copy.ai",
    logo: "🗂️",
    color: "#3B82F6",
    planPrice: 36,
    unitCost: 0.01,
    quality: 0.78,
    pop: 0.4,
    createdAt: "2020-10-01",
    description:
      "Copy.ai sales aur marketing ke repetitive kaam automate karta hai — GTM workflows, email personalisation aur content briefs. Free plan se test karna aasan hai.",
    bestFor: ["Sales emails", "Workflow automation", "Content briefs"],
    models: [
      { name: "Copy.ai Workflows", bestFor: "Automated GTM tasks", price: "paid", offset: 0.12, date: "2024-01-15" },
      { name: "Copy.ai Free", bestFor: "Basic copy generation", price: "free", offset: -0.2, date: "2022-01-01" },
    ],
  },
  {
    name: "Khanmigo",
    slug: "khanmigo",
    category: "education",
    price: "freemium",
    website: "https://www.khanacademy.org/khanmigo",
    logo: "🎓",
    color: "#14B8A6",
    planPrice: 4,
    unitCost: 0.005,
    quality: 0.83,
    pop: 0.5,
    createdAt: "2023-03-14",
    description:
      "Khanmigo Khan Academy ka AI tutor hai jo jawab seedha nahi deta, balki sawal puchh kar samjhata hai. Bache ke liye safe aur teacher-approved approach hai.",
    bestFor: ["Maths tutoring", "Safe for kids", "Guided learning"],
    models: [
      { name: "Khanmigo Tutor", bestFor: "Socratic step-by-step help", price: "freemium", offset: 0.16, date: "2024-05-01" },
      { name: "Khanmigo Teacher", bestFor: "Lesson planning", price: "paid", offset: 0.02, date: "2024-08-01" },
    ],
  },
  {
    name: "Duolingo Max",
    slug: "duolingo-max",
    category: "education",
    price: "paid",
    website: "https://www.duolingo.com",
    logo: "🦉",
    color: "#58CC02",
    planPrice: 14,
    unitCost: 0.01,
    quality: 0.82,
    pop: 0.6,
    createdAt: "2023-03-14",
    description:
      "Duolingo Max me AI roleplay aur 'Explain My Answer' features hain. Language practice ko conversation jaisa banata hai, bina teacher ke.",
    bestFor: ["Language practice", "Roleplay", "Beginner friendly"],
    models: [
      { name: "Duolingo Max", bestFor: "AI roleplay conversations", price: "paid", offset: 0.14, date: "2023-03-14" },
      { name: "Duolingo Super", bestFor: "Ad-free lessons", price: "paid", offset: -0.06, date: "2022-08-01" },
    ],
  },
  {
    name: "StudyFetch",
    slug: "studyfetch",
    category: "education",
    price: "freemium",
    website: "https://www.studyfetch.com",
    logo: "📚",
    color: "#8B5CF6",
    planPrice: 8,
    unitCost: 0.01,
    quality: 0.75,
    pop: 0.3,
    createdAt: "2022-09-01",
    description:
      "StudyFetch notes aur PDF se flashcards, quiz aur study guide banata hai. Exam ke last week me revision fast karne ke liye useful hai.",
    bestFor: ["Flashcards", "Exam revision", "PDF to quiz"],
    models: [
      { name: "StudyFetch AI Tutor", bestFor: "Course-specific Q&A", price: "paid", offset: 0.1, date: "2024-04-01" },
      { name: "StudyFetch Free", bestFor: "Basic flashcard sets", price: "free", offset: -0.18, date: "2023-01-01" },
    ],
  },
  {
    name: "Zapier AI",
    slug: "zapier-ai",
    category: "business",
    price: "freemium",
    website: "https://zapier.com",
    logo: "💡",
    color: "#FF4F00",
    planPrice: 20,
    unitCost: 0.01,
    quality: 0.82,
    pop: 0.55,
    createdAt: "2023-06-01",
    description:
      "Zapier AI natural language se automations banata hai aur 7000+ apps ko jodta hai. Repetitive reporting aur lead routing bina code automate ho jata hai.",
    bestFor: ["No-code automation", "App integrations", "Lead routing"],
    models: [
      { name: "Zapier Agents", bestFor: "Autonomous multi-step tasks", price: "paid", offset: 0.16, date: "2025-01-28" },
      { name: "Zapier AI Builder", bestFor: "Prompt to automation", price: "freemium", offset: 0.02, date: "2024-03-01" },
    ],
  },
  {
    name: "Grok",
    slug: "grok",
    category: "writing",
    price: "freemium",
    website: "https://grok.com",
    logo: "✖️",
    color: "#0F172A",
    planPrice: 30,
    unitCost: 0.004,
    quality: 0.84,
    pop: 0.65,
    createdAt: "2023-11-04",
    description:
      "xAI ka Grok real-time X (Twitter) data ke saath jawab deta hai. Trending topics aur public sentiment samajhne ke liye ye sabse fast option hai.",
    bestFor: ["Real-time news", "Social trends", "Casual chat"],
    models: [
      { name: "Grok 4", bestFor: "Live social context", price: "paid", offset: 0.2, date: "2025-07-09" },
      { name: "Grok 3 Mini", bestFor: "Fast free answers", price: "free", offset: -0.12, date: "2025-02-19" },
    ],
  },
  {
    name: "Mistral Le Chat",
    slug: "mistral",
    category: "business",
    price: "freemium",
    website: "https://chat.mistral.ai",
    logo: "🌬️",
    color: "#FF7000",
    planPrice: 15,
    unitCost: 0.002,
    quality: 0.8,
    pop: 0.4,
    createdAt: "2024-02-26",
    description:
      "Mistral ka Le Chat European privacy rules ke saath fast open-weight models deta hai. Developers iske API ko sasta aur self-hostable hone ke liye pasand karte hain.",
    bestFor: ["EU data privacy", "Cheap API", "Open weights"],
    models: [
      { name: "Mistral Large 2", bestFor: "Multilingual business tasks", price: "paid", offset: 0.15, date: "2024-07-24" },
      { name: "Mistral Small", bestFor: "Fast free chat", price: "free", offset: -0.15, date: "2024-09-17" },
    ],
  },
];

const CATEGORY_PRO: Record<CategorySlug, string> = {
  writing: "Long-form writing aur editing me natural, usable output deta hai",
  image: "Visual quality aur style control me strong hai",
  video: "Video generation ya editing ka poora workflow ek jagah deta hai",
  coding: "Real codebase context ke saath kaam karta hai",
  voice: "Natural voice aur pronunciation quality high hai",
  music: "Ek prompt se poora track, vocals ke saath mil jata hai",
  design: "Design ke andar hi AI se draft ban jata hai",
  productivity: "Roz ke kaam ke tools ke saath seedha integrate hota hai",
  education: "Step-by-step samjhata hai, seedha jawab nahi deta",
  business: "Team workflows aur brand voice ke saath chalta hai",
  research: "Sources aur data ke saath tez research karta hai",
  marketing: "Content ko growth aur campaign tak jodta hai",
  social: "Lambe content se social posts aur clips banata hai",
  agents: "Multi-step kaam khud automate karta hai",
  specialized: "Ek focused, high-value kaam ke liye bana hai",
};

const USER_NAMES = [
  "Aarav Sharma", "Priya Nair", "Rohit Verma", "Sneha Iyer", "Kabir Khan", "Ananya Das",
  "Vikram Patel", "Meera Joshi", "Rahul Gupta", "Ishita Bose", "Arjun Reddy", "Tanya Singh",
  "Dev Malhotra", "Nisha Rao", "Aditya Kulkarni", "Pooja Menon", "Sahil Chopra", "Riya Bhatt",
  "Karan Mehta", "Divya Pillai", "Manav Shah", "Sara Ali", "Nikhil Jain", "Aditi Desai",
  "Yash Thakur", "Zoya Siddiqui", "Aman Soni", "Kavya Ramesh", "Varun Saxena", "Neha Kapoor",
];

const REVIEWS: string[] = [
  "Mera daily workflow ka hissa ban gaya hai, time bahut bacha raha hai.",
  "Output quality achhi hai, par kabhi kabhi extra edit karna padta hai.",
  "Free plan me hi kaafi kaam ho jata hai. Beginners ke liye perfect.",
  "Speed impressive hai, lekin pricing thodi zyada lagti hai.",
  "Hindi prompts bhi samajh leta hai, ye sabse badi baat hai.",
  "Accuracy acchi hai. Complex tasks me ek-do baar galat bhi jata hai.",
  "Interface simple hai, koi learning curve nahi. Family ko bhi bata diya.",
  "Team ke liye liya hai, sab log use kar rahe hain. Worth it.",
  "Kuch features paid me hain jo free hone chahiye the.",
  "Compare karke dekha, yahi sabse balanced nikla. Recommend karunga.",
  "Reliability kabhi kabhi issue karti hai, downtime aata hai.",
  "Output ka tone natural hai, AI jaisa flat nahi lagta.",
  "Long documents ke liye best. 50 page PDF bhi handle kar liya.",
  "Mobile app thoda slow hai, par desktop pe mast chalta hai.",
  "Isse pehle main 3 tools use karta tha, ab ek hi kaafi hai.",
  "Beginner hoon, phir bhi pehle din se useful output mila.",
  "Pricing page confusing hai, plans clearly likhne chahiye.",
  "Customer support ne 2 din me reply kiya, thoda slow.",
  "Result consistent hai, isliye client work me bharosa hai.",
  "Quality ke hisaab se sasta hai. Value for money.",
  "Coding tasks me kabhi kabhi hallucinate karta hai, dhyan rakhna.",
  "Achha hai but free limit jaldi khatam ho jati hai.",
  "Maine apne students ko suggest kiya, sabko pasand aaya.",
  "Export options limited hain, aur chahiye.",
  "Ye tool try karke hi samajh aayega, demo version rakho.",
  "Language support strong hai, regional languages bhi try karo.",
  "Small business ke liye perfect, enterprise features ki zarurat nahi.",
  "BC update ke baad aur fast ho gaya hai.",
  "Iska API documentation achha hai, integrate karna easy tha.",
  "Mujhe sirf ek problem hai: mobile pe copy karna mushkil hai.",
];

function makeRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function hashCode(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function gaussian(rng: () => number) {
  const u = Math.max(rng(), 1e-6);
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function isoDaysAgo(days: number, hourOffset = 0): string {
  const base = Date.now() - days * 86400000 - hourOffset * 3600000;
  return new Date(base).toISOString();
}

function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length) % arr.length];
}

const PROMPT_TEMPLATES = [
  (ai: string, cat: string) => ({
    title: "Quick brief",
    text: `Act as a senior ${cat} expert. I am working on a project for an Indian audience. Ask me 3 clarifying questions, then give a step-by-step plan using ${ai}. Keep the language simple and practical.`,
  }),
  (ai: string, cat: string) => ({
    title: "Beginner explainer",
    text: `Explain ${cat} to a complete beginner in 8 short bullet points. Use one everyday Indian example. Then list 3 mistakes beginners make and how to avoid them.`,
  }),
  (ai: string, cat: string) => ({
    title: "Critique my work",
    text: `Here is my current ${cat} output: [paste your work]. Review it like a strict but helpful mentor. Give a score out of 10, list what is weak, and rewrite the weakest 3 lines without changing my voice.`,
  }),
  (ai: string, cat: string) => ({
    title: "Fast ideation",
    text: `Give me 10 ${cat} ideas for a small Indian creator brand with a budget under ₹5,000 per month. For each idea give: what it is, time needed, and expected result. Mark the 3 easiest wins.`,
  }),
  (ai: string, cat: string) => ({
    title: "Production checklist",
    text: `Create a 7-step checklist I can reuse every time I do ${cat} work with ${ai}. Include a quality check before publishing and a short template I can fill in under 2 minutes.`,
  }),
];

const POST_SEED: {
  title: string;
  slug: string;
  type: PostType;
  excerpt: string;
  emoji: string;
  ai: string[];
  sponsored?: boolean;
  days: number;
  content: string;
}[] = [
  {
    title: "Top 10 Free AI Tools Jo 2026 Me Paise Bina Kaam Aate Hain",
    slug: "top-10-free-ai-tools",
    type: "top10",
    excerpt: "Zero budget me shuru karne wale creators ke liye 10 free AI tools, real user rating ke saath.",
    emoji: "🏆",
    ai: ["chatgpt", "stable-diffusion", "gemini", "canva", "elevenlabs", "suno"],
    days: 2,
    content: `Har mahine naye AI tools aa rahe hain, par free plan kaafi nahi hota. Is list me humne wahi tools chune hain jinka free tier sach me kaam ka hai.

## Kaise chune gaye
Humne teen cheezein dekhi: free plan ki real limit, output quality, aur GigleNode users ki rating. Jo tool sirf demo deta hai wo list me nahi hai.

## Free tier ka sach
Free plan ka matlab "hamesha free" nahi hota. Zyada tar tools credit system chalate hain. Isliye pehle apna monthly volume likhiye, phir tool chuniye.

## Shuruaat kaise karein
Ek hi category se shuru kijiye. Writing ke liye ek tool, image ke liye ek. Teen-chaar tools ek saath use karna confusion badhata hai.`,
  },
  {
    title: "ChatGPT vs Gemini vs Claude: 2026 Me Kaunsa Best Hai?",
    slug: "chatgpt-vs-gemini-vs-claude",
    type: "comparison",
    excerpt: "Teeno flagship AI ka honest comparison — writing, coding, research aur pricing ke hisab se.",
    emoji: "⚖️",
    ai: ["chatgpt", "gemini", "claude"],
    days: 4,
    content: `Teeno tools achhe hain, par teeno ek jaise nahi hain. Farak samajhne ke liye humne same 5 tasks teeno pe chalaye.

## Writing
Claude ka tone sabse natural laga. ChatGPT thoda formulaic hota hai, Gemini ka output concise hota hai.

## Coding
Cursor ke saath ChatGPT aur Claude dono strong hain. Bade refactor me Claude ne kam galtiyan ki.

## Research
Gemini ka long context aur Perplexity style citations ise documents ke liye aage rakhte hain.

## Final verdict
Ek tool chahiye to ChatGPT. Writing-heavy kaam hai to Claude. Google ecosystem me ho to Gemini.`,
  },
  {
    title: "Sora 2 Aa Gaya: Kya Ab Video Editor Ki Zarurat Nahi?",
    slug: "sora-2-video-editing",
    type: "news",
    excerpt: "Sora 2 ke realistic clips aur audio ke baad creators ke liye workflow kaisa badlega.",
    emoji: "🎥",
    ai: ["sora", "runway", "descript"],
    days: 6,
    content: `Sora 2 ne text se video ki quality ko agle level pe pahuncha diya hai. Physics realistic hai aur audio bhi sath aata hai.

## Kya badla
10 second ka clip ab ek prompt me ban jata hai. B-roll ke liye shooting ki zarurat kam ho gayi hai.

## Kya nahi badla
Story, pacing aur brand tone abhi bhi human ka kaam hai. AI clip ko edit karna aur sequence banana zaroori hai.

## Practical use
Reels ke hook shots, product angles aur ad variations — in teeno me Sora sabse fast hai.`,
  },
  {
    title: "Cursor Se 1 Ghante Me Landing Page Kaise Banayein",
    slug: "cursor-landing-page-tutorial",
    type: "tutorial",
    excerpt: "Step-by-step: prompt likhne se deploy tak, bina coding background ke.",
    emoji: "⌨️",
    ai: ["cursor", "v0", "bolt-new"],
    days: 8,
    content: `Cursor ek AI editor hai jo aapke poore project ko samajhta hai. Is tutorial me hum ek simple landing page banayenge.

## Step 1: Structure do
Cursor ko pehle file structure batao. Ek page, ek section component, ek style file. Bina structure ke wo guess karega.

## Step 2: Chhote changes maango
"Poora website bana do" mat bolo. Ek waqt me ek section. Isse galtiyan kam hoti hain.

## Step 3: Review karo
Har change ke baad browser me dekho. Galat output ko undo karke dobara likho, aage mat badho.

## Step 4: Deploy
Vercel pe push karo. Build error aaye to error message Cursor me paste karo — wo theek kar dega.`,
  },
  {
    title: "Free AI Se Professional Thumbnail Banane Ka Tarika",
    slug: "free-ai-thumbnail-guide",
    type: "tutorial",
    excerpt: "Canva, Ideogram aur Stable Diffusion se YouTube thumbnail jo click laaye.",
    emoji: "🖼️",
    ai: ["canva", "ideogram", "stable-diffusion"],
    days: 10,
    content: `Thumbnail pe 3 cheezein matter karti hain: face, contrast aur 3 shabd se kam text.

## Background
Ideogram se background banao kyunki wo text bhi saaf likhta hai. 16:9 ratio chuniye.

## Face aur emotion
Stable Diffusion me expression control karna mushkil hota hai. Canva ke templates me ready faces hote hain, unhe use karo.

## Text
Teen shabd, bada font, high contrast. Mobile pe check karna mat bhoolo.`,
  },
  {
    title: "Suno v4.5 Review: Kya AI Ke Gaane Sunne Layak Hain?",
    slug: "suno-v4-5-review",
    type: "news",
    excerpt: "Humne 20 tracks banaye aur mixing, lyrics aur repeatability check ki.",
    emoji: "🎵",
    ai: ["suno", "udio", "aiva"],
    days: 12,
    content: `Suno v4.5 ke baad AI music clearly "demo" se "release-ready" ki taraf gaya hai.

## Vocals
Hindi pronunciation kaafi sudhar gayi hai. Kuch words abhi bhi galat pronounce hote hain.

## Mixing
Low end thoda muddy lagta hai, par mastering se theek ho jata hai.

## Verdict
Background music aur jingles ke liye 9/10. Full album ke liye abhi human producer chahiye.`,
  },
  {
    title: "AI Rating Fake Kaise Hote Hain Aur GigleNode Kya Karta Hai",
    slug: "fake-ai-ratings",
    type: "news",
    excerpt: "Paid reviews aur bot votes se bachaav ke liye hamara 4-layer system.",
    emoji: "🛡️",
    ai: ["chatgpt", "claude"],
    days: 14,
    content: `AI tool directory me sabse badi problem fake rating hai. Humne iske liye 4 rules banaye hain.

## Login zaroori
Bina account rating nahi. Har rating ek verified user se juda hota hai.

## Ek user, ek model, ek rating
Purani rating edit hoti hai, nayi entry nahi banti. Isse vote stuffing rukti hai.

## 24 ghante ka edit lock
Baar baar rating badal kar ranking hilana possible nahi.

## Weighted ranking
Kam votes wala 5.0 star, zyada votes wale 4.7 star se upar nahi ja sakta.`,
  },
  {
    title: "ElevenLabs vs Murf: Hindi Voiceover Ke Liye Kaunsa?",
    slug: "elevenlabs-vs-murf-hindi",
    type: "comparison",
    excerpt: "Hindi pronunciation, emotion aur pricing pe dono tools ka test.",
    emoji: "🎙️",
    ai: ["elevenlabs", "murf-ai", "playht"],
    days: 16,
    content: `Hindi voiceover ke liye dono tools use kiye. Farak clearly hai.

## Pronunciation
ElevenLabs Hindi me zyada natural hai, especially "ऋ" jaise sounds me. Murf thoda English accent le aata hai.

## Emotion
ElevenLabs me stability aur style control hai. Murf ka editor simple hai par control kam.

## Pricing
Murf sasta padta hai agar aapko sirf narration chahiye. Cloning chahiye to ElevenLabs.`,
  },
  {
    title: "Top 5 Coding AI Jo 2026 Me Developers Use Kar Rahe Hain",
    slug: "top-5-coding-ai",
    type: "top10",
    excerpt: "Cursor, Copilot, v0, Bolt aur Replit — kaun kis kaam ke liye best hai.",
    emoji: "💻",
    ai: ["cursor", "github-copilot", "v0", "bolt-new", "replit"],
    days: 18,
    content: `Coding AI me ek hi winner nahi hai. Kaam ke hisab se tool badalta hai.

## Existing codebase
Cursor aur Copilot sabse strong hain kyunki wo repo context samajhte hain.

## Naya prototype
v0 aur Bolt fastest hain. Prompt se UI ya full app.

## Students
Replit mobile pe bhi chalta hai, isliye learning ke liye best.

## Teams
Copilot ka enterprise aur compliance support sabse mature hai.`,
  },
  {
    title: "AI Se Blog Writing: 30 Minute Me Publish Karne Ka Workflow",
    slug: "ai-blog-writing-workflow",
    type: "tutorial",
    excerpt: "Outline, draft, fact-check aur editing — har step ke liye alag tool.",
    emoji: "✍️",
    ai: ["chatgpt", "claude", "perplexity", "grammarly"],
    days: 21,
    content: `AI se blog likhna easy hai, par publish karne layak banana kaam hai. Ye workflow follow kijiye.

## Step 1: Research
Perplexity se sources ke saath research karo. Har point ke saath link rakho.

## Step 2: Outline
ChatGPT se outline banao, par angle aap do. AI ka angle generic hota hai.

## Step 3: Draft
Claude se section-wise draft likhwao. Poore article ek baar me mat maango.

## Step 4: Human pass
Apne examples, numbers aur experience add karo. Ye hi part Google ko original lagta hai.

## Step 5: Polish
Grammarly se grammar, phir khud padho.`,
  },
  {
    title: "Gamma Se 10 Minute Me Pitch Deck Kaise Banayein",
    slug: "gamma-pitch-deck",
    type: "tutorial",
    excerpt: "Investor deck ke liye structure, prompt aur design tips.",
    emoji: "📊",
    ai: ["gamma", "canva", "notion-ai"],
    days: 24,
    content: `Pitch deck ka kaam story hai, design nahi. Gamma story ko fast structure deta hai.

## Prompt
"10 slide investor deck for a D2C brand, ₹2 crore raise, traction included" — aisa specific prompt do.

## Structure
Problem, solution, market, product, traction, business model, competition, team, ask, appendix.

## Design
Ek accent colour rakho. Har slide pe ek hi message. Charts ke numbers real rakho.`,
  },
  {
    title: "AI Se Padhai: Students Ke Liye 6 Smart Tarike",
    slug: "ai-for-students",
    type: "top10",
    excerpt: "Notes, flashcards, doubt solving aur revision ke liye AI ka sahi use.",
    emoji: "🎓",
    ai: ["khanmigo", "studyfetch", "chatgpt", "quillbot", "duolingo-max"],
    days: 28,
    content: `AI padhai ko aasan bana sakta hai ya aapko weak bana sakta hai. Farak use karne ke tareeke me hai.

## Rule 1: Pehle khud try karo
Answer seedha mat puchho. Pehle 10 minute khud koshish karo, phir hint maango.

## Rule 2: AI se sawal puchhwao
Khanmigo jaisa tutor aapse sawal puchhta hai. Ye learning ko active rakhta hai.

## Rule 3: Flashcards banao
StudyFetch se notes ko cards me badlo. Active recall sabse fast revision hai.

## Rule 4: Copy-paste mat karo
QuillBot se paraphrase karne se pehle concept samjho. Warna exam me yaad nahi rahega.`,
  },
];

export function buildSeed(): DB {
  const ai: Ai[] = [];
  const models: Model[] = [];
  const ratings: Rating[] = [];
  const prompts: Prompt[] = [];
  const users: User[] = [];
  const posts: Post[] = [];

  const now = new Date();

  // ---- users first: seeded ratings reference this pool ----
  const FIRST = [
    "Aarav", "Priya", "Rohit", "Sneha", "Kabir", "Ananya", "Vikram", "Meera", "Rahul", "Ishita",
    "Arjun", "Tanya", "Dev", "Nisha", "Aditya", "Pooja", "Sahil", "Riya", "Karan", "Divya",
    "Manav", "Sara", "Nikhil", "Aditi", "Yash", "Zoya", "Aman", "Kavya", "Varun", "Neha",
  ];
  const LAST = [
    "Sharma", "Nair", "Verma", "Iyer", "Khan", "Das", "Patel", "Joshi", "Gupta", "Bose",
    "Reddy", "Singh", "Malhotra", "Rao", "Kulkarni", "Menon", "Chopra", "Bhatt", "Mehta", "Pillai",
  ];
  USER_NAMES.forEach((name, i) => {
    users.push({
      id: `u_seed_${String(i + 1).padStart(3, "0")}`,
      name,
      email: `${name.toLowerCase().replace(/[^a-z0-9]+/g, ".")}@giglenode.com`,
      avatar: name.slice(0, 1),
      role: "user",
      createdAt: isoDaysAgo(220 - i),
      isSeed: true,
    });
  });
  let poolIndex = USER_NAMES.length;
  while (users.length < 240) {
    const first = FIRST[poolIndex % FIRST.length];
    const last = LAST[Math.floor(poolIndex / FIRST.length) % LAST.length];
    const n = poolIndex + 1;
    users.push({
      id: `u_seed_${String(n).padStart(3, "0")}`,
      name: `${first} ${last}`,
      email: `${first.toLowerCase()}.${last.toLowerCase()}${n}@giglenode.com`,
      avatar: first.slice(0, 1),
      role: "user",
      createdAt: isoDaysAgo(210 - (n % 180)),
      isSeed: true,
    });
    poolIndex++;
  }
  users.push(
    {
      id: "u_demo",
      name: "Demo Reviewer",
      email: "demo@giglenode.com",
      avatar: "D",
      role: "user",
      createdAt: isoDaysAgo(60),
    },
    {
      id: "u_admin",
      name: "GigleNode Admin",
      email: "admin@giglenode.com",
      avatar: "G",
      role: "admin",
      createdAt: isoDaysAgo(400),
    },
  );
  const ratingPool = users.filter((u) => u.isSeed);

  AI_SEED.forEach((seed, aiIndex) => {
    const aiId = `ai_${seed.slug}`;
    ai.push({
      id: aiId,
      name: seed.name,
      slug: seed.slug,
      logo: seed.logo,
      color: seed.color,
      website: seed.website,
      category: seed.category,
      priceType: seed.price,
      description: seed.description,
      bestFor: seed.bestFor,
      pros: [
        CATEGORY_PRO[seed.category],
        seed.price === "paid"
          ? "Professional-grade output, team use ke liye reliable"
          : "Free plan se bina card ke shuru kar sakte hain",
        `${seed.models.length} models ek hi account me — har kaam ke liye alag`,
      ],
      cons: [
        "Beginner ke liye options zyada lag sakte hain",
        seed.price === "free"
          ? "Advanced features aur support limited hai"
          : "Behtar limits ke liye paid plan lena padta hai",
        "Output hamesha review karna zaroori hai — 100% accurate nahi hota",
      ],
      freeAlternativeId: seed.freeAlt ? `ai_${seed.freeAlt}` : null,
      sponsored: Boolean(seed.sponsored),
      boost: 0,
      planPrice: seed.planPrice,
      unitCost: seed.unitCost,
      visits: Math.round(400 + seed.pop * 42000),
      createdAt: seed.createdAt,
    });

    seed.models.forEach((m, mIndex) => {
      const slug = m.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      models.push({
        id: `mdl_${seed.slug}_${slug}`,
        aiId,
        name: m.name,
        slug,
        description: `${m.name} — ${m.bestFor}. ${seed.name} ke family ka ye model ${m.price === "free" ? "free tier me available hai" : "paid plan me milta hai"} aur ${seed.category} ke kaam ke liye tuned hai.`,
        launchDate: m.date ?? "2024-01-01",
        bestFor: m.bestFor,
        categories: m.categories,
        priceType: m.price ?? seed.price,
      });

      const rng = makeRng(hashCode(`${seed.slug}-${slug}`));
      const popularity = Math.max(0.12, seed.pop * (1 - mIndex * 0.22));
      const wanted = Math.round(18 + popularity * (60 + rng() * 210));
      const voteCount = Math.min(wanted, ratingPool.length - 1);
      const quality = Math.min(
        0.97,
        Math.max(0.34, seed.quality + (m.offset ?? 0) + (rng() - 0.5) * 0.05),
      );
      const mean = 3.55 + quality * 1.35;
      const startUser = Math.floor(rng() * ratingPool.length);
      for (let i = 0; i < voteCount; i++) {
        // stride 7 is coprime with the 240-user pool, so ids stay unique per model
        const user = ratingPool[(startUser + i * 7 + aiIndex) % ratingPool.length];
        if (!user) break;
        const stars = Math.min(5, Math.max(1, Math.round(mean + gaussian(rng) * 0.72)));
        const daysAgo = rng() < 0.42 ? rng() * 29 : 30 + rng() * 160;
        const createdAt = isoDaysAgo(daysAgo, rng() * 20);
        const hasReview = rng() < 0.17;
        ratings.push({
          id: `rt_${seed.slug}_${slug}_${i}`,
          userId: user.id,
          modelId: `mdl_${seed.slug}_${slug}`,
          stars,
          review: hasReview ? pick(rng, REVIEWS) : null,
          createdAt,
          updatedAt: createdAt,
          lastEditedAt: null,
        });
      }

      PROMPT_TEMPLATES.forEach((template, ti) => {
        const p = template(seed.name, seed.category);
        prompts.push({
          id: `pr_${seed.slug}_${ti}`,
          aiId,
          title: p.title,
          promptText: p.text,
        });
      });
    });
  });

  POST_SEED.forEach((p, i) => {
    const created = new Date(now.getTime() - p.days * 86400000).toISOString();
    posts.push({
      id: `post_${p.slug}`,
      title: p.title,
      slug: p.slug,
      coverImage: "",
      coverEmoji: p.emoji,
      excerpt: p.excerpt,
      content: p.content,
      type: p.type,
      relatedAiIds: p.ai.map((s) => `ai_${s}`),
      status: "published",
      author: p.sponsored ? "GigleNode Team" : i % 3 === 0 ? "GigleNode Team" : "Aarav Sharma",
      sponsored: Boolean(p.sponsored),
      createdAt: created,
      updatedAt: created,
    });
  });

  // one draft post for the admin panel
  posts.unshift({
    id: "post_draft_ai-tools-for-entrepreneurs",
    title: "AI Tools For Small Business Owners (Draft)",
    slug: "ai-tools-small-business",
    coverImage: "",
    coverEmoji: "💼",
    excerpt: "Chhote business ke liye AI stack — abhi draft me.",
    content: "## Outline\n\n- Invoicing automation\n- WhatsApp marketing\n- Social content\n",
    type: "top10",
    relatedAiIds: ["ai_zapier-ai", "ai_copy-ai"],
    status: "draft",
    author: "GigleNode Team",
    sponsored: false,
    createdAt: isoDaysAgo(1),
    updatedAt: isoDaysAgo(1),
  });

  const bookmarks: Bookmark[] = ["ai_chatgpt", "ai_midjourney", "ai_cursor"].map((aiId, i) => ({
    id: `bm_demo_${i}`,
    userId: "u_demo",
    aiId,
    createdAt: isoDaysAgo(5 - i),
  }));

  const follows: Follow[] = ["ai_claude", "ai_elevenlabs"].map((aiId, i) => ({
    id: `fl_demo_${i}`,
    userId: "u_demo",
    aiId,
    createdAt: isoDaysAgo(3 - i),
  }));

  // the demo user's own ratings (so edit + lock states are visible immediately)
  const demoRatings: { aiSlug: string; modelIdx: number; stars: number; review: string | null; days: number }[] = [
    { aiSlug: "chatgpt", modelIdx: 0, stars: 5, review: "Mera daily driver. Hindi prompts bhi achhe samajhta hai.", days: 3 },
    { aiSlug: "midjourney", modelIdx: 0, stars: 4, review: "Quality is excellent, but the price is a little high.", days: 9 },
  ];
  demoRatings.forEach((r, i) => {
    const model = models.filter((m) => m.aiId === `ai_${r.aiSlug}`)[r.modelIdx];
    if (!model) return;
    ratings.push({
      id: `rt_demo_${i}`,
      userId: "u_demo",
      modelId: model.id,
      stars: r.stars,
      review: r.review,
      createdAt: isoDaysAgo(r.days),
      updatedAt: isoDaysAgo(r.days),
      lastEditedAt: null,
    });
  });

  return {
    version: 1,
    ai,
    models,
    ratings,
    posts,
    prompts,
    bookmarks,
    follows,
    users,
    rateEvents: [],
    authEvents: [],
    settings: { ...DEFAULT_SITE_SETTINGS },
    adminLog: [],
    ownerAccounts: [],
    aiOwners: [],
    ownerRequests: [],
    ownerChanges: [],
  };
}
