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

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf8');
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
  const byName = Object.fromEntries(cookies.map(cookie => [cookie.name, cookie.value]));
  if (!byName.PHPSESSID || !byName._csrf) {
    throw new Error('Playwright profile does not contain PaperPass login cookies');
  }
  return cookies;
}

function cookieHeader(cookies) {
  return cookies.map(({ name, value }) => `${name}=${value}`).join('; ');
}

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch (error) {
    return { _non_json: true, textPrefix: text.slice(0, 1000) };
  }
}

function runCurl(url, { method = 'GET', headers = {}, data = undefined, cookie = '', output, headerOutput }) {
  const args = ['-sS', '-L', '--compressed', '-w', '\n%{http_code}', '-o', output];
  if (headerOutput) args.push('-D', headerOutput);
  if (process.env.https_proxy || process.env.HTTPS_PROXY) {
    args.push('--proxy', process.env.https_proxy || process.env.HTTPS_PROXY);
  }
  args.push('-X', method);
  args.push('-H', 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/148 Safari/537.36');
  args.push('-H', 'Accept: application/json, text/javascript, */*; q=0.01');
  args.push('-H', 'Accept-Language: zh-CN,zh;q=0.9');
  if (cookie) args.push('-H', `Cookie: ${cookie}`);
  for (const [key, value] of Object.entries(headers)) args.push('-H', `${key}: ${value}`);
  if (data !== undefined) args.push('--data-raw', data);
  args.push(url);
  const statusText = execFileSync('curl', args, { encoding: 'utf8', env: process.env }).trim();
  const status = Number(statusText.split('\n').pop());
  return { status, body: fs.readFileSync(output) };
}

function formEncode(payload) {
  return Object.entries(payload)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
}

function detectExtension(headersPath, bodyPath) {
  const headers = fs.existsSync(headersPath) ? fs.readFileSync(headersPath, 'utf8') : '';
  const contentType = (headers.match(/^content-type:\s*(.+)$/im) || [])[1] || '';
  const disposition = (headers.match(/^content-disposition:\s*(.+)$/im) || [])[1] || '';
  if (/\.zip/i.test(disposition) || /zip/i.test(contentType)) return 'zip';
  if (/\.pdf/i.test(disposition) || /pdf/i.test(contentType)) return 'pdf';
  const prefix = fs.readFileSync(bodyPath).subarray(0, 16);
  if (prefix.subarray(0, 4).toString('hex') === '504b0304') return 'zip';
  if (prefix.subarray(0, 4).toString() === '%PDF') return 'pdf';
  if (/html/i.test(contentType)) return 'html';
  return 'bin';
}

function findReport(listJson, fileName, reportId) {
  const items = listJson.response?.data || listJson.data || [];
  if (!Array.isArray(items)) return undefined;
  if (fileName) return items.find(item => item.FileName === fileName);
  if (reportId) return items.find(item => item.ReportID === reportId);
  return items[0];
}

function statusText(status) {
  if (String(status) === '1') return 'complete';
  if (String(status) === '2') return 'processing';
  if (String(status) === '3') return 'failed_or_expired';
  return `unknown_${status}`;
}

async function main() {
  process.env.https_proxy = process.env.https_proxy || DEFAULT_PROXY;
  process.env.http_proxy = process.env.http_proxy || DEFAULT_PROXY;
  process.env.all_proxy = process.env.all_proxy || 'socks5://127.0.0.1:7897';

  const runDir = path.resolve(arg('run-dir', ''));
  if (!runDir || !fs.existsSync(runDir)) {
    throw new Error('Usage: node paperpass_poll_download.js --run-dir <paperpass-run-dir> --profile-dir <playwright-profile> [--file-name <PaperPass FileName>]');
  }
  const profileDir = path.resolve(arg('profile-dir', path.join(runDir, 'playwright-chromium-profile')));
  const fileName = arg('file-name', '');
  const reportId = arg('report-id', '');
  const intervalMs = Number(arg('interval-ms', '15000'));
  const maxAttempts = Number(arg('max-attempts', '40'));
  const download = !flag('no-download');

  const cookies = readPaperpassCookies(profileDir);
  const cookie = cookieHeader(cookies);
  writeJson(path.join(runDir, '31-cookie-status.json'), {
    status: 'cookies_loaded_from_playwright_profile',
    cookieNames: cookies.map(item => item.name),
    profileDir,
    target: { fileName, reportId },
  });

  let finalReport;
  let finalList;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const stem = `31-report-index-poll-${String(attempt).padStart(3, '0')}`;
    const rawPath = path.join(runDir, `${stem}.raw`);
    const response = runCurl(`${BASE}/panel/report/index?page=1`, {
      method: 'POST',
      output: rawPath,
      cookie,
      headers: {
        Origin: BASE,
        Referer: `${BASE}/panel/report`,
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest',
      },
      data: formEncode({ page: '1' }),
    });
    const parsed = parseJson(response.body.toString('utf8'));
    const listJson = { httpStatus: response.status, response: parsed };
    writeJson(path.join(runDir, `${stem}.json`), listJson);
    const report = findReport(listJson, fileName, reportId);
    writeJson(path.join(runDir, '31-report-index-latest.json'), {
      attempt,
      target: { fileName, reportId },
      found: Boolean(report),
      report,
      interpretedStatus: report ? statusText(report.Status) : 'not_found',
    });
    console.log(JSON.stringify({
      attempt,
      found: Boolean(report),
      status: report ? report.Status : undefined,
      interpretedStatus: report ? statusText(report.Status) : 'not_found',
      score: report ? report.Score : undefined,
      aiScore: report ? report.AiScore : undefined,
      reportId: report ? report.ReportID : undefined,
      fileName: report ? report.FileName : undefined,
    }, null, 2));

    if (report && String(report.Status) === '1') {
      finalReport = report;
      finalList = listJson;
      break;
    }
    if (report && String(report.Status) === '3') {
      throw new Error(`PaperPass report failed or expired: ${JSON.stringify(report)}`);
    }
    if (attempt < maxAttempts) await sleep(intervalMs);
  }

  if (!finalReport) {
    writeJson(path.join(runDir, '32-paperpass-final-summary.json'), {
      status: 'not_complete_before_timeout',
      target: { fileName, reportId },
      maxAttempts,
      intervalMs,
    });
    process.exitCode = 2;
    return;
  }

  const summary = {
    status: 'report_complete',
    report: finalReport,
    officialList: finalList,
    downloaded: null,
  };

  if (download) {
    const downloadRaw = path.join(runDir, '32-paperpass-report-download.tmp');
    const headersPath = path.join(runDir, '32-paperpass-report-download.headers');
    const url = `${BASE}/panel/report/report?filename=${encodeURIComponent(finalReport.FileName)}`;
    const response = runCurl(url, {
      output: downloadRaw,
      headerOutput: headersPath,
      cookie,
      headers: {
        Referer: `${BASE}/panel/report`,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,application/pdf,application/zip,*/*;q=0.8',
      },
    });
    const ext = detectExtension(headersPath, downloadRaw);
    const finalPath = path.join(runDir, `32-paperpass-official-report.${ext}`);
    fs.renameSync(downloadRaw, finalPath);
    summary.downloaded = {
      httpStatus: response.status,
      url,
      headersPath,
      path: finalPath,
      extension: ext,
      bytes: fs.statSync(finalPath).size,
    };
  }

  writeJson(path.join(runDir, '32-paperpass-final-summary.json'), summary);
  console.log(JSON.stringify(summary, null, 2));
}

main().catch(error => {
  console.error(error.stack || String(error));
  process.exit(1);
});
