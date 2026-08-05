// Pulls a real audio bed out of Lyrx by driving its own WAV export.
// The promo's soundtrack is then a loop the app actually made.
import fs from 'node:fs';
import path from 'node:path';
import { launch, goHome } from './rig.mjs';

const OUT = path.resolve('art/lyrx-broll/audio');
fs.mkdirSync(OUT, { recursive: true });

const TAKES = [
  { name: 'bed-a', bpm: 128, rolls: 1 },
  { name: 'bed-b', bpm: 92, rolls: 2 },
  { name: 'bed-c', bpm: 140, rolls: 3 }
];

const { browser, page } = await launch();
await goHome(page);
await page.locator('button[data-view="studio"]').first().click();
await page.waitForSelector('select');
await page.waitForTimeout(700);

for (const take of TAKES) {
  for (let i = 0; i < take.rolls; i++) {
    await page.locator('button:has-text("Roll dice")').first().click();
    await page.waitForTimeout(700);
  }
  // set tempo
  await page.locator('input[type="range"]').first().evaluate((n, v) => {
    n.value = String(v);
    n.dispatchEvent(new Event('input', { bubbles: true }));
    n.dispatchEvent(new Event('change', { bubbles: true }));
  }, take.bpm);
  await page.waitForTimeout(400);

  const dl = page.waitForEvent('download', { timeout: 120000 });
  await page.locator('button:has-text("EXPORT WAV"), button:has-text("Export wav")').first().click();
  try {
    const d = await dl;
    const dest = path.join(OUT, `${take.name}.wav`);
    await d.saveAs(dest);
    const kb = (fs.statSync(dest).size / 1024).toFixed(0);
    console.log(`✓ ${take.name}  ${take.bpm}bpm  ${kb}kb  ${dest}`);
  } catch (e) {
    console.error(`✗ ${take.name}: ${e.message}`);
  }
  await page.waitForTimeout(600);
}

await browser.close();
