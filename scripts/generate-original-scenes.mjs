import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = join(root, "public", "scenes", "v1");
const dataDir = join(root, "public", "data");

const prompts = [
  ["wrong-door", "Wrong Door", "I think this is definitely not the dentist.", "Awkward", "#ff4d6d", "#321450"],
  ["last-cookie", "The Last Cookie", "Put the cookie down and nobody gets judged.", "Comedy", "#ff9f1c", "#402300"],
  ["tiny-emergency", "Tiny Emergency", "Remain calm, the Wi-Fi password is on the fridge.", "Chaos", "#2ec4b6", "#092f38"],
  ["meeting-escape", "Meeting Escape", "My camera froze, but spiritually I have left.", "Work", "#7b2cbf", "#16072a"],
  ["plant-witness", "The Plant Knows", "Do not look at the plant, it saw everything.", "Mystery", "#52b788", "#09281d"],
  ["group-chat", "Group Chat Evidence", "For legal reasons, that message was a joke.", "Chaos", "#e63946", "#30070c"],
  ["monday-hero", "Monday Hero", "I survived Monday and all I got was Tuesday.", "Work", "#4361ee", "#0b1541"],
  ["fridge-light", "Fridge Interrogation", "We meet again, mysterious light behind the leftovers.", "Mystery", "#80ed99", "#12331d"],
  ["dramatic-email", "The Dramatic Email", "Per my last email, I am becoming a lighthouse keeper.", "Work", "#f72585", "#3d0524"],
  ["snack-alibi", "Snack Alibi", "The chips were already open when I arrived.", "Comedy", "#ffd166", "#3d2b02"],
  ["elevator-speech", "Elevator Speech", "If this stops again, I am taking the stairs forever.", "Awkward", "#00b4d8", "#002936"],
  ["alarm-bargain", "Alarm Bargain", "Five more minutes, and I promise to become productive.", "Everyday", "#fb8500", "#3a1c00"],
  ["cat-manager", "New Management", "The cat has reviewed your work and looks concerned.", "Comedy", "#9b5de5", "#20103b"],
  ["parallel-parking", "Parking Finale", "Everyone stay quiet, the curb can sense fear.", "Chaos", "#ef476f", "#390817"],
  ["forgot-name", "Name Loading", "Of course I remember your name, I am building suspense.", "Awkward", "#06d6a0", "#003c2f"],
  ["delivery-quest", "Delivery Quest", "Your package is nearby, somewhere in this dimension.", "Mystery", "#118ab2", "#062c3a"],
  ["low-battery", "One Percent", "Tell my charger I should have listened.", "Drama", "#e71d36", "#35040b"],
  ["recipe-rebel", "Recipe Rebel", "The recipe said gently, and I chose absolute chaos.", "Chaos", "#ff6b35", "#3e1504"],
  ["mute-button", "The Mute Button", "That was a private thought with public audio.", "Work", "#3a86ff", "#071b3d"],
  ["laundry-mountain", "Laundry Mountain", "We climb at dawn, bring matching socks.", "Everyday", "#8338ec", "#21063f"],
  ["coffee-prophecy", "Coffee Prophecy", "The mug is empty, so the prophecy is unclear.", "Drama", "#ffbe0b", "#3b2b00"],
  ["doorbell-panic", "Doorbell Panic", "Nobody move, maybe the delivery will forget us.", "Everyday", "#00f5d4", "#003832"],
  ["password-ritual", "Password Ritual", "One uppercase rune, two numbers, and my first memory.", "Mystery", "#b5179e", "#35042f"],
  ["final-tab", "The Final Tab", "I closed one browser tab and discovered inner peace.", "Everyday", "#4cc9f0", "#092f3b"]
];

function wordsFor(text, duration) {
  const tokens = text.split(/\s+/);
  const available = duration - 0.7;
  const weights = tokens.map((word) => Math.max(2, word.replace(/[^a-z0-9']/gi, "").length));
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let cursor = 0.35;

  return tokens.map((word, index) => {
    const allocation = available * (weights[index] / total);
    const gap = Math.min(0.09, allocation * 0.18);
    const start = cursor;
    const end = index === tokens.length - 1 ? duration - 0.35 : cursor + allocation - gap;
    cursor += allocation;
    return {
      word,
      start: Number(start.toFixed(3)),
      end: Number(end.toFixed(3))
    };
  });
}

mkdirSync(outputDir, { recursive: true });
mkdirSync(dataDir, { recursive: true });

const scenes = prompts.map(([slug, title, quote, category, colorA, colorB], index) => {
  const duration = Number(Math.max(4.4, Math.min(6.2, 3.1 + quote.split(/\s+/).length * 0.31)).toFixed(1));
  const videoName = `${slug}.v1.mp4`;
  const thumbnailName = `${slug}.v1.jpg`;
  const videoPath = join(outputDir, videoName);
  const thumbnailPath = join(outputDir, thumbnailName);
  const frequency = 120 + index * 9;
  const gradientType = index % 5;

  execFileSync("ffmpeg", [
    "-hide_banner", "-loglevel", "error", "-y",
    "-f", "lavfi", "-i", `gradients=s=640x360:r=24:c0=${colorA}:c1=${colorB}:n=2:d=${duration}:speed=0.012:type=${gradientType}`,
    "-f", "lavfi", "-i", `sine=frequency=${frequency}:sample_rate=48000:duration=${duration}`,
    "-filter:a", "volume=0.025",
    "-c:v", "libx264", "-preset", "veryfast", "-crf", "28", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "64k", "-movflags", "+faststart", "-shortest", videoPath
  ]);

  execFileSync("ffmpeg", [
    "-hide_banner", "-loglevel", "error", "-y", "-ss", String(duration / 2),
    "-i", videoPath, "-frames:v", "1", "-q:v", "3", thumbnailPath
  ]);

  return {
    id: `scene_${String(index + 1).padStart(3, "0")}`,
    slug,
    title,
    quote,
    sourceTitle: "StealMyScene Originals — Volume One",
    sourceType: "original",
    category,
    videoUrl: `/scenes/v1/${videoName}`,
    thumbnailUrl: `/scenes/v1/${thumbnailName}`,
    duration,
    transcript: quote,
    wordTimings: wordsFor(quote, duration),
    dubCount: 0,
    viewCount: 0,
    rightsStatus: "cleared",
    rightsOwner: "StealMyScene",
    rightsBasis: "Original synthetic visual and authored prompt",
    published: true,
    createdAt: "2026-08-10T00:00:00.000Z",
    updatedAt: "2026-08-10T00:00:00.000Z"
  };
});

const manifest = {
  version: 1,
  generatedAt: "2026-08-10T00:00:00.000Z",
  scenes
};

writeFileSync(join(dataDir, "scenes.json"), `${JSON.stringify(manifest, null, 2)}\n`);
writeFileSync(join(outputDir, "RIGHTS.md"), `# Volume One asset rights\n\nAll 24 moving-gradient clips, ambient tones, thumbnails, titles, quotes, and timings in this directory were generated specifically for StealMyScene on 2026-08-10. They contain no third-party footage, music, performances, logos, or character likenesses. Publishing is gated by the matching manifest records with \`rightsStatus: \"cleared\"\`.\n`);

console.log(`Generated ${scenes.length} original, rights-cleared scenes in ${outputDir}`);
