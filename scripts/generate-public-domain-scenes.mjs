import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { publicDomainSources } from "./public-domain-sources.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sourceDir = process.env.PUBLIC_DOMAIN_SOURCE_DIR || join(root, "var", "public-domain-sources");
const outputDir = join(root, "public", "scenes", "v3");
const dataDir = join(root, "public", "data");

const sceneGroups = {
  "easy-street": [
    ["unexpected-sermon", "The Unexpected Sermon", "I came for answers and somehow got assigned homework.", "Awkward", 96],
    ["front-row-regret", "Front Row Regret", "This seat felt safer before everyone turned around.", "Comedy", 132],
    ["room-read-failed", "Room Read Failed", "I may have misunderstood the energy in this room.", "Awkward", 168],
    ["polite-interruption", "Polite Interruption", "Sorry to interrupt, but the situation has become extremely loud.", "Chaos", 204],
    ["new-badge", "The New Badge", "Good news, I have authority and almost no instructions.", "Work", 246],
    ["street-committee", "Street Committee", "The neighborhood meeting has officially left the agenda.", "Chaos", 286],
    ["backup-arrived", "Backup Arrived", "I brought backup, but backup brought additional problems.", "Comedy", 326],
    ["quiet-patrol", "Quiet Patrol", "Everything looks calm, which is usually when it gets expensive.", "Mystery", 368],
    ["corner-conversation", "Corner Conversation", "Let us discuss this somewhere with fewer flying objects.", "Drama", 410],
    ["professional-distance", "Professional Distance", "Please respect the official distance between me and consequences.", "Comedy", 452],
    ["doorway-negotiation", "Doorway Negotiation", "We can solve this peacefully if nobody touches that chair.", "Chaos", 494],
    ["street-cleanup", "Street Cleanup", "I leave for one minute and the furniture starts migrating.", "Everyday", 536],
    ["friendly-warning", "Friendly Warning", "That was the friendly warning, the next one has paperwork.", "Drama", 578],
    ["chair-delivery", "Express Chair Delivery", "Your chair has arrived at a speed nobody requested.", "Comedy", 620],
    ["alley-supervisor", "Alley Supervisor", "I am supervising from here for important safety reasons.", "Work", 662],
    ["window-inspection", "Window Inspection", "The window is fine, the person behind it concerns me.", "Mystery", 704],
    ["nap-interrupted", "Nap Interrupted", "I was not sleeping, I was monitoring the floor closely.", "Everyday", 746],
    ["unplanned-childcare", "Unplanned Childcare", "Nobody mentioned the mission included this many tiny managers.", "Chaos", 788],
    ["kitchen-standoff", "Kitchen Standoff", "Put down the spoon and step away from the soup.", "Comedy", 830],
    ["table-manners", "Table Manners", "I have reviewed the table manners and filed a complaint.", "Everyday", 874],
    ["roommate-evidence", "Roommate Evidence", "This room was clean when I last imagined checking it.", "Mystery", 920],
    ["badge-on-break", "Badge on Break", "The badge is working, but the person is currently buffering.", "Work", 972],
    ["mission-recovery", "Mission Recovery", "We lost the plan, so confidence is now the plan.", "Drama", 1042],
    ["street-finale", "Street Finale", "Everyone act natural until I figure out what natural means.", "Chaos", 1148],
    ["peace-restored", "Peace Restored", "Peace has returned, please ignore everything behind me.", "Comedy", 1360]
  ],
  "a-woman": [
    ["park-entrance", "The Park Entrance", "I arrived casually after practicing that walk for twenty minutes.", "Awkward", 48],
    ["bench-strategy", "Bench Strategy", "The plan is simple: sit here and look unavailable.", "Everyday", 92],
    ["third-wheel", "The Third Wheel", "Do not mind me, I am just supervising the romance.", "Comedy", 136],
    ["tree-consultation", "Tree Consultation", "The tree agrees with me, and it has seniority.", "Mystery", 182],
    ["bench-takeover", "Bench Takeover", "This bench is under new management effective immediately.", "Drama", 228],
    ["park-debate", "Park Debate", "We can debate this calmly after you stop pointing dramatically.", "Awkward", 276],
    ["pond-witness", "The Pond Witness", "Even the pond saw that, and it refuses to comment.", "Mystery", 324],
    ["formal-introduction", "Formal Introduction", "Hello, I prepared a normal greeting and immediately lost it.", "Awkward", 372],
    ["surprise-guest", "The Surprise Guest", "I brought no invitation, only confidence and excellent timing.", "Comedy", 422],
    ["tea-table", "Tea Table Tension", "Nobody touch the tea until we establish a clear motive.", "Mystery", 474],
    ["doorway-reveal", "Doorway Reveal", "I have entered the room, so the meeting may begin.", "Drama", 528],
    ["dinner-disruption", "Dinner Disruption", "Please continue dinner while I completely change the atmosphere.", "Chaos", 584],
    ["table-argument", "Table Argument", "The table has heard both sides and supports me.", "Comedy", 638],
    ["dramatic-exit", "The Dramatic Exit", "I am leaving dramatically, but I may need directions.", "Drama", 692],
    ["outfit-emergency", "Outfit Emergency", "This outfit was a decision, and we must respect it.", "Chaos", 748],
    ["mirror-confidence", "Mirror Confidence", "The mirror believes in me, which makes one of us.", "Everyday", 804],
    ["new-look", "The New Look", "Act natural, nobody has noticed the completely new person.", "Comedy", 860],
    ["guest-inspection", "Guest Inspection", "I have inspected the guest and remain deeply curious.", "Mystery", 916],
    ["hat-negotiation", "Hat Negotiation", "The hat stays, everything else remains open to discussion.", "Drama", 972],
    ["living-room-chaos", "Living Room Chaos", "This living room has exceeded its recommended drama limit.", "Chaos", 1048],
    ["awkward-handshake", "Awkward Handshake", "We have been shaking hands long enough to share taxes.", "Awkward", 1084],
    ["family-meeting", "Family Meeting", "I called this meeting because whispering stopped being effective.", "Everyday", 1140],
    ["identity-crisis", "Identity Crisis", "I know exactly who I am, the outfit is still deciding.", "Comedy", 1200],
    ["final-explanation", "The Final Explanation", "There is a reasonable explanation, but this is not it.", "Drama", 1320],
    ["party-verdict", "Party Verdict", "The party is over because the plot has arrived.", "Chaos", 1480]
  ],
  "moon-trip": [
    ["moon-pitch", "The Moon Pitch", "My proposal is simple: point the machine upward and hope.", "Sci-Fi", 58],
    ["rocket-meeting", "Rocket Meeting", "We approved the launch before anyone found the instructions.", "Work", 88],
    ["boarding-chaos", "Boarding Chaos", "One at a time, the moon is not going anywhere.", "Chaos", 118],
    ["cannon-check", "Cannon Check", "The safety inspection consisted mostly of confident nodding.", "Comedy", 148],
    ["launch-window", "Launch Window", "This is our only launch window, mostly because it has no glass.", "Sci-Fi", 178],
    ["moon-landing", "Moon Landing", "We have landed directly in the moon's personal space.", "Sci-Fi", 208],
    ["cosmic-greeting", "Cosmic Greeting", "Hello moon, sorry about the transportation choice.", "Awkward", 238],
    ["star-weather", "Star Weather", "The forecast says stars with a chance of impossible decisions.", "Mystery", 268],
    ["space-camping", "Space Camping", "I packed snacks, so technically the expedition is prepared.", "Everyday", 298],
    ["alien-committee", "Alien Committee", "The local committee has questions about our parking.", "Sci-Fi", 328],
    ["moon-chase", "Moon Chase", "Run first, explain interplanetary diplomacy much later.", "Chaos", 358],
    ["escape-plan", "The Escape Plan", "The escape plan is working if you ignore every detail.", "Drama", 388],
    ["ocean-return", "Ocean Return", "We aimed for home and discovered a very large puddle.", "Comedy", 418],
    ["hero-welcome", "Hero Welcome", "Please hold applause until we confirm everyone returned.", "Drama", 452],
    ["moon-parade", "Moon Parade", "Nothing says scientific success like an immediate parade.", "Comedy", 482]
  ],
  "happy-hooligan": [
    ["cartoon-moon", "Cartoon Moon", "I found the moon, but the moon found me first.", "Animation", 8],
    ["telescope-trouble", "Telescope Trouble", "This telescope is showing consequences in high definition.", "Animation", 32],
    ["backyard-launch", "Backyard Launch", "The neighbors said no rockets, so this is technically a cannon.", "Chaos", 48],
    ["rocket-loading", "Rocket Loading", "Please board quickly before the plan develops common sense.", "Animation", 64],
    ["moon-arrival", "Moon Arrival", "We made it, and absolutely nobody prepared a return ticket.", "Sci-Fi", 80],
    ["royal-moon", "Royal Moon", "I came seeking adventure and somehow became moon management.", "Comedy", 96],
    ["lunar-audience", "Lunar Audience", "Your moonliness, I can explain the hole in the wall.", "Awkward", 112],
    ["moon-business", "Moon Business", "Let us keep this professional despite the complete lack of gravity.", "Work", 128],
    ["cartoon-chase", "Cartoon Chase", "This meeting could have been a much slower email.", "Chaos", 148],
    ["earth-again", "Earth Again", "Home looks better after accidentally ruling the moon.", "Animation", 176]
  ]
};

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
    return { word, start: Number(start.toFixed(3)), end: Number(end.toFixed(3)) };
  });
}

mkdirSync(outputDir, { recursive: true });
mkdirSync(dataDir, { recursive: true });

const scenes = [];
for (const source of publicDomainSources) {
  const sourcePath = join(sourceDir, source.fileName);
  if (!existsSync(sourcePath)) throw new Error(`Missing verified source: ${sourcePath}`);
  for (const [slug, title, quote, category, start] of sceneGroups[source.key]) {
    const duration = Number(Math.max(5.4, Math.min(7.8, 3.5 + quote.split(/\s+/).length * 0.32)).toFixed(1));
    const videoName = `${slug}.v3.mp4`;
    const thumbnailName = `${slug}.v3.jpg`;
    const videoPath = join(outputDir, videoName);
    const thumbnailPath = join(outputDir, thumbnailName);
    execFileSync("ffmpeg", [
      "-hide_banner", "-loglevel", "error", "-y", "-ss", String(start), "-i", sourcePath,
      "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=48000", "-t", String(duration),
      "-map", "0:v:0", "-map", "1:a:0",
      "-vf", "scale=640:360:force_original_aspect_ratio=decrease,pad=640:360:(ow-iw)/2:(oh-ih)/2:black,fps=24",
      "-c:v", "libx264", "-preset", "veryfast", "-crf", "25", "-pix_fmt", "yuv420p",
      "-c:a", "aac", "-b:a", "64k", "-movflags", "+faststart", "-shortest", videoPath
    ]);
    execFileSync("ffmpeg", [
      "-hide_banner", "-loglevel", "error", "-y", "-ss", String(duration / 2), "-i", videoPath,
      "-frames:v", "1", "-q:v", "3", thumbnailPath
    ]);
    const index = scenes.length + 1;
    scenes.push({
      id: `scene_${String(index).padStart(3, "0")}`,
      slug,
      title,
      quote,
      sourceTitle: source.title,
      sourceType: "movie",
      category,
      videoUrl: `/scenes/v3/${videoName}`,
      thumbnailUrl: `/scenes/v3/${thumbnailName}`,
      duration,
      transcript: quote,
      wordTimings: wordsFor(quote, duration),
      dubCount: 0,
      viewCount: 0,
      rightsStatus: "cleared",
      rightsOwner: "Public domain",
      rightsBasis: `Public-domain motion picture. Source and license evidence: ${source.filePage}`,
      published: true,
      createdAt: "2026-08-14T00:00:00.000Z",
      updatedAt: "2026-08-14T00:00:00.000Z"
    });
  }
}

if (scenes.length !== 75) throw new Error(`Expected 75 scenes, received ${scenes.length}`);

const manifest = { version: 3, generatedAt: "2026-08-14T00:00:00.000Z", scenes };
writeFileSync(join(dataDir, "scenes.json"), `${JSON.stringify(manifest, null, 2)}\n`);

const sourceRows = publicDomainSources.map((source) =>
  `| ${source.title} | ${source.creator} | [Wikimedia Commons file page](${source.filePage}) | ${source.license} | \`${source.sha256}\` |`
).join("\n");
writeFileSync(join(outputDir, "SOURCES.md"), `# Public-domain catalog sources\n\nAll clips in this directory are short, silent derivatives of the motion-picture masters below. The download script verifies the exact byte size and SHA-256 digest before a master can be used. The generated MP4 files contain a silent AAC track and do not copy soundtrack audio.\n\n| Work | Creator | Evidence | Status | Master SHA-256 |\n|---|---|---|---|---|\n${sourceRows}\n\nGenerated on 2026-08-14 with \`scripts/generate-public-domain-scenes.mjs\`. Clip start times, titles, transcripts, and categories are defined in that script.\n`);

console.log(`Generated ${scenes.length} real public-domain scenes in ${outputDir}`);
