#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const BASE = 'https://xyzscience.com';
const DEFAULT_PROXY = 'http://127.0.0.1:7897';

function arg(name, fallback) {
  const idx = process.argv.indexOf(`--${name}`);
  return idx >= 0 && idx + 1 < process.argv.length ? process.argv[idx + 1] : fallback;
}

function need(value, message) {
  if (!value) throw new Error(message);
  return value;
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeJson(file, value) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2), 'utf8');
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function run(command, args, opts = {}) {
  const result = spawnSync(command, args, { encoding: 'utf8', ...opts });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} exited ${result.status}\n${result.stderr || result.stdout || ''}`);
  }
  return result.stdout;
}

function curl(url, { method = 'GET', headers = {}, data, form = [], out, token } = {}) {
  const args = ['-sS', '-L'];
  const proxy = process.env.https_proxy || process.env.HTTPS_PROXY || process.env.http_proxy || process.env.HTTP_PROXY || DEFAULT_PROXY;
  if (proxy) args.push('--proxy', proxy);
  if (out) args.push('-o', out);
  args.push('-X', method);
  args.push('-H', 'Accept: application/json, text/plain, */*');
  for (const [key, value] of Object.entries(headers)) args.push('-H', `${key}: ${value}`);
  if (token) args.push('-H', `Authorization: ${token}`);
  if (data !== undefined) args.push('--data-raw', data);
  for (const item of form) args.push('-F', item);
  args.push(url);
  const stdout = run('curl', args);
  if (out) return fs.readFileSync(out, 'utf8');
  return stdout;
}

function openQr(imagePath) {
  const script = path.join(__dirname, 'open_qr.js');
  run(process.execPath, [script, imagePath], { stdio: 'inherit' });
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseMaybeJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return { _non_json: true, text };
  }
}

async function login(runDir) {
  const qrRaw = curl(`${BASE}/api/app/user/login/qrcode/mp`, {
    headers: { Origin: BASE, Referer: `${BASE}/detection` },
  });
  fs.writeFileSync(path.join(runDir, '01-qrcode-response.json'), qrRaw);
  const qrJson = parseMaybeJson(qrRaw);
  if (qrJson.code !== 1000 || !qrJson.data?.qrcodeUrl || !qrJson.data?.sceneId) {
    throw new Error(`unexpected QR response: ${qrRaw}`);
  }

  const qrImage = path.join(runDir, '02-login-qrcode.jpg');
  curl(qrJson.data.qrcodeUrl, { out: qrImage, headers: { Referer: `${BASE}/detection` } });
  openQr(qrImage);

  const sceneId = qrJson.data.sceneId;
  for (let i = 1; i <= 120; i++) {
    const raw = curl(`${BASE}/api/app/user/login/qrcode/status?sceneId=${encodeURIComponent(sceneId)}`, {
      headers: { Referer: `${BASE}/detection` },
    });
    const pollFile = path.join(runDir, `poll-${String(i).padStart(3, '0')}.json`);
    fs.writeFileSync(pollFile, raw);
    const json = parseMaybeJson(raw);
    console.log(`[${i}] ${raw}`);
    if (json.code === 1000 && json.data?.status === 'logged' && json.data?.token) {
      fs.writeFileSync(path.join(runDir, 'login-success.json'), raw);
      return json.data.token;
    }
    await sleep(3000);
  }
  throw new Error('QR login timed out');
}

function userInfo(runDir, token) {
  const raw = curl(`${BASE}/api/app/user/info/person`, {
    token,
    headers: { Referer: `${BASE}/detection` },
  });
  fs.writeFileSync(path.join(runDir, '02-user-info.json'), raw);
  return parseMaybeJson(raw);
}

async function detectDocx(runDir, token, filePath, title) {
  const uploadRaw = curl(`${BASE}/api/app/uselog/info/uploadDetect`, {
    method: 'POST',
    token,
    headers: { Origin: BASE, Referer: `${BASE}/detection` },
    form: [
      `file=@${filePath};type=application/vnd.openxmlformats-officedocument.wordprocessingml.document`,
      `title=${title || path.basename(filePath, path.extname(filePath))}`,
    ],
  });
  fs.writeFileSync(path.join(runDir, '03-upload-detect-docx.json'), uploadRaw);
  const upload = parseMaybeJson(uploadRaw);
  const taskId = upload.data?.taskId;
  if (!taskId) throw new Error(`upload did not return taskId: ${uploadRaw}`);

  for (let i = 1; i <= 120; i++) {
    const raw = curl(`${BASE}/api/app/uselog/info/queryStatus/${taskId}`, {
      token,
      headers: { Referer: `${BASE}/detection` },
    });
    const file = path.join(runDir, `04-query-detect-${String(i).padStart(3, '0')}.json`);
    fs.writeFileSync(file, raw);
    const json = parseMaybeJson(raw);
    console.log(`[detect ${i}] ${raw}`);
    if (json.data?.status === 'COMPLETED' || json.data?.status === 'FAILED') {
      fs.writeFileSync(path.join(runDir, '04-query-detect-final.json'), raw);
      if (json.data?.ossUrl) {
        curl(json.data.ossUrl, {
          out: path.join(runDir, '05-xyzscience-full-report.pdf'),
          headers: { Referer: `${BASE}/detection` },
        });
      }
      return json;
    }
    await sleep(5000);
  }
  throw new Error(`detect task timed out: ${taskId}`);
}

function rewriteText(runDir, token, text) {
  const payload = {
    interfaceType: 'rewrite',
    type: 0,
    content: text,
    useWordCount: text.length,
  };
  writeJson(path.join(runDir, '06-rewrite-payload.json'), payload);
  const raw = curl(`${BASE}/api/app/uselog/info/addUselog`, {
    method: 'POST',
    token,
    headers: {
      Origin: BASE,
      Referer: `${BASE}/rewrite`,
      'Content-Type': 'application/json',
    },
    data: JSON.stringify(payload),
  });
  fs.writeFileSync(path.join(runDir, '07-rewrite-response.json'), raw);
  return parseMaybeJson(raw);
}

async function main() {
  const mode = arg('mode', 'login-detect');
  const runDir = path.resolve(arg('run-dir', path.join(process.cwd(), `xyzscience-${Date.now()}`)));
  ensureDir(runDir);

  let token = arg('token');
  if (!token && fs.existsSync(path.join(runDir, 'login-success.json'))) {
    token = readJson(path.join(runDir, 'login-success.json')).data?.token;
  }
  if (!token) token = await login(runDir);
  userInfo(runDir, token);

  let detectResult = null;
  if (mode.includes('detect')) {
    const file = path.resolve(need(arg('file'), '--file is required for detect mode'));
    detectResult = await detectDocx(runDir, token, file, arg('title'));
  }

  let rewriteResult = null;
  if (mode.includes('rewrite')) {
    const text = arg('text') || (arg('text-file') ? fs.readFileSync(arg('text-file'), 'utf8').trim() : '');
    rewriteResult = rewriteText(runDir, token, need(text, '--text or --text-file is required for rewrite mode'));
  }

  writeJson(path.join(runDir, 'summary.json'), {
    service: 'XYZ SCIENCE',
    runDir,
    mode,
    detectResult,
    rewriteResult,
  });
  console.log(JSON.stringify({ status: 'done', runDir }, null, 2));
}

main().catch((error) => {
  console.error(error.stack || String(error));
  process.exit(1);
});
