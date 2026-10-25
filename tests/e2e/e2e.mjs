// Browser E2E + performance probe on the production build, using the locally installed Chrome.
// Usage: npm run build && npm run e2e      (HEADED=1 for a visible window / real GPU path)
import { chromium } from 'playwright-core';
import { preview } from 'vite';
import fs from 'node:fs';

const OUT = process.env.E2E_OUT || 'tests/e2e/out';
const HEADED = !!process.env.HEADED;
fs.mkdirSync(OUT, { recursive: true });
const server = await preview({ preview: { port: 4199, strictPort: true } });
const URL = 'http://localhost:4199/?debug';
const browser = await chromium.launch({
  executablePath: process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: !HEADED,
  args: ['--ignore-gpu-blocklist'],
});
const results = [];
const check = (name, ok, extra = '') => {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  — ' + extra : ''}`);
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

async function newPage(opts) {
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto(URL);
  await page.waitForFunction(() => window.__tc);
  return { page, errors, ctx };
}

const state = (page) => page.evaluate(() => ({ path: [...__tc.game.path.path], playing: __tc.game.playing, completed: __tc.game.path.completed }));

/** Real pointer click/tap at the cell's projected screen position (goes through InputController). */
async function clickCell(page, id, tap = false) {
  await page.evaluate((id) => __tc.focusCell(id), id);
  await wait(40);
  const { x, y } = await page.evaluate((id) => __tc.cellScreen(id), id);
  if (tap) await page.touchscreen.tap(x, y);
  else await page.mouse.click(x, y);
  await wait(20);
}

async function solve(page, tap = false) {
  const sol = await page.evaluate(() => __tc.solution());
  for (const id of sol.slice(1)) await clickCell(page, id, tap);
  return sol;
}

// ---------- desktop ----------
{
  const { page, errors, ctx } = await newPage({ viewport: { width: 1280, height: 800 } });
  const gpu = await page.evaluate(() => {
    const gl = __tc.game.sm.renderer.getContext();
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
  });
  console.log('GPU:', gpu);
  await wait(800);
  await page.screenshot({ path: `${OUT}/01-menu.png` });

  await page.click('#btn-start');
  await wait(400);
  check('start → stage 1 playing', (await state(page)).playing);
  await page.screenshot({ path: `${OUT}/02-stage1.png` });

  const sol = await page.evaluate(() => __tc.solution());
  await clickCell(page, sol[3]);
  check('click unconnected circuit cell → no change', (await state(page)).path.length === 1);

  for (const id of sol.slice(1, 5)) await clickCell(page, id);
  let s = await state(page);
  check('extend 4 steps by clicking', same(s.path, sol.slice(0, 5)), s.path.join(','));

  // Drag starting on the valid next cell must rotate, not select.
  await page.evaluate((id) => __tc.focusCell(id), sol[5]);
  await wait(40);
  const p5 = await page.evaluate((id) => __tc.cellScreen(id), sol[5]);
  await page.mouse.move(p5.x, p5.y);
  await page.mouse.down();
  await page.mouse.move(p5.x + 120, p5.y + 20, { steps: 8 });
  await page.mouse.up();
  await wait(50);
  check('drag does not select', (await state(page)).path.length === 5);

  await clickCell(page, sol[2]);
  s = await state(page);
  check('click middle of path → cut from there', same(s.path, sol.slice(0, 2)), s.path.join(','));
  await clickCell(page, sol[1]);
  check('click last cell → removes just it', same((await state(page)).path, sol.slice(0, 1)));
  for (const id of sol.slice(1, 4)) await clickCell(page, id);
  await page.click('#btn-reset-path');
  check('reset path button → start only', (await state(page)).path.length === 1);

  // Click where an opposite-face cell projects (through the cube): must never select that hidden cell.
  const back = await page.evaluate(() => {
    const g = __tc.game;
    g.resetView();
    const topo = g.stage.maze.topo;
    const opposite = [1, 0, 3, 2, 5, 4][topo.cells[g.stage.maze.start].face];
    const ids = topo.cells.filter((c) => c.face === opposite).map((c) => c.id);
    return ids.map((id) => ({ id, ...__tc.cellScreen(id) }));
  });
  await wait(60);
  const ignored = await page.evaluate((back) => back.map(({ id, x, y }) => ({ id, picked: __tc.pick(x, y) })), back);
  check('back-face cells are never picked through the front', ignored.every((r) => r.picked !== r.id), `${ignored.length} probes`);

  await solve(page);
  check('stage 1 completes', (await state(page)).completed);
  await wait(900);
  await page.screenshot({ path: `${OUT}/03-powerup.png` });
  await page.waitForSelector('#complete:not([hidden])', { timeout: 5000 });
  await wait(500);
  await page.screenshot({ path: `${OUT}/04-complete.png` });
  check('complete overlay shown', true);
  await page.evaluate(() => __tc.game.onCell(__tc.solution()[1]));
  check('input after complete ignored', (await state(page)).path.length === sol.length);

  const total = await page.evaluate(() => document.querySelectorAll('#stage-grid button').length);
  check('menu lists every stage', total === 30, `${total}`);
  for (let i = 2; i <= total; i++) {
    await page.click('#btn-next');
    await wait(300);
    await solve(page);
    check(`stage ${i} completes by real clicks`, (await state(page)).completed);
    if (i === total) {
      await wait(400);
      await page.screenshot({ path: `${OUT}/05-last-stage-solved.png` });
    }
    await page.waitForSelector('#complete:not([hidden])', { timeout: 6000 });
  }
  const saved = JSON.parse(await page.evaluate(() => localStorage.getItem('tesseract-circuit:v1')));
  check(`progress saved (${total} cleared)`, saved.cleared.length === total, `${saved.cleared.length} cleared, unlocked ${saved.unlocked}`);

  const geomBefore = await page.evaluate(() => __tc.game.sm.renderer.info.memory.geometries);
  for (let k = 0; k < 30; k++) {
    await page.evaluate((k) => __tc.game.play(k % 30), k);
    await wait(30);
  }
  await wait(200);
  const geomAfter = await page.evaluate(() => __tc.game.sm.renderer.info.memory.geometries);
  check('no GPU geometry growth over 30 stage loads', geomAfter <= geomBefore + 2, `${geomBefore} → ${geomAfter}`);

  // Performance: last (heaviest) stage, continuous rotation, per preset.
  await page.evaluate(() => __tc.game.play(29));
  const perf = [];
  for (const q of ['high', 'medium', 'low']) {
    await page.evaluate((q) => {
      const g = __tc.game;
      g.setQuality(q);
      g.sm.controls.autoRotate = true;
      g.sm.controls.autoRotateSpeed = 6;
      g.perf.count = 0;
    }, q);
    await wait(4000);
    const st = await page.evaluate(() => __tc.game.perf.stats());
    perf.push({ test: `L30 rotate ${q}`, avgFps: +st.avgFps.toFixed(1), p95ms: +st.p95.toFixed(1), drawCalls: st.calls, triangles: st.triangles });
    await page.screenshot({ path: `${OUT}/06-perf-${q}.png` });
  }
  await page.evaluate(() => {
    const g = __tc.game;
    g.setQuality('high');
    g.sm.controls.autoRotate = false;
    for (const id of __tc.solution().slice(1, -1)) g.onCell(id);
  });
  await wait(600);
  await page.evaluate(() => {
    __tc.game.perf.count = 0;
    __tc.game.onCell(__tc.solution()[1]);
  });
  await wait(700);
  const rs = await page.evaluate(() => ({ st: __tc.game.perf.stats(), len: __tc.game.path.path.length, disp: __tc.game.circuit.display }));
  perf.push({ test: 'L30 retract full path (high)', avgFps: +rs.st.avgFps.toFixed(1), p95ms: +rs.st.p95.toFixed(1), drawCalls: rs.st.calls, triangles: rs.st.triangles });
  check('long retraction (click 1st step) → start only, animation done in 0.7s', rs.len === 1 && rs.disp === 0, `display=${rs.disp}`);
  console.table(perf);
  fs.writeFileSync(`${OUT}/perf.json`, JSON.stringify({ gpu, headless: !HEADED, viewport: '1280x800', perf }, null, 2));
  check('no console errors (desktop)', errors.length === 0, errors.slice(0, 3).join(' | '));
  await ctx.close();
}

// ---------- mobile (touch) ----------
{
  const { page, errors, ctx } = await newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, hasTouch: true, isMobile: true });
  await wait(500);
  await page.screenshot({ path: `${OUT}/07-mobile-menu.png` });
  await page.tap('#btn-start');
  await wait(300);
  await page.screenshot({ path: `${OUT}/08-mobile-stage.png` });
  const sol = await page.evaluate(() => __tc.solution());
  await clickCell(page, sol[1], true);
  check('mobile tap extends path', (await state(page)).path.length === 2);
  for (const id of sol.slice(2)) await clickCell(page, id, true);
  check('mobile: stage solvable by taps', (await state(page)).completed);
  await page.waitForSelector('#complete:not([hidden])', { timeout: 5000 });
  await page.screenshot({ path: `${OUT}/09-mobile-complete.png` });
  check('no console errors (mobile)', errors.length === 0, errors.slice(0, 3).join(' | '));
  await ctx.close();
}

await browser.close();
await server.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
