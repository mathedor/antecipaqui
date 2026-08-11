import { chromium } from '../../notta/video/node_modules/playwright/index.mjs';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const CAMPANHAS = ['imob', 'constr', 'com'];
const FILES = CAMPANHAS.flatMap((c) => [
  `${c}-carrosseis-a.html`,
  `${c}-carrosseis-b.html`,
  `${c}-singles.html`,
  `${c}-stories.html`,
]);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 2100 }, deviceScaleFactor: 1 });
let total = 0;

for (const file of FILES) {
  await page.goto('file://' + join(here, file));
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(600);

  const boards = await page.$$eval('section[data-post]', els =>
    els.map(el => {
      const r = el.getBoundingClientRect();
      const fr = el.querySelectorAll('.frame');
      return {
        id: el.dataset.post,
        x: r.x + window.scrollX, y: r.y + window.scrollY,
        n: fr.length,
        w: fr[0].getBoundingClientRect().width,
        h: fr[0].getBoundingClientRect().height,
      };
    })
  );

  for (const b of boards) {
    const dir = join(here, 'out', b.id);
    mkdirSync(dir, { recursive: true });
    for (let i = 0; i < b.n; i++) {
      await page.screenshot({
        path: join(dir, String(i + 1).padStart(2, '0') + '.png'),
        clip: { x: b.x + i * b.w, y: b.y, width: b.w, height: b.h },
        fullPage: true,
      });
      total++;
    }
    console.log(`✓ ${b.id} — ${b.n} imagem(ns) ${b.w}×${b.h}`);
  }
}

await browser.close();
console.log(`\n${total} PNGs exportados em marketing/out/`);
