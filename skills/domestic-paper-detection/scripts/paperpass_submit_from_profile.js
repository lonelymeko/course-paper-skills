#!/usr/bin/env node
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const BASE = 'https://www.paperpass.com';
const DEFAULT_PROXY = 'http://127.0.0.1:7897';

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

function writeText(filePath, text) {
  fs.writeFileSync(filePath, text, 'utf8');
}

function writeJson(filePath, value) {
  writeText(filePath, JSON.stringify(value, null, 2));
}

function decryptChromiumCookie(host, encryptedHex) {
  const encrypted = Buffer.from(encryptedHex, 'hex');
  if (!encrypted.subarray(0, 3).equals(Buffer.from('v10'))) {
    throw new Error(`unsupported cookie encryption prefix for ${host}`);
  }
  const key = crypto.pbkdf2Sync('mock_password', 'saltysalt', 1003, 16, 'sha1');
  const iv = Buffer.alloc(16, 0x20);
  const decipher = crypto.createDecipheriv('aes-128-cbc', key, iv);
  const plain = Buffer.concat([decipher.update(encrypted.subarray(3)), decipher.final()]);
  const hostHash = crypto.createHash('sha256').update(host).digest();
  return plain.subarray(0, 32).equals(hostHash) ? plain.subarray(32).toString('utf8') : plain.toString('utf8');
}

function readPaperpassCookies(profileDir) {
  const db = path.join(profileDir, 'Default', 'Cookies');
  if (!fs.existsSync(db)) throw new Error(`missing Chromium cookie DB: ${db}`);
  const sql = [
    'select host_key, name, value, hex(encrypted_value)',
    'from cookies',
    "where host_key like '%paperpass.com%'",
    "and name in ('PHPSESSID','SERVERID','_csrf','pp_identifier','aliyungf_tc','CNZZDATA2347458')",
  ].join(' ');
  const out = execFileSync('sqlite3', [db, sql], { encoding: 'utf8' }).trim();
  const cookies = [];
  for (const line of out.split('\n').filter(Boolean)) {
    const [host, name, value, encryptedHex] = line.split('|');
    const cookieValue = value || decryptChromiumCookie(host, encryptedHex);
    cookies.push({ host, name, value: cookieValue });
  }
  const byName = Object.fromEntries(cookies.map((cookie) => [cookie.name, cookie.value]));
  if (!byName.PHPSESSID || !byName._csrf) {
    throw new Error('Playwright profile does not contain PaperPass login cookies');
  }
  return cookies;
}

function cookieHeader(cookies) {
  return cookies.map(({ name, value }) => `${name}=${value}`).join('; ');
}

function runCurl(url, { method = 'GET', headers = {}, data = undefined, cookie = '', output }) {
  const args = ['-sS', '-L', '--compressed', '-w', '\n%{http_code}', '-o', output];
  if (process.env.https_proxy || process.env.HTTPS_PROXY) {
    args.push('--proxy', process.env.https_proxy || process.env.HTTPS_PROXY);
  }
  args.push('-X', method);
  args.push('-H', 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/148 Safari/537.36');
  args.push('-H', 'Accept: application/json, text/javascript, */*; q=0.01');
  args.push('-H', 'Accept-Language: zh-CN,zh;q=0.9');
  if (cookie) args.push('-H', `Cookie: ${cookie}`);
  for (const [key, value] of Object.entries(headers)) args.push('-H', `${key}: ${value}`);
  if (data !== undefined) {
    args.push('--data-raw', data);
  }
  args.push(url);
  const statusText = execFileSync('curl', args, { encoding: 'utf8', env: process.env }).trim();
  const status = Number(statusText.split('\n').pop());
  const body = fs.readFileSync(output, 'utf8');
  return { status, body };
}

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch (error) {
    return { _non_json: true, textPrefix: text.slice(0, 800) };
  }
}

function extractCsrf(html) {
  const match = html.match(/<meta\s+name="csrf-token"\s+content="([^"]+)"/i);
  return match ? match[1] : '';
}

function formEncode(payload) {
  return Object.entries(payload)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
}

function postSubmit(runDir, csrf, cookie, payload, label) {
  const rawPath = path.join(runDir, `${label}.raw`);
  const { status, body } = runCurl(`${BASE}/panel/index/submit-papers-key`, {
    method: 'POST',
    output: rawPath,
    cookie,
    headers: {
      Origin: BASE,
      Referer: `${BASE}/panel/index`,
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-Requested-With': 'XMLHttpRequest',
      ...(csrf ? { 'X-CSRF-Token': csrf } : {}),
    },
    data: formEncode(payload),
  });
  const json = parseJson(body);
  writeJson(path.join(runDir, `${label}.json`), { httpStatus: status, response: json });
  return json;
}

function main() {
  process.env.https_proxy = process.env.https_proxy || DEFAULT_PROXY;
  process.env.http_proxy = process.env.http_proxy || DEFAULT_PROXY;
  process.env.all_proxy = process.env.all_proxy || 'socks5://127.0.0.1:7897';

  const checkType = arg('check-type', 'free');
  const title = arg('title', 'Untitled Paper');
  const author = arg('author', '');
  if (looksPlaceholder(author) && !flag('allow-placeholder-author')) {
    throw new Error('PaperPass author is missing or placeholder. Provide --author "<真实姓名>" before submission, or pass --allow-placeholder-author only for a deliberate test run.');
  }

  const runDir = path.resolve(arg('run-dir', ''));
  if (!runDir || !fs.existsSync(runDir)) {
    throw new Error('Usage: node paperpass_submit_playwright_profile.js --run-dir <paperpass-run-dir>');
  }
  const profileDir = path.resolve(arg('profile-dir', path.join(runDir, 'playwright-chromium-profile')));

  const sign = JSON.parse(fs.readFileSync(path.join(runDir, '01-get-upload-sign.json'), 'utf8'));
  const parse = JSON.parse(fs.readFileSync(path.join(runDir, '03-parse.json'), 'utf8'));
  if (sign.code !== 0 || parse.status !== 0) {
    throw new Error('missing successful PaperPass upload/parse response');
  }

  const cookies = readPaperpassCookies(profileDir);
  const cookie = cookieHeader(cookies);
  writeJson(path.join(runDir, '13-playwright-cookie-status.json'), {
    status: 'cookies_loaded_from_playwright_profile',
    cookieNames: cookies.map((item) => item.name),
    profileDir,
    proxy: {
      https_proxy: process.env.https_proxy,
      http_proxy: process.env.http_proxy,
      all_proxy: process.env.all_proxy,
    },
  });

  const panelRaw = path.join(runDir, '14-profile-panel-index.html');
  const panel = runCurl(`${BASE}/panel/index`, { output: panelRaw, cookie });
  const csrf = extractCsrf(panel.body);
  const loggedIn = panel.body.includes('/site/logout') || panel.body.includes('注销登录') || panel.body.includes('m6j38efo7w9');
  writeJson(path.join(runDir, '14-profile-panel-status.json'), {
    httpStatus: panel.status,
    loggedIn,
    csrfPresent: Boolean(csrf),
  });
  if (!loggedIn) {
    throw new Error('Playwright profile cookies are not logged in on PaperPass');
  }

  const freeRaw = path.join(runDir, '15-free-data.raw');
  const free = runCurl(`${BASE}/panel/index/free-data?_=${Date.now()}`, { output: freeRaw, cookie });
  const freeJson = parseJson(free.body);
  writeJson(path.join(runDir, '15-free-data.json'), { httpStatus: free.status, response: freeJson });

  const basePayload = {
    canSubmit: '0',
    'SubmitKeyPaperForm[isReduceAi]': 'false',
    'SubmitKeyPaperForm[paperType]': 'file',
    'SubmitKeyPaperForm[officeKey]': sign.data.file_key,
    'SubmitKeyPaperForm[isReduce]': 'false',
    'SubmitKeyPaperForm[couponId]': '',
    'SubmitKeyPaperForm[captcha]': '',
    'SubmitKeyPaperForm[checkType]': checkType,
    'SubmitKeyPaperForm[title]': title,
    'SubmitKeyPaperForm[author]': author,
    'SubmitKeyPaperForm[content]': '',
  };

  const pre = postSubmit(runDir, csrf, cookie, basePayload, '16-profile-pre-submit');
  const paper = (pre.data || pre.response?.data || {});
  if (paper.status !== 1) {
    const summary = { status: 'pre_submit_failed', response: pre };
    writeJson(path.join(runDir, '16-profile-submit-summary.json'), summary);
    console.log(JSON.stringify(summary, null, 2));
    process.exitCode = 1;
    return;
  }

  const needsCaptcha = Boolean(checkType === 'free' ? paper.free_captcha : paper.fee_captcha);
  const contentLength = Number(paper.contentLength || parse.data.contentLenght || 0);
  const price = Number(paper.price || 0);
  const remainCount = Number(paper.remainCount || 0);
  const needsPayment = checkType !== 'free' && price * Math.ceil(contentLength / 1000) > remainCount;
  const preSummary = {
    status: 'pre_submit_ok',
    checkType,
    needsCaptcha,
    needsPayment,
    paper,
  };
  writeJson(path.join(runDir, '16-profile-submit-summary.json'), preSummary);

  if (needsPayment) {
    console.log(JSON.stringify({ ...preSummary, nextStep: 'payment_required_on_official_page' }, null, 2));
    process.exitCode = 3;
    return;
  }
  if (needsCaptcha) {
    console.log(JSON.stringify({ ...preSummary, nextStep: 'tencent_captcha_required_on_official_page' }, null, 2));
    process.exitCode = 4;
    return;
  }

  const finalPayload = { ...basePayload, canSubmit: '1' };
  const final = postSubmit(runDir, csrf, cookie, finalPayload, '17-profile-final-submit');
  const finalSummary = {
    status: 'final_submit_response_saved',
    response: final,
  };
  writeJson(path.join(runDir, '17-profile-final-submit-summary.json'), finalSummary);
  console.log(JSON.stringify(finalSummary, null, 2));
}

try {
  main();
} catch (error) {
  console.error(error.stack || String(error));
  process.exit(1);
}
