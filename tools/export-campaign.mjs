// Exports the 15 campaign levels (vetted seeds) into /levels as plain JSON
// plus a manifest.json the game fetches at startup. Applies the fuel
// re-balance: roughly half the start fuel, but fuel canisters now carry a
// real capacity so the player must manage energy and siphon depots en route.
//
// Usage: node tools/export-campaign.mjs
import { mkdir, copyFile, writeFile, rm } from 'fs/promises';

// levelgen.js is ESM but has a .js extension without a package.json
// "type": "module", so copy it to .mjs before importing.
await copyFile('js/levelgen.js', 'tools/_levelgen.mjs');
const { generateCampaign } = await import('./_levelgen.mjs');

const CAMPAIGN_SEEDS = [31337, 31438, 31539, 31842, 32347, 32448, 32549, 32650, 32953, 33054, 33256, 34165, 34468, 34670, 37801];
const levels = generateCampaign(CAMPAIGN_SEEDS);

const files = [];
levels.forEach((lvl, i) => {
  const t = levels.length === 1 ? 0 : i / (levels.length - 1);

  // ---- Fuel re-balance ----
  // Start fuel halved: forces planning instead of brute-force thrusting.
  lvl.fuel = Math.round((lvl.fuel * 0.5) / 100) * 100;
  // Fuel depots get a real capacity (fuel units they hold). Deeper levels
  // have bigger depots, but reaching them costs fuel too.
  const capacity = Math.round((400 + 500 * t) / 50) * 50;
  for (const e of lvl.entities) {
    if (e.type === 'fuel') e.capacity = capacity;
  }

  const slug = String(i + 1).padStart(2, '0') + '-' +
    lvl.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  files.push({ file: slug + '.json', lvl });
});

await mkdir('levels', { recursive: true });
for (const f of files) {
  await writeFile('levels/' + f.file, JSON.stringify(f.lvl, null, 2));
  console.log('written levels/' + f.file, '| fuel', f.lvl.lvl ?? f.lvl.fuel ?? '');
}
await writeFile('levels/manifest.json', JSON.stringify(files.map(f => f.file), null, 2));
console.log('written levels/manifest.json with', files.length, 'entries');

await rm('tools/_levelgen.mjs');
