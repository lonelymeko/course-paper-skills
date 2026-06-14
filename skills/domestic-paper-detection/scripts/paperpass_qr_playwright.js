#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { spawnSync } = require('child_process');

function arg(name, fallback) {
  const idx = process.argv.indexOf(`--${name}`);
  return idx >= 0 && idx + 1 < process.argv.length ? process.argv[idx + 1] : fallback;
}

function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} exited ${result.status}`);
}

function openQr(imagePath) {
  run(process.execPath, [path.join(__dirname, 'open_qr.js'), imagePath]);
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const runDir = path.resolve(arg('run-dir', path.join(process.cwd(), `paperpass-login-${Date.now()}`)));
  fs.mkdirSync(runDir, { recursive: true });
  const userDataDir = path.resolve(arg('profile-dir', path.join(runDir, 'playwright-chromium-profile')));

  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    viewport: { width: 1366, height: 900 },
  });
  const page = context.pages()[0] || await context.newPage();
  await page.goto('https://www.paperpass.com/login', { waitUntil: 'domcontentloaded' }).catch(async () => {
    await page.goto('https://www.paperpass.com', { waitUntil: 'domcontentloaded' });
  });
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

  const qrPath = path.join(runDir, 'login-qrcode.png');
  const qrLocator = page.locator('img[src*="qr"], img[src*="qrcode"], canvas').first();
  if (await qrLocator.count().catch(() => 0)) {
    await qrLocator.screenshot({ path: qrPath }).catch(async () => {
      await page.screenshot({ path: qrPath, fullPage: false });
    });
  } else {
    await page.screenshot({ path: qrPath, fullPage: false });
  }
  openQr(qrPath);

  for (let i = 1; i <= 240; i++) {
    await page.goto('https://www.paperpass.com/panel/index', { waitUntil: 'domcontentloaded' }).catch(() => {});
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
    const url = page.url();
    const html = await page.content().catch(() => '');
    const loggedIn = !url.includes('/login') && (html.includes('/site/logout') || html.includes('注销登录') || html.includes('/panel/'));
    fs.writeFileSync(path.join(runDir, `poll-${String(i).padStart(3, '0')}.json`), JSON.stringify({ url, loggedIn, at: new Date().toISOString() }, null, 2));
    console.log(JSON.stringify({ i, url, loggedIn }));
    if (loggedIn) {
      await context.storageState({ path: path.join(runDir, 'storage-state.json') });
      console.log(JSON.stringify({ status: 'logged_in', runDir, profileDir: userDataDir }, null, 2));
      return;
    }
    await sleep(3000);
  }
  throw new Error('PaperPass login polling timed out');
}

main().catch((error) => {
  console.error(error.stack || String(error));
  process.exit(1);
});
