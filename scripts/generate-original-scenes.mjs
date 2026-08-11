import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
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
  ["final-tab", "The Final Tab", "I closed one browser tab and discovered inner peace.", "Everyday", "#4cc9f0", "#092f3b"],
  ["remote-control", "Remote Control Treaty", "We can negotiate, but the volume button stays with me.", "Comedy", "#ff477e", "#350818"],
  ["grocery-plot", "Grocery Store Plot", "I came for milk and somehow joined a conspiracy.", "Mystery", "#06d6a0", "#06382d"],
  ["rainy-alibi", "The Rainy Alibi", "The forecast said sunshine, so clearly this is personal.", "Drama", "#4895ef", "#091d3d"],
  ["suspicious-calendar", "Suspicious Calendar", "Friday disappeared, and I would like an investigation.", "Work", "#f72585", "#3b0826"],
  ["chair-squeak", "The Chair Confession", "That sound was the chair, and the chair knows it.", "Awkward", "#b5179e", "#33052e"],
  ["midnight-snack", "Midnight Snack Mission", "Stay quiet, the refrigerator has excellent hearing.", "Everyday", "#ffd166", "#3c2b04"],
  ["printer-rebellion", "Printer Rebellion", "It can smell urgency, and that only makes it stronger.", "Work", "#ef476f", "#3a0918"],
  ["weather-app", "Weather App Betrayal", "You promised light clouds, not an aquatic emergency.", "Chaos", "#00b4d8", "#052d3b"],
  ["mystery-sock", "The Mystery Sock", "One sock returned, but it refuses to answer questions.", "Mystery", "#9b5de5", "#261143"],
  ["traffic-light", "Traffic Light Monologue", "We have been red for three chapters of my life.", "Drama", "#e63946", "#36070c"],
  ["vacuum-duel", "Vacuum Duel", "This floor is not big enough for both of us.", "Comedy", "#ff9f1c", "#402402"],
  ["typo-apology", "The Typo Apology", "I meant regards, not revenge, and I can explain.", "Work", "#4361ee", "#101744"],
  ["queue-philosopher", "Queue Philosopher", "Perhaps the real checkout was the patience we lost.", "Everyday", "#2ec4b6", "#07332f"],
  ["leftovers-treaty", "Leftovers Treaty", "You had three days, the noodles belong to history now.", "Comedy", "#fb8500", "#3c1e02"],
  ["ringtone-trial", "Ringtone on Trial", "The courtroom recognizes that was not my chosen sound.", "Awkward", "#8338ec", "#220641"],
  ["missing-keys", "The Missing Keys", "Everybody remain calm and check the door again.", "Mystery", "#52b788", "#0a2d20"],
  ["toaster-warning", "Toaster Warning", "The smoke alarm is being extremely dramatic about breakfast.", "Chaos", "#ff6b35", "#3d1605"],
  ["virtual-background", "Background Malfunction", "Please ignore the tropical beach attacking my outline.", "Work", "#3a86ff", "#091d42"],
  ["elevator-button", "Elevator Button", "Pressing it twelve times tells the elevator we mean business.", "Everyday", "#00f5d4", "#063d36"],
  ["cereal-dinner", "Cereal for Dinner", "This is not giving up, this is culinary efficiency.", "Comedy", "#ffbe0b", "#3c2b01"],
  ["package-neighbor", "The Neighbor's Package", "I am only guarding it, with suspicious dedication.", "Mystery", "#118ab2", "#072e3c"],
  ["autocorrect-betrayal", "Autocorrect Betrayal", "My phone has issued a statement I do not support.", "Chaos", "#e71d36", "#38060d"],
  ["umbrella-inspector", "Umbrella Inspector", "This umbrella has one job and several creative interpretations.", "Everyday", "#4cc9f0", "#0b3341"],
  ["meeting-microphone", "Microphone Still On", "That was valuable feedback intended for a much smaller audience.", "Work", "#7b2cbf", "#1d0835"],
  ["frozen-pizza", "Frozen Pizza Summit", "The instructions say twelve minutes, but destiny says ten.", "Comedy", "#ff4d6d", "#3b0a18"],
  ["hallway-encounter", "Hallway Encounter", "We both chose the same direction four times, so this is destiny.", "Awkward", "#06d6a0", "#06382d"],
  ["calendar-invite", "Calendar Ambush", "An invite without context is just a digital threat.", "Work", "#f72585", "#3d0625"],
  ["dog-excuse", "The Dog's Excuse", "He looks innocent, which is exactly what worries me.", "Mystery", "#80ed99", "#153721"],
  ["grocery-bag", "One Trip Only", "We make one trip, even if the bags claim otherwise.", "Drama", "#ef476f", "#3a0817"],
  ["coffee-machine", "Coffee Machine Negotiation", "I pressed every button, now we wait for diplomacy.", "Work", "#9b5de5", "#241041"],
  ["wrong-number", "The Wrong Number", "You have the wrong person, but I am invested now.", "Awkward", "#00b4d8", "#042d3b"],
  ["suitcase-drama", "Suitcase Drama", "If it closes, it counts as organized.", "Chaos", "#fb8500", "#3b1d01"],
  ["office-thermostat", "Thermostat Cold War", "Someone moved it one degree, and peace has ended.", "Work", "#4361ee", "#0c1741"],
  ["sandwich-heist", "Sandwich Heist", "I labeled it clearly, which means this was planned.", "Mystery", "#ffd166", "#3c2b03"],
  ["silent-notification", "Silent Notification", "My phone said nothing, but somehow I felt judged.", "Everyday", "#b5179e", "#35052f"],
  ["robot-vacuum", "Robot Vacuum Uprising", "It has mapped the house and now knows too much.", "Chaos", "#2ec4b6", "#07332f"],
  ["weekend-plan", "Weekend Plan", "My schedule is completely open and emotionally unavailable.", "Comedy", "#ff477e", "#380818"],
  ["recipe-substitution", "Recipe Substitution", "I replaced one ingredient and accidentally invented weather.", "Chaos", "#ff6b35", "#3d1504"],
  ["parking-ticket", "Parking Ticket Speech", "This paper and I remember the signs very differently.", "Drama", "#e63946", "#35070c"],
  ["unread-message", "The Unread Message", "I saw the preview, and now we are both pretending.", "Awkward", "#8338ec", "#22063f"],
  ["hallway-light", "Hallway Light", "It flickered twice, which is legally a warning.", "Mystery", "#52b788", "#0a2d20"],
  ["desk-drawer", "The Desk Drawer", "I opened it for a pen and found three previous careers.", "Work", "#3a86ff", "#091c40"],
  ["spare-key", "Spare Key Mystery", "The spare key is in a safe place nobody remembers.", "Mystery", "#118ab2", "#072e3b"],
  ["bus-stop", "Bus Stop Prophecy", "The moment I sit down, the bus will appear.", "Everyday", "#4cc9f0", "#0a323f"],
  ["cereal-box", "Cereal Box Evidence", "The empty box returned to the shelf under suspicious circumstances.", "Comedy", "#ffbe0b", "#3b2a01"],
  ["charger-court", "Charger Court", "You borrowed it indefinitely, which is a fascinating legal theory.", "Drama", "#e71d36", "#36050c"],
  ["mystery-smell", "The Mystery Smell", "Nobody panic, but the kitchen has developed a personality.", "Chaos", "#00f5d4", "#053b34"],
  ["screen-share", "Screen Share Panic", "That is not the tab I intended to introduce.", "Work", "#7b2cbf", "#1c0834"],
  ["lunch-meeting", "Lunch Meeting", "If there is no lunch, this is simply a meeting.", "Work", "#ff9f1c", "#402301"],
  ["late-alarm", "The Late Alarm", "You had one job, and somehow I am apologizing.", "Everyday", "#f72585", "#3c0624"],
  ["final-voicemail", "The Final Voicemail", "Please call me back before I rehearse this again.", "Drama", "#4895ef", "#0a1d3d"]
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

  if (!existsSync(videoPath)) {
    execFileSync("ffmpeg", [
      "-hide_banner", "-loglevel", "error", "-y",
      "-f", "lavfi", "-i", `gradients=s=640x360:r=24:c0=${colorA}:c1=${colorB}:n=2:d=${duration}:speed=0.012:type=${gradientType}`,
      "-f", "lavfi", "-i", `sine=frequency=${frequency}:sample_rate=48000:duration=${duration}`,
      "-filter:a", "volume=0.025",
      "-c:v", "libx264", "-preset", "veryfast", "-crf", "28", "-pix_fmt", "yuv420p",
      "-c:a", "aac", "-b:a", "64k", "-movflags", "+faststart", "-shortest", videoPath
    ]);
  }

  if (!existsSync(thumbnailPath)) {
    execFileSync("ffmpeg", [
      "-hide_banner", "-loglevel", "error", "-y", "-ss", String(duration / 2),
      "-i", videoPath, "-frames:v", "1", "-q:v", "3", thumbnailPath
    ]);
  }

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
writeFileSync(join(outputDir, "RIGHTS.md"), `# Original catalog asset rights\n\nAll ${scenes.length} moving-gradient clips, ambient tones, thumbnails, titles, quotes, and timings in this directory were created specifically for StealMyScene. They contain no third-party footage, music, performances, logos, or character likenesses. Publishing is gated by the matching manifest records with \`rightsStatus: \"cleared\"\`.\n`);

console.log(`Generated ${scenes.length} original, rights-cleared scenes in ${outputDir}`);
