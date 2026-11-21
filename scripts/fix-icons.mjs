import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const OUT = path.join(process.cwd(), "public/logos");
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36";

const jobs = {
  "dora-ai": { url: "https://www.google.com/s2/favicons?domain=dora.run&sz=256" },
  "asana-ai": { url: "https://www.google.com/s2/favicons?domain=asana.com&sz=256" },
  "ernie-bot": { url: "https://www.google.com/s2/favicons?domain=baidu.com&sz=256" },
  "dia-browser": { url: "https://www.diabrowser.com/apple-touch-icon.png" },
  "lovo-ai": { url: "https://unavatar.io/lovo.ai" },
  "toppr-ai": { url: "https://github.com/toppr.png?size=256" },
  "mutable-ai": {
    url: "https://bookface-images.s3.us-west-2.amazonaws.com/logos/93402f1f0d0cec39e1e78a7bad41c95e39b5f56a.png",
    crop: { left: 0, top: 0, width: 135, height: 130 },
  },
};

for (const [slug, job] of Object.entries(jobs)) {
  try {
    const res = await fetch(job.url, { signal: AbortSignal.timeout(20000), headers: { "user-agent": UA } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    let image = sharp(Buffer.from(await res.arrayBuffer()));
    if (job.crop) image = sharp(await image.extract(job.crop).png().toBuffer());
    const png = await image
      .resize(96, 96, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .png({ compressionLevel: 9, palette: true })
      .toBuffer();
    await fs.writeFile(path.join(OUT, `${slug}.png`), png);
    console.log(`[fix] ok ${slug} ${png.length}b`);
  } catch (error) {
    console.log(`[fix] FAIL ${slug}: ${error.message}`);
  }
}
