import type { CategorySlug, DB, PriceType } from "./types";

/**
 * One-time English pass over the seeded editorial content.
 *
 * The first data snapshot shipped Hinglish tool blurbs, model summaries and posts.
 * The public site is English now, so `migrateDb` applies this once and records
 * `contentLocale = "en"`; after that the document already holds English copy.
 * User-generated reviews are translated only where they match the original seed text,
 * so anything written by a real account is left untouched.
 */

const AI_DESCRIPTIONS: Record<string, string> = {
  chatgpt:
    "OpenAI's general-purpose assistant for writing, coding, research and data analysis, with voice and image understanding built in.",
  claude:
    "Anthropic's assistant known for natural long-form writing, document analysis and careful reasoning over very large contexts.",
  gemini:
    "Google's assistant, deeply connected to Search, Gmail, Docs and YouTube, with a generous free tier and long context.",
  perplexity:
    "An AI answer engine that cites its sources — built for fast, verifiable research and news summaries.",
  midjourney:
    "A cinematic image generator loved for artistic style, lighting control and consistent characters.",
  "dall-e-3":
    "OpenAI's image model inside ChatGPT, strongest at following detailed prompts and rendering short text.",
  "leonardo-ai":
    "An image platform for game assets, product shots and social creatives, with built-in models and canvas editing.",
  ideogram:
    "An image generator that renders text cleanly — a favourite for posters, logos and thumbnails.",
  "stable-diffusion":
    "The open-source image model you can run locally, with full control through LoRA, ControlNet and custom checkpoints.",
  runway:
    "A complete AI video studio for text-to-video, image-to-video and motion-controlled editing.",
  sora: "OpenAI's video model known for realistic physics, longer clips and storyboard-driven scene creation.",
  pika: "A playful video generator built for short viral clips and one-click photo animation.",
  synthesia:
    "AI avatar videos for training and corporate communication in 140+ languages — no camera required.",
  heygen:
    "Avatar cloning and lip-sync translation that turns one video into thirty localised versions.",
  descript: "Text-based video and podcast editing: delete a word and the footage cuts with it.",
  cursor:
    "An AI-first code editor that understands your whole repository, with tab completion and multi-file agents.",
  "github-copilot":
    "GitHub's coding assistant inside VS Code, JetBrains and Neovim, with chat, review and pull-request summaries.",
  v0: "Vercel's prompt-to-UI generator that produces React and Tailwind components you can copy or deploy.",
  "bolt-new":
    "Generates, runs and deploys full-stack apps in the browser — from idea to live link with no setup.",
  replit: "A cloud IDE with an agent that builds apps and sets up databases, auth and hosting.",
  tabnine:
    "Privacy-first code completion that can be self-hosted, built for teams that cannot send code outside.",
  elevenlabs:
    "The market leader in natural text-to-speech and voice cloning, with emotion control and a real-time API.",
  "murf-ai":
    "Studio-style voiceovers for presentations, e-learning and ads, with a timeline editor for script and music.",
  playht: "Realistic text-to-speech, voice cloning and a simple API for podcasts, videos and developers.",
  suno: "Turns a prompt into a complete song — vocals, lyrics and mixing included.",
  udio: "An AI music generator with detailed instrument separation, remixing and track extension.",
  aiva: "Composes cinematic and orchestral scores for films, documentaries and games with clear licensing.",
  canva: "Brings AI image, text and video tools into one design editor, with templates for every format.",
  "figma-ai": "Drafts wireframes, renames layers and fills content inside Figma, close to your design system.",
  gamma: "Turns a prompt or document into polished slides and one-pagers in minutes.",
  "notion-ai": "Searches and writes inside your workspace — meeting notes, summaries and answers from your own docs.",
  "otter-ai": "Transcribes meetings live and produces summaries, with Zoom, Meet and Teams integrations.",
  "fireflies-ai": "Records meetings, writes notes and syncs them to your CRM so sales follow-ups happen automatically.",
  grammarly: "Cleans up grammar, tone and clarity across every app — the lowest-friction writing assistant.",
  deepl: "Translation that often beats the competition on nuance, plus document translation that keeps formatting.",
  quillbot: "Paraphrasing, summaries and citations in one place, popular with students.",
  jasper: "A marketing AI built around brand voice and campaign workflows for content teams.",
  "copy-ai": "Automates repetitive sales and marketing work — GTM workflows, email personalisation and content briefs.",
  khanmigo: "Khan Academy's AI tutor that asks questions instead of handing over answers, designed to be safe for kids.",
  "duolingo-max": "Adds AI roleplay and answer explanations to Duolingo, turning language practice into conversation.",
  studyfetch: "Turns notes and PDFs into flashcards, quizzes and study guides for fast exam revision.",
  "zapier-ai": "Builds automations from natural language and connects 7,000+ apps without code.",
  grok: "xAI's assistant with real-time X data, useful for trending topics and public sentiment.",
  mistral: "Mistral's Le Chat pairs fast open-weight models with European privacy standards and a cheap API.",
};

const CATEGORY_VOICE: Record<CategorySlug, { pro: string; con: string }> = {
  writing: {
    pro: "Produces natural, usable long-form drafts",
    con: "Tone can drift and still needs a human edit",
  },
  image: {
    pro: "Strong visual quality and style control",
    con: "Text inside images can still break",
  },
  video: {
    pro: "Covers generation and editing in one workflow",
    con: "Render times add up on heavy projects",
  },
  coding: {
    pro: "Works with real repository context, not just snippets",
    con: "Complex refactors still need a careful review",
  },
  voice: {
    pro: "Natural prosody and strong pronunciation",
    con: "Emotional range varies between languages",
  },
  music: {
    pro: "Full tracks with vocals from a single prompt",
    con: "Fine control is limited compared to a DAW",
  },
  design: {
    pro: "AI drafting happens inside the design canvas",
    con: "Brand systems still need manual setup",
  },
  productivity: {
    pro: "Fits directly into the tools you already use",
    con: "Best features often require a workspace upgrade",
  },
  research: {
    pro: "Speeds up source-heavy research with citations",
    con: "Findings still need verification against the source",
  },
  marketing: {
    pro: "Connects content work to measurable growth",
    con: "Strategy and brand judgement stay human",
  },
  education: {
    pro: "Guides you step by step instead of giving answers",
    con: "Not a substitute for a real teacher",
  },
  business: {
    pro: "Fits team workflows and brand voice",
    con: "Setup and onboarding take time",
  },
  social: {
    pro: "Turns long content into posts and clips fast",
    con: "Platform rules and reach change constantly",
  },
  agents: {
    pro: "Automates multi-step work end to end",
    con: "Failures are harder to debug than a simple script",
  },
  specialized: {
    pro: "Solves a focused, high-value job",
    con: "Expert review is still essential",
  },
};

const CATEGORY_LABEL: Record<string, string> = {
  writing: "writing",
  image: "image",
  video: "video",
  coding: "coding",
  voice: "voice",
  music: "music",
  design: "design",
  productivity: "productivity",
  research: "research",
  marketing: "marketing",
  education: "education",
  social: "social",
  agents: "agents",
  business: "business",
  specialized: "specialized",
};

const POST_EN: Record<string, { title: string; excerpt: string; content: string }> = {
  "top-10-free-ai-tools": {
    title: "Top 10 Free AI Tools That Actually Deliver in 2026",
    excerpt: "Ten free AI tools for creators on a zero budget, with real user ratings attached.",
    content: `New AI tools appear every month, but most free plans are not enough to do real work. This list covers the tools whose free tier genuinely earns its place.

## How we chose
We looked at three things: the real limits of the free plan, output quality, and how GigleNode users rate the tool. Anything that only offers a demo did not make the cut.

## The truth about free tiers
A free plan rarely means "free forever". Most tools run on credits. Write down your monthly volume first, then choose the tool that fits it.

## How to start
Begin with one category. One writing tool, one image tool. Using three or four at once only adds confusion.`,
  },
  "chatgpt-vs-gemini-vs-claude": {
    title: "ChatGPT vs Gemini vs Claude: Which Is Best in 2026?",
    excerpt: "An honest comparison of the three flagship assistants — writing, coding, research and pricing.",
    content: `All three tools are good, but they are not the same. To find the differences we ran the same five tasks through each one.

## Writing
Claude had the most natural tone. ChatGPT is a little more formulaic, while Gemini keeps its output concise.

## Coding
ChatGPT and Claude are both strong alongside Cursor. Claude made fewer mistakes on a large refactor.

## Research
Gemini's long context and Perplexity-style citations give it an edge on documents.

## Final verdict
If you need one tool, choose ChatGPT. For writing-heavy work, Claude. If you live in Google's ecosystem, Gemini.`,
  },
  "sora-2-video-editing": {
    title: "Sora 2 Is Here: Do You Still Need a Video Editor?",
    excerpt: "How realistic clips and native audio from Sora 2 change the creator workflow.",
    content: `Sora 2 pushes text-to-video quality to another level. The physics look real, and audio arrives with the clip.

## What changed
A ten-second clip now comes from a single prompt. Far less shooting is needed for B-roll.

## What did not change
Story, pacing and brand tone are still human work. You still need to edit the clips and build a sequence.

## Practical use
Hook shots for Reels, product angles and ad variations — Sora is fastest at all three.`,
  },
  "cursor-landing-page-tutorial": {
    title: "Build a Landing Page in One Hour with Cursor",
    excerpt: "Step by step, from prompt to deploy — no coding background required.",
    content: `Cursor is an AI editor that understands your whole project. In this tutorial we build a simple landing page.

## Step 1: Give it structure
Tell Cursor the file structure first: one page, one section component, one style file. Without structure it will guess.

## Step 2: Ask for small changes
Do not say "build the whole website". One section at a time. Fewer mistakes that way.

## Step 3: Review
Check the browser after every change. Undo bad output and rewrite the instruction instead of pushing forward.

## Step 4: Deploy
Push to Vercel. If the build fails, paste the error message into Cursor and let it fix the cause.`,
  },
  "free-ai-thumbnail-guide": {
    title: "How to Make a Professional YouTube Thumbnail with Free AI",
    excerpt: "Use Canva, Ideogram and Stable Diffusion to design thumbnails that earn clicks.",
    content: `Three things matter on a thumbnail: a face, contrast, and fewer than three words.

## Background
Generate the background with Ideogram because it also renders text cleanly. Use a 16:9 ratio.

## Face and emotion
Controlling expression in Stable Diffusion is hard. Canva templates include ready-made faces — use those.

## Text
Three words, a large font, high contrast. And check it on a phone before publishing.`,
  },
  "suno-v4-5-review": {
    title: "Suno v4.5 Review: Are AI Songs Actually Listenable?",
    excerpt: "We made 20 tracks and tested mixing, lyrics and repeatability.",
    content: `With v4.5, AI music has clearly moved from "demo" toward "release-ready".

## Vocals
Pronunciation has improved a lot. A few words still come out wrong.

## Mixing
The low end sounds slightly muddy, but mastering fixes most of it.

## Verdict
9/10 for background music and jingles. A full album still needs a human producer.`,
  },
  "fake-ai-ratings": {
    title: "How Fake AI Ratings Happen — and What GigleNode Does About It",
    excerpt: "Our four-layer system against paid reviews and bot votes.",
    content: `Fake ratings are the biggest problem in AI directories. We built four rules to fight them.

## Login required
No rating without an account. Every rating is tied to a verified user.

## One user, one model, one rating
Editing updates the existing rating instead of creating a new entry. That stops vote stuffing.

## A 24-hour edit lock
You cannot keep changing a rating to move the ranking.

## Weighted ranking
A 5.0 from a handful of votes cannot outrank a 4.7 from hundreds.`,
  },
  "elevenlabs-vs-murf-hindi": {
    title: "ElevenLabs vs Murf for Hindi Voiceovers: Which Wins?",
    excerpt: "A side-by-side test of Hindi pronunciation, emotion and pricing.",
    content: `We used both tools for Hindi voiceover work, and the difference is clear.

## Pronunciation
ElevenLabs sounds more natural in Hindi, especially on sounds like "ऋ". Murf carries a slight English accent.

## Emotion
ElevenLabs gives you stability and style controls. Murf's editor is simpler but offers less control.

## Pricing
Murf is cheaper if you only need narration. If you need voice cloning, choose ElevenLabs.`,
  },
  "top-5-coding-ai": {
    title: "Top 5 Coding AI Tools Developers Use in 2026",
    excerpt: "Cursor, Copilot, v0, Bolt and Replit — which one fits which job.",
    content: `There is no single winner in coding AI. The right tool depends on the job.

## Existing codebase
Cursor and Copilot are strongest because they understand repository context.

## New prototypes
v0 and Bolt are the fastest. A prompt gets you a UI or a full app.

## Students
Replit runs on mobile too, which makes it the best learning environment.

## Teams
Copilot has the most mature enterprise and compliance support.`,
  },
  "ai-blog-writing-workflow": {
    title: "AI Blog Writing: A 30-Minute Publish Workflow",
    excerpt: "Outline, draft, fact-check and edit — a different tool for every step.",
    content: `Writing a blog with AI is easy. Making it worth publishing is the work. Follow this workflow.

## Step 1: Research
Research with Perplexity and keep the sources. Link every important claim.

## Step 2: Outline
Have ChatGPT draft the outline, but set the angle yourself. AI angles are generic.

## Step 3: Draft
Ask Claude to write section by section. Do not request the whole article in one go.

## Step 4: Human pass
Add your own examples, numbers and experience. That is the part search engines treat as original.

## Step 5: Polish
Run Grammarly for grammar, then read it once yourself.`,
  },
  "gamma-pitch-deck": {
    title: "Build an Investor Pitch Deck in 10 Minutes with Gamma",
    excerpt: "Structure, prompting and design tips for a deck that tells the story.",
    content: `A pitch deck is about story, not decoration. Gamma gives the story structure quickly.

## Prompt
Be specific: "10-slide investor deck for a D2C brand raising $250k, traction included."

## Structure
Problem, solution, market, product, traction, business model, competition, team, ask, appendix.

## Design
Use one accent colour. One message per slide. Keep the chart numbers real.`,
  },
  "ai-for-students": {
    title: "Studying with AI: 6 Smart Habits for Students",
    excerpt: "How to use AI for notes, flashcards, doubt-solving and revision — without losing the learning.",
    content: `AI can make studying easier or make you weaker. The difference is how you use it.

## Rule 1: Try first
Do not ask for the answer immediately. Spend ten minutes on your own, then ask for a hint.

## Rule 2: Let AI question you
A tutor like Khanmigo asks you questions, which keeps learning active.

## Rule 3: Build flashcards
Turn notes into cards with StudyFetch. Active recall is the fastest revision.

## Rule 4: Do not copy-paste
Understand the concept before paraphrasing with QuillBot, or you will not remember it in the exam.`,
  },
};

/** Original seeded review strings → English. Only exact matches are replaced. */
const REVIEW_EN: Record<string, string> = {
  "Mera daily workflow ka hissa ban gaya hai, time bahut bacha raha hai.":
    "It has become part of my daily workflow and saves me a lot of time.",
  "Output quality achhi hai, par kabhi kabhi extra edit karna padta hai.":
    "Output quality is good, though I sometimes need extra edits.",
  "Free plan me hi kaafi kaam ho jata hai. Beginners ke liye perfect.":
    "The free plan covers a lot. Perfect for beginners.",
  "Speed impressive hai, lekin pricing thodi zyada lagti hai.":
    "Speed is impressive, but pricing feels a little high.",
  "Hindi prompts bhi samajh leta hai, ye sabse badi baat hai.":
    "It understands Hindi prompts too — that is the biggest win.",
  "Accuracy acchi hai. Complex tasks me ek-do baar galat bhi jata hai.":
    "Accuracy is good. It occasionally gets complex tasks wrong.",
  "Interface simple hai, koi learning curve nahi. Family ko bhi bata diya.":
    "The interface is simple with no learning curve. I told my family about it.",
  "Team ke liye liya hai, sab log use kar rahe hain. Worth it.":
    "We bought it for the team and everyone uses it. Worth it.",
  "Kuch features paid me hain jo free hone chahiye the.":
    "Some features are paid that should have been free.",
  "Compare karke dekha, yahi sabse balanced nikla. Recommend karunga.":
    "I compared a few and this one felt the most balanced. Recommended.",
  "Reliability kabhi kabhi issue karti hai, downtime aata hai.":
    "Reliability can be an issue — there is occasional downtime.",
  "Output ka tone natural hai, AI jaisa flat nahi lagta.":
    "The tone is natural, not the flat AI voice.",
  "Long documents ke liye best. 50 page PDF bhi handle kar liya.":
    "Best for long documents. It handled a 50-page PDF.",
  "Mobile app thoda slow hai, par desktop pe mast chalta hai.":
    "The mobile app is a bit slow, but desktop works great.",
  "Isse pehle main 3 tools use karta tha, ab ek hi kaafi hai.":
    "I used three tools before; now one is enough.",
  "Beginner hoon, phir bhi pehle din se useful output mila.":
    "I am a beginner, yet I got useful output from day one.",
  "Pricing page confusing hai, plans clearly likhne chahiye.":
    "The pricing page is confusing; plans should be clearer.",
  "Customer support ne 2 din me reply kiya, thoda slow.":
    "Support replied in two days, a little slow.",
  "Result consistent hai, isliye client work me bharosa hai.":
    "Results are consistent, so I trust it for client work.",
  "Quality ke hisaab se sasta hai. Value for money.":
    "Cheap for the quality. Good value for money.",
  "Coding tasks me kabhi kabhi hallucinate karta hai, dhyan rakhna.":
    "It sometimes hallucinates on coding tasks — watch out.",
  "Achha hai but free limit jaldi khatam ho jati hai.":
    "Good, but the free limit runs out quickly.",
  "Maine apne students ko suggest kiya, sabko pasand aaya.":
    "I recommended it to my students and they all liked it.",
  "Export options limited hain, aur chahiye.":
    "Export options are limited; I need more.",
  "Ye tool try karke hi samajh aayega, demo version rakho.":
    "You have to try this tool to understand it — offer a demo.",
  "Language support strong hai, regional languages bhi try karo.":
    "Language support is strong; try regional languages too.",
  "Small business ke liye perfect, enterprise features ki zarurat nahi.":
    "Perfect for small businesses; no need for enterprise features.",
  "BC update ke baad aur fast ho gaya hai.":
    "It got even faster after the latest update.",
  "Iska API documentation achha hai, integrate karna easy tha.":
    "The API documentation is good; integration was easy.",
  "Mujhe sirf ek problem hai: mobile pe copy karna mushkil hai.":
    "My only issue is that copying on mobile is difficult.",
  "Mera daily driver. Hindi prompts bhi achhe samajhta hai.":
    "My daily driver. It understands Hindi prompts well too.",
};

function priceWord(price: PriceType): string {
  return price === "free" ? "free" : price === "freemium" ? "freemium" : "paid";
}

export function localizeContentToEnglish(db: DB): boolean {
  let changed = false;

  if (db.contentLocale !== "en") {
  const aiById = new Map(db.ai.map((ai) => [ai.id, ai]));

  for (const ai of db.ai) {
    const description = AI_DESCRIPTIONS[ai.slug];
    if (description) ai.description = description;

    const voice = CATEGORY_VOICE[ai.category];
    if (voice) {
      const bestFor = ai.bestFor[0] ? ai.bestFor[0].toLowerCase() : "everyday tasks";
      ai.pros = [
        voice.pro,
        `Strong fit for ${bestFor}`,
        "Starts on a free or low-cost plan",
      ];
      ai.cons = [voice.con, "Advanced features require a paid plan", "Output still needs a human review"];
    }
  }

  for (const model of db.models) {
    const parent = aiById.get(model.aiId);
    if (!parent) continue;
    model.description = `${model.name} is a ${priceWord(model.priceType)} model in the ${parent.name} family, built for ${model.bestFor.toLowerCase()}. It competes in the ${CATEGORY_LABEL[parent.category] ?? parent.category} category.`;
  }

  for (const post of db.posts) {
    const copy = POST_EN[post.slug];
    if (copy) Object.assign(post, copy);
  }

  db.contentLocale = "en";
  changed = true;
  }

  // Seed reviews are normalized even for an already-localized document, so it is
  // safe to add a missing translation later without a second full migration.
  for (const rating of db.ratings) {
    if (!rating.review) continue;
    const translated = REVIEW_EN[rating.review];
    if (translated) {
      rating.review = translated;
      changed = true;
    }
  }

  return changed;
}
