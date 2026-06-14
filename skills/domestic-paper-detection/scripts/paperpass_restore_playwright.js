#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

function arg(name, fallback = undefined) {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx >= 0 && idx + 1 < process.argv.length) return process.argv[idx + 1];
  return fallback;
}

function flag(name) {
  return process.argv.includes(`--${name}`);
}

function looksPlaceholder(value) {
  return ['', 'Unknown', 'unknown', '待填写', '待填充', '未知', 'N/A', 'na'].includes(String(value || '').trim());
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function injectPaperpassState(page, runDir, title, author) {
  const parse = JSON.parse(fs.readFileSync(path.join(runDir, '03-parse.json'), 'utf8'));
  const sign = JSON.parse(fs.readFileSync(path.join(runDir, '01-get-upload-sign.json'), 'utf8'));
  const fileData = {
    fileName: arg('file-name', 'final-paper.docx'),
    fileSize: arg('file-size', '40.11 KB'),
  };
  const notUploadData = [
    { name: 'SubmitKeyPaperForm[paperType]', value: 'file' },
    { name: 'SubmitKeyPaperForm[officeKey]', value: sign.data.file_key },
    { name: 'SubmitKeyPaperForm[isReduce]', value: 'false' },
    { name: 'SubmitKeyPaperForm[isReduceAi]', value: 'false' },
    { name: 'SubmitKeyPaperForm[couponId]', value: '' },
    { name: 'SubmitKeyPaperForm[captcha]', value: '' },
    { name: 'SubmitKeyPaperForm[checkType]', value: 'free' },
    { name: 'SubmitKeyPaperForm[title]', value: title },
    { name: 'SubmitKeyPaperForm[author]', value: author },
    { name: 'SubmitKeyPaperForm[content]', value: '' },
  ];
  await page.evaluate(({ fileData, parseData, notUploadData }) => {
    sessionStorage.setItem('fileData', JSON.stringify(fileData));
    sessionStorage.setItem('parseData', JSON.stringify(parseData));
    sessionStorage.setItem('notUploadData', JSON.stringify(notUploadData));
  }, { fileData, parseData: parse.data, notUploadData });
}

async function main() {
  const title = arg('title', 'Untitled Paper');
  const author = arg('author', '');
  if (looksPlaceholder(author) && !flag('allow-placeholder-author')) {
    throw new Error('PaperPass author is missing or placeholder. Provide --author "<真实姓名>" before submission, or pass --allow-placeholder-author only for a deliberate test run.');
  }

  const runDir = path.resolve(arg('run-dir', ''));
  if (!runDir || !fs.existsSync(runDir)) {
    throw new Error('Usage: node paperpass_playwright_flow.js --run-dir <paperpass-run-dir>');
  }
  const userDataDir = path.resolve(arg('profile-dir', path.join(runDir, 'playwright-chromium-profile')));
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    viewport: { width: 1366, height: 900 },
  });
  const page = context.pages()[0] || await context.newPage();

  async function saveState(label) {
    const url = page.url();
    await page.screenshot({ path: path.join(runDir, `${label}.png`), fullPage: true }).catch(() => {});
    fs.writeFileSync(path.join(runDir, `${label}.json`), JSON.stringify({ url, at: new Date().toISOString() }, null, 2));
    console.log(JSON.stringify({ status: label, url, note: `saved ${label}.png/json` }, null, 2));
  }

  await page.goto('https://www.paperpass.com/upload', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await injectPaperpassState(page, runDir, title, author);
  await page.goto('https://www.paperpass.com/panel/index', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await saveState('11-after-panel-open');

  while (page.url().includes('/login')) {
    console.log(JSON.stringify({
      status: 'waiting_for_login',
      url: page.url(),
      instruction: 'Please log in inside the Playwright Chromium window. This process will keep running and will not close the browser.',
    }, null, 2));
    await sleep(5000);
    await page.goto('https://www.paperpass.com/panel/index', { waitUntil: 'domcontentloaded' }).catch(() => {});
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  }

  await page.goto('https://www.paperpass.com/upload', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await injectPaperpassState(page, runDir, title, author);
  await page.goto('https://www.paperpass.com/panel/index', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await saveState('12-after-state-restore');

  console.log(JSON.stringify({
    status: 'ready_for_manual_or_auto_submit',
    url: page.url(),
    instruction: 'If the page shows the restored paper/order, complete captcha/payment manually. The browser will stay open.',
  }, null, 2));

  await new Promise(() => {});
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
